import { getJson } from "../helpers/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function runSavedPostsFlow(
  userId: string,
  loginCookie: string,
  postId: string
): Promise<void> {
  console.log(`\n▶ [FLOW 5] Saved Posts (Bookmarks) Workflow`);

  // 1. Bookmark the post in saved_posts
  const { error: saveErr } = await supabaseAdmin
    .from("saved_posts")
    .insert({
      user_id: userId,
      post_id: postId,
    });

  if (saveErr) {
    throw new Error(`Failed to save post in database: ${saveErr.message}`);
  }
  console.log(`  ✓ Saved post ${postId} for verified user`);

  // 2. Fetch Saved Posts via API (User is now verified, must return 200 OK)
  const savedRes = await getJson("/api/posts/saved", { cookie: loginCookie });

  if (savedRes.status !== 200) {
    throw new Error(`Expected 200 OK for verified user saved posts, got ${savedRes.status}: ${JSON.stringify(savedRes.data)}`);
  }

  const savedPosts = savedRes.data.posts || [];
  const foundSaved = savedPosts.some((p: any) => p && p.id === postId);

  if (!foundSaved) {
    throw new Error(`Saved post ${postId} not found in /api/posts/saved response: ${JSON.stringify(savedPosts)}`);
  }
  console.log(`  ✓ GET /api/posts/saved returned 200 OK and confirmed post is present in saved list`);

  // 3. Unsave the post (delete bookmark)
  const { error: unsaveErr } = await supabaseAdmin
    .from("saved_posts")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);

  if (unsaveErr) {
    throw new Error(`Failed to unsave post in database: ${unsaveErr.message}`);
  }
  console.log(`  ✓ Removed post ${postId} from bookmarks`);

  // 4. Verify post is no longer in saved list
  const refreshedRes = await getJson("/api/posts/saved", { cookie: loginCookie });
  const refreshedSaved = refreshedRes.data.posts || [];
  const stillFound = refreshedSaved.some((p: any) => p && p.id === postId);

  if (stillFound) {
    throw new Error(`Post ${postId} still found in saved list after deletion!`);
  }
  console.log("  ✓ Verified post is no longer returned in GET /api/posts/saved");
}
