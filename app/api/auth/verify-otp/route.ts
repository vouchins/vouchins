import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const MAX_OTP_ATTEMPTS = 5;

// IP Rate Limit: 15 verification attempts per 10 minutes
const IP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_IP_ATTEMPTS = 15;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // 0. IP Rate Limiting (Defense against DoS and distributed brute-force)
    const ipRateLimit = checkRateLimit(`verify-otp:ip:${ip}`, {
      windowMs: IP_RATE_LIMIT_WINDOW_MS,
      max: MAX_IP_ATTEMPTS,
    });

    if (!ipRateLimit.success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((ipRateLimit.reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many verification attempts from this IP. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(ipRateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(ipRateLimit.reset / 1000)),
          },
        }
      );
    }

    const { email, otp, userId } = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !otp) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const supabase = await createServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // 1. Fetch & Validate OTP
    const { data: otpRow } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!otpRow) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Check expiration
    if (new Date(otpRow.expires_at) < new Date()) {
      await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
      return NextResponse.json({ error: "Code expired. Please request a new code." }, { status: 400 });
    }

    // 2. Lockout Check: If OTP has already reached max attempts, invalidate it immediately
    const currentAttempts = otpRow.attempts || 0;
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
      return NextResponse.json(
        { error: "Too many failed attempts. This verification code has been invalidated. Please request a new code." },
        { status: 429 }
      );
    }

    // 3. Verify Hash
    const isValid = await bcrypt.compare(String(otp).trim(), otpRow.otp_hash);
    if (!isValid) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        // Exceeded limit: destroy OTP to prevent further brute-force
        await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
        return NextResponse.json(
          { error: "Too many failed attempts. This verification code has been invalidated. Please request a new code." },
          { status: 429 }
        );
      }

      await supabaseAdmin
        .from("email_otps")
        .update({ attempts: nextAttempts })
        .eq("email", normalizedEmail);

      const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
      return NextResponse.json(
        { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
        { status: 400 }
      );
    }

    // 4. Check if corporate email is already claimed by another user
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .or(`email.eq.${normalizedEmail},secondary_email.eq.${normalizedEmail}`)
      .neq("id", targetUserId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "This corporate email is already associated with another account." },
        { status: 400 }
      );
    }

    // 5. Resolve Company (Auto-creation logic)
    const domain = normalizedEmail.split("@")[1];
    let { data: company } = await supabaseAdmin.from("companies").select("id").eq("domain", domain).maybeSingle();

    if (!company) {
      const { data: newComp } = await supabaseAdmin.from("companies").insert({
        domain,
        name: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1),
      }).select("id").single();
      company = newComp;
    }

    // 6. Upgrade User Identity
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        secondary_email: normalizedEmail,
        company_id: company?.id,
        is_verified: true, // This unlocks the 'Company' feed
        onboarded: true,
        verification_method: "otp",
      })
      .eq("id", targetUserId);

    if (updateError) throw updateError;

    // 7. Cleanup OTP & reset IP rate limit on success
    await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
    resetRateLimit(`verify-otp:ip:${ip}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}