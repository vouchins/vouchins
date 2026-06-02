import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.get("q") || "";
    const category = searchParams.get("category") || "all";
    const jobType = searchParams.get("job_type") || "all";
    const experienceLevel = searchParams.get("experience_level") || "all";
    const location = searchParams.get("location") || "all";

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

    // Get session user to ensure they are logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build the query
    let query = supabase
      .from("jobs")
      .select(`
        *,
        recruiter:recruiters(company_name, company_logo, website)
      `)
      .eq("is_active", true);

    // Apply filters
    if (category !== "all") {
      query = query.eq("category", category);
    }
    if (jobType !== "all") {
      query = query.eq("job_type", jobType);
    }
    if (experienceLevel !== "all") {
      query = query.eq("experience_level", experienceLevel);
    }
    if (location !== "all") {
      query = query.eq("location", location);
    }

    // Apply text search if queryStr is present
    if (queryStr.trim()) {
      // Basic text search on title, company_name, description
      query = query.or(`title.ilike.%${queryStr}%,company_name.ilike.%${queryStr}%,description.ilike.%${queryStr}%`);
    }

    const { data: jobs, error: jobsError } = await query.order("created_at", { ascending: false });

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}
