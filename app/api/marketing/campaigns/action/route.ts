import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMarketingPrincipal } from "@/lib/marketing/auth";
import { sendCampaignApprovalEmail } from "@/lib/marketing/approval-email";
import { deliverApprovedCampaign } from "@/lib/marketing/campaign-delivery";

export async function POST(request: Request) {
  const p = await getMarketingPrincipal();
  if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, action } = await request.json();
  if (!id || !["submit", "withdraw", "retry_email", "publish"].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  let owned = supabaseAdmin.from("campaigns").select("*").eq("id", id);
  if (!p.isAdmin) owned = owned.eq("created_by", p.id);
  const { data: campaign } = await owned.maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "publish") {
    if (!p.isAdmin) return NextResponse.json({ error: "Only admins can publish campaigns" }, { status: 403 });
    if (!["draft", "rejected", "failed"].includes(campaign.status)) return NextResponse.json({ error: "Campaign cannot be published" }, { status: 409 });
    const { data: claimed, error } = await supabaseAdmin
      .from("campaigns")
      .update({ status: "sending", reviewed_at: new Date().toISOString(), reviewed_by: p.id, updated_at: new Date().toISOString() })
      .eq("id", id)
      .in("status", ["draft", "rejected", "failed"])
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!claimed) return NextResponse.json({ error: "Campaign status changed; refresh and try again" }, { status: 409 });
    try {
      await deliverApprovedCampaign(id, p.id);
      const { data } = await supabaseAdmin.from("campaigns").select("*").eq("id", id).single();
      return NextResponse.json({ campaign: data });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Campaign delivery failed" }, { status: 502 });
    }
  }

  if (action === "withdraw") {
    if (campaign.status !== "pending_approval") return NextResponse.json({ error: "Campaign is not pending" }, { status: 409 });
    const { data } = await supabaseAdmin.from("campaigns").update({ status: "draft", submitted_at: null, approval_email_error: null, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "pending_approval").select().maybeSingle();
    if (!data) return NextResponse.json({ error: "Campaign was already reviewed" }, { status: 409 });
    await supabaseAdmin.from("campaign_approval_events").insert({ campaign_id: id, version: campaign.approval_version, action: "withdrawn", actor_id: p.id });
    return NextResponse.json({ campaign: data });
  }

  if (action === "submit") {
    if (!["draft", "rejected"].includes(campaign.status)) return NextResponse.json({ error: "Campaign cannot be submitted" }, { status: 409 });
    const version = campaign.approval_version + 1;
    const { data } = await supabaseAdmin.from("campaigns").update({ status: "pending_approval", submitted_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null, rejection_reason: null, approval_email_error: null, approval_version: version, updated_at: new Date().toISOString() }).eq("id", id).in("status", ["draft", "rejected"]).select().single();
    await supabaseAdmin.from("campaign_approval_events").insert({ campaign_id: id, version, action: "submitted", actor_id: p.id });
    try {
      await sendCampaignApprovalEmail(data);
    } catch (error: any) {
      await supabaseAdmin.from("campaigns").update({ approval_email_error: error.message }).eq("id", id);
      await supabaseAdmin.from("campaign_approval_events").insert({ campaign_id: id, version, action: "email_failed", actor_id: p.id, reason: error.message });
      return NextResponse.json({ campaign: { ...data, approval_email_error: error.message }, warning: "Submitted, but approval email failed" }, { status: 202 });
    }
    return NextResponse.json({ campaign: data });
  }

  if (!p.isAdmin || campaign.status !== "pending_approval") return NextResponse.json({ error: "Only admins can retry pending approval email" }, { status: 403 });
  try {
    await sendCampaignApprovalEmail(campaign);
    await supabaseAdmin.from("campaigns").update({ approval_email_error: null }).eq("id", id);
    await supabaseAdmin.from("campaign_approval_events").insert({ campaign_id: id, version: campaign.approval_version, action: "email_retried", actor_id: p.id });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 502 }); }
}
