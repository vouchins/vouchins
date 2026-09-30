import { NextRequest, NextResponse } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { generateCsvTemplate, generateExcelTemplate } from "@/lib/content-importer/excel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "csv") {
    const csvContent = generateCsvTemplate();
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vouchins-bulk-import-template.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  const excelBuffer = generateExcelTemplate();
  return new NextResponse(Buffer.from(excelBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="vouchins-bulk-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
