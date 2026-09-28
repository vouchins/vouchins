import { supabaseAdmin } from "@/lib/supabase/admin";
import { clearAllRateLimits } from "@/lib/rate-limit";

export interface CleanupContext {
  testUserId?: string;
  testEmail?: string;
  corporateEmail?: string;
  tempHoldingUserId?: string;
}

export async function runTeardown(ctx: CleanupContext): Promise<void> {
  console.log("\n🧹 Running teardown and cleaning all test data from database...");
  clearAllRateLimits();

  // 1. Restore admin email if swapped
  if (ctx.tempHoldingUserId && ctx.corporateEmail) {
    try {
      await supabaseAdmin
        .from("users")
        .update({ email: ctx.corporateEmail })
        .eq("id", ctx.tempHoldingUserId);
      console.log(`  ✓ Restored primary email on admin account (${ctx.corporateEmail})`);
    } catch (e) {
      console.error("  ⚠ Failed to restore admin holding account:", e);
    }
  }

  // 2. Clean OTPs & IP rate limits
  if (ctx.corporateEmail) {
    try {
      await supabaseAdmin.from("email_otps").delete().eq("email", ctx.corporateEmail);
      console.log(`  ✓ Purged any test OTP rows for ${ctx.corporateEmail}`);
    } catch (e) {
      console.error("  ⚠ Failed to purge OTP rows:", e);
    }
  }

  // 3. Clean test user artifacts
  if (ctx.testUserId) {
    try {
      await supabaseAdmin.from("job_applications").delete().eq("user_id", ctx.testUserId);
      await supabaseAdmin.from("job_views").delete().eq("user_id", ctx.testUserId);
      await supabaseAdmin.from("saved_posts").delete().eq("user_id", ctx.testUserId);
      await supabaseAdmin.from("post_views").delete().eq("user_id", ctx.testUserId);
      await supabaseAdmin.from("messages").delete().or(`sender_id.eq.${ctx.testUserId},receiver_id.eq.${ctx.testUserId}`);
      await supabaseAdmin.from("posts").delete().eq("user_id", ctx.testUserId);
      console.log("  ✓ Purged test user jobs, saves, views, messages, and posts");

      await supabaseAdmin.from("users").delete().eq("id", ctx.testUserId);
      await supabaseAdmin.auth.admin.deleteUser(ctx.testUserId);
      console.log(`  ✓ Purged test user (${ctx.testUserId}) from users and auth.users`);
    } catch (e) {
      console.error("  ⚠ Failed to clean test user artifacts:", e);
    }
  }
}
