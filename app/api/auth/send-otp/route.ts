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
    /* -------------------- extract IP -------------------- */
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { email, firstName, password } = await req.json();

    /* -------------------- validation -------------------- */

    if (!email || !firstName || !password) {
      return NextResponse.json(
        { error: "Email, first name and password are required" },
        { status: 400 }
      );
    }

    if (!isCorporateEmail(email)) {
      return NextResponse.json(
        { error: "Only corporate emails are allowed" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    /* -------------------- IP rate limiting -------------------- */

    const oneHourAgo = new Date(
      Date.now() - 60 * 60 * 1000
    ).toISOString();

    const { count: hourlyCount } = await supabaseAdmin
      .from("otp_ip_rate_limits")
      .select("ip", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= MAX_IP_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please try again later." },
        { status: 429 }
      );
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

    // Log this IP request
    await supabaseAdmin
      .from("otp_ip_rate_limits")
      .insert({ ip });

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

    if (lastOtp?.created_at) {
      const secondsSinceLast =
        (Date.now() - new Date(lastOtp.created_at).getTime()) / 1000;

      if (secondsSinceLast < OTP_COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: `Please wait ${Math.ceil(
              OTP_COOLDOWN_SECONDS - secondsSinceLast
            )} seconds before requesting another code`,
          },
          { status: 429 }
        );
      }
    }

    /* -------------------- stage signup intent -------------------- */

    await supabaseAdmin.from("signup_intents").upsert({
      email: normalizedEmail,
      first_name: firstName.trim(),
      password, // stored temporarily, used only after OTP verification
    });

    /* -------------------- OTP creation -------------------- */

    // Remove any existing OTP for this email
    await supabaseAdmin
      .from("email_otps")
      .delete()
      .eq("email", normalizedEmail);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("email_otps")
      .insert({
        email: normalizedEmail,
        otp_hash: otpHash,
        expires_at: expiresAt,
        attempts: 0,
      });

    if (insertError) {
      console.error("OTP insert failed:", insertError);
      return NextResponse.json(
        { error: "Failed to create OTP" },
        { status: 500 }
      );
    }

    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
