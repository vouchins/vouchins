import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOtpEmail } from "@/lib/email";
import { isCorporateEmail } from "@/lib/auth/validation";

const OTP_COOLDOWN_SECONDS = 60;
const OTP_EXPIRY_MINUTES = 10;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isCorporateEmail(email)) {
      return NextResponse.json(
        { error: "Only corporate emails are allowed" },
        { status: 400 }
      );
    }

    // Check cooldown using created_at
    const { data: lastOtp } = await supabaseAdmin
      .from("email_otps")
      .select("created_at")
      .eq("email", email)
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

    // Remove any previous OTP
    await supabaseAdmin.from("email_otps").delete().eq("email", email);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    // ✅ Insert ONLY valid columns
    const { error: insertError } = await supabaseAdmin
      .from("email_otps")
      .insert({
        email,
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

    await sendOtpEmail(email, otp);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
