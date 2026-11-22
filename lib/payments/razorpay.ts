import Razorpay from 'razorpay';
import crypto from 'crypto';

export interface PlanPricing {
  amountPaise: number;
  amountInr: number;
  name: string;
  durationDays: number;
}

export const PLAN_PRICING: Record<string, Record<'monthly' | 'yearly', PlanPricing>> = {
  jobs_pro: {
    monthly: {
      amountPaise: 49900,
      amountInr: 499,
      name: 'Jobs Pro - Monthly',
      durationDays: 30,
    },
    yearly: {
      amountPaise: 399900,
      amountInr: 3999,
      name: 'Jobs Pro - Annual',
      durationDays: 365,
    },
  },
  premium_bundle: {
    monthly: {
      amountPaise: 99900,
      amountInr: 999,
      name: 'Premium Career Bundle - Monthly',
      durationDays: 30,
    },
    yearly: {
      amountPaise: 799900,
      amountInr: 7999,
      name: 'Premium Career Bundle - Annual',
      durationDays: 365,
    },
  },
};

export function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId === 'rzp_test_placeholder_key') {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  // In local development or demo test mode with placeholder secret
  if (keySecret === 'rzp_test_placeholder_secret' && params.signature.startsWith('demo_sig_')) {
    return true;
  }

  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  return generatedSignature === params.signature;
}
