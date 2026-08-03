import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const text = String(body.text ?? "").replace(/<[^>]*>/g, "").trim();
  if (!text || text.length > 10000) return NextResponse.json({ error: "Post text must be between 1 and 10,000 characters" }, { status: 400 });
  const { data: item } = await supabaseAdmin.from("content_import_items").select("accommodation_type").eq("id", id).maybeSingle();
  if (!item) return NextResponse.json({ error: "Imported item not found" }, { status: 404 });
  const shared = /shared|private room|roommate|flatmate|pg/i.test(item.accommodation_type ?? "");
  const { data, error } = await supabaseAdmin.rpc("accept_content_import_item", {
    p_item_id: id, p_admin_id: auth.user.id, p_text: text, p_sub_category: shared ? "flatmates" : "rentals",
  });
  if (error) {
    console.error("Content importer publish failed", { itemId: id, error });
    await supabaseAdmin.from("content_import_items").update({ status: "publish_failed", publish_error: "Publication failed. You can retry.", updated_at: new Date().toISOString() }).eq("id", id).in("status", ["pending", "publish_failed"]);
    return NextResponse.json({ error: "Publication failed. You can retry." }, { status: 500 });
  }
  return NextResponse.json({ postId: data });
}
