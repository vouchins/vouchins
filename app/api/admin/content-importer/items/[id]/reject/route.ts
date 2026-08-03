import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const reason = String(body.reason ?? "").trim().slice(0, 1000) || null;
  const { data, error } = await supabaseAdmin.from("content_import_items").update({
    status: "rejected", rejection_reason: reason, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(), publish_error: null, updated_at: new Date().toISOString(),
  }).eq("id", id).in("status", ["pending", "publish_failed"]).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to reject item" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item is no longer reviewable" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
