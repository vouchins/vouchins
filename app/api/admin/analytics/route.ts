import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
