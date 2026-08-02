import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED = ["full_name", "personal_email", "linkedin_url", "is_active", "is_verified", "onboarded", "company_id", "is_marketing_manager"] as const;
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: actor } = await supabaseAdmin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (!actor?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, updates } = await request.json(); const safe: Record<string, unknown> = {};
  for (const field of ALLOWED) if (field in (updates || {})) safe[field] = updates[field];
  const { data, error } = await supabaseAdmin.from("users").update(safe).eq("id", userId).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return data ? NextResponse.json({ success: true, user: data }) : NextResponse.json({ error: "User not found" }, { status: 404 });
}
