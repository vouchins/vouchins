import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: comment, error: findError } = await supabaseAdmin
    .from("comments")
    .select("id, user_id, is_removed")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!comment || comment.is_removed) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }
  if (comment.user_id !== auth.user.id) {
    return NextResponse.json({ error: "You can only delete your own reply" }, { status: 403 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("comments")
    .update({ is_removed: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
