import type { Metadata } from 'next';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { User, ShieldCheck, Mail, Building2, MapPin, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Profile | Vouchins Jobs',
  description: 'Verified candidate credentials, work history, and corporate referral status.',
};

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="profile" />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-6 sm:px-8 border-b border-neutral-200/80 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight uppercase">
            PROFILE
          </h1>
          <div className="w-9 h-9 rounded-full bg-[#0A1B5C] text-[#4FD1C5] font-black text-xs flex items-center justify-center ring-2 ring-white shadow-xs">
            ST
          </div>
        </header>

        <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0A1B5C] to-[#122b8f] text-[#4FD1C5] text-2xl font-black flex items-center justify-center shadow-inner">
                  ST
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-neutral-900">Shaik Taher</h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4FD1C5]/15 text-[#0A1B5C] text-xs font-black">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#0A1B5C]" />
                      Verified Candidate
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">Staff Platform Engineer - Priority Pass Activated</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-neutral-100">
              <div className="bg-neutral-50 rounded-2xl p-4">
                <span className="text-[10px] font-extrabold uppercase text-neutral-400">Match Readiness</span>
                <p className="text-xl font-black text-[#0A1B5C] mt-1">84%</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Top 10% in Peer Pool</p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-4">
                <span className="text-[10px] font-extrabold uppercase text-neutral-400">Target Level</span>
                <p className="text-xl font-black text-neutral-900 mt-1">Staff / Principal</p>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Platform & Backend</p>
              </div>
              <div className="bg-neutral-50 rounded-2xl p-4">
                <span className="text-[10px] font-extrabold uppercase text-neutral-400">Vouch Status</span>
                <p className="text-xl font-black text-emerald-600 mt-1">Fast-Tracked</p>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">Direct Recruiter Routing</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
