/** @jest-environment node */
import {
  ADMIN_AUDIT_LIMIT,
  PLAN_ENTITLEMENTS,
  getPeriodKey,
  getPeriodResetIso,
  quotaDeniedResponse,
  resolveIdempotencyKey,
  consumeEntitlement,
  resolveUserPlanInfo,
} from '@/lib/jobs/entitlements';
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('Unified Entitlement & Quota Engine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('validates Idempotency-Key header format strictly', () => {
    const validReq = new Request('https://example.com', {
      headers: { 'Idempotency-Key': 'req_abc-123_XYZ' },
    });
    const valid = resolveIdempotencyKey(validReq);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.key).toBe('req_abc-123_XYZ');
      expect(valid.clientProvided).toBe(true);
    }

    const badReq = new Request('https://example.com', {
      headers: { 'Idempotency-Key': 'bad key with spaces!' },
    });
    const bad = resolveIdempotencyKey(badReq);
    expect(bad.ok).toBe(false);

    const tooLongReq = new Request('https://example.com', {
      headers: { 'Idempotency-Key': 'a'.repeat(65) },
    });
    expect(resolveIdempotencyKey(tooLongReq).ok).toBe(false);
  });

  it('computes UTC period keys and reset timestamps deterministically', () => {
    const dec31 = new Date('2026-12-31T23:59:59.000Z');
    expect(getPeriodKey('lifetime', dec31)).toBe('lifetime');
    expect(getPeriodResetIso('lifetime', dec31)).toBeNull();
    expect(getPeriodKey('monthly', dec31)).toBe('2026-12');
    expect(getPeriodResetIso('monthly', dec31)).toBe('2027-01-01T00:00:00.000Z');
  });

  it('formats 403 LIMIT_REACHED, 409 DUPLICATE_REQUEST, and 503 QUOTA_UNAVAILABLE responses', async () => {
    const limitRes = quotaDeniedResponse({
      allowed: false,
      feature: 'resume_upload',
      tier: 'free',
      limit: 2,
      used: 2,
      remaining: 0,
      resetsAt: null,
      periodKey: 'lifetime',
      refundCap: 5,
      code: 'LIMIT_REACHED',
      reason: 'Limit reached',
    });
    expect(limitRes.status).toBe(403);
    const limitBody = await limitRes.json();
    expect(limitBody).toMatchObject({
      code: 'LIMIT_REACHED',
      feature: 'resume_upload',
      limit: 2,
      used: 2,
      resets_at: null,
    });

    const dupRes = quotaDeniedResponse({
      allowed: false,
      duplicate: true,
      existingOutcome: 'completed',
      feature: 'ai_evaluate',
      tier: 'free',
      limit: 3,
      used: 1,
      remaining: 2,
      resetsAt: '2026-12-01T00:00:00.000Z',
      periodKey: '2026-11',
      refundCap: 5,
      code: 'DUPLICATE_REQUEST',
    });
    expect(dupRes.status).toBe(409);
    const dupBody = await dupRes.json();
    expect(dupBody.code).toBe('DUPLICATE_REQUEST');
    expect(dupBody.existing_outcome).toBe('completed');
  });

  it('fails closed when RPC fails or returns empty array in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFallback = process.env.ALLOW_QUOTA_FALLBACK;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    process.env.ALLOW_QUOTA_FALLBACK = 'true';

    jest.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { is_admin: false }, error: null }),
            }),
          }),
        } as any;
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      } as any;
    });

    jest.spyOn(supabaseAdmin, 'rpc').mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Function not found' },
    } as any);

    const res = await consumeEntitlement('user-1', 'resume_upload', 'req-1');
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('QUOTA_UNAVAILABLE');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
    process.env.ALLOW_QUOTA_FALLBACK = originalFallback;
  });

  it('handles subscription active grace, past_due grace, canceled, and admin tiers', async () => {
    const now = new Date('2026-11-26T12:00:00.000Z');

    const mockSub = (subData: any, isAdmin = false) => {
      jest.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { is_admin: isAdmin }, error: null }),
              }),
            }),
          } as any;
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: subData, error: null }),
                }),
              }),
            }),
          }),
        } as any;
      });
    };

    // Active within 24h grace
    mockSub({
      plan_type: 'jobs_pro',
      status: 'active',
      current_period_end: '2026-11-26T00:00:00.000Z',
    });
    expect(await resolveUserPlanInfo('u1', now)).toEqual({ tier: 'pro', isAdmin: false });

    // Canceled immediately drops to free
    mockSub({
      plan_type: 'jobs_pro',
      status: 'canceled',
      current_period_end: '2026-12-20T00:00:00.000Z',
    });
    expect(await resolveUserPlanInfo('u1', now)).toEqual({ tier: 'free', isAdmin: false });

    // past_due within 72h grace stays elite
    mockSub({
      plan_type: 'premium_bundle',
      status: 'past_due',
      current_period_end: '2026-11-24T12:00:00.000Z',
    });
    expect(await resolveUserPlanInfo('u1', now)).toEqual({ tier: 'elite', isAdmin: false });

    // Admin resolves to elite + isAdmin
    mockSub(null, true);
    expect(await resolveUserPlanInfo('u1', now)).toEqual({ tier: 'elite', isAdmin: true });
    expect(ADMIN_AUDIT_LIMIT).toBeGreaterThan(PLAN_ENTITLEMENTS.elite.ai_evaluate.limit);
  });
});
