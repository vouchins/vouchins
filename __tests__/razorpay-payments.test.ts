/**
 * @jest-environment node
 */
import { PLAN_PRICING, verifyRazorpaySignature } from '@/lib/payments/razorpay';
import { POST as createOrderPOST } from '@/lib/../app/api/payments/razorpay/create-order/route';
import { POST as verifyPOST } from '@/lib/../app/api/payments/razorpay/verify/route';

jest.mock('@/lib/jobs/auth-guard', () => ({
  verifyJobsAccess: jest.fn().mockResolvedValue({
    allowed: true,
    userId: 'user-uuid-1234',
    isAdmin: false,
    isPro: false,
  }),
}));

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ data: null, error: null }),
});

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => ({
            gt: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          })),
        })),
      })),
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
}));

describe('Razorpay Payments & Subscriptions Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_placeholder_secret';
  });

  describe('Pricing Configuration', () => {
    it('defines correct pricing for Jobs Pro monthly and yearly', () => {
      expect(PLAN_PRICING.jobs_pro.monthly.amountInr).toBe(499);
      expect(PLAN_PRICING.jobs_pro.monthly.amountPaise).toBe(49900);
      expect(PLAN_PRICING.jobs_pro.monthly.durationDays).toBe(30);

      expect(PLAN_PRICING.jobs_pro.yearly.amountInr).toBe(3999);
      expect(PLAN_PRICING.jobs_pro.yearly.amountPaise).toBe(399900);
      expect(PLAN_PRICING.jobs_pro.yearly.durationDays).toBe(365);
    });

    it('defines correct pricing for Premium Career Bundle', () => {
      expect(PLAN_PRICING.premium_bundle.monthly.amountInr).toBe(999);
      expect(PLAN_PRICING.premium_bundle.yearly.amountInr).toBe(7999);
    });
  });

  describe('Signature Verification', () => {
    it('verifies mock / demo signatures in sandbox development mode', () => {
      const isValid = verifyRazorpaySignature({
        orderId: 'order_mock_123',
        paymentId: 'pay_mock_456',
        signature: 'demo_sig_789',
      });
      expect(isValid).toBe(true);
    });

    it('rejects invalid signatures when not matching HMAC', () => {
      process.env.RAZORPAY_KEY_SECRET = 'real_secret_key';
      const isValid = verifyRazorpaySignature({
        orderId: 'order_123',
        paymentId: 'pay_456',
        signature: 'wrong_signature_hash',
      });
      expect(isValid).toBe(false);
    });
  });

  describe('Create Order API', () => {
    it('creates a checkout order for jobs_pro monthly', async () => {
      const req = new Request('http://localhost:3000/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'jobs_pro',
          billingCycle: 'monthly',
        }),
      });

      const res = await createOrderPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.amount).toBe(49900);
      expect(json.amountInr).toBe(499);
      expect(json.planType).toBe('jobs_pro');
      expect(json.orderId).toBeTruthy();
    });

    it('creates a checkout order for premium_bundle yearly', async () => {
      const req = new Request('http://localhost:3000/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: 'premium_bundle',
          billingCycle: 'yearly',
        }),
      });

      const res = await createOrderPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.amount).toBe(799900);
      expect(json.amountInr).toBe(7999);
      expect(json.billingCycle).toBe('yearly');
    });
  });

  describe('Verify Payment API', () => {
    it('successfully activates subscription upon valid payment signature', async () => {
      const req = new Request('http://localhost:3000/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order_mock_test_1',
          paymentId: 'pay_mock_test_2',
          signature: 'demo_sig_test_3',
          planType: 'jobs_pro',
          billingCycle: 'monthly',
        }),
      });

      const res = await verifyPOST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.planType).toBe('jobs_pro');
      expect(json.periodEnd).toBeTruthy();
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('fails when payment signature is invalid', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'live_secret';
      const req = new Request('http://localhost:3000/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order_real_1',
          paymentId: 'pay_real_2',
          signature: 'invalid_forged_signature',
          planType: 'jobs_pro',
          billingCycle: 'monthly',
        }),
      });

      const res = await verifyPOST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/signature verification failed/i);
    });
  });
});
