import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResumeStudioClient } from '@/components/jobs';

export const metadata: Metadata = {
  title: 'Resume Studio - Interactive ATS Editor | Vouchins Jobs',
  description:
    'Interactive ATS Resume Studio with Google XYZ formula scoring, real-time metric benchmarks, and high-density export on Vouchins Jobs.',
  alternates: {
    canonical: 'https://www.vouchins.com/jobs/resume/studio',
  },
};

export default function JobsResumeStudioPage() {
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
      <ResumeStudioClient />
    </Suspense>
  );
}

