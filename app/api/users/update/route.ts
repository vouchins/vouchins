import { NextResponse } from 'next/server';
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = new Set([
  "full_name", "avatar_url", "linkedin_url", "phone_number", "bio",
  "city", "personal_email", "pref_email_messages", "pref_email_comments",
  "pref_email_digest",
]);

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const userId = body?.userId ?? user.id;
  const updates = body?.updates;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    return NextResponse.json({ error: "Invalid updates" }, { status: 400 });
  }
  const invalid = Object.keys(updates).filter((field) => !ALLOWED_FIELDS.has(field));
  if (invalid.length) {
    return NextResponse.json({ error: `Fields cannot be updated: ${invalid.join(", ")}` }, { status: 400 });
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates supplied" }, { status: 400 });
  }
  const { data: actor } = await supabaseAdmin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  if (userId !== user.id && !actor?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select("id, full_name, avatar_url, linkedin_url, phone_number, bio, city, personal_email, pref_email_messages, pref_email_comments, pref_email_digest");

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }

  const updatedUser = data?.[0] ?? null;

  return NextResponse.json(
    { success: true, user: updatedUser },
    { status: 200 }
  );
}
