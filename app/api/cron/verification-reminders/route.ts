import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendVerificationReminderEmail, getTargetNotificationEmail } from "@/lib/email-notifications";
import { getUnsubscribedCampaignEmails, normalizeCampaignEmail } from "@/lib/marketing/email-preferences";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch users registered >= 24 hours ago who are unverified and have not yet received the reminder
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, email, personal_email, full_name, is_verified, is_active, created_at, verification_reminder_sent_at, company:companies(domain)")
      .or("is_verified.eq.false,is_verified.is.null")
      .or("is_active.eq.true,is_active.is.null")
      .lte("created_at", twentyFourHoursAgo.toISOString())
      .gte("created_at", fourteenDaysAgo.toISOString())
      .is("verification_reminder_sent_at", null)
      .limit(100);

    if (error) {
      console.error("Error fetching unverified users for verification reminder:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No unverified users due for reminder" });
    }

    // Resolve destination emails
    const addressedTargets = users.map((u: any) => ({
      user: u,
      targetEmail: getTargetNotificationEmail(u) || u.email,
    })).filter(({ targetEmail }: any) => Boolean(targetEmail));

    const unsubscribed = await getUnsubscribedCampaignEmails(addressedTargets.map(({ targetEmail }: any) => targetEmail));
    const eligibleTargets = addressedTargets.filter(({ targetEmail }: any) => !unsubscribed.has(normalizeCampaignEmail(targetEmail)));

    const processedUserIds: string[] = [];

    for (const { user, targetEmail } of eligibleTargets) {
      try {
        await sendVerificationReminderEmail(targetEmail, user.full_name, user.id);
        processedUserIds.push(user.id);
      } catch (sendError) {
        console.error(`Failed to send verification reminder to ${targetEmail} (user ${user.id}):`, sendError);
      }
    }

    // Update timestamp for all users we processed (including unsubscribed to avoid reprocessing)
    const allUserIdsToMark = users.map((u: any) => u.id);
    if (allUserIdsToMark.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ verification_reminder_sent_at: now.toISOString() })
        .in("id", allUserIdsToMark);

      if (updateError) {
        console.error("Error updating verification_reminder_sent_at:", updateError);
      }
    }

    return NextResponse.json({
      message: "Processed verification reminders",
      totalEligible: users.length,
      sentCount: processedUserIds.length,
    });
  } catch (err: any) {
    console.error("Error in verification reminders cron route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
