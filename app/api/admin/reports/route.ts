import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedActions = [
  "mark_reviewed",
  "dismiss",
  "remove_content",
  "suspend_user",
] as const;
type ModerationAction = (typeof allowedActions)[number];

async function resolveTargetReports(
  report: {
    post_id: string | null;
    comment_id: string | null;
    reported_user_id: string | null;
  },
  updates: Record<string, unknown>,
) {
  let query = supabaseAdmin.from("reports").update(updates).eq("status", "pending");

  if (report.post_id) query = query.eq("post_id", report.post_id);
  if (report.comment_id) query = query.eq("comment_id", report.comment_id);
  if (report.reported_user_id) {
    query = query.eq("reported_user_id", report.reported_user_id);
  }

  const { error } = await query;
  if (error) throw error;
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

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const reportId = typeof body?.reportId === "string" ? body.reportId : "";
    const action = body?.action as ModerationAction;
    const notes =
      typeof body?.notes === "string" ? body.notes.trim().slice(0, 1000) : null;

    if (!reportId || !allowedActions.includes(action)) {
      return NextResponse.json(
        { error: "A valid report and moderation action are required" },
        { status: 400 },
      );
    }

    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("id, status, post_id, comment_id, reported_user_id")
      .eq("id", reportId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (report.status !== "pending") {
      return NextResponse.json(
        { error: "This report has already been resolved" },
        { status: 409 },
      );
    }

    const resolvedAt = new Date().toISOString();
    const baseResolution = {
      reviewed_by: user.id,
      reviewed_at: resolvedAt,
      resolution_notes: notes,
    };

    if (action === "mark_reviewed") {
      await resolveTargetReports(report, {
        ...baseResolution,
        status: "reviewed",
        resolution_action: "none",
      });
    }

    if (action === "dismiss") {
      await resolveTargetReports(report, {
        ...baseResolution,
        status: "dismissed",
        resolution_action: "dismissed",
      });
    }

    if (action === "remove_content") {
      if (report.post_id) {
        const { error } = await supabaseAdmin
          .from("posts")
          .update({ is_removed: true })
          .eq("id", report.post_id);
        if (error) throw error;
      } else if (report.comment_id) {
        const { error } = await supabaseAdmin
          .from("comments")
          .update({ is_removed: true })
          .eq("id", report.comment_id);
        if (error) throw error;
      } else {
        return NextResponse.json(
          { error: "User reports do not contain removable content" },
          { status: 400 },
        );
      }

      await resolveTargetReports(report, {
        ...baseResolution,
        status: "reviewed",
        resolution_action: "content_removed",
      });
    }

    if (action === "suspend_user") {
      let targetUserId = report.reported_user_id;

      if (!targetUserId && report.post_id) {
        const { data: post } = await supabaseAdmin
          .from("posts")
          .select("user_id")
          .eq("id", report.post_id)
          .maybeSingle();
        targetUserId = post?.user_id || null;
      }

      if (!targetUserId && report.comment_id) {
        const { data: comment } = await supabaseAdmin
          .from("comments")
          .select("user_id")
          .eq("id", report.comment_id)
          .maybeSingle();
        targetUserId = comment?.user_id || null;
      }

      if (!targetUserId || targetUserId === user.id) {
        return NextResponse.json(
          { error: "The target user cannot be suspended" },
          { status: 400 },
        );
      }

      const { data: suspendedUser, error } = await supabaseAdmin
        .from("users")
        .update({ is_active: false })
        .eq("id", targetUserId)
        .eq("is_admin", false)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!suspendedUser) {
        return NextResponse.json(
          { error: "Administrators cannot be suspended" },
          { status: 400 },
        );
      }

      await resolveTargetReports(report, {
        ...baseResolution,
        status: "reviewed",
        resolution_action: "user_suspended",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Report moderation failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to moderate report" },
      { status: 500 },
    );
  }
}
