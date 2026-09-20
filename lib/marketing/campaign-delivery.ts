import { supabaseAdmin } from "@/lib/supabase/admin";
import { transporter } from "@/lib/email";
import { getTargetNotificationEmail } from "@/lib/email-notifications";
import { campaignEmailFooter, emailPreferenceUrls, getUnsubscribedCampaignEmails, normalizeCampaignEmail } from "@/lib/marketing/email-preferences";

async function recipients(groupId: string, groupName: string) {
  if (groupId === "manual_emails") {
    const emails = Array.from(new Set(groupName.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)));
    if (!emails.length) return [];
    const [corporate, personal] = await Promise.all([
      supabaseAdmin.from("users").select("id,email,personal_email,full_name").in("email", emails),
      supabaseAdmin.from("users").select("id,email,personal_email,full_name").in("personal_email", emails),
    ]);
    if (corporate.error) throw corporate.error;
    if (personal.error) throw personal.error;
    const usersByEmail = new Map<string, any>();
    for (const user of [...(corporate.data || []), ...(personal.data || [])]) {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user);
      if (user.personal_email) usersByEmail.set(user.personal_email.toLowerCase(), user);
    }
    return emails.map((email) => usersByEmail.get(email) || ({ id: null, email, personal_email: null, full_name: "there" }));
  }
  let query = supabaseAdmin.from("users").select("id,email,personal_email,full_name").or("is_active.eq.true,is_active.is.null");
  if (groupId === "default_verified") query = query.eq("is_verified", true);
  else if (groupId === "default_unverified") query = query.eq("is_verified", false);
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
    let deliveredCount = targets.length;
    if (campaign.target_type === "notification") {
      const rows = targets.filter((u: any) => u.id).map((u: any) => ({
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
      const addressedTargets = targets.map((user: any) => ({ user, to: getTargetNotificationEmail(user) || user.email })).filter(({ to }: any) => Boolean(to));
      const unsubscribed = await getUnsubscribedCampaignEmails(addressedTargets.map(({ to }: any) => to));
      const eligibleTargets = addressedTargets.filter(({ to }: any) => !unsubscribed.has(normalizeCampaignEmail(to)));
      deliveredCount = eligibleTargets.length;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.vouchins.com";
      const logoUrl = (appUrl.includes("localhost") || appUrl.includes("127.0.0.1"))
        ? "https://raw.githubusercontent.com/vouchins/vouchins/main/public/images/logo.png"
        : `${appUrl}/images/logo.png`;

      for (const { user, to } of eligibleTargets) {
        if (!to) continue;
        const headers = user.id
          ? { "List-Unsubscribe": `<${emailPreferenceUrls(to, user.id).unsubscribeUrl}>` }
          : undefined;

        const formattedHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; color: #334155; line-height: 1.7; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
            <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #4FD1C5;">
              <img src="${logoUrl}" alt="Vouchins" style="height: 36px; max-height: 36px; display: block; margin: auto; border: 0; background-color: #ffffff;" />
            </div>
            <div style="padding: 40px 32px; background-color: #ffffff;">
              <div style="color: #334155; font-size: 15px; line-height: 1.7; font-weight: 400;">
                ${personalize(campaign.body, user.full_name)}
              </div>
            </div>
            ${campaignEmailFooter(to, user.id)}
          </div>
        `;

        await transporter.sendMail({
          from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
          to,
          subject: personalize(campaign.title, user.full_name),
          html: formattedHtml,
          headers,
        });
      }
    }
    await supabaseAdmin.from("campaigns").update({ status: "sent", sent_count: deliveredCount, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaignId).eq("status", "sending");
  } catch (error) {
    await supabaseAdmin.from("campaigns").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", campaignId).eq("status", "sending");
    throw error;
  }
}

export async function processDueScheduledCampaigns(): Promise<Array<{ id: string; status: string }>> {
  const nowIso = new Date().toISOString();
  const { data: dueCampaigns, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, status, scheduled_at, created_by")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });

  if (error || !dueCampaigns?.length) return [];

  const results: Array<{ id: string; status: string }> = [];

  for (const campaign of dueCampaigns) {
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("campaigns")
      .update({ status: "sending", updated_at: nowIso })
      .eq("id", campaign.id)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) continue;

    try {
      await deliverApprovedCampaign(campaign.id, campaign.created_by || "system");
      results.push({ id: campaign.id, status: "sent" });
    } catch (sendError) {
      results.push({ id: campaign.id, status: "failed" });
      console.error(`Scheduled campaign ${campaign.id} failed:`, sendError);
    }
  }

  return results;
}
