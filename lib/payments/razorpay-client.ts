'use client';

export interface CheckoutOptions {
  planType: 'jobs_pro' | 'premium_bundle';
  billingCycle: 'monthly' | 'yearly';
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    id?: string;
  };
  onSuccess?: (data: { orderId: string; paymentId: string; periodEnd: string; planType: string }) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay checkout.js script');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  try {
    // 1. Create order on server
    const orderRes = await fetch('/api/payments/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planType: options.planType,
        billingCycle: options.billingCycle,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.error || 'Failed to initialize payment order');
    }

    // 2. Handle Mock / Demo mode (when placeholder keys are present in dev/test)
    if (orderData.isMock) {
      const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const mockSignature = `demo_sig_${Date.now()}`;

      const verifyRes = await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          paymentId: mockPaymentId,
          signature: mockSignature,
          planType: options.planType,
          billingCycle: options.billingCycle,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Mock payment verification failed');
      }

      options.onSuccess?.({
        orderId: orderData.orderId,
        paymentId: mockPaymentId,
        periodEnd: verifyData.periodEnd,
        planType: options.planType,
      });
      return;
    }

    // 3. Load script for live/test checkout
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error('Razorpay payment gateway failed to load. Please check your network connection.');
    }

    const rzpOptions = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Vouchins',
      description: orderData.planName || 'Vouchins Jobs Pro Subscription',
      order_id: orderData.orderId,
      prefill: {
        name: options.user?.name || '',
        email: options.user?.email || '',
        contact: options.user?.phone || '',
      },
      theme: {
        color: '#0A1B5C', // Vouchins primary brand color
      },
      modal: {
        ondismiss: () => {
          options.onDismiss?.();
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planType: options.planType,
              billingCycle: options.billingCycle,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.error || 'Payment verification failed');
          }

          options.onSuccess?.({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            periodEnd: verifyData.periodEnd,
            planType: options.planType,
          });
        } catch (err: any) {
          options.onError?.(err?.message || 'Failed to verify payment with server');
        }
      },
    };

    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.open();
  } catch (err: any) {
    console.error('Checkout error:', err);
    options.onError?.(err?.message || 'Payment initiation failed');
  }
}
