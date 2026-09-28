import { getJson, postJson } from "../helpers/client";

export async function runUnverifiedGatesFlow(loginCookie: string): Promise<void> {
  console.log(`\n▶ [FLOW 2] Unverified User Security Gating`);

  // 1. Saved Posts must be restricted for unverified users
  const savedRes = await getJson("/api/posts/saved", { cookie: loginCookie });
  if (savedRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unverified /api/posts/saved, got ${savedRes.status}: ${JSON.stringify(savedRes.data)}`);
  }
  console.log("  ✓ GET /api/posts/saved correctly rejected unverified user with 403 Forbidden");

  // 2. Job Application must be restricted for unverified users
  const applyRes = await postJson("/api/jobs/apply", {
    jobId: "6f9fc1ea-ec5b-4cbc-9022-92c208cbf27e",
    resumeUrl: "https://example.com/resume.pdf",
    coverLetter: "Unverified application attempt",
  }, { cookie: loginCookie });

  if (applyRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unverified /api/jobs/apply, got ${applyRes.status}: ${JSON.stringify(applyRes.data)}`);
  }
  console.log("  ✓ POST /api/jobs/apply correctly rejected unverified user with 403 Forbidden");
}
