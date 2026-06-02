import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email, password, company_name, billing_email, website } = await req.json();

    if (!email || !password || !company_name || !billing_email) {
      return NextResponse.json(
        { error: "Email, password, company name, and billing email are required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 1. Sign up the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Signup failed" },
        { status: 400 }
      );
    }

    // 2. Create recruiter profile using admin service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: recruiterError } = await supabaseAdmin.from("recruiters").insert({
      id: data.user.id,
      company_name,
      website,
      billing_email,
      status: "pending",
    });

    if (recruiterError) {
      console.error("Recruiter insert error:", recruiterError);
      return NextResponse.json(
        { error: recruiterError.message || "Failed to create recruiter profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected signup error:", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
