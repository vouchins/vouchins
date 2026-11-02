import type { Metadata } from 'next';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { Video, Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Mock Interviews | Vouchins Jobs',
  description: 'AI-guided mock interviews simulating Tier-1 FAANG and enterprise engineering loops.',
};

export default function MockInterviewsPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="interview" />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 sm:px-8 border-b border-neutral-200/80 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight uppercase">
              MOCK INTERVIEWS
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider">
              NEW
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0A1B5C] text-[#4FD1C5] font-black text-xs flex items-center justify-center ring-2 ring-white shadow-xs">
            ST
          </div>
        </header>

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
              <Sparkles className="h-3.5 w-3.5 text-rose-500" />
              Interactive audio & code simulator releasing soon
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
