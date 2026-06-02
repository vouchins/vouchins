import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    // Get session user (can be anonymous or logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Log the view in job_views
    const { error: insertError } = await supabase
      .from("job_views")
      .insert({
        job_id: jobId,
        user_id: user?.id || null
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Log job view error:", error);
    return NextResponse.json({ error: error.message || "Failed to log impression" }, { status: 500 });
  }
}
