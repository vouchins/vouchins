import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, password, full_name } = await req.json();
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
    options: {
      data: {
        full_name: full_name,
      },
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Signup failed" },
      { status: 400 }
    );
  }

  // Retrieve invite attribution
  let invitedBy: string | null = cookieStore.get("vouchins_invited_by")?.value || null;
  if (invitedBy) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitedBy)) {
      invitedBy = null;
    }
  }

  // Create profile in public.users
  const { error: profileError } = await supabase.from("users").insert({
    id: data.user.id,
    email,
    full_name,
    is_verified: false,
    onboarded: false,
    is_active: true,
    is_admin: false,
    invited_by: invitedBy,
  });

  if (profileError) {
    console.error("Profile insert error:", profileError);
  }

  return NextResponse.json({ success: true });
}