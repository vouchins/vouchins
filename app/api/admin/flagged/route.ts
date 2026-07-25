import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedActions = ["ignore", "remove", "suspend"] as const;
type FlaggedAction = (typeof allowedActions)[number];

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = body?.action as FlaggedAction;
    const postIds = Array.from(
      new Set(
        (Array.isArray(body?.postIds) ? body.postIds : []).filter(
          (id: unknown): id is string => typeof id === "string" && id.length > 0,
        ),
      ),
    ).slice(0, 100);

    if (!allowedActions.includes(action) || postIds.length === 0) {
      return NextResponse.json(
        { error: "A valid action and at least one post are required" },
        { status: 400 },
      );
    }

    if (action === "ignore") {
      const { error } = await supabaseAdmin
        .from("posts")
        .update({ is_flagged: false, flag_reasons: [] })
        .in("id", postIds)
        .eq("is_flagged", true)
        .eq("is_removed", false);

      if (error) throw error;
    }

    if (action === "remove") {
      const { error } = await supabaseAdmin
        .from("posts")
        .update({ is_removed: true })
        .in("id", postIds)
        .eq("is_removed", false);

      if (error) throw error;
    }

    if (action === "suspend") {
      const { data: posts, error: postsError } = await supabaseAdmin
        .from("posts")
        .select("user_id")
        .in("id", postIds);

      if (postsError) throw postsError;

      const userIds = Array.from(
        new Set((posts || []).map((post) => post.user_id).filter(Boolean)),
      );

      if (userIds.length > 0) {
        const { error } = await supabaseAdmin
          .from("users")
          .update({ is_active: false })
          .in("id", userIds)
          .eq("is_admin", false);

        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true, affectedPosts: postIds.length });
  } catch (error: any) {
    console.error("Flagged content moderation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to moderate flagged content" },
      { status: 500 },
    );
  }
}
