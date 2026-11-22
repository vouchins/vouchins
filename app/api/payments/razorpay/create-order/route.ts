import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { getRazorpayClient, PLAN_PRICING } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json(
        { error: 'Please sign in to proceed with subscription checkout.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planType: 'jobs_pro' | 'premium_bundle' = body.planType === 'premium_bundle' ? 'premium_bundle' : 'jobs_pro';
    const billingCycle: 'monthly' | 'yearly' = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

    const planConfig = PLAN_PRICING[planType]?.[billingCycle];
    if (!planConfig) {
      return NextResponse.json(
        { error: 'Invalid plan or billing cycle requested.' },
        { status: 400 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
    const razorpay = getRazorpayClient();

    let orderId: string;
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: planConfig.amountPaise,
        currency: 'INR',
        receipt: `rcpt_${authCheck.userId.slice(0, 8)}_${Date.now()}`,
        notes: {
          userId: authCheck.userId,
          planType,
          billingCycle,
        },
      });
      orderId = order.id;
    } else {
      // Mock / sandbox fallback order for development testing before production keys are inserted
      orderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    return NextResponse.json({
      success: true,
      orderId,
      amount: planConfig.amountPaise,
      amountInr: planConfig.amountInr,
      currency: 'INR',
      keyId,
      planName: planConfig.name,
      planType,
      billingCycle,
      isMock: !razorpay,
    });
  } catch (error: any) {
    console.error('Razorpay create-order error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to initiate Razorpay checkout order.' },
      { status: 500 }
    );
  }
}
