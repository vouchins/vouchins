import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "Your Vouchins verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
  });
}

export async function sendApprovalEmail(to: string) {
  if (!process.env.SES_FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL not configured");
  }

  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "Your Vouchins account has been approved!",
    text: `Great news! Your profile has been manually verified. You can now log in to Vouchins using your corporate email address. 
    
Welcome to the network!`,
    html: `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #404040; line-height: 1.6;">
    <h2 style="color: #171717; margin-bottom: 16px;">Welcome to Vouchins</h2>
    <p style="margin-bottom: 12px;">Great news! Your profile has been manually verified by our team.</p>
    <p style="margin-bottom: 24px;">You can now log in using your corporate email address.</p>
    
    <div style="margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://vouchins.com"}/login" 
         style="background-color: #171717; 
                color: #ffffff; 
                padding: 14px 28px; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: bold; 
                display: inline-block; 
                line-height: 1;">
        Log in to your account
      </a>
    </div>
    
    <p style="font-size: 12px; color: #a3a3a3; margin-top: 40px;">
      Built for professionals. Designed for trust.
    </p>
  </div>
`,
  });
}

export async function sendRejectionEmail(to: string) {
  await transporter.sendMail({
    from: `Vouchins <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject: "Update regarding your Vouchins access request",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #404040; line-height: 1.6;">
        <h2 style="color: #171717;">Access Request Update</h2>
        <p>Thank you for your interest in joining Vouchins.</p>
        <p>After reviewing your request, we are unable to approve your account at this time. Our network requires a verifiable professional profile and a supported corporate domain to maintain community integrity.</p>
        <p>If you believe this was an error, please ensure your LinkedIn profile is public and re-apply using a valid corporate email address.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="font-size: 12px; color: #a3a3a3;">Vouchins Verification Team</p>
      </div>
    `,
  });
}