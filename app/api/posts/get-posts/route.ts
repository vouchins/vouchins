import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cookieStore = await cookies();
  // 1. Initialize the Server Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 1. Get query parameters
  const tab = searchParams.get("tab") || "city";
  const category = searchParams.get("category") || "all";
  const subCategory = searchParams.get("subCategory") || "all";
  const page = parseInt(searchParams.get("page") || "0");
  const queryStr = searchParams.get("query") || "";
  const limit = 50;
  const from = page * limit;
  const to = from + limit - 1;

  // 2. Auth Check
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 3. Get detailed user info for filtering
  const { data: userData } = await supabase
    .from("users")
    .select("city, company_id, is_verified")
    .eq("id", authUser.id)
    .single();

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // 4. Build Query
  let query = supabase
    .from("posts")
    .select(`
      *,
      user:users!posts_user_id_fkey!inner(id, first_name, city, is_admin, company_id, company:companies(name, domain)),
      comments(id, text, created_at, user:users!comments_user_id_fkey(id, first_name))
    `)
    .eq("is_removed", false)
    .eq("user.city", userData.city);

  // Tab logic
  if (tab === "company") {
    if (!userData.is_verified) {
      return NextResponse.json({ posts: [], hasMore: false });
    }
    query = query
      .eq("visibility", "company")
      .eq("user.company_id", userData.company_id);
  } else {
    query = query.eq("visibility", "all");
  }

  // Filters
  if (category !== "all") query = query.eq("category", category);
  if (subCategory !== "all") query = query.eq("sub_category", subCategory);
  if (queryStr.trim()) query = query.textSearch("text", queryStr);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processedPosts = data || [];

  // Trim content for unverified users to enforce the "Circle of Trust" at the network level
  if (!userData.is_verified) {
    processedPosts = processedPosts.map((post: any) => ({
      ...post,
      text: post.text && post.text.length > 150 ? post.text.substring(0, 150) + "..." : post.text,
      comments: [], // Hide comments from unverified users
    }));
  }

  return NextResponse.json({
    posts: processedPosts,
    hasMore: (data || []).length === limit,
  });
}