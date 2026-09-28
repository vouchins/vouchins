import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const requestedDays = Number.parseInt(url.searchParams.get("days") || "30", 10);
    const days = Number.isFinite(requestedDays)
      ? Math.min(Math.max(requestedDays, 7), 90)
      : 30;

    const [productResult, blogResult] = await Promise.all([
      supabaseAdmin.rpc("get_product_analytics", { p_days: days }),
      supabaseAdmin.rpc("get_blog_analytics", { p_days: days }),
    ]);

    if (productResult.error) throw productResult.error;
    if (blogResult.error) throw blogResult.error;

    return NextResponse.json({
      product: productResult.data,
      blog: blogResult.data,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Admin analytics endpoint failed:", error);
    return NextResponse.json(
      { error: error?.message || "Unable to load analytics" },
      { status: 500 },
    );
  }
}
