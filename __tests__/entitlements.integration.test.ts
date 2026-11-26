/** @jest-environment node */
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const shouldRun =
  process.env.RUN_ENTITLEMENTS_INTEGRATION === 'true' &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const describeIf = shouldRun ? describe : describe.skip;

describeIf('Entitlements Postgres Integration & Concurrency', () => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const admin = createClient(url, serviceKey);

  let testUserId = '';

  beforeAll(async () => {
    const { data: user } = await admin
      .from('users')
      .select('id')
      .limit(1)
      .single();
    testUserId = user!.id;
  });

  afterEach(async () => {
    if (!testUserId) return;
    await admin.from('usage_events').delete().eq('user_id', testUserId).like('request_id', 'test-%');
    await admin.from('user_feature_usage').delete().eq('user_id', testUserId).eq('period_key', 'test-period');
  });

  it('allows exactly 5 out of 20 parallel consumes at limit 5', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        admin.rpc('consume_user_quota', {
          p_user_id: testUserId,
          p_feature_key: 'ai_evaluate',
          p_period_key: 'test-period',
          p_limit: 5,
          p_request_id: `test-par-${i}-${crypto.randomUUID()}`,
        })
      )
    );

    const allowedCount = results.filter((r) => r.data?.[0]?.allowed === true).length;
    expect(allowedCount).toBe(5);
  });

  it('allows only 1 out of 10 concurrent calls with identical request_id', async () => {
    const sharedReq = `test-dup-${crypto.randomUUID()}`;
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        admin.rpc('consume_user_quota', {
          p_user_id: testUserId,
          p_feature_key: 'ai_evaluate',
          p_period_key: 'test-period',
          p_limit: 5,
          p_request_id: sharedReq,
        })
      )
    );

    const allowedCount = results.filter((r) => r.data?.[0]?.allowed === true).length;
    const dupCount = results.filter((r) => r.data?.[0]?.duplicate === true).length;
    expect(allowedCount).toBe(1);
    expect(dupCount).toBe(9);
  });

  it('allows the same request_id across different features (resume_upload + ai_evaluate)', async () => {
    const sharedReq = `test-multi-${crypto.randomUUID()}`;
    const { data } = await admin.rpc('consume_user_quotas', {
      p_user_id: testUserId,
      p_items: [
        { feature_key: 'resume_upload', period_key: 'test-period', limit: 2 },
        { feature_key: 'ai_evaluate', period_key: 'test-period', limit: 3 },
      ],
      p_request_id: sharedReq,
    });

    expect(data?.[0]?.allowed).toBe(true);
  });

  it('blocks refund after completed and blocks retry with refunded request_id', async () => {
    const reqId = `test-ref-${crypto.randomUUID()}`;
    await admin.rpc('consume_user_quota', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_period_key: 'test-period',
      p_limit: 5,
      p_request_id: reqId,
    });

    const { data: refundRes } = await admin.rpc('refund_user_quota', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_request_id: reqId,
      p_reason: 'infra_error',
      p_max_refunds_per_period: 5,
    });
    expect(refundRes?.[0]?.refunded).toBe(true);

    // Retry with same requestId must return duplicate=true, allowed=false
    const { data: retryRes } = await admin.rpc('consume_user_quota', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_period_key: 'test-period',
      p_limit: 5,
      p_request_id: reqId,
    });
    expect(retryRes?.[0]?.allowed).toBe(false);
    expect(retryRes?.[0]?.duplicate).toBe(true);
    expect(retryRes?.[0]?.existing_outcome).toBe('refunded');

    // Completing a refunded event is a no-op
    const { data: completed } = await admin.rpc('mark_usage_event_completed', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_request_id: reqId,
    });
    expect(completed).toBe(false);
  });

  it('denies anon PostgREST access to consume_user_quota and refund_user_quota', async () => {
    if (!anonKey) return;
    const anon = createClient(url, anonKey);
    const res1 = await anon.rpc('consume_user_quota', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_period_key: 'test-period',
      p_limit: 999,
      p_request_id: 'test-anon-1',
    });
    expect(res1.error).toBeTruthy();

    const res2 = await anon.rpc('refund_user_quota', {
      p_user_id: testUserId,
      p_feature_key: 'ai_evaluate',
      p_request_id: 'test-anon-1',
      p_reason: 'hack',
      p_max_refunds_per_period: 99,
    });
    expect(res2.error).toBeTruthy();
  });
});
