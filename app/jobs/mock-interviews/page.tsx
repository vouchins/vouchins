import type { Metadata } from 'next';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { Video, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mock Interviews | Vouchins Jobs',
  description: 'AI-guided mock interviews simulating Tier-1 FAANG and enterprise engineering loops.',
};

export default function JobsMockInterviewsPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="interview" />

      <main className="flex-1 flex flex-col min-w-0">
        <JobsNavbar />

        <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900">AI Mock Engineering Loops</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Practice real-time technical screening, system design deep-dives, and behavioral leadership questions tailored to the companies you match with.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-rose-500" />
              Interactive audio & code simulator releasing soon
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

