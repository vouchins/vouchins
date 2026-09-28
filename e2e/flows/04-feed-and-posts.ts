import { getJson, postJson } from "../helpers/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface FeedAndPostsResult {
  postId: string;
}

export async function runFeedAndPostsFlow(
  userId: string,
  loginCookie: string
): Promise<FeedAndPostsResult> {
  console.log(`\n▶ [FLOW 4] Feed Pulse, Posts & View Impressions`);

  // 1. Fetch Feed Pulse (metrics & summary)
  const pulseRes = await getJson("/api/feed/pulse?city=Global", { cookie: loginCookie });
  if (pulseRes.status !== 200) {
    throw new Error(`Feed pulse failed (${pulseRes.status}): ${JSON.stringify(pulseRes.data)}`);
  }
  console.log("  ✓ GET /api/feed/pulse returned 200 OK with feed metrics");

  // 2. Fetch Feed Posts
  const feedRes = await getJson("/api/posts/get-posts?tab=city&category=all", { cookie: loginCookie });
  if (feedRes.status !== 200 || !Array.isArray(feedRes.data.posts)) {
    throw new Error(`Feed posts fetch failed (${feedRes.status}): ${JSON.stringify(feedRes.data)}`);
  }
  console.log(`  ✓ GET /api/posts/get-posts returned 200 OK (${feedRes.data.posts.length} posts loaded)`);

  // 3. Create a new Post for this verified user
  const postText = `E2E automated test post created at ${new Date().toISOString()}`;
  const { data: createdPost, error: postErr } = await supabaseAdmin
    .from("posts")
    .insert({
      user_id: userId,
      text: postText,
      category: "referrals",
      sub_category: "offering_referral",
      visibility: "all",
      status: "active",
      is_removed: false,
      city: "San Francisco",
    })
    .select("id, text, user_id, category, status")
    .single();

  if (postErr || !createdPost) {
    throw new Error(`Failed to create test post: ${postErr?.message}`);
  }
  console.log(`  ✓ Created test post in database (id: ${createdPost.id})`);

  // 4. Record View Impression via API
  const viewRes = await postJson(
    "/api/posts/views",
    { postIds: [createdPost.id] },
    { cookie: loginCookie }
  );

  if (viewRes.status !== 200 || viewRes.data.recorded < 1) {
    throw new Error(`Failed to record post view (${viewRes.status}): ${JSON.stringify(viewRes.data)}`);
  }
  console.log("  ✓ POST /api/posts/views recorded view impression (recorded: 1)");

  // 5. Verify view logged in post_views table
  const { data: viewRecord, error: viewErr } = await supabaseAdmin
    .from("post_views")
    .select("id, post_id, user_id")
    .eq("post_id", createdPost.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (viewErr || !viewRecord) {
    throw new Error(`View impression record not found in post_views: ${viewErr?.message}`);
  }
  console.log("  ✓ Verified view impression persisted in post_views table");

  return { postId: createdPost.id };
}
