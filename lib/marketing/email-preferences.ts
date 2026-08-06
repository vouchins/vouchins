import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function secret() {
  const value = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return value;
}

export function normalizeCampaignEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createEmailPreferenceToken(email: string) {
  const encoded = Buffer.from(normalizeCampaignEmail(email)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function emailFromPreferenceToken(token: string) {
  const [encoded, suppliedSignature, ...extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra.length) return null;
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(suppliedSignature, "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const email = normalizeCampaignEmail(Buffer.from(encoded, "base64url").toString("utf8"));
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch { return null; }
}

export function emailPreferenceUrls(email: string, userId?: string | null) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.vouchins.com";
  const token = createEmailPreferenceToken(email);
  const unsubscribeUrl = `${base}/email-preferences?token=${encodeURIComponent(token)}&action=unsubscribe`;
  const preferencesUrl = userId ? `${base}/users/${userId}` : `${base}/email-preferences?token=${encodeURIComponent(token)}`;
  return { base, preferencesUrl, unsubscribeUrl };
}

export function campaignEmailFooter(email: string, userId?: string | null) {
  const { base, preferencesUrl, unsubscribeUrl } = emailPreferenceUrls(email, userId);
  if (!userId) {
    return `<div style="background-color:#f8fafc;padding:24px;text-align:center;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;font-weight:500;">
      <p style="margin:0 0 8px;"><a href="${base}/how-it-works" style="color:#475569;">How it works</a> &middot; <a href="${base}/blog" style="color:#475569;">Blogs</a></p>
      <p style="margin:0;">&copy; 2026 Vouchins. All rights reserved.</p>
    </div>`;
  }
  return `<div style="background-color:#f8fafc;padding:24px;text-align:center;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;font-weight:500;">
    <p style="margin:0 0 8px;color:#64748b;">You’re receiving this email because you’re a member of the Vouchins community.</p>
    <p style="margin:0 0 8px;"><a href="${preferencesUrl}" style="color:#475569;">Manage email preferences</a> &middot; <a href="${unsubscribeUrl}" style="color:#475569;">Unsubscribe</a> &middot; <a href="${base}/privacy" style="color:#475569;">Privacy Policy</a></p>
    <p style="margin:0;">&copy; 2026 Vouchins. All rights reserved.</p>
  </div>`;
}

export async function getUnsubscribedCampaignEmails(emails: string[]) {
  const normalized = Array.from(new Set(emails.map(normalizeCampaignEmail).filter(Boolean)));
  if (!normalized.length) return new Set<string>();
  const [suppression, corporateUsers, personalUsers] = await Promise.all([
    supabaseAdmin.from("campaign_email_unsubscribes").select("email").in("email", normalized),
    supabaseAdmin.from("users").select("email,pref_email_campaigns").in("email", normalized),
    supabaseAdmin.from("users").select("personal_email,pref_email_campaigns").in("personal_email", normalized),
  ]);
  if (suppression.error) throw suppression.error;
  if (corporateUsers.error) throw corporateUsers.error;
  if (personalUsers.error) throw personalUsers.error;
  const result = new Set((suppression.data || []).map((row: any) => normalizeCampaignEmail(row.email)));
  for (const row of corporateUsers.data || []) {
    const email = normalizeCampaignEmail((row as any).email);
    (row as any).pref_email_campaigns ? result.delete(email) : result.add(email);
  }
  for (const row of personalUsers.data || []) {
    const email = normalizeCampaignEmail((row as any).personal_email);
    (row as any).pref_email_campaigns ? result.delete(email) : result.add(email);
  }
  return result;
}
