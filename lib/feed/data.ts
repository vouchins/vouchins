import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedCursor, FeedFilters, FeedPageData, FeedPost, FeedUser } from "@/lib/feed/types";

export const INITIAL_FEED_LIMIT = 10;
export const NEXT_FEED_LIMIT = 15;

const POST_SELECT = `
  id, user_id, text, category, sub_category, visibility, image_urls,
  is_flagged, flag_reasons, created_at, updated_at, status,
  user:users!posts_user_id_fkey!inner(
    id, full_name, city, avatar_url, vouch_points, is_admin, is_verified,
    company_id, company:companies(id, name, domain)
  ),
  comments(count), vouches(count), saved_posts(count), post_views(count)
`;

function relationCount(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) return 0;
  const count = (value[0] as { count?: number })?.count;
  return typeof count === "number" ? count : 0;
}

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeFeedCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return typeof parsed.createdAt === "string" && typeof parsed.id === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export async function getFeedUser(supabase: SupabaseClient, userId: string): Promise<FeedUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select(`id, full_name, email, city, avatar_url, vouch_points, is_admin, is_verified, onboarded, company_id, linkedin_url, phone_number, company:companies(id, name, domain)`)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const company = Array.isArray(data.company) ? data.company[0] ?? null : data.company;
  return {
    ...data,
    city: data.city || "All Cities",
    vouch_points: data.vouch_points || 0,
    company: company || { name: "Your Workplace", domain: "" },
    is_profile_complete: Boolean(data.is_verified && data.avatar_url && data.linkedin_url && data.phone_number),
    profile_completion_percentage:
      ([data.is_verified, data.avatar_url, data.linkedin_url, data.phone_number].filter(Boolean).length / 4) * 100,
  } as FeedUser;
}

export async function getFeedPage(
  supabase: SupabaseClient,
  viewer: FeedUser,
  filters: FeedFilters,
): Promise<FeedPageData> {
  const limit = Math.min(Math.max(filters.limit ?? NEXT_FEED_LIMIT, 1), 25);
  if (filters.tab === "company" && !viewer.is_verified) {
    return { posts: [], hasMore: false, nextCursor: null };
  }

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_removed", false)
    .eq("comments.is_removed", false);
  if (filters.city !== "All Cities" && filters.city !== "Global") {
    query = query.eq("user.city", filters.city);
  }
  if (filters.tab === "company") {
    query = query.eq("visibility", "company").eq("user.company_id", viewer.company_id);
  } else {
    query = query.eq("visibility", "all");
  }
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.subCategory !== "all") query = query.eq("sub_category", filters.subCategory);
  if (filters.search.trim()) {
    query = query.textSearch("text", filters.search.trim(), { config: "english", type: "websearch" });
  }
  if (filters.cursor) {
    query = query.or(`created_at.lt.${filters.cursor.createdAt},and(created_at.eq.${filters.cursor.createdAt},id.lt.${filters.cursor.id})`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (error) throw error;

  const hasMore = (data?.length ?? 0) > limit;
  const rows = (data ?? []).slice(0, limit) as unknown as Array<Record<string, unknown>>;
  const posts = rows.map((row) => {
    const rawText = typeof row.text === "string" ? row.text : "";
    const rawAuthor = (Array.isArray(row.user) ? row.user[0] : row.user) as Record<string, unknown>;
    const rawCompany = Array.isArray(rawAuthor.company) ? rawAuthor.company[0] : rawAuthor.company;
    const author = {
      ...rawAuthor,
      city: rawAuthor.city || "All Cities",
      company: rawCompany || { name: "Independent", domain: "" },
    };
    return {
      ...row,
      user: author,
      text: !viewer.is_verified && !(author as { is_admin?: boolean })?.is_admin
        ? `${rawText.slice(0, 150)}${rawText.length > 150 ? "..." : ""}`
        : rawText,
      comment_count: relationCount(row.comments),
      vouch_count: relationCount(row.vouches),
      save_count: relationCount(row.saved_posts),
      view_count: relationCount(row.post_views),
      comments: [],
    } as unknown as FeedPost;
  });

  const lastPost = posts.at(-1);
  return {
    posts,
    hasMore,
    nextCursor: hasMore && lastPost
      ? encodeCursor({ createdAt: lastPost.created_at, id: lastPost.id })
      : null,
  };
}
