import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PremiumPageClient } from '@/components/premium/premium-page-client';

export const metadata: Metadata = {
  title: 'Membership & Enterprise Plans | Vouchins',
  description:
    'Accelerate your career with unlimited AI Resume Studio, vector job matching, and verified insider referrals. Customizable enterprise hiring solutions for tech teams.',
  alternates: {
    canonical: 'https://www.vouchins.com/premium',
  },
};

export default function PremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-neutral-500">Loading plans...</p>
          </div>
        </div>
      }
    >
      <PremiumPageClient />
    </Suspense>
  );
}
