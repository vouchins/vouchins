import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { parseSupportedSource } from "@/lib/content-importer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
  if (body.url !== undefined) {
    try {
      const { url, adapter } = parseSupportedSource(String(body.url));
      updates.url = url.toString();
      updates.adapter = adapter.key;
      updates.cursor = null;
      updates.last_error = null;
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid source URL" }, { status: 400 });
    }
  }
  if (!("enabled" in updates) && !("url" in updates)) return NextResponse.json({ error: "No valid changes supplied" }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("content_import_sources").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "This source already exists" : "Unable to update source" }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  return NextResponse.json({ source: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const { error } = await supabaseAdmin.from("content_import_sources").delete().eq("id", id);
  return error ? NextResponse.json({ error: "Unable to remove source" }, { status: 500 }) : NextResponse.json({ ok: true });
}
