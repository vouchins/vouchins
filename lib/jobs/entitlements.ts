import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type PlanTier = 'free' | 'pro' | 'elite';
export type FeatureKey =
  | 'resume_extract'
  | 'resume_upload'
  | 'ai_evaluate'
  | 'referral_request';
export type QuotaPeriod = 'lifetime' | 'monthly';

export interface FeatureQuotaRule {
  period: QuotaPeriod;
  limit: number;
  refundCap: number;
}

export const PLAN_TO_TIER: Record<string, PlanTier> = {
  jobs_pro: 'pro',
  accelerator_pro: 'pro',
  job_pass_pro: 'pro',
  premium_bundle: 'elite',
  job_pass_elite: 'elite',
  fast_lane_free: 'free',
  job_pass_free: 'free',
  free: 'free',
};

export const PLAN_ENTITLEMENTS: Record<PlanTier, Record<FeatureKey, FeatureQuotaRule>> = {
  free: {
    resume_extract: { period: 'monthly', limit: 3, refundCap: 5 },
    resume_upload: { period: 'lifetime', limit: 2, refundCap: 5 },
    ai_evaluate: { period: 'monthly', limit: 3, refundCap: 5 },
    referral_request: { period: 'monthly', limit: 2, refundCap: 5 },
  },
  pro: {
    resume_extract: { period: 'monthly', limit: 100, refundCap: 20 },
    resume_upload: { period: 'monthly', limit: 25, refundCap: 20 },
    ai_evaluate: { period: 'monthly', limit: 100, refundCap: 20 },
    referral_request: { period: 'monthly', limit: 15, refundCap: 20 },
  },
  elite: {
    resume_extract: { period: 'monthly', limit: 250, refundCap: 20 },
    resume_upload: { period: 'monthly', limit: 100, refundCap: 20 },
    ai_evaluate: { period: 'monthly', limit: 250, refundCap: 20 },
    referral_request: { period: 'monthly', limit: 50, refundCap: 20 },
  },
};

export const ADMIN_AUDIT_LIMIT = 1_000_000;
const ACTIVE_GRACE_MS = 24 * 60 * 60 * 1000; // 24h renewal webhook grace
const PAST_DUE_GRACE_MS = 72 * 60 * 60 * 1000; // 72h payment retry grace
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function getPeriodKey(period: QuotaPeriod, now: Date = new Date()): string {
  if (period === 'lifetime') return 'lifetime';
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getPeriodResetIso(period: QuotaPeriod, now: Date = new Date()): string | null {
  if (period === 'lifetime') return null;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonth.toISOString();
}

export function resolveIdempotencyKey(
  request: Request
): { ok: true; key: string; clientProvided: boolean } | { ok: false; error: string } {
  const raw =
    request.headers.get('idempotency-key') ||
    request.headers.get('x-idempotency-key');
  if (!raw) {
    return { ok: true, key: crypto.randomUUID(), clientProvided: false };
  }
  const trimmed = raw.trim();
  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    return {
      ok: false,
      error: 'Invalid Idempotency-Key header. Expected 1-64 characters matching [A-Za-z0-9_-].',
    };
  }
  return { ok: true, key: trimmed, clientProvided: true };
}

function isQuotaFallbackAllowed(err: any): boolean {
  const isDevAllowlisted =
    process.env.NODE_ENV === 'development' &&
    process.env.ALLOW_QUOTA_FALLBACK === 'true';
  if (!isDevAllowlisted) return false;
  const code = String(err?.code || '');
  return code === 'PGRST202' || code === '42883' || code === '42P01';
}

export async function resolveUserPlanInfo(
  userId: string,
  now: Date = new Date()
): Promise<{ tier: PlanTier; isAdmin: boolean }> {
  if (!userId) return { tier: 'free', isAdmin: false };

  const [{ data: userRow }, { data: subRow }] = await Promise.all([
    supabaseAdmin.from('users').select('is_admin').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('subscriptions')
      .select('plan_type, status, current_period_end')
      .eq('user_id', userId)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const isAdmin = Boolean(userRow?.is_admin);
  if (isAdmin) {
    return { tier: 'elite', isAdmin: true };
  }

  if (!subRow) {
    return { tier: 'free', isAdmin: false };
  }

  const endMs = subRow.current_period_end ? new Date(subRow.current_period_end).getTime() : 0;
  const nowMs = now.getTime();
  const status = String(subRow.status || '').toLowerCase();

  if ((status === 'active' || status === 'trialing') && endMs + ACTIVE_GRACE_MS > nowMs) {
    return { tier: PLAN_TO_TIER[subRow.plan_type] || 'pro', isAdmin: false };
  }

  if (status === 'past_due' && endMs + PAST_DUE_GRACE_MS > nowMs) {
    return { tier: PLAN_TO_TIER[subRow.plan_type] || 'pro', isAdmin: false };
  }

  // Immediate cancellation / expired / unknown resolves to free
  return { tier: 'free', isAdmin: false };
}

export interface EntitlementCheckResult {
  allowed: boolean;
  duplicate?: boolean;
  existingOutcome?: string | null;
  feature: FeatureKey;
  tier: PlanTier;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string | null;
  periodKey: string;
  refundCap: number;
  code?: 'LIMIT_REACHED' | 'DUPLICATE_REQUEST' | 'QUOTA_UNAVAILABLE';
  reason?: string;
}

export async function checkEntitlement(
  userId: string,
  feature: FeatureKey
): Promise<EntitlementCheckResult> {
  const { tier, isAdmin } = await resolveUserPlanInfo(userId);
  const rule = PLAN_ENTITLEMENTS[tier][feature];
  const limit = isAdmin ? ADMIN_AUDIT_LIMIT : rule.limit;
  const periodKey = getPeriodKey(rule.period);
  const resetsAt = getPeriodResetIso(rule.period);

  const { data, error } = await supabaseAdmin
    .from('user_feature_usage')
    .select('used_count')
    .eq('user_id', userId)
    .eq('feature_key', feature)
    .eq('period_key', periodKey)
    .maybeSingle();

  if (error) {
    if (isQuotaFallbackAllowed(error)) {
      console.warn(`[Entitlements] DEV FALLBACK allowing ${feature} check:`, error.message);
      return {
        allowed: true,
        feature,
        tier,
        limit,
        used: 0,
        remaining: limit,
        resetsAt,
        periodKey,
        refundCap: rule.refundCap,
      };
    }
    return {
      allowed: false,
      feature,
      tier,
      limit,
      used: 0,
      remaining: 0,
      resetsAt,
      periodKey,
      refundCap: rule.refundCap,
      code: 'QUOTA_UNAVAILABLE',
      reason: 'Unable to verify quota right now. Please try again.',
    };
  }

  const used = data?.used_count ?? 0;
  const allowed = used < limit;
  return {
    allowed,
    feature,
    tier,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt,
    periodKey,
    refundCap: rule.refundCap,
    ...(!allowed
      ? {
          code: 'LIMIT_REACHED' as const,
          reason: `You have reached your ${tier} plan limit (${used}/${limit}) for ${feature.replace('_', ' ')}. Upgrade to continue.`,
        }
      : {}),
  };
}

export async function consumeEntitlement(
  userId: string,
  feature: FeatureKey,
  requestId: string
): Promise<EntitlementCheckResult> {
  const { tier, isAdmin } = await resolveUserPlanInfo(userId);
  const rule = PLAN_ENTITLEMENTS[tier][feature];
  const limit = isAdmin ? ADMIN_AUDIT_LIMIT : rule.limit;
  const periodKey = getPeriodKey(rule.period);
  const resetsAt = getPeriodResetIso(rule.period);

  const { data, error } = await supabaseAdmin.rpc('consume_user_quota', {
    p_user_id: userId,
    p_feature_key: feature,
    p_period_key: periodKey,
    p_limit: limit,
    p_request_id: requestId,
  });

  if (error) {
    if (isQuotaFallbackAllowed(error)) {
      console.warn(`[Entitlements] DEV FALLBACK allowing ${feature} consume:`, error.message);
      return {
        allowed: true,
        feature,
        tier,
        limit,
        used: 0,
        remaining: limit,
        resetsAt,
        periodKey,
        refundCap: rule.refundCap,
      };
    }
    return {
      allowed: false,
      feature,
      tier,
      limit,
      used: 0,
      remaining: 0,
      resetsAt,
      periodKey,
      refundCap: rule.refundCap,
      code: 'QUOTA_UNAVAILABLE',
      reason: 'Unable to verify quota right now. Please try again.',
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      allowed: false,
      feature,
      tier,
      limit,
      used: 0,
      remaining: 0,
      resetsAt,
      periodKey,
      refundCap: rule.refundCap,
      code: 'QUOTA_UNAVAILABLE',
      reason: 'Empty quota response from database.',
    };
  }

  if (row.duplicate) {
    return {
      allowed: false,
      duplicate: true,
      existingOutcome: row.existing_outcome || null,
      feature,
      tier,
      limit,
      used: row.used ?? 0,
      remaining: row.remaining ?? 0,
      resetsAt,
      periodKey,
      refundCap: rule.refundCap,
      code: 'DUPLICATE_REQUEST',
      reason: `Duplicate request already processed (status: ${row.existing_outcome || 'unknown'}).`,
    };
  }

  if (!row.allowed) {
    return {
      allowed: false,
      feature,
      tier,
      limit,
      used: row.used ?? limit,
      remaining: 0,
      resetsAt,
      periodKey,
      refundCap: rule.refundCap,
      code: 'LIMIT_REACHED',
      reason: `You have reached your ${tier} plan limit (${row.used ?? limit}/${limit}) for ${feature.replace('_', ' ')}. Upgrade to continue.`,
    };
  }

  return {
    allowed: true,
    feature,
    tier,
    limit,
    used: row.used ?? 1,
    remaining: row.remaining ?? Math.max(0, limit - 1),
    resetsAt,
    periodKey,
    refundCap: rule.refundCap,
  };
}

export async function consumeMultiEntitlements(
  userId: string,
  features: FeatureKey[],
  requestId: string
): Promise<EntitlementCheckResult> {
  if (features.length === 1) {
    return consumeEntitlement(userId, features[0], requestId);
  }

  const { tier, isAdmin } = await resolveUserPlanInfo(userId);
  const items = features.map((f) => {
    const rule = PLAN_ENTITLEMENTS[tier][f];
    return {
      feature_key: f,
      period_key: getPeriodKey(rule.period),
      limit: isAdmin ? ADMIN_AUDIT_LIMIT : rule.limit,
    };
  });

  const firstRule = PLAN_ENTITLEMENTS[tier][features[0]];
  const { data, error } = await supabaseAdmin.rpc('consume_user_quotas', {
    p_user_id: userId,
    p_items: items,
    p_request_id: requestId,
  });

  if (error) {
    if (isQuotaFallbackAllowed(error)) {
      console.warn(`[Entitlements] DEV FALLBACK allowing multi consume:`, error.message);
      return {
        allowed: true,
        feature: features[0],
        tier,
        limit: isAdmin ? ADMIN_AUDIT_LIMIT : firstRule.limit,
        used: 0,
        remaining: firstRule.limit,
        resetsAt: getPeriodResetIso(firstRule.period),
        periodKey: getPeriodKey(firstRule.period),
        refundCap: firstRule.refundCap,
      };
    }
    return {
      allowed: false,
      feature: features[0],
      tier,
      limit: firstRule.limit,
      used: 0,
      remaining: 0,
      resetsAt: getPeriodResetIso(firstRule.period),
      periodKey: getPeriodKey(firstRule.period),
      refundCap: firstRule.refundCap,
      code: 'QUOTA_UNAVAILABLE',
      reason: 'Unable to verify quota right now. Please try again.',
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      allowed: false,
      feature: features[0],
      tier,
      limit: firstRule.limit,
      used: 0,
      remaining: 0,
      resetsAt: getPeriodResetIso(firstRule.period),
      periodKey: getPeriodKey(firstRule.period),
      refundCap: firstRule.refundCap,
      code: 'QUOTA_UNAVAILABLE',
      reason: 'Empty quota response from database.',
    };
  }

  const targetFeature = (row.denied_feature || features[0]) as FeatureKey;
  const targetRule = PLAN_ENTITLEMENTS[tier][targetFeature] || firstRule;
  const targetLimit = isAdmin ? ADMIN_AUDIT_LIMIT : targetRule.limit;

  if (row.duplicate) {
    return {
      allowed: false,
      duplicate: true,
      existingOutcome: row.existing_outcome || null,
      feature: targetFeature,
      tier,
      limit: targetLimit,
      used: row.used ?? 0,
      remaining: row.remaining ?? 0,
      resetsAt: getPeriodResetIso(targetRule.period),
      periodKey: getPeriodKey(targetRule.period),
      refundCap: targetRule.refundCap,
      code: 'DUPLICATE_REQUEST',
      reason: `Duplicate request already processed (status: ${row.existing_outcome || 'unknown'}).`,
    };
  }

  if (!row.allowed) {
    return {
      allowed: false,
      feature: targetFeature,
      tier,
      limit: targetLimit,
      used: row.used ?? targetLimit,
      remaining: 0,
      resetsAt: getPeriodResetIso(targetRule.period),
      periodKey: getPeriodKey(targetRule.period),
      refundCap: targetRule.refundCap,
      code: 'LIMIT_REACHED',
      reason: `You have reached your ${tier} plan limit (${row.used ?? targetLimit}/${targetLimit}) for ${targetFeature.replace('_', ' ')}. Upgrade to continue.`,
    };
  }

  return {
    allowed: true,
    feature: features[0],
    tier,
    limit: isAdmin ? ADMIN_AUDIT_LIMIT : firstRule.limit,
    used: row.used ?? 1,
    remaining: row.remaining ?? 0,
    resetsAt: getPeriodResetIso(firstRule.period),
    periodKey: getPeriodKey(firstRule.period),
    refundCap: firstRule.refundCap,
  };
}

export async function refundEntitlement(
  userId: string,
  feature: FeatureKey,
  requestId: string,
  reason: string = 'infra_error'
): Promise<boolean> {
  try {
    const { tier } = await resolveUserPlanInfo(userId);
    const maxRefunds = PLAN_ENTITLEMENTS[tier][feature].refundCap;
    const { data, error } = await supabaseAdmin.rpc('refund_user_quota', {
      p_user_id: userId,
      p_feature_key: feature,
      p_request_id: requestId,
      p_reason: reason,
      p_max_refunds_per_period: maxRefunds,
    });
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return Boolean(row?.refunded);
  } catch {
    return false;
  }
}

export async function markUsageCompleted(
  userId: string,
  feature: FeatureKey,
  requestId: string
): Promise<void> {
  try {
    await supabaseAdmin.rpc('mark_usage_event_completed', {
      p_user_id: userId,
      p_feature_key: feature,
      p_request_id: requestId,
    });
  } catch {
    // Non-fatal
  }
}

export function quotaDeniedResponse(result: EntitlementCheckResult) {
  if (result.code === 'DUPLICATE_REQUEST') {
    return NextResponse.json(
      {
        error: result.reason || 'Duplicate request already processed.',
        code: 'DUPLICATE_REQUEST',
        feature: result.feature,
        existing_outcome: result.existingOutcome,
      },
      { status: 409 }
    );
  }

  if (result.code === 'QUOTA_UNAVAILABLE') {
    return NextResponse.json(
      {
        error: result.reason || 'Quota verification temporarily unavailable.',
        code: 'QUOTA_UNAVAILABLE',
        feature: result.feature,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: result.reason || 'Plan quota limit reached.',
      code: 'LIMIT_REACHED',
      feature: result.feature,
      limit: result.limit,
      used: result.used,
      resets_at: result.resetsAt,
    },
    { status: 403 }
  );
}

export async function getAllEntitlementsSummary(userId: string) {
  const { tier, isAdmin } = await resolveUserPlanInfo(userId);
  const features: FeatureKey[] = [
    'resume_extract',
    'resume_upload',
    'ai_evaluate',
    'referral_request',
  ];

  const { data: rows } = await supabaseAdmin
    .from('user_feature_usage')
    .select('feature_key, period_key, used_count')
    .eq('user_id', userId);

  const usageMap = new Map<string, number>();
  for (const r of rows || []) {
    usageMap.set(`${r.feature_key}:${r.period_key}`, r.used_count ?? 0);
  }

  const quotas: Record<string, any> = {};
  for (const f of features) {
    const rule = PLAN_ENTITLEMENTS[tier][f];
    const periodKey = getPeriodKey(rule.period);
    const limit = isAdmin ? ADMIN_AUDIT_LIMIT : rule.limit;
    const used = usageMap.get(`${f}:${periodKey}`) ?? 0;
    quotas[f] = {
      period: rule.period,
      periodKey,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: getPeriodResetIso(rule.period),
    };
  }

  return {
    tier,
    isAdmin,
    quotas,
  };
}
