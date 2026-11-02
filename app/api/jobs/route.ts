import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.get("q") || "";
    const category = searchParams.get("category") || "all";
    const jobType = searchParams.get("job_type") || "all";
    const experienceLevel = searchParams.get("experience_level") || "all";
    const location = searchParams.get("location") || "all";
    const limit = parseInt(searchParams.get("limit") || "150", 10);

    // Build query using supabaseAdmin to allow active jobs to be browsed
    let query = supabaseAdmin
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

    const { data: jobs, error: jobsError } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}
