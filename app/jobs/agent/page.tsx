import type { Metadata } from 'next';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { Bot, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Agent | Vouchins Jobs',
  description: 'Autonomous AI career copilot finding and applying to matched engineering roles.',
};

export default function JobsAgentPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="agent" />

      <main className="flex-1 flex flex-col min-w-0">
        <JobsNavbar />

        <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8 text-[#0A1B5C]" />
            </div>
            <h2 className="text-2xl font-black text-neutral-900">AI Application Copilot</h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Your autonomous agent scans real-time tech openings across ServiceNow, Google, Uber, and Stripe, tuning your Google XYZ Master Resume bullets for each job.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Agent Status: Actively indexing Tier-1 tech matches
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

