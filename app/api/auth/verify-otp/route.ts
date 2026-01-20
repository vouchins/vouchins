import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    /* -------------------- fetch OTP -------------------- */

    const { data: otpRow } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!otpRow) {
      return NextResponse.json(
        { error: "OTP not found or already used" },
        { status: 400 }
      );
    }

    if (new Date(otpRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 400 }
      );
    }

    const isValidOtp = await bcrypt.compare(otp, otpRow.otp_hash);
    if (!isValidOtp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    /* -------------------- fetch signup intent -------------------- */

    const { data: intent } = await supabaseAdmin
      .from("signup_intents")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!intent) {
      return NextResponse.json(
        { error: "Signup session expired. Please sign up again." },
        { status: 400 }
      );
    }

    /* -------------------- resolve company -------------------- */

    const domain = normalizedEmail.split("@")[1];

    let companyId: string;

    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error } = await supabaseAdmin
        .from("companies")
        .insert({
          domain,
          name: domain.split(".")[0],
        })
        .select("id")
        .single();

      if (error) throw error;
      companyId = newCompany.id;
    }

    /* -------------------- create auth user -------------------- */

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: intent.password, // ✅ plaintext (Supabase hashes internally)
        email_confirm: true,
      });

    if (authError || !authUser?.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    /* -------------------- create users row -------------------- */

    await supabaseAdmin.from("users").insert({
      id: userId,
      email: normalizedEmail,
      first_name: intent.first_name,
      company_id: companyId,
      is_verified: true,
      onboarded: false,
    });

    /* -------------------- cleanup -------------------- */

    await supabaseAdmin.from("email_otps").delete().eq("email", normalizedEmail);
    await supabaseAdmin
      .from("signup_intents")
      .delete()
      .eq("email", normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
