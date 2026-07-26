import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const targetColumns = {
  post: "post_id",
  comment: "comment_id",
  user: "reported_user_id",
} as const;

type ReportTargetType = keyof typeof targetColumns;

function isTargetType(value: unknown): value is ReportTargetType {
  return typeof value === "string" && value in targetColumns;
}

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

    const body = await request.json().catch(() => ({}));
    const targetType = body?.targetType;
    const targetId =
      typeof body?.targetId === "string" ? body.targetId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!isTargetType(targetType) || !targetId) {
      return NextResponse.json(
        { error: "A valid report target is required" },
        { status: 400 },
      );
    }

    if (reason.length < 3 || reason.length > 500) {
      return NextResponse.json(
        { error: "Reason must be between 3 and 500 characters" },
        { status: 400 },
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentReports } = await supabaseAdmin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((recentReports || 0) >= 10) {
      return NextResponse.json(
        { error: "Too many reports submitted. Please try again later." },
        { status: 429 },
      );
    }

    let targetOwnerId: string;

    if (targetType === "post") {
      const { data: post } = await supabaseAdmin
        .from("posts")
        .select("id, user_id, is_removed")
        .eq("id", targetId)
        .maybeSingle();

      if (!post || post.is_removed) {
        return NextResponse.json(
          { error: "This post is no longer available" },
          { status: 404 },
        );
      }
      targetOwnerId = post.user_id;
    } else if (targetType === "comment") {
      const { data: comment } = await supabaseAdmin
        .from("comments")
        .select("id, user_id, is_removed")
        .eq("id", targetId)
        .maybeSingle();

      if (!comment || comment.is_removed) {
        return NextResponse.json(
          { error: "This comment is no longer available" },
          { status: 404 },
        );
      }
      targetOwnerId = comment.user_id;
    } else {
      const { data: reportedUser } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();

      if (!reportedUser) {
        return NextResponse.json(
          { error: "This user is no longer available" },
          { status: 404 },
        );
      }
      targetOwnerId = reportedUser.id;
    }

    if (targetOwnerId === user.id) {
      return NextResponse.json(
        { error: `You cannot report your own ${targetType}` },
        { status: 400 },
      );
    }

    const report = {
      reporter_id: user.id,
      post_id: targetType === "post" ? targetId : null,
      comment_id: targetType === "comment" ? targetId : null,
      reported_user_id: targetType === "user" ? targetId : null,
      reason,
    };

    const { error } = await supabaseAdmin.from("reports").insert(report);

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: `You already have a pending report for this ${targetType}` },
        { status: 409 },
      );
    }
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("Report submission failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to submit report" },
      { status: 500 },
    );
  }
}
