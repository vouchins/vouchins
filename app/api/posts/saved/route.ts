import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "0");
  const limit = 50;
  const from = page * limit;
  const to = from + limit - 1;

  const supabase = await createServerSupabase();

  // 1. Auth Check
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Get user info (for enforcing verified rules like get-posts)
  const { data: userData } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", authUser.id)
    .single();

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 3. Build Query to fetch saved posts with all post relations
  const { data, error } = await supabase
    .from("saved_posts")
    .select(`
      id,
      created_at,
      post:posts (
        *,
        user:users!posts_user_id_fkey!inner(id, full_name, city, avatar_url, vouch_points, is_admin, company_id, company:companies(name, domain)),
        comments(id, text, created_at, user:users!comments_user_id_fkey(id, full_name))
      )
    `)
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Extract the actual posts and filter out any where post might be null (e.g. deleted/removed posts if not cascaded)
  let processedPosts = (data || [])
    .map((item: any) => item.post)
    .filter((post: any) => post && post.is_removed === false);

  // 4. Enforce rules for unverified users
  if (!userData.is_verified) {
    return NextResponse.json({ error: "Forbidden: Verified users only" }, { status: 403 });
  }

  const hasMore = processedPosts.length === limit;

  return NextResponse.json({
    posts: processedPosts,
    hasMore,
  });
}
