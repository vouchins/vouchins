import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED = [
  "full_name",
  "personal_email",
  "linkedin_url",
  "is_active",
  "is_verified",
  "onboarded",
  "company_id",
  "is_marketing_manager",
  "city",
] as const;

export async function POST(request: Request) {
  const auth = await requireActiveAdmin();
  if (auth.response) return auth.response;

  const { userId, updates } = await request.json();
  const safe: Record<string, unknown> = {};

  for (const field of ALLOWED) {
    if (field in (updates || {})) safe[field] = updates[field];
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update(safe)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return data
    ? NextResponse.json({ success: true, user: data })
    : NextResponse.json({ error: "User not found" }, { status: 404 });
}
