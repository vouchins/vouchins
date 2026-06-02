import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

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

    // Get session user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a recruiter
    const { data: recruiter, error: recError } = await supabase
      .from("recruiters")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (recError || !recruiter) {
      return NextResponse.json({ error: "Forbidden: Not a recruiter" }, { status: 403 });
    }

    // Fetch applications
    let query = supabase
      .from("job_applications")
      .select(`
        *,
        job:jobs!inner(*),
        user:users!inner(id, full_name, email, city, avatar_url, company:companies(name))
      `);

    if (jobId) {
      query = query.eq("job_id", jobId);
    }

    // Restrict to jobs belonging to this recruiter
    query = query.eq("job.recruiter_id", recruiter.id);

    const { data: applications, error: appError } = await query.order("created_at", { ascending: false });

    if (appError) throw appError;

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error("Recruiter GET applications error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch applications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json({ error: "Application ID and Status are required" }, { status: 400 });
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

    // Get session user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a recruiter
    const { data: recruiter, error: recError } = await supabase
      .from("recruiters")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (recError || !recruiter) {
      return NextResponse.json({ error: "Forbidden: Not a recruiter" }, { status: 403 });
    }

    // Verify application belongs to a job posted by this recruiter
    const { data: application, error: fetchAppError } = await supabase
      .from("job_applications")
      .select(`
        *,
        job:jobs!inner(*)
      `)
      .eq("id", applicationId)
      .eq("job.recruiter_id", recruiter.id)
      .maybeSingle();

    if (fetchAppError || !application) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
    }

    // Update status
    const { data: updatedApp, error: updateError } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", applicationId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, application: updatedApp });
  } catch (error: any) {
    console.error("Recruiter POST application status error:", error);
    return NextResponse.json({ error: error.message || "Failed to update application status" }, { status: 500 });
  }
}
