import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSubscriptionInfo } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    let user = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data } = await supabase.auth.getUser(token);
      if (data?.user) {
        user = data.user;
      }
    }

    if (!user) {
      const {
        data: { user: cookieUser },
        error,
      } = await supabase.auth.getUser();
      if (!error && cookieUser) {
        user = cookieUser;
      }
    }

    const isLocalhost =
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') ||
      Boolean(request?.headers?.get('host')?.includes('localhost'));

    if (!user && isLocalhost) {
      let devUser = null;
      try {
        const { data } = await supabaseAdmin
          .from('users')
          .select('id, email, is_admin')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        devUser = data;
      } catch (err) {
        console.warn('Dev fallback user lookup error:', err);
      }

      const userId = devUser?.id || '00000000-0000-0000-0000-000000000001';
      const subInfo = await getSubscriptionInfo(userId);
      return NextResponse.json({
        authenticated: true,
        userId,
        email: devUser?.email || 'dev@localhost',
        ...subInfo,
      });
    }

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        hasAccess: false,
        status: 'none',
      });
    }

    const subInfo = await getSubscriptionInfo(user.id);

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      ...subInfo,
    });
  } catch (err: any) {
    console.error('Jobs subscription error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
