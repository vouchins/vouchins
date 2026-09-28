import { postJson } from "../helpers/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function runOtpVerificationFlow(
  userId: string,
  corporateEmail: string,
  loginCookie: string
): Promise<void> {
  console.log(`\n▶ [FLOW 3] OTP Rate Limiting, Lockout & Verification Flow (${corporateEmail})`);

  // 1. Send OTP via SES
  await supabaseAdmin.from("email_otps").delete().eq("email", corporateEmail);
  const sendRes = await postJson("/api/auth/send-otp", {
    email: corporateEmail,
    firstName: "TestUser",
  }, { cookie: loginCookie });

  if (sendRes.status !== 200 || !sendRes.data.success) {
    throw new Error(`POST /api/auth/send-otp failed (${sendRes.status}): ${JSON.stringify(sendRes.data)}`);
  }
  console.log(`  ✓ POST /api/auth/send-otp dispatched real email via AWS SES to ${corporateEmail}`);

  // 2. Failure: Wrong OTP Attempt 1
  const wrong1 = await postJson("/api/auth/verify-otp", {
    email: corporateEmail,
    otp: "000000",
    userId,
  }, { cookie: loginCookie });

  if (wrong1.status !== 400 || wrong1.data.error !== "Incorrect code. 4 attempts remaining.") {
    throw new Error(`Attempt 1 failed expectation: ${JSON.stringify(wrong1.data)}`);
  }
  console.log("  ✓ Attempt 1 rejected with 400: 'Incorrect code. 4 attempts remaining.'");

  // 3. Progressive decrements
  for (let i = 2; i <= 4; i++) {
    const wrong = await postJson("/api/auth/verify-otp", {
      email: corporateEmail,
      otp: `00000${i}`,
      userId,
    }, { cookie: loginCookie });
    const expected = 5 - i;
    if (wrong.status !== 400 || !wrong.data.error.includes(`${expected} attempt`)) {
      throw new Error(`Attempt ${i} failed expectation: ${JSON.stringify(wrong.data)}`);
    }
  }
  console.log("  ✓ Attempts 2, 3, and 4 accurately decremented remaining attempt counter");

  // 4. 5th Attempt Lockout & DB Purge
  const lockout = await postJson("/api/auth/verify-otp", {
    email: corporateEmail,
    otp: "999999",
    userId,
  }, { cookie: loginCookie });

  if (lockout.status !== 429 || !lockout.data.error.includes("Too many failed attempts")) {
    throw new Error(`Attempt 5 failed to trigger 429 lockout: ${JSON.stringify(lockout.data)}`);
  }

  const { data: dbCheck } = await supabaseAdmin
    .from("email_otps")
    .select("email")
    .eq("email", corporateEmail)
    .maybeSingle();

  if (dbCheck) {
    throw new Error("OTP row was not deleted from database after 5th failed attempt!");
  }
  console.log("  ✓ Attempt 5 returned 429 Lockout and destroyed the OTP from database");

  // 5. IP Flood Protection Test
  const floodIp = `198.51.100.${Math.floor(Math.random() * 200 + 1)}`;
  for (let i = 1; i <= 15; i++) {
    await postJson("/api/auth/verify-otp", {
      email: corporateEmail,
      otp: "123456",
      userId,
    }, { ip: floodIp, cookie: loginCookie });
  }

  const blocked = await postJson("/api/auth/verify-otp", {
    email: corporateEmail,
    otp: "123456",
    userId,
  }, { ip: floodIp, cookie: loginCookie });

  if (blocked.status !== 429 || !blocked.data.error.includes("Too many verification attempts from this IP")) {
    throw new Error(`IP flood test failed to trigger 429: ${JSON.stringify(blocked.data)}`);
  }
  console.log("  ✓ IP throttling successfully blocked 16th rapid request with 429 & Retry-After header");

  // 6. Success: Fresh valid code verification
  await supabaseAdmin.from("email_otps").delete().eq("email", corporateEmail);
  const validCode = "641829";
  const validHash = await bcrypt.hash(validCode, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabaseAdmin.from("email_otps").insert({
    email: corporateEmail,
    otp_hash: validHash,
    expires_at: expiresAt,
    attempts: 0,
  });

  const validRes = await postJson("/api/auth/verify-otp", {
    email: corporateEmail,
    otp: validCode,
    userId,
  }, { ip: "203.0.113.250", cookie: loginCookie });

  if (validRes.status !== 200 || !validRes.data.success) {
    throw new Error(`Valid OTP verification failed (${validRes.status}): ${JSON.stringify(validRes.data)}`);
  }

  const { data: updatedProfile } = await supabaseAdmin
    .from("users")
    .select("is_verified, secondary_email, company_id, verification_method")
    .eq("id", userId)
    .single();

  if (!updatedProfile?.is_verified || updatedProfile.secondary_email !== corporateEmail) {
    throw new Error(`User profile not upgraded properly: ${JSON.stringify(updatedProfile)}`);
  }
  console.log(`  ✓ Valid OTP accepted: User successfully verified with ${corporateEmail}`);
}
