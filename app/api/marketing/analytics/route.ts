import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getMarketingPrincipal } from "@/lib/marketing/auth";

export async function GET(request: Request) {
  const principal = await getMarketingPrincipal();
  if (!principal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const requested = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = Math.min(Math.max(Number.isFinite(requested) ? requested : 30, 7), 90);
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("get_marketing_blog_analytics", { p_author_id: principal.id, p_days: days });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ blog: data });
}
