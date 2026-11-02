import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResumePageClient } from '@/components/jobs';

export const metadata: Metadata = {
  title: 'Resume Studio | Vouchins Jobs',
  description:
    'Manage your ATS Master Resumes, review Google XYZ formula scoring, and benchmark against Tier-1 tech engineering bars on Vouchins Jobs.',
  alternates: {
    canonical: 'https://www.vouchins.com/jobs/resume',
  },
};

export default function JobsResumePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-neutral-500">Loading Resume Studio...</p>
          </div>
        </div>
      }
    >
      <ResumePageClient />
    </Suspense>
  );
}

