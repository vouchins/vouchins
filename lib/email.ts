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
