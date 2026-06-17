import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendDailyDigestEmail, getTargetNotificationEmail } from "@/lib/email-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Verify CRON_SECRET authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Query users who are eligible for a daily digest
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, personal_email, last_seen, last_digest_sent_at, company:companies(domain)")
      .eq("pref_email_digest", true)
      .lt("last_seen", twentyFourHoursAgo.toISOString())
      .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${twentyFourHoursAgo.toISOString()}`);

    if (usersError) {
      console.error("Error fetching users for digest:", usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users eligible for digest today" });
    }

    const userIds = users.map((u) => u.id);

    // 3. Fetch all unread and unsent notifications for these users
    const { data: notifications, error: notifError } = await supabaseAdmin
      .from("notifications")
      .select("id, type, user_id")
      .in("user_id", userIds)
      .is("email_sent_at", null)
      .eq("is_read", false);

    if (notifError) {
      console.error("Error fetching notifications for digest:", notifError);
      return NextResponse.json({ error: notifError.message }, { status: 500 });
    }

    // Group notifications by user_id
    const userNotificationsMap = new Map<string, any[]>();
    for (const notif of notifications || []) {
      if (!userNotificationsMap.has(notif.user_id)) {
        userNotificationsMap.set(notif.user_id, []);
      }
      userNotificationsMap.get(notif.user_id)!.push(notif);
    }

    let sentDigestsCount = 0;
    const allProcessedNotificationIds: string[] = [];
    const usersToUpdateLastDigest: string[] = [];

    // 4. Process each user
    for (const user of users) {
      const targetEmail = getTargetNotificationEmail(user as any);
      if (!targetEmail) continue;
      const userNotifs = userNotificationsMap.get(user.id) || [];
      if (userNotifs.length === 0) continue;

      // Count notification types
      let unreadDmsCount = 0;
      let newCommentsCount = 0;
      let newVouchesCount = 0;

      for (const notif of userNotifs) {
        if (notif.type === "MESSAGE_RECEIVED") {
          unreadDmsCount++;
        } else if (notif.type === "COMMENT_RECEIVED" || notif.type === "COMMENT_REPLY") {
          newCommentsCount++;
        } else if (notif.type === "POST_VOUCHED") {
          newVouchesCount++;
        }
      }

      const totalActivity = unreadDmsCount + newCommentsCount + newVouchesCount;
      if (totalActivity > 0) {
        try {
          await sendDailyDigestEmail(targetEmail, unreadDmsCount, newCommentsCount, newVouchesCount);
          sentDigestsCount++;
          usersToUpdateLastDigest.push(user.id);
          allProcessedNotificationIds.push(...userNotifs.map((n) => n.id));
        } catch (err) {
          console.error(`Failed to send daily digest email to user ${user.id} (${targetEmail}):`, err);
        }
      }
    }

    // 5. Update notifications as sent
    if (allProcessedNotificationIds.length > 0) {
      const { error: updateNotifError } = await supabaseAdmin
        .from("notifications")
        .update({ email_sent_at: now.toISOString() })
        .in("id", allProcessedNotificationIds);

      if (updateNotifError) {
        console.error("Error updating notifications for digest:", updateNotifError);
      }
    }

    // 6. Update user's last_digest_sent_at
    if (usersToUpdateLastDigest.length > 0) {
      const { error: updateUserError } = await supabaseAdmin
        .from("users")
        .update({ last_digest_sent_at: now.toISOString() })
        .in("id", usersToUpdateLastDigest);

      if (updateUserError) {
        console.error("Error updating users last_digest_sent_at:", updateUserError);
      }
    }

    return NextResponse.json({
      message: `Processed digests successfully`,
      digestsSent: sentDigestsCount,
      notificationsMarkedSent: allProcessedNotificationIds.length,
      usersUpdated: usersToUpdateLastDigest.length,
    });
  } catch (error: any) {
    console.error("Error in digest cron route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
