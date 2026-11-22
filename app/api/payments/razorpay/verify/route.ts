import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyRazorpaySignature, PLAN_PRICING } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json(
        { error: 'Please sign in to verify your subscription payment.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, paymentId, signature, planType = 'jobs_pro', billingCycle = 'monthly' } = body;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters.' },
        { status: 400 }
      );
    }

    const targetPlan: 'jobs_pro' | 'premium_bundle' =
      planType === 'premium_bundle' ? 'premium_bundle' : 'jobs_pro';
    const targetCycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const planConfig = PLAN_PRICING[targetPlan]?.[targetCycle];
    const durationDays = planConfig?.durationDays || 30;

    // Verify Razorpay HMAC signature
    const isValid = verifyRazorpaySignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Payment signature verification failed. Please contact support.' },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription to extend
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('user_id', authCheck.userId)
      .in('status', ['active', 'trialing'])
      .gt('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    const baseTime = existingSub?.current_period_end
      ? new Date(existingSub.current_period_end).getTime()
      : Date.now();

    const newPeriodEnd = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    if (existingSub?.id) {
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_type: targetPlan,
          status: 'active',
          current_period_end: newPeriodEnd,
          payment_provider: 'razorpay',
          external_subscription_id: paymentId,
          updated_at: nowIso,
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        return NextResponse.json(
          { error: 'Payment verified, but failed to record subscription activation.' },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: authCheck.userId,
          plan_type: targetPlan,
          status: 'active',
          current_period_start: nowIso,
          current_period_end: newPeriodEnd,
          payment_provider: 'razorpay',
          external_subscription_id: paymentId,
          created_at: nowIso,
          updated_at: nowIso,
        });

      if (insertError) {
        console.error('Failed to insert subscription:', insertError);
        return NextResponse.json(
          { error: 'Payment verified, but failed to create subscription record.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      planType: targetPlan,
      billingCycle: targetCycle,
      periodEnd: newPeriodEnd,
      message: 'Subscription successfully activated!',
    });
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal error verifying payment.' },
      { status: 500 }
    );
  }
}
