import { supabaseAdmin } from "@/lib/supabase/admin";

export async function runFileUploadsFlow(userId: string): Promise<void> {
  console.log(`\n▶ [FLOW 8] Storage Buckets & File Uploads Flow`);

  const createdPaths: { bucket: string; path: string }[] = [];

  try {
    // 1. Post Images Upload (Public Bucket)
    const postImageName = `e2e-post-${Date.now()}.png`;
    const dummyPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );

    const { error: postImgErr } = await supabaseAdmin.storage
      .from("post-images")
      .upload(postImageName, dummyPng, { contentType: "image/png" });

    if (postImgErr) {
      throw new Error(`Failed to upload to post-images: ${postImgErr.message}`);
    }
    createdPaths.push({ bucket: "post-images", path: postImageName });

    const { data: postImgUrl } = supabaseAdmin.storage
      .from("post-images")
      .getPublicUrl(postImageName);

    if (!postImgUrl.publicUrl) {
      throw new Error("Failed to retrieve public URL for post-images");
    }
    console.log("  ✓ post-images: Uploaded image and generated public URL");

    // 2. Avatar Upload (Public Bucket, 5MB limit)
    const avatarPath = `public/${userId}-${Date.now()}.png`;
    const { error: avatarErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(avatarPath, dummyPng, { contentType: "image/png" });

    if (avatarErr) {
      throw new Error(`Failed to upload avatar: ${avatarErr.message}`);
    }
    createdPaths.push({ bucket: "avatars", path: avatarPath });

    const { data: avatarUrl } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(avatarPath);

    if (!avatarUrl.publicUrl) {
      throw new Error("Failed to retrieve public URL for avatars");
    }
    console.log("  ✓ avatars: Uploaded profile avatar and generated public URL");

    // 3. Resume Upload (Private Bucket, User Folder RLS, 5MB limit, PDF/DOCX)
    const resumePath = `${userId}/e2e-resume-${Date.now()}.pdf`;
    const dummyPdf = Buffer.from("%PDF-1.4 E2E Test Resume %%EOF");

    const { error: resumeErr } = await supabaseAdmin.storage
      .from("resumes")
      .upload(resumePath, dummyPdf, { contentType: "application/pdf" });

    if (resumeErr) {
      throw new Error(`Failed to upload resume: ${resumeErr.message}`);
    }
    createdPaths.push({ bucket: "resumes", path: resumePath });

    const { data: signedResume, error: signErr } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(resumePath, 60);

    if (signErr || !signedResume?.signedUrl) {
      throw new Error(`Failed to create signed URL for private resume: ${signErr?.message}`);
    }
    console.log("  ✓ resumes: Uploaded private PDF and generated authenticated signed URL");

    // 4. Verification Document Upload (Private Bucket)
    const docPath = `${userId}-id-card-${Date.now()}.png`;
    const { error: docErr } = await supabaseAdmin.storage
      .from("verification-docs")
      .upload(docPath, dummyPng, { contentType: "image/png" });

    if (docErr) {
      throw new Error(`Failed to upload verification document: ${docErr.message}`);
    }
    createdPaths.push({ bucket: "verification-docs", path: docPath });

    const { data: signedDoc, error: docSignErr } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(docPath, 60);

    if (docSignErr || !signedDoc?.signedUrl) {
      throw new Error(`Failed to create signed URL for verification doc: ${docSignErr?.message}`);
    }
    console.log("  ✓ verification-docs: Uploaded ID document and verified private signed access");
  } finally {
    // Clean up all uploaded test assets
    for (const item of createdPaths) {
      try {
        await supabaseAdmin.storage.from(item.bucket).remove([item.path]);
      } catch (e) {
        console.warn(`  ⚠ Failed to delete test storage asset ${item.path}:`, e);
      }
    }
  }
}
