import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API Gateway endpoint for user bootstrap & auxiliary state.
 * Consolidates unread messages count, vouched post/comment IDs, and saved post IDs
 * into a single fast server-side query instead of multiple direct browser REST calls to Supabase.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    let authUser = null;

    // 1. Try Bearer token from authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        authUser = data.user;
      }
    }

    // 2. Try cookie session
    if (!authUser) {
      const {
        data: { user: cookieUser },
        error,
      } = await supabase.auth.getUser();
      if (!error && cookieUser) {
        authUser = cookieUser;
      }
    }

    // 3. Fallback for local development or explicit userId param if matching session
    const { searchParams } = new URL(request.url);
    const paramUserId = searchParams.get("userId");

    const isDevelopment = process.env.NODE_ENV === "development";
    if (!authUser && isDevelopment && paramUserId) {
      authUser = { id: paramUserId } as any;
    }

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    // Execute queries in parallel on the server
    const [messagesResult, vouchesResult, savedResult] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("is_read", false),
      supabaseAdmin
        .from("vouches")
        .select("post_id, comment_id")
        .eq("vouching_user_id", userId),
      supabaseAdmin
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", userId),
    ]);

    // Format vouched entities lookup map
    const vouchedEntities: Record<string, boolean> = {};
    if (vouchesResult.data) {
      vouchesResult.data.forEach((v: { post_id?: string | null; comment_id?: string | null }) => {
        if (v.post_id) vouchedEntities[`post_${v.post_id}`] = true;
        if (v.comment_id) vouchedEntities[`comment_${v.comment_id}`] = true;
      });
    }

    // Format saved post IDs array
    const savedPostIds: string[] = [];
    if (savedResult.data) {
      savedResult.data.forEach((item: { post_id: string }) => {
        if (item.post_id) savedPostIds.push(item.post_id);
      });
    }

    // Fire-and-forget last_seen activity timestamp update
    void supabaseAdmin
      .from("users")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({
      unreadCount: messagesResult.count ?? 0,
      vouchedEntities,
      savedPostIds,
    });
  } catch (err: any) {
    console.error("User auxiliary API gateway error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch user auxiliary state" },
      { status: 500 }
    );
  }
}

