import { transporter } from "./email";
import { campaignEmailFooter, emailPreferenceUrls } from "@/lib/marketing/email-preferences";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vouchins.com";

export async function sendVerificationReminderEmail(to: string, fullName: string, userId?: string) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  const name = fullName ? fullName.split(" ")[0] : "there";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.vouchins.com";
  const logoUrl = (appUrl.includes("localhost") || appUrl.includes("127.0.0.1"))
    ? "https://raw.githubusercontent.com/vouchins/vouchins/main/public/images/logo.png"
    : `${appUrl}/images/logo.png`;

  const verifyUrl = `${siteUrl}/verify-email`;
  const footerHtml = userId
    ? campaignEmailFooter(to, userId)
    : `<div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; font-weight: 500;"><p style="margin: 0;">&copy; 2026 Vouchins. All rights reserved.</p></div>`;

  const headers = userId
    ? { "List-Unsubscribe": `<${emailPreferenceUrls(to, userId).unsubscribeUrl}>` }
    : undefined;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; color: #334155; line-height: 1.7; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
      <div style="background-color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #4FD1C5;">
        <img src="${logoUrl}" alt="Vouchins" style="height: 36px; max-height: 36px; display: block; margin: auto; border: 0; background-color: #ffffff;" />
      </div>
      <div style="padding: 40px 32px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0A1B5C; margin: 0 0 16px 0; line-height: 1.3;">
          Unlock your verified professional network
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
          Hi ${name},
        </p>
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
          You recently joined Vouchins. Verifying your corporate email confirms your professional identity and unlocks full access to the community:
        </p>

        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <div style="margin-bottom: 12px;">
            <span style="color: #4FD1C5; font-weight: bold; margin-right: 8px;">✓</span>
            <span style="font-size: 14px; color: #334155;"><strong>View Unblurred Posts:</strong> Read private salary insights, company reviews, and insider discussions.</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #4FD1C5; font-weight: bold; margin-right: 8px;">✓</span>
            <span style="font-size: 14px; color: #334155;"><strong>Colleague Network:</strong> Connect directly with verified coworkers at your company.</span>
          </div>
          <div>
            <span style="color: #4FD1C5; font-weight: bold; margin-right: 8px;">✓</span>
            <span style="font-size: 14px; color: #334155;"><strong>Employee Referrals:</strong> Request and exchange job referrals with guaranteed trust.</span>
          </div>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #0A1B5C; 
                    color: #ffffff; 
                    padding: 14px 32px; 
                    text-decoration: none; 
                    border-radius: 12px; 
                    font-weight: 700; 
                    font-size: 15px;
                    display: inline-block; 
                    box-shadow: 0 4px 14px rgba(10, 27, 92, 0.25);
                    line-height: 1;">
            Verify My Account
          </a>
        </div>

        <p style="font-size: 13px; color: #64748B; margin: 24px 0 0 0; text-align: center;">
          Takes less than a minute with your work email or ID.
        </p>
      </div>
      ${footerHtml}
    </div>
  `;

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "Verify your work email on Vouchins to unlock full access",
    html,
    headers,
  });
}

export async function sendDmReminderEmail(to: string, actorName: string, actorId: string) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  const dmLink = `${siteUrl}/messages/${actorId}`;

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: `New message from ${actorName} on Vouchins`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #404040; line-height: 1.6;">
        <h2 style="color: #1F2557; margin-bottom: 16px;">New Direct Message</h2>
        <p style="margin-bottom: 12px;">You have received a new private message from <strong>${actorName}</strong> on Vouchins.</p>
        <p style="margin-bottom: 24px; color: #737373; font-style: italic;">Log in to the app to view the message details and reply.</p>
        
        <div style="margin: 30px 0;">
          <a href="${dmLink}" 
             style="background-color: #1F2557; 
                    color: #ffffff; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    display: inline-block; 
                    line-height: 1;">
            View Message
          </a>
        </div>
        
        <p style="font-size: 12px; color: #a3a3a3; margin-top: 40px;">
          Built for professionals. Designed for trust.
        </p>
      </div>
    `,
  });
}

export async function sendCommentReminderEmail(
  to: string,
  actorName: string,
  postTitle: string,
  isReply: boolean,
  postId: string,
  commentId?: string
) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  const targetLink = isReply && commentId
    ? `${siteUrl}/posts/${postId}#comment-${commentId}`
    : `${siteUrl}/posts/${postId}`;

  const subject = isReply
    ? `New reply from ${actorName} on Vouchins`
    : `New comment from ${actorName} on your post`;

  const description = isReply
    ? `<strong>${actorName}</strong> replied to your comment on the post <strong>"${postTitle}"</strong>.`
    : `<strong>${actorName}</strong> commented on your post <strong>"${postTitle}"</strong>.`;

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #404040; line-height: 1.6;">
        <h2 style="color: #1F2557; margin-bottom: 16px;">${isReply ? "New Reply" : "New Comment"}</h2>
        <p style="margin-bottom: 24px;">${description}</p>
        
        <div style="margin: 30px 0;">
          <a href="${targetLink}" 
             style="background-color: #1F2557; 
                    color: #ffffff; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    display: inline-block; 
                    line-height: 1;">
            View Comment
          </a>
        </div>
        
        <p style="font-size: 12px; color: #a3a3a3; margin-top: 40px;">
          Built for professionals. Designed for trust.
        </p>
      </div>
    `,
  });
}

export async function sendDailyDigestEmail(
  to: string,
  unreadDmsCount: number,
  newCommentsCount: number,
  newVouchesCount: number
) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  const feedLink = `${siteUrl}/feed`;

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "Your Vouchins Daily Activity Digest",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #404040; line-height: 1.6;">
        <h2 style="color: #1F2557; margin-bottom: 16px;">Daily Activity Digest</h2>
        <p style="margin-bottom: 24px;">Here is a summary of what you missed on Vouchins in the last 24 hours:</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #f0f0f0;">
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${unreadDmsCount > 0 ? `<li style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;"><span>💬 Unread messages</span> <strong>${unreadDmsCount}</strong></li>` : ""}
            ${newCommentsCount > 0 ? `<li style="padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;"><span>💬 Comments & replies</span> <strong>${newCommentsCount}</strong></li>` : ""}
            ${newVouchesCount > 0 ? `<li style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;"><span>🤝 New vouches</span> <strong>${newVouchesCount}</strong></li>` : ""}
          </ul>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${feedLink}" 
             style="background-color: #1F2557; 
                    color: #ffffff; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold; 
                    display: inline-block; 
                    line-height: 1;">
            Go to Vouchins Feed
          </a>
        </div>
        
        <p style="font-size: 12px; color: #a3a3a3; margin-top: 40px;">
          Built for professionals. Designed for trust.
        </p>
      </div>
    `,
  });
}

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "zoho.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "gmx.com",
  "yandex.com",
  "live.com",
  "msn.com"
]);

export interface RecipientUser {
  email: string;
  personal_email?: string;
  company?: { domain: string } | { domain: string }[] | null;
}

export function getTargetNotificationEmail(recipient: RecipientUser): string | null {
  const companyDomain = Array.isArray(recipient.company)
    ? recipient.company[0]?.domain
    : (recipient.company as any)?.domain;

  const cleanDomain = companyDomain ? companyDomain.toLowerCase().trim() : null;

  const hasCompanyDomain = (emailStr: string) => {
    if (!cleanDomain) return false;
    const emailLower = emailStr.toLowerCase().trim();
    return emailLower.includes(cleanDomain);
  };

  // 1. If personal_email is provided, check if it doesn't contain company domain
  if (recipient.personal_email) {
    const pEmail = recipient.personal_email.toLowerCase().trim();
    if (!hasCompanyDomain(pEmail)) {
      return pEmail;
    }
  }

  // 2. Fall back to recipient.email (corporate email) ONLY if it belongs to a personal email provider and doesn't contain company domain
  if (recipient.email) {
    const cEmail = recipient.email.toLowerCase().trim();
    const emailParts = cEmail.split("@");
    const emailDomain = emailParts[emailParts.length - 1];

    if (PERSONAL_EMAIL_DOMAINS.has(emailDomain) && !hasCompanyDomain(cEmail)) {
      return cEmail;
    }
  }

  return null;
}
