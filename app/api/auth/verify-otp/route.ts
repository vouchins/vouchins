import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, otp, userId } = await req.json();
    if (userId !== undefined && userId !== user.id) {
      return NextResponse.json({ error: "Cannot verify another user" }, { status: 403 });
    }
    if (typeof email !== "string" || typeof otp !== "string") {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const { data: attempt } = await supabaseAdmin.from("otp_attempts")
      .select("attempt_count, locked_until").eq("user_id", user.id).maybeSingle();
    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    const { data: otpRow } = await supabaseAdmin.from("email_otps").select("*").eq("email", normalizedEmail).maybeSingle();
    if (!otpRow) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    if (new Date(otpRow.expires_at) < new Date()) {
      await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(String(otp).trim(), otpRow.otp_hash);
    if (!isValid) {
      const nextCount = (attempt?.attempt_count ?? 0) + 1;
      await supabaseAdmin.from("otp_attempts").upsert({
        user_id: user.id,
        attempt_count: Math.min(nextCount, MAX_ATTEMPTS),
        locked_until: nextCount >= MAX_ATTEMPTS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      });
      if (nextCount >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
      }
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    const domain = normalizedEmail.split("@")[1];
    let { data: company } = await supabaseAdmin.from("companies").select("id").eq("domain", domain).maybeSingle();

    if (!company) {
      const { data: newComp } = await supabaseAdmin.from("companies").insert({
        domain,
        name: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)
      }).select("id").single();
      company = newComp;
    }

    const { data: consumed, error: consumeError } = await supabaseAdmin.rpc("consume_email_otp", {
      p_user_id: user.id,
      p_email: normalizedEmail,
      p_expected_hash: otpRow.otp_hash,
      p_company_id: company?.id,
    });
    if (consumeError) throw consumeError;
    if (!consumed) return NextResponse.json({ error: "Code already used or expired" }, { status: 409 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
