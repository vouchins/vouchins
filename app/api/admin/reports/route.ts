import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireActiveAdmin } from "@/lib/admin/auth";

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

async function applyVouchPenalty(params: {
  reportId: string;
  userId: string;
  delta: number;
  reason: string;
  adminId: string;
}) {
  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();

  if (userError) throw userError;
  if (!user) return;

  const { data: previousScoreData, error: scoreError } = await supabaseAdmin.rpc("get_vouch_score", {
    profile_id: params.userId,
  });
  if (scoreError) throw scoreError;
  const previousScore = Number(previousScoreData) || 0;
  const newScore = Math.max(0, previousScore + params.delta);
  const appliedDelta = newScore - previousScore;

  const { error: auditError } = await supabaseAdmin
    .from("vouch_score_adjustments")
    .insert({
      user_id: params.userId,
      admin_id: params.adminId,
      report_id: params.reportId,
      delta: appliedDelta,
      previous_score: previousScore,
      new_score: newScore,
      reason: params.reason,
      source: "report",
    });

  if (auditError) throw auditError;
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

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
      reviewed_by: auth.user.id,
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

      const targetUserId = report.reported_user_id
        || (report.post_id
          ? (await supabaseAdmin.from("posts").select("user_id").eq("id", report.post_id).maybeSingle()).data?.user_id
          : null)
        || (report.comment_id
          ? (await supabaseAdmin.from("comments").select("user_id").eq("id", report.comment_id).maybeSingle()).data?.user_id
          : null);

      if (targetUserId) {
        await applyVouchPenalty({
          reportId: report.id,
          userId: targetUserId,
          delta: -5,
          reason: notes || "Content removed after report review",
          adminId: auth.user.id,
        });
      }
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

      if (!targetUserId || targetUserId === auth.user.id) {
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

      await applyVouchPenalty({
        reportId: report.id,
        userId: targetUserId,
        delta: -10,
        reason: notes || "User suspended after report review",
        adminId: auth.user.id,
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
