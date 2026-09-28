import { runSignupLoginFlow } from "./flows/01-signup-login";
import { runUnverifiedGatesFlow } from "./flows/02-unverified-gates";
import { runOtpVerificationFlow } from "./flows/03-otp-verification";
import { runFeedAndPostsFlow } from "./flows/04-feed-and-posts";
import { runSavedPostsFlow } from "./flows/05-saved-posts";
import { runJobsFlow } from "./flows/06-jobs";
import { runMessagingFlow } from "./flows/07-messaging";
import { runFileUploadsFlow } from "./flows/08-file-uploads";
import { runTeardown, CleanupContext } from "./helpers/cleanup";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function main() {
  const startTime = Date.now();
  console.log("===============================================================");
  console.log("🚀 VOUCHINS ON - DEMAND END - TO - END AUTOMATED TEST SUITE");
  console.log("===============================================================");

  const timestamp = Date.now();
  const testEmail = `e2e_test_${timestamp}@gmail.com`;
  const testPassword = "TestPassword123!";
  const testFullName = `E2E Tester ${timestamp.toString().slice(-4)}`;
  const corporateEmail = "connect@vouchins.com";

  const cleanupCtx: CleanupContext = {
    corporateEmail,
  };

  const stepsSummary: { name: string; duration: string; status: "PASS" | "FAIL" }[] = [];

  try {
    // 0. Verify Next.js server connection
    const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
    try {
      const ping = await fetch(appUrl);
      if (!ping.ok && ping.status !== 307 && ping.status !== 308 && ping.status !== 200) {
        console.warn(`  ⚠ Dev server ping returned ${ping.status}`);
      }
    } catch {
      throw new Error(`Unable to connect to Next.js server at ${appUrl}. Please run "npm run dev" first.`);
    }

    // 0b. Admin Account Isolation (if corporateEmail is already used by admin, temporarily swap it)
    const { data: existingAdmin } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", corporateEmail)
      .maybeSingle();

    if (existingAdmin) {
      cleanupCtx.tempHoldingUserId = existingAdmin.id;
      const holdingEmail = `connect_held_${timestamp}@vouchins.com`;
      await supabaseAdmin
        .from("users")
        .update({ email: holdingEmail })
        .eq("id", existingAdmin.id);
      console.log(`ℹ Temporarily aliased admin account email to ${holdingEmail} during test run`);
    }

    // Flow 1: Signup & Login
    const t1 = Date.now();
    const { userId, loginCookie } = await runSignupLoginFlow(testEmail, testPassword, testFullName);
    cleanupCtx.testUserId = userId;
    cleanupCtx.testEmail = testEmail;
    stepsSummary.push({ name: "Flow 1: Signup & Login", duration: `${Date.now() - t1}ms`, status: "PASS" });

    // Flow 2: Unverified User Security Gating
    const t2 = Date.now();
    await runUnverifiedGatesFlow(loginCookie);
    stepsSummary.push({ name: "Flow 2: Unverified Gates", duration: `${Date.now() - t2}ms`, status: "PASS" });

    // Flow 3: OTP Verification, Rate Limiting & Account Upgrade
    const t3 = Date.now();
    await runOtpVerificationFlow(userId, corporateEmail, loginCookie);
    stepsSummary.push({ name: "Flow 3: OTP Verification & Rate Limits", duration: `${Date.now() - t3}ms`, status: "PASS" });

    // Flow 4: Feed Pulse, Posts & View Impressions
    const t4 = Date.now();
    const { postId } = await runFeedAndPostsFlow(userId, loginCookie);
    stepsSummary.push({ name: "Flow 4: Feed & Posts", duration: `${Date.now() - t4}ms`, status: "PASS" });

    // Flow 5: Saved Posts (Bookmarks) Workflow
    const t5 = Date.now();
    await runSavedPostsFlow(userId, loginCookie, postId);
    stepsSummary.push({ name: "Flow 5: Saved Posts", duration: `${Date.now() - t5}ms`, status: "PASS" });

    // Flow 6: Jobs Discovery, Impressions & Verified Application
    const t6 = Date.now();
    await runJobsFlow(userId, loginCookie);
    stepsSummary.push({ name: "Flow 6: Jobs & Applications", duration: `${Date.now() - t6}ms`, status: "PASS" });

    // Flow 7: Direct Messaging & Read Receipts
    const t7 = Date.now();
    await runMessagingFlow(userId);
    stepsSummary.push({ name: "Flow 7: Direct Messaging", duration: `${Date.now() - t7}ms`, status: "PASS" });

    // Flow 8: Storage Buckets & File Uploads
    const t8 = Date.now();
    await runFileUploadsFlow(userId);
    stepsSummary.push({ name: "Flow 8: Storage & File Uploads", duration: `${Date.now() - t8}ms`, status: "PASS" });

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n===============================================================");
    console.log(`🎉 ALL 8 E2E FLOWS COMPLETED SUCCESSFULLY in ${totalSeconds}s`);
    console.log("===============================================================");
    console.table(stepsSummary);
  } catch (err: any) {
    console.error("\n❌ E2E SUITE FAILED with error:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await runTeardown(cleanupCtx);
  }
}

main().catch((err) => {
  console.error("Unhandled fatal exception in E2E runner:", err);
  process.exit(1);
});
