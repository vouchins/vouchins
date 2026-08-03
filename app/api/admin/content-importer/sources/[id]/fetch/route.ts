import { NextRequest, NextResponse } from "next/server";
import { contentFingerprint, normalizeExternalUrl, parseSupportedSource } from "@/lib/content-importer";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import type { ImportMode } from "@/lib/content-importer/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const { mode } = await request.json() as { mode: ImportMode };
  if (!["initial", "latest", "more"].includes(mode)) return NextResponse.json({ error: "Invalid fetch mode" }, { status: 400 });
  const { data: source } = await supabaseAdmin.from("content_import_sources").select("*").eq("id", id).maybeSingle();
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (!source.enabled) return NextResponse.json({ error: "Enable this source before fetching" }, { status: 400 });
  const attemptedAt = new Date().toISOString();
  try {
    const { url, adapter } = parseSupportedSource(source.url);
    if (adapter.key !== source.adapter) throw new Error("Source adapter mismatch");
    const result = await adapter.fetch(url, mode, source.cursor);
    const rows = await Promise.all(result.items.map(async (item) => ({
      source_id: source.id, external_id: item.externalId, source_listing_url: item.sourceListingUrl,
      original_url: normalizeExternalUrl(item.originalUrl), title: item.title, summary: item.summary,
      location: item.location, city: item.city, price_min: item.priceMin, price_max: item.priceMax,
      currency: item.currency, media_urls: item.mediaUrls.filter((value) => /^https:\/\//i.test(value)).slice(0, 10),
      accommodation_type: item.accommodationType, furnishing: item.furnishing, bhk: item.bhk,
      source_published_at: item.publishedAt, source_payload: item.raw, content_fingerprint: contentFingerprint(item),
    })));
    let inserted = 0;
    for (const row of rows) {
      const { error } = await supabaseAdmin.from("content_import_items").insert(row);
      if (!error) inserted += 1;
      else if (error.code !== "23505") throw error;
    }
    await supabaseAdmin.from("content_import_sources").update({ cursor: result.cursor, last_fetched_at: attemptedAt, last_success_at: attemptedAt, last_error: null, updated_at: attemptedAt }).eq("id", id);
    return NextResponse.json({ fetched: rows.length, inserted });
  } catch (error) {
    console.error("Content importer fetch failed", { sourceId: id, error });
    await supabaseAdmin.from("content_import_sources").update({ last_fetched_at: attemptedAt, last_error: "The source could not be fetched", updated_at: attemptedAt }).eq("id", id);
    return NextResponse.json({ error: "The source could not be fetched. Try again later." }, { status: 502 });
  }
}
