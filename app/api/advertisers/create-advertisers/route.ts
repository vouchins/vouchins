import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { company_name, billing_email } = body;

    if (!company_name || !billing_email) {
      return NextResponse.json(
        { error: "Company name and billing email are required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options); },
          remove(name: string, options: any) { cookieStore.set(name, "", options); },
        },
      }
    );

    // Ensure the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use the Service Role key to bypass RLS for the insertion
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from("advertisers")
      .insert({
        user_id: user.id,
        company_name,
        billing_email,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, advertiser: data });
  } catch (error: any) {
    console.error("Create advertiser error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create advertiser profile" },
      { status: 500 }
    );
  }
}