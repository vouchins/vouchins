import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const status = request.nextUrl.searchParams.get("status") ?? "pending";
  const source = request.nextUrl.searchParams.get("source");
  if (!["pending", "accepted", "rejected", "publish_failed"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  let query = supabaseAdmin.from("content_import_items").select("*, source:content_import_sources(id,name)").eq("status", status).order("source_published_at", { ascending: false, nullsFirst: false }).order("imported_at", { ascending: false }).limit(200);
  if (source) query = query.eq("source_id", source);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: "Unable to load imported content" }, { status: 500 }) : NextResponse.json({ items: data });
}
