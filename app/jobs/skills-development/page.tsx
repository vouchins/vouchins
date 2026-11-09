import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SkillsDevelopmentDashboard } from '@/components/jobs/skills-development-dashboard';

export const metadata: Metadata = {
  title: 'Skills Development & Free Course Hub | Vouchins Jobs',
  description:
    'Curated free engineering interview preparation resources, DSA problem sheets, system design primers, and language guides.',
  alternates: {
    canonical: 'https://www.vouchins.com/jobs/skills-development',
  },
};

export default function JobsSkillsDevelopmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-neutral-500">Loading skill courses...</p>
          </div>
        </div>
      }
    >
      <SkillsDevelopmentDashboard />
    </Suspense>
  );
}
