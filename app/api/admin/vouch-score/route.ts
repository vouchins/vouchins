import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function getCurrentScore(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("get_vouch_score", {
    profile_id: userId,
  });
  if (error) throw error;
  return Number(data) || 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(1000, value));
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const delta = Number(body?.delta);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const source = body?.source === "report" ? "report" : "manual";
    const reportId = typeof body?.reportId === "string" ? body.reportId.trim() : null;

    if (!userId || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 500) {
      return NextResponse.json(
        { error: "A valid user and score change are required" },
        { status: 400 },
      );
    }

    if (source === "report" && !reportId) {
      return NextResponse.json(
        { error: "A report is required for report-based score changes" },
        { status: 400 },
      );
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousScore = await getCurrentScore(userId);
    const newScore = clampScore(previousScore + delta);
    const appliedDelta = newScore - previousScore;

    const { error: auditError } = await supabaseAdmin.from("vouch_score_adjustments").insert({
      user_id: userId,
      admin_id: auth.user.id,
      report_id: reportId,
      delta: appliedDelta,
      previous_score: previousScore,
      new_score: newScore,
      reason: reason || null,
      source,
    });

    if (auditError) throw auditError;

    return NextResponse.json({
      success: true,
      userId,
      previousScore,
      newScore,
      delta: appliedDelta,
    });
  } catch (error: any) {
    console.error("Vouch score adjustment failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to update vouch score" },
      { status: 500 },
    );
  }
}
