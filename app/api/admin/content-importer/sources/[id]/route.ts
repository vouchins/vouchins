import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid enabled state" }, { status: 400 });
  const { error } = await supabaseAdmin.from("content_import_sources").update({ enabled: body.enabled, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? NextResponse.json({ error: "Unable to update source" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const { error } = await supabaseAdmin.from("content_import_sources").delete().eq("id", id);
  return error ? NextResponse.json({ error: "Unable to remove source" }, { status: 500 }) : NextResponse.json({ ok: true });
}
