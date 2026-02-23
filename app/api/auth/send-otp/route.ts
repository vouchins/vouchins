import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email";
import { isCorporateEmail } from "@/lib/auth/validation";

const OTP_COOLDOWN_SECONDS = 60;
const OTP_EXPIRY_MINUTES = 10;

// IP rate limits
const MAX_IP_PER_HOUR = 5;
const MAX_IP_PER_DAY = 10;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { email, firstName } = await req.json(); // Password removed - not needed for existing users

    if (!email || !firstName) {
      return NextResponse.json({ error: "Email and first name are required" }, { status: 400 });
    }

    if (!isCorporateEmail(email)) {
      return NextResponse.json({ error: "Please use your corporate email address" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    /* -------------------- Rate Limiting -------------------- */
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabaseAdmin
      .from("otp_ip_rate_limits")
      .select("ip", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= MAX_IP_PER_HOUR) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: dailyCount } = await supabaseAdmin
      .from("otp_ip_rate_limits")
      .select("ip", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", todayStart.toISOString());

    if ((dailyCount ?? 0) >= MAX_IP_PER_DAY) {
      return NextResponse.json(
        { error: "Daily OTP limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }
    await supabaseAdmin.from("otp_ip_rate_limits").insert({ ip });

    /* -------------------- cleanup expired OTPs -------------------- */

    await supabaseAdmin
      .from("email_otps")
      .delete()
      .lt("expires_at", new Date().toISOString());

    /* -------------------- OTP cooldown per email -------------------- */

    const { data: lastOtp } = await supabaseAdmin
      .from("email_otps")
      .select("created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lastOtp) {
      const secondsSinceLast = (Date.now() - new Date(lastOtp.created_at).getTime()) / 1000;
      if (secondsSinceLast < OTP_COOLDOWN_SECONDS) {
        return NextResponse.json({ error: `Please wait ${Math.ceil(60 - secondsSinceLast)}s` }, { status: 429 });
      }
    }

    /* -------------------- OTP Generation -------------------- */
    await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    await supabaseAdmin.from("email_otps").insert({
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
    });

    await sendOtpEmail(normalizedEmail, otp);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}