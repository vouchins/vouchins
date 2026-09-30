import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { parseExcelRows } from "@/lib/content-importer/excel";
import { contentFingerprint } from "@/lib/content-importer";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXCEL_SOURCE_URL = "https://vouchins.com/bulk-excel-import";
const EXCEL_SOURCE_NAME = "Excel Bulk Import";

export async function POST(request: NextRequest) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Please upload an Excel (.xlsx, .xls) or CSV file" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls") && !filename.endsWith(".csv")) {
      return NextResponse.json({ error: "Only Excel (.xlsx, .xls) or CSV (.csv) files are supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    const parseResult = parseExcelRows(buffer);

    if (!parseResult.validRows.length && parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "Could not parse any valid listings from the uploaded file",
          validationErrors: parseResult.errors,
        },
        { status: 400 }
      );
    }

    if (!parseResult.validRows.length) {
      return NextResponse.json(
        { error: "No listings found in the file. Please ensure data is placed under the required column headers." },
        { status: 400 }
      );
    }

    // Ensure dedicated Excel Bulk Import source exists
    let { data: source } = await supabaseAdmin
      .from("content_import_sources")
      .select("*")
      .eq("url", EXCEL_SOURCE_URL)
      .maybeSingle();

    if (!source) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("content_import_sources")
        .insert({
          name: EXCEL_SOURCE_NAME,
          url: EXCEL_SOURCE_URL,
          adapter: "excel",
          enabled: true,
          created_by: auth.user.id,
        })
        .select("*")
        .single();

      if (createError) {
        return NextResponse.json({ error: `Failed to initialize Excel source: ${createError.message}` }, { status: 500 });
      }
      source = created;
    }

    const now = new Date().toISOString();
    let imported = 0;
    let duplicates = 0;
    const insertErrors: string[] = [];

    for (const item of parseResult.validRows) {
      const fingerprint = contentFingerprint({
        title: item.title,
        summary: item.summary,
        city: item.city,
        location: item.location,
        priceMin: item.priceMin,
        priceMax: item.priceMax,
      });

      const row = {
        source_id: source.id,
        external_id: item.externalId,
        source_listing_url: item.contactUrl || "https://vouchins.com/bulk-import",
        original_url: item.contactUrl || null,
        title: item.title,
        summary: item.summary,
        location: item.location,
        city: item.city,
        price_min: item.priceMin,
        price_max: item.priceMax,
        currency: item.currency,
        media_urls: item.mediaUrls,
        accommodation_type: item.accommodationType,
        furnishing: item.furnishing,
        bhk: item.bhk,
        content_fingerprint: fingerprint,
        source_published_at: now,
        source_payload: item.raw,
        status: "pending",
      };

      const { error } = await supabaseAdmin.from("content_import_items").insert(row);
      if (!error) {
        imported += 1;
      } else if (error.code === "23505") {
        duplicates += 1;
      } else {
        insertErrors.push(`Failed to insert "${item.title}": ${error.message}`);
      }
    }

    await supabaseAdmin
      .from("content_import_sources")
      .update({
        last_fetched_at: now,
        last_success_at: now,
        last_error: null,
        updated_at: now,
      })
      .eq("id", source.id);

    return NextResponse.json({
      success: true,
      totalRows: parseResult.totalRows,
      imported,
      duplicates,
      validationErrors: parseResult.errors,
      insertErrors,
      sourceId: source.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk import processing failed";
    console.error("Bulk import failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
