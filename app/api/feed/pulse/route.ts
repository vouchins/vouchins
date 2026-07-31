import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/constants";
import type { FeedPulse } from "@/lib/feed/types";
import { createServerSupabase } from "@/lib/supabase/server";

function relationCount(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) return 0;
  const count = (value[0] as { count?: number })?.count;
  return typeof count === "number" ? count : 0;
}

export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Global";
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let postsQuery = supabase
    .from("posts")
    .select("id, category, city, comments(count)")
    .eq("is_removed", false)
    .eq("status", "active")
    .eq("visibility", "all")
    .eq("comments.is_removed", false)
    .gte("created_at", monthAgo)
    .limit(250);

  const blogPostsQuery = supabase
    .from("blog_posts")
    .select("slug, title, excerpt, cover_image_url")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(2);

  if (city !== "All Cities" && city !== "Global") {
    postsQuery = postsQuery.eq("city", city);
  }

  const [postsResult, blogPostsResult] = await Promise.all([
    postsQuery,
    blogPostsQuery,
  ]);

  if (postsResult.error) throw postsResult.error;
  if (blogPostsResult.error) throw blogPostsResult.error;

  const categoryCounts = new Map<string, number>();
  let unansweredCount = 0;
  let awaitingRecommendationsCount = 0;
  for (const post of postsResult.data ?? []) {
    const hasNoReplies = relationCount(post.comments) === 0;
    if (hasNoReplies) unansweredCount += 1;
    if (post.category === "recommendations" && hasNoReplies) {
      awaitingRecommendationsCount += 1;
    }
    categoryCounts.set(
      post.category,
      (categoryCounts.get(post.category) ?? 0) + 1,
    );
  }

  const categoryLabels = new Map<string, string>(
    CATEGORIES.map((category) => [category.value, category.label]),
  );
  const recentPostCount = postsResult.data?.length ?? 0;
  const answeredCount = Math.max(recentPostCount - unansweredCount, 0);
  const pulse: FeedPulse = {
    awaitingRecommendationsCount,
    answeredCount,
    responseRate:
      recentPostCount > 0
        ? Math.round((answeredCount / recentPostCount) * 100)
        : 0,
    trending: Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({
        category,
        label: categoryLabels.get(category) ?? category,
        count,
      })),
    blogPosts: (blogPostsResult.data ?? []).map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      coverImageUrl: post.cover_image_url,
    })),
  };

  return NextResponse.json(pulse, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
