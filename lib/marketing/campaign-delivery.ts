import { supabaseAdmin } from "@/lib/supabase/admin";
import { transporter } from "@/lib/email";
import { getTargetNotificationEmail } from "@/lib/email-notifications";

async function recipients(groupId: string, groupName: string) {
  let query = supabaseAdmin.from("users").select("id,email,personal_email,full_name").eq("is_active", true);
  if (groupId === "default_verified") query = query.eq("is_verified", true);
  else if (["default_email", "default_google", "default_linkedin"].includes(groupId)) {
    let providerQuery = supabaseAdmin.from("user_identity_providers").select("user_id");
    providerQuery = groupId === "default_linkedin"
      ? providerQuery.ilike("provider", "linkedin%")
      : providerQuery.eq("provider", groupId.replace("default_", ""));
    const { data: providers, error: providerError } = await providerQuery;
    if (providerError) throw providerError;
    const ids = Array.from(new Set((providers || []).map((p: any) => p.user_id)));
    if (!ids.length) return [];
    query = query.in("id", ids);
  }
  else if (groupId.startsWith("default_company_")) {
    query = query.eq("company_id", groupId.slice("default_company_".length));
  }
  else if (groupId.startsWith("default_location_")) {
    const location = decodeURIComponent(groupId.slice("default_location_".length)).trim();
    if (!location) return [];
    query = query.eq("city", location);
  }
  else if (groupId !== "default_all") {
    const { data: members, error } = await supabaseAdmin.from("user_group_members").select("user_id").eq("group_id", groupId);
    if (error) throw error;
    const ids = (members || []).map((m: any) => m.user_id);
    if (!ids.length) return [];
    query = query.in("id", ids);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function personalize(value: string, name: string) {
  return value.replace(/\{\{?(?:name|full_name)\}?\}/gi, name || "there");
}

export async function deliverApprovedCampaign(campaignId: string, actorId: string) {
  const { data: campaign, error } = await supabaseAdmin.from("campaigns").select("*").eq("id", campaignId).single();
  if (error || !campaign || campaign.status !== "sending") throw error || new Error("Campaign is not ready for delivery");
  try {
    const targets = await recipients(campaign.recipient_group_id, campaign.recipient_group_name);
    if (campaign.target_type === "notification") {
      const rows = targets.map((u: any) => ({
        user_id: u.id, actor_id: actorId, type: "SYSTEM_ANNOUNCEMENT",
        entity_id: campaign.id, entity_type: "campaign", is_read: false,
        metadata: { title: personalize(campaign.title, u.full_name), message: personalize(campaign.body, u.full_name) },
      }));
      for (let i = 0; i < rows.length; i += 50) {
        const { error: insertError } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 50));
        if (insertError) throw insertError;
      }
    } else {
      if (!process.env.SES_FROM_EMAIL) throw new Error("SES_FROM_EMAIL is not configured");
      for (const user of targets) {
        const to = getTargetNotificationEmail(user) || user.email;
        if (!to) continue;
        await transporter.sendMail({
          from: `Vouchins <${process.env.SES_FROM_EMAIL}>`, to,
          subject: personalize(campaign.title, user.full_name),
          html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;line-height:1.7">${personalize(campaign.body, user.full_name)}</div>`,
        });
      }
    }
    await supabaseAdmin.from("campaigns").update({ status: "sent", sent_count: targets.length, updated_at: new Date().toISOString() }).eq("id", campaignId).eq("status", "sending");
  } catch (error) {
    await supabaseAdmin.from("campaigns").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("status", "sending");
    throw error;
  }
}
