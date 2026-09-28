import { getJson, postJson } from "../helpers/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function runJobsFlow(
  userId: string,
  loginCookie: string
): Promise<void> {
  console.log(`\n▶ [FLOW 6] Jobs Discovery, View Impressions & Verified Application`);

  // 1. Fetch available jobs
  const jobsRes = await getJson("/api/jobs", { cookie: loginCookie });
  if (jobsRes.status !== 200 || !Array.isArray(jobsRes.data.jobs)) {
    throw new Error(`Jobs fetch failed (${jobsRes.status}): ${JSON.stringify(jobsRes.data)}`);
  }

  const jobs = jobsRes.data.jobs;
  if (jobs.length === 0) {
    throw new Error("No active jobs found in database to test job flow");
  }

  const targetJob = jobs[0];
  console.log(`  ✓ GET /api/jobs returned 200 OK (${jobs.length} jobs available, targeting: "${targetJob.title}")`);

  // 2. Log Job View Impression
  const viewRes = await postJson("/api/jobs/view", {
    jobId: targetJob.id,
  }, { cookie: loginCookie });

  if (viewRes.status !== 200 || !viewRes.data.success) {
    throw new Error(`Job view logging failed (${viewRes.status}): ${JSON.stringify(viewRes.data)}`);
  }
  console.log(`  ✓ POST /api/jobs/view recorded view impression for job ${targetJob.id}`);

  // Verify impression in job_views table
  const { data: viewRow, error: viewRowErr } = await supabaseAdmin
    .from("job_views")
    .select("id, job_id, user_id")
    .eq("job_id", targetJob.id)
    .eq("user_id", userId)
    .limit(1);

  if (viewRowErr || !viewRow || viewRow.length === 0) {
    throw new Error(`Job view record not found in job_views: ${viewRowErr?.message}`);
  }
  console.log("  ✓ Confirmed job impression persisted in database");

  // 3. Clean up any previous test application for this user and job
  await supabaseAdmin
    .from("job_applications")
    .delete()
    .eq("user_id", userId)
    .eq("job_id", targetJob.id);

  // 4. Apply to Job (Now that user is verified, this MUST succeed)
  const applyRes = await postJson("/api/jobs/apply", {
    jobId: targetJob.id,
    resumeUrl: "https://example.com/e2e-verified-resume.pdf",
    coverLetter: "Automated E2E application from corporate verified user",
  }, { cookie: loginCookie });

  if (applyRes.status !== 200 || !applyRes.data.success) {
    throw new Error(`Job application failed for verified user (${applyRes.status}): ${JSON.stringify(applyRes.data)}`);
  }
  console.log(`  ✓ POST /api/jobs/apply succeeded with 200 OK (Application ID: ${applyRes.data.application?.id})`);

  // 5. Test Duplicate Application Guard (409 Conflict)
  const dupRes = await postJson("/api/jobs/apply", {
    jobId: targetJob.id,
    resumeUrl: "https://example.com/e2e-verified-resume.pdf",
    coverLetter: "Duplicate application attempt",
  }, { cookie: loginCookie });

  if (dupRes.status !== 409 || !dupRes.data.error.includes("already applied")) {
    throw new Error(`Expected 409 Conflict for duplicate application, got ${dupRes.status}: ${JSON.stringify(dupRes.data)}`);
  }
  console.log("  ✓ POST /api/jobs/apply correctly blocked duplicate application with 409 Conflict");
}
