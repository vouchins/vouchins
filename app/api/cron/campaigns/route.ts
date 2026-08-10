import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deliverApprovedCampaign } from "@/lib/marketing/campaign-delivery";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    const { data: dueCampaigns, error } = await supabaseAdmin
      .from("campaigns")
      .select("id, status, scheduled_at, created_by")
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    if (!dueCampaigns?.length) {
      return NextResponse.json({ message: "No scheduled campaigns due" });
    }

    const results: Array<{ id: string; status: string }> = [];

    for (const campaign of dueCampaigns) {
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("campaigns")
        .update({ status: "sending", updated_at: nowIso })
        .eq("id", campaign.id)
        .eq("status", "scheduled")
        .select("id")
        .maybeSingle();

      if (claimError) throw claimError;
      if (!claimed) continue;

      try {
        await deliverApprovedCampaign(campaign.id, campaign.created_by || "system");
        results.push({ id: campaign.id, status: "sent" });
      } catch (sendError: any) {
        results.push({ id: campaign.id, status: "failed" });
        console.error(`Scheduled campaign ${campaign.id} failed:`, sendError);
      }
    }

    return NextResponse.json({ message: "Processed scheduled campaigns", results });
  } catch (error: any) {
    console.error("Error in campaign scheduler cron route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
