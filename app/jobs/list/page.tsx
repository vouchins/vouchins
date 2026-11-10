import type { Metadata } from 'next';
import { Suspense } from 'react';
import { JobRecommendationsDashboard } from '@/components/jobs/recommend-dashboard';

export const metadata: Metadata = {
  title: 'AI Job Recommendations & Roles | Vouchins Jobs',
  description:
    'Curated tech roles matched against your Master Resume with verified employee referrals, Google XYZ gap analysis, and 1-click ATS tailoring.',
  alternates: {
    canonical: 'https://www.vouchins.com/jobs/list',
  },
};

export default function JobsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-neutral-500">Loading AI recommendations...</p>
          </div>
        </div>
      }
    >
      <JobRecommendationsDashboard />
    </Suspense>
  );
}

