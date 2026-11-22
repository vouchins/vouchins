'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { openRazorpayCheckout } from '@/lib/payments/razorpay-client';

interface SubscriptionGateProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreDemo?: () => void;
}

export function SubscriptionGate({
  isOpen,
  onClose,
  onExploreDemo,
}: SubscriptionGateProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const perks = [
    'Unlimited Google XYZ impact metric evaluations benchmarked against Tier-1 tech bars',
    'Granular bullet-level rewrite suggestions with 1-click canvas synchronization',
    'Pixel-perfect ATS vector PDF export with 100% selectable text',
    'Automated candidate vector matching across verified company referral boards',
    'Up to 5 resume slots for multi-role and company-tailored targeting',
  ];

  const handleInstantUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await openRazorpayCheckout({
        planType: 'jobs_pro',
        billingCycle: 'monthly',
        onSuccess: () => {
          toast.success('Welcome to Jobs Pro! All features are now unlocked.');
          onClose();
          window.location.reload();
        },
        onError: (errMsg) => {
          toast.error(errMsg || 'Failed to complete checkout');
        },
        onDismiss: () => {
          setIsUpgrading(false);
        },
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to initiate checkout');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100 [&>button:hover]:text-white [&>button]:focus:ring-white/40">
        {/* Top Header Banner */}
        <div className="bg-[#0A1B5C] px-6 py-8 text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#4FD1C5] text-xs font-semibold mb-3">
            Jobs Pro Feature
          </div>

          <DialogTitle className="text-2xl font-bold tracking-tight text-white">
            Unlock Top-Tier Tech Resume Intelligence
          </DialogTitle>

          <DialogDescription className="text-neutral-300 text-xs mt-2 leading-relaxed">
            Elevate your profile to meet the engineering hiring bar at Google, Meta, Amazon, Uber, and ServiceNow with AI impact metrics and live ATS canvas editing.
          </DialogDescription>
        </div>

        {/* Value Proposition List */}
        <div className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Included in Jobs Pro
            </span>
            <div className="flex flex-col gap-2">
              {perks.map((perk, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-neutral-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-neutral-100">
            <Button
              onClick={handleInstantUpgrade}
              disabled={isUpgrading}
              className="w-full h-11 text-sm font-semibold bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white rounded-xl shadow-md gap-2"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Opening Secure Checkout...
                </>
              ) : (
                <>
                  Upgrade to Jobs Pro - ₹499/mo
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </Button>

            <Button
              asChild
              variant="ghost"
              className="w-full h-9 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl"
            >
              <Link href="/premium">
                Compare All Plans & Annual Discounts
              </Link>
            </Button>

            {onExploreDemo && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onExploreDemo();
                }}
                className="w-full h-10 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 rounded-xl"
              >
                Try Interactive Demo Mode
              </Button>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
            <span>Guaranteed private storage with authenticated Row-Level Security</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
