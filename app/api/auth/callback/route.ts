import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no-code`);
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // Ensure user profile exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", data?.user?.id)
    .maybeSingle();

  if (!existingUser) {
    await supabase.from("users").insert({
      id: data?.user?.id,
      email: data?.user?.email,
      first_name:
        data?.user?.user_metadata?.full_name ||
        data?.user?.user_metadata?.name ||
        "New Professional",
      is_verified: false,
      onboarded: false,
      is_active: true,
      is_admin: false,
    });
  }

  if (error || !data.user) {
    console.error("OAuth exchange error:", error);
    return NextResponse.redirect(`${origin}/login?error=exchange-failed`);
  }

  // Fetch onboarding status
  const { data: profile } = await supabase
    .from("users")
    .select("onboarded")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination = profile?.onboarded ? "/feed" : "/onboarding";

  return NextResponse.redirect(`${origin}${destination}`);
}