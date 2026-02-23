import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, otp, userId } = await req.json();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch & Validate OTP
    const { data: otpRow } = await supabaseAdmin.from("email_otps").select("*").eq("email", normalizedEmail).maybeSingle();
    if (!otpRow) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    if (new Date(otpRow.expires_at) < new Date()) {
      await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // 2. Verify Hash
    const isValid = await bcrypt.compare(String(otp).trim(), otpRow.otp_hash);
    if (!isValid) {
      await supabaseAdmin.from("email_otps").update({ attempts: otpRow.attempts + 1 }).eq("email", normalizedEmail);
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    // 3. Resolve Company (Auto-creation logic)
    const domain = normalizedEmail.split("@")[1];
    let { data: company } = await supabaseAdmin.from("companies").select("id").eq("domain", domain).maybeSingle();

    if (!company) {
      const { data: newComp } = await supabaseAdmin.from("companies").insert({
        domain,
        name: domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1)
      }).select("id").single();
      company = newComp;
    }

    // 4. Upgrade User Identity
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        secondary_email: normalizedEmail,
        company_id: company?.id,
        is_verified: true, // This unlocks the 'Company' feed
        onboarded: true,
        verification_method: 'otp'
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 5. Cleanup
    await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}