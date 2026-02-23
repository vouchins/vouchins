import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
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

    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
    }

    if (data.user) {
      // 1. Fetch existing user profile to check onboarding status
      const { data: profile } = await supabase
        .from('users')
        .select('onboarded')
        .eq('id', data.user.id)
        .maybeSingle();

      // 2. Determine Destination
      // If profile exists and is onboarded, go to feed. Otherwise, onboarding.
      const destination = profile?.onboarded ? '/feed' : '/onboarding';

      // 3. Optional: Extract Metadata (especially for LinkedIn/Google profiles)
      // This is useful if you want to pre-fill their name in the public.users table
      const fullName = data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        'New Professional';

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`);
}