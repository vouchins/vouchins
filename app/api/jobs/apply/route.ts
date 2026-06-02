import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, resumeUrl, coverLetter } = body;

    if (!jobId || !resumeUrl) {
      return NextResponse.json({ error: "Job ID and Resume URL are required" }, { status: 400 });
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

    // Verify user is verified in Vouchins
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_verified")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.is_verified) {
      return NextResponse.json({ error: "Only verified Vouchins users can apply to jobs." }, { status: 403 });
    }

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        user_id: user.id,
        resume_url: resumeUrl,
        cover_letter: coverLetter,
        status: "applied"
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") { // unique constraint violation
        return NextResponse.json({ error: "You have already applied to this job." }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Apply to job error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
