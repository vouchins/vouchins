import { createServerSupabase } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { UserSubscriptionGuard, SubscriptionInfo } from './types';

/**
 * Verifies if the calling user is authenticated and has active Jobs / Pro access.
 * Admin users (users.is_admin = true) automatically bypass subscription requirements.
 */
export async function verifyJobsAccess(request?: Request): Promise<UserSubscriptionGuard> {
  try {
    const supabase = await createServerSupabase();
    let user = null;

    // 1. Try bearer token from request header if provided
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data } = await supabase.auth.getUser(token);
        if (data?.user) {
          user = data.user;
        }
      }
    }

    // 2. Try cookie session
    if (!user) {
      const {
        data: { user: cookieUser },
        error,
      } = await supabase.auth.getUser();

      if (!error && cookieUser) {
        user = cookieUser;
      }
    }

    // 3. In local development only, if no cookie/token was sent across subdomains (e.g. localhost to jobs.localhost),
    // fallback to active local database user so development features function without 401.
    // In production, never trust incoming Host or App URL headers for auth bypass.
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!user && isDevelopment) {
      let devUser = null;
      try {
        const { data } = await supabaseAdmin
          .from('users')
          .select('id, is_admin')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        devUser = data;
      } catch (err) {
        console.warn('Dev fallback user lookup error:', err);
      }

      return {
        allowed: true,
        userId: devUser?.id || '00000000-0000-0000-0000-000000000001',
        isAdmin: Boolean(devUser?.is_admin ?? false),
      };
    }

    if (!user) {
      return { allowed: false, reason: 'UNAUTHENTICATED' };
    }

    // 1. Check if user is platform admin
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_admin) {
      return { allowed: true, userId: user.id, isAdmin: true, isPro: true };
    }

    // 2. Check active subscription if any
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, current_period_end, plan_type')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPro = Boolean(subscription);

    // Fast Lane Master Resume is 100% free for all verified Vouchins members
    return {
      allowed: true,
      userId: user.id,
      isAdmin: false,
      isPro,
    };
  } catch (err) {
    console.error('Jobs access verification error:', err);
    return { allowed: false, reason: 'UNAUTHENTICATED' };
  }
}

/**
 * Checks whether a given user has an active Pro subscription or platform admin privileges.
 */
export async function checkIsUserPro(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (userRow?.is_admin) return true;

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    return Boolean(sub);
  } catch (err) {
    console.warn('[Auth Guard] Error checking Pro subscription:', err);
    return false;
  }
}

export const verifyAcceleratorAccess = verifyJobsAccess;

/**
 * Returns detailed subscription status for client UI consumption.
 * Fast Lane Master Resume is free for all authenticated Vouchins users.
 */
export async function getSubscriptionInfo(userId?: string): Promise<SubscriptionInfo> {
  if (!userId) {
    return { hasAccess: false, status: 'none' };
  }

  try {
    // Check admin status
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.is_admin) {
      return {
        hasAccess: true,
        status: 'active',
        planType: 'jobs_pro',
        isAdmin: true,
      };
    }

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, plan_type, current_period_end')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      // Vouchins Member Free Fast Lane Access
      return {
        hasAccess: true,
        status: 'free',
        planType: 'fast_lane_free',
        isAdmin: false,
      };
    }

    const isActive =
      (sub.status === 'active' || sub.status === 'trialing') &&
      new Date(sub.current_period_end) > new Date();

    return {
      hasAccess: true,
      status: isActive ? (sub.status as any) : 'free',
      planType: isActive ? (sub.plan_type as any) : 'fast_lane_free',
      currentPeriodEnd: sub.current_period_end,
      isAdmin: false,
    };
  } catch (err) {
    console.error('getSubscriptionInfo error:', err);
    return { hasAccess: false, status: 'none' };
  }
}
