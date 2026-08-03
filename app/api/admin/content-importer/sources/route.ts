import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { parseSupportedSource } from "@/lib/content-importer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { data, error } = await supabaseAdmin.from("content_import_sources").select("*").order("created_at");
  return error
    ? NextResponse.json({ error: "Unable to load sources" }, { status: 500, headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ sources: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name || name.length > 100) return NextResponse.json({ error: "Enter a source name" }, { status: 400 });
    const { url, adapter } = parseSupportedSource(String(body.url ?? ""));
    const { data, error } = await supabaseAdmin.from("content_import_sources").insert({
      name, url: url.toString(), adapter: adapter.key, created_by: auth.user.id,
    }).select().single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "This source already exists" : "Unable to add source" }, { status: 400 });
    return NextResponse.json({ source: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid source" }, { status: 400 });
  }
}
