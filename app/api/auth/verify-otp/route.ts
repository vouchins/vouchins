import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const { email, otp, password, firstName } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: "Email, OTP, and password are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Fetch OTP record
    const { data: otpRow, error: otpError } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (otpError || !otpRow) {
      return NextResponse.json(
        { error: "OTP not found or already used" },
        { status: 400 }
      );
    }

    // 2️⃣ Check expiry
    if (new Date(otpRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 400 }
      );
    }

    // 3️⃣ Validate OTP
    const isValidOtp = await bcrypt.compare(otp, otpRow.otp_hash);
    if (!isValidOtp) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    // 4️⃣ Find existing auth user by email (TYPE-SAFE)
    let userId: string | null = null;

    const { data: usersList, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 }
      );
    }

    const existingUser = usersList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // 5️⃣ Create auth user
      const { data: newUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createUserError || !newUser?.user) {
        return NextResponse.json(
          { error: createUserError?.message || "Failed to create user" },
          { status: 400 }
        );
      }

      userId = newUser.user.id;
    }

    // 6️⃣ Ensure public.users profile exists & mark verified
    const { data: existingProfile } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from("users").insert({
        id: userId,
        email,
        first_name: firstName || "",
        is_verified: true,
        onboarded: false,
      });
    } else {
      await supabaseAdmin
        .from("users")
        .update({ is_verified: true })
        .eq("id", userId);
    }

    // 7️⃣ Delete OTP (single-use)
    await supabaseAdmin.from("email_otps").delete().eq("email", email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
