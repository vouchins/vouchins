import { postJson } from "../helpers/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SignupLoginResult {
  userId: string;
  loginCookie: string;
}

export async function runSignupLoginFlow(
  email: string,
  password: string,
  fullName: string
): Promise<SignupLoginResult> {
  console.log(`\n▶ [FLOW 1] Signup & Login Flow (${email})`);

  // 1. Signup via API
  const signupRes = await postJson("/api/auth/signup", {
    email,
    password,
    full_name: fullName,
  });

  if (signupRes.status !== 200 || !signupRes.data.success) {
    throw new Error(`Signup failed (${signupRes.status}): ${JSON.stringify(signupRes.data)}`);
  }
  console.log("  ✓ POST /api/auth/signup returned 200 OK");

  // 2. Verify profile created in database
  const { data: userProfile, error: profileErr } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, is_verified, onboarded, is_active")
    .eq("email", email)
    .single();

  if (profileErr || !userProfile) {
    throw new Error(`User profile not found in database: ${profileErr?.message}`);
  }

  if (userProfile.is_verified !== false || userProfile.onboarded !== false) {
    throw new Error(`User profile should be unverified (is_verified: false, onboarded: false). Got: ${JSON.stringify(userProfile)}`);
  }
  console.log(`  ✓ Database profile confirmed (id: ${userProfile.id}, is_verified: false)`);

  // 3. Login via API
  const loginRes = await postJson("/api/auth/login", {
    email,
    password,
  });

  if (loginRes.status !== 200 || !loginRes.data.success) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }

  const loginCookie = loginRes.cookieHeader;
  if (!loginCookie) {
    throw new Error("Login did not return session cookies");
  }
  console.log("  ✓ POST /api/auth/login returned 200 OK with session cookies");

  return {
    userId: userProfile.id,
    loginCookie,
  };
}
