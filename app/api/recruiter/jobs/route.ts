import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
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

    // Fetch jobs posted by this recruiter
    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        *,
        job_applications:job_applications(id),
        job_views:job_views(id)
      `)
      .eq("recruiter_id", recruiter.id)
      .order("created_at", { ascending: false });

    if (jobsError) {
      throw jobsError;
    }

    // Format metrics
    const formattedJobs = (jobs || []).map(job => ({
      ...job,
      applications_count: job.job_applications?.length || 0,
      views_count: job.job_views?.length || 0,
      job_applications: undefined,
      job_views: undefined
    }));

    return NextResponse.json({ success: true, jobs: formattedJobs });
  } catch (error: any) {
    console.error("Recruiter GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      requirements,
      location,
      job_type,
      salary_range,
      experience_level,
      category,
      is_active,
      external_apply_url,
      company_name,
      company_logo
    } = body;

    if (!title || !description || !location || !job_type || !experience_level || !category) {
      return NextResponse.json({ error: "Missing required job fields" }, { status: 400 });
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

    // Check if the user has admin rights
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = userData?.is_admin || false;

    const resolvedCompanyName = isAdmin && company_name ? company_name : recruiter.company_name;
    let resolvedCompanyLogo = isAdmin && company_logo ? company_logo : (recruiter.company_logo || null);

    if (!resolvedCompanyLogo && resolvedCompanyName) {
      const { data: companyObj } = await supabase
        .from("companies")
        .select("domain")
        .ilike("name", resolvedCompanyName.trim())
        .maybeSingle();

      if (companyObj?.domain) {
        resolvedCompanyLogo = `https://www.google.com/s2/favicons?domain=${companyObj.domain}&sz=128`;
      } else {
        const cleanName = resolvedCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanName) {
          resolvedCompanyLogo = `https://www.google.com/s2/favicons?domain=${cleanName}.com&sz=128`;
        }
      }
    }

    const jobData: any = {
      recruiter_id: recruiter.id,
      title,
      company_name: resolvedCompanyName,
      company_logo: resolvedCompanyLogo,
      description,
      requirements,
      location,
      job_type,
      salary_range,
      experience_level,
      category,
      is_active: is_active !== undefined ? is_active : true,
      external_apply_url,
    };

    if (id) {
      // Update job
      const { data: updatedJob, error: updateError } = await supabase
        .from("jobs")
        .update(jobData)
        .eq("id", id)
        .eq("recruiter_id", recruiter.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, job: updatedJob });
    } else {
      // Create job
      const { data: newJob, error: insertError } = await supabase
        .from("jobs")
        .insert(jobData)
        .select()
        .single();

      if (insertError) throw insertError;
      return NextResponse.json({ success: true, job: newJob });
    }
  } catch (error: any) {
    console.error("Recruiter POST job error:", error);
    return NextResponse.json({ error: error.message || "Failed to save job" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
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

    const { error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id)
      .eq("recruiter_id", recruiter.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Recruiter DELETE job error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete job" }, { status: 500 });
  }
}
