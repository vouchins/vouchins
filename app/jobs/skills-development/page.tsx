import type { Metadata } from 'next';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { GraduationCap, Award, TrendingUp, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Skills Development & Coaching | Vouchins Jobs',
  description: 'AI-curated engineering skill gap closure and Google XYZ formula coaching.',
};

export default function JobsSkillsDevelopmentPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="coaching" />

      <main className="flex-1 flex flex-col min-w-0">
        <JobsNavbar />

        <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C] text-white flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-neutral-900">Engineering Benchmarking Engine</h2>
                <p className="text-xs text-neutral-500">Pillar breakdown: System Design, Quantifiable Impact, and Tech Stack Alignment.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="border border-neutral-200 rounded-2xl p-5 hover:border-[#0A1B5C] transition-colors">
                <span className="text-xs font-bold text-[#0A1B5C]">Target Gap: Distributed Consensus</span>
                <p className="text-xs text-neutral-500 mt-1">Recommended for Staff Engineer bar at Uber and ServiceNow.</p>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>Match Impact: +12% Readiness</span>
                  <span className="text-emerald-600">Ready to audit</span>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-2xl p-5 hover:border-[#0A1B5C] transition-colors">
                <span className="text-xs font-bold text-[#0A1B5C]">Target Gap: Kafka Partitioning & p99 Latency</span>
                <p className="text-xs text-neutral-500 mt-1">Add Google XYZ metric bullets into your primary resume.</p>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-neutral-700">
                  <span>Match Impact: +18% Readiness</span>
                  <span className="text-emerald-600">Suggested rewrite available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

