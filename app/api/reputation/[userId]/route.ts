import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const DISCLAIMER =
  "Verification and reputation are not background, financial, or safety guarantees.";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await context.params;
  const [{ data: flag }, { data: viewer }, { data: reputation }, { data: legacy, error: legacyError }] =
    await Promise.all([
      supabaseAdmin.from("feature_flags").select("enabled, internal_only").eq("key", "reputation_display").maybeSingle(),
      supabaseAdmin.from("users").select("is_admin").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("user_reputation").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.rpc("get_unified_legacy_score", { p_user_id: userId }),
    ]);

  const preview = Boolean(flag?.enabled && (!flag.internal_only || viewer?.is_admin));
  if (!preview || !reputation) {
    if (legacyError) return NextResponse.json({ error: "Reputation unavailable" }, { status: 500 });
    return NextResponse.json({
      level: "legacy",
      total_score: Number(legacy ?? 0),
      components: null,
      distinct_endorser_count: null,
      confirmed_outcome_count: null,
      scoring_version: 0,
      calculated_at: null,
      preview: false,
      disclaimer: DISCLAIMER,
    });
  }

  return NextResponse.json({
    level: reputation.level,
    total_score: reputation.total_score,
    components: {
      independent_confidence: reputation.independent_confidence_score,
      outcomes: reputation.outcome_score,
      contribution: reputation.contribution_score,
    },
    distinct_endorser_count: reputation.distinct_endorser_count,
    confirmed_outcome_count: reputation.confirmed_outcome_count,
    scoring_version: reputation.scoring_version,
    calculated_at: reputation.calculated_at,
    preview: true,
    disclaimer: DISCLAIMER,
  });
}
