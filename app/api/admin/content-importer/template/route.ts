import { NextRequest } from "next/server";
import { requireImporterAdmin } from "@/lib/content-importer/auth";
import { generateCsvTemplate, generateExcelTemplate } from "@/lib/content-importer/excel";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireImporterAdmin();
  if (auth.response) return auth.response;

  const format = request.nextUrl.searchParams.get("format")?.toLowerCase();

  if (format === "csv") {
    const csvContent = generateCsvTemplate();
    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vouchins-bulk-import-template.csv"',
        "Content-Length": String(new TextEncoder().encode(csvContent).length),
        "Cache-Control": "no-store",
      },
    });
  }

  const excelBuffer = generateExcelTemplate();
  return new Response(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="vouchins-bulk-import-template.xlsx"',
      "Content-Length": String(excelBuffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
