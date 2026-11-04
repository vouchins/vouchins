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

      const devUserId = devUser?.id || '00000000-0000-0000-0000-000000000001';
      const isDevAdmin = Boolean(devUser?.is_admin ?? false);

      return {
        allowed: true,
        userId: devUserId,
        isAdmin: isDevAdmin,
        isPro: isDevAdmin,
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

    // Check active or trialing subscriptions
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, plan_type, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) return true;

    // RPC check fallback if database function exists
    if (typeof (supabaseAdmin as any).rpc === 'function') {
      try {
        const { data: rpcHasSub } = await supabaseAdmin.rpc('has_active_jobs_subscription', {
          check_user_id: userId,
        });
        if (rpcHasSub === true) return true;
      } catch {
        // Fall through
      }
    }

    return false;
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
    return { hasAccess: false, status: 'none', isPro: false, isElite: false };
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
        isPro: true,
        isElite: true,
      };
    }

    // 1. Check for active or trialing subscription first
    const { data: activeSub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, plan_type, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      const isElite = activeSub.plan_type === 'premium_bundle' || activeSub.plan_type === 'job_pass_elite';
      return {
        hasAccess: true,
        status: activeSub.status as any,
        planType: activeSub.plan_type as any,
        currentPeriodEnd: activeSub.current_period_end,
        isAdmin: false,
        isPro: true,
        isElite,
      };
    }

    // 2. Fallback: check RPC helper function
    if (typeof (supabaseAdmin as any).rpc === 'function') {
      try {
        const { data: rpcHasSub } = await supabaseAdmin.rpc('has_active_jobs_subscription', {
          check_user_id: userId,
        });
        if (rpcHasSub === true) {
          return {
            hasAccess: true,
            status: 'active',
            planType: 'jobs_pro',
            isAdmin: false,
            isPro: true,
            isElite: false,
          };
        }
      } catch {
        // Fall through
      }
    }

    // 3. Fallback: fetch latest subscription row (for expired or canceled members)
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
        isPro: false,
        isElite: false,
      };
    }

    const isActive =
      (sub.status === 'active' || sub.status === 'trialing') &&
      Boolean(sub.current_period_end && new Date(sub.current_period_end) > new Date());

    const isElite = isActive && (sub.plan_type === 'premium_bundle' || sub.plan_type === 'job_pass_elite');

    return {
      hasAccess: true,
      status: isActive ? (sub.status as any) : (sub.status as any || 'free'),
      planType: isActive ? (sub.plan_type as any) : 'fast_lane_free',
      currentPeriodEnd: sub.current_period_end,
      isAdmin: false,
      isPro: isActive,
      isElite,
    };
  } catch (err) {
    console.error('getSubscriptionInfo error:', err);
    return { hasAccess: false, status: 'none' };
  }
}
