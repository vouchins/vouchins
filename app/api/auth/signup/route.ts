import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password, first_name } = await req.json();
  const origin = new URL(req.url).origin;

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Signup failed" },
      { status: 400 }
    );
  }

  // Create profile in public.users
  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    email,
    first_name,
    is_verified: false,
    onboarded: false,
    is_active: true,
    is_admin: false,
  });

  if (profileError) {
    console.error("Profile insert error:", profileError);
  }

  return NextResponse.json({ success: true });
}