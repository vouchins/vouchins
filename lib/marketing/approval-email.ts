import { supabaseAdmin } from "@/lib/supabase/admin";
import { transporter } from "@/lib/email";

export async function sendCampaignApprovalEmail(campaign: any) {
  const { data: admins, error } = await supabaseAdmin.from("users").select("email,personal_email").eq("is_admin", true).eq("is_active", true);
  if (error) throw error;
  const recipients = Array.from(new Set((admins || []).map((a: any) => a.personal_email || a.email).filter(Boolean)));
  if (!recipients.length) throw new Error("No active admin email address is configured");
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.vouchins.com";
  const reviewUrl = `${base}/admin/campaign-approvals/${campaign.id}`;
  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`, bcc: recipients,
    subject: `Campaign approval requested: ${campaign.title}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto"><h2>Campaign approval requested</h2><p><strong>${campaign.title}</strong></p><p>Channel: ${campaign.target_type}<br/>Audience: ${campaign.recipient_group_name}</p><a href="${reviewUrl}">Review campaign</a></div>`,
  });
}

