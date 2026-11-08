import type { Metadata } from 'next';
import { Suspense } from 'react';
import { JobsOverviewDashboard } from '@/components/jobs';

export const metadata: Metadata = {
  title: 'Jobs Overview & Analytics | Vouchins',
  description:
    'Real-time overview of your Jobs candidate pipeline, Google XYZ Master Resume audit, application velocity, and verified employee referrals.',
  alternates: {
    canonical: 'https://www.vouchins.com/jobs-dashboard',
  },
};

export default function DirectJobsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-neutral-500">Loading Jobs overview...</p>
          </div>
        </div>
      }
    >
      <JobsOverviewDashboard />
    </Suspense>
  );
}

