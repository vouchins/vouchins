'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Briefcase,
  FileText,
  Video,
  Bot,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  ChevronRight,
  Clock,
  Award,
  BarChart3,
  Users,
  Target,
  Layers,
  ArrowUpRight,
  DollarSign,
  MapPin,
  Flame,
  Activity,
  Bell,
  Search,
  Plus,
  Lock,
  UploadCloud,
} from 'lucide-react';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { useUser } from '@/components/user-provider';
import { fetchCachedResumes, fetchCachedJobs } from '@/lib/jobs/client-cache';

export function JobsOverviewDashboard() {
  const { user } = useUser();
  const [funnelTimeframe, setFunnelTimeframe] = useState<'7d' | '30d' | 'all'>('30d');

  // Resume state
  const [resumes, setResumes] = useState<any[]>([]);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [latestScore, setLatestScore] = useState<number | null>(null);

  // Matching jobs state
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const firstName = user?.full_name?.trim().split(' ')[0] || '';

  useEffect(() => {
    let isMounted = true;

    async function loadResumeAndJobs() {
      setIsLoadingResume(true);
      try {
        const data = await fetchCachedResumes();
        if (isMounted && data.resumes && Array.isArray(data.resumes)) {
          setResumes(data.resumes);
          if (typeof data.latestScore === 'number') {
            setLatestScore(data.latestScore);
          }
        }
      } catch (err) {
        console.error('Failed to load resumes:', err);
      } finally {
        if (isMounted) setIsLoadingResume(false);
      }

      setIsLoadingJobs(true);
      try {
        const jobs = await fetchCachedJobs(4);
        if (isMounted && Array.isArray(jobs)) {
          setJobsList(jobs);
        }
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        if (isMounted) setIsLoadingJobs(false);
      }
    }

    loadResumeAndJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  const primaryResume = resumes.find((r) => r.isPrimary) || resumes[0];
  const hasResume = Boolean(primaryResume) || Boolean((user as any)?.resume_path);
  const totalResumesCount = resumes.length > 0 ? resumes.length : ((user as any)?.resume_path ? 1 : 0);
  const additionalResumesCount = Math.max(0, totalResumesCount - 1);

  // Pipeline funnel statistics (preserved for when section is uncommented)
  const funnelData = {
    '7d': [
      { stage: 'Matched Roles', count: 18, rate: '100%', color: 'from-[#0A1B5C] to-[#142d8a]' },
      { stage: 'Referrals Requested', count: 6, rate: '33%', color: 'from-blue-600 to-indigo-600' },
      { stage: 'Internal Vouchers', count: 4, rate: '67%', color: 'from-[#0A1B5C] to-indigo-600' },
      { stage: 'Recruiter Screens', count: 2, rate: '50%', color: 'from-emerald-500 to-teal-600' },
      { stage: 'Tech Loops', count: 1, rate: '50%', color: 'from-violet-500 to-purple-600' },
    ],
    '30d': [
      { stage: 'Matched Roles', count: 48, rate: '100%', color: 'from-[#0A1B5C] to-[#142d8a]' },
      { stage: 'Referrals Requested', count: 14, rate: '29%', color: 'from-blue-600 to-indigo-600' },
      { stage: 'Internal Vouchers', count: 9, rate: '64%', color: 'from-[#0A1B5C] to-indigo-600' },
      { stage: 'Recruiter Screens', count: 5, rate: '56%', color: 'from-emerald-500 to-teal-600' },
      { stage: 'Tech Loops', count: 2, rate: '40%', color: 'from-violet-500 to-purple-600' },
      { stage: 'Offer Stage', count: 1, rate: '50%', color: 'from-amber-500 to-orange-500' },
    ],
    all: [
      { stage: 'Matched Roles', count: 112, rate: '100%', color: 'from-[#0A1B5C] to-[#142d8a]' },
      { stage: 'Referrals Requested', count: 32, rate: '28%', color: 'from-blue-600 to-indigo-600' },
      { stage: 'Internal Vouchers', count: 22, rate: '69%', color: 'from-[#0A1B5C] to-indigo-600' },
      { stage: 'Recruiter Screens', count: 11, rate: '50%', color: 'from-emerald-500 to-teal-600' },
      { stage: 'Tech Loops', count: 5, rate: '45%', color: 'from-violet-500 to-purple-600' },
      { stage: 'Offer Stage', count: 2, rate: '40%', color: 'from-amber-500 to-orange-500' },
    ],
  };

  const currentFunnel = funnelData[funnelTimeframe];

  // Top featured matches for quick launch
  const topMatches = [
    {
      id: 'rec-uber-senior-backend',
      title: 'Staff Distributed Systems Engineer',
      company: 'Uber',
      logo: 'UB',
      logoBg: 'bg-black text-white',
      location: 'San Francisco, CA (Hybrid)',
      salary: '$240,000 - $290,000 / yr',
      matchScore: 96,
      referralsAvailable: 3,
      tags: ['Kafka', 'Go', 'Distributed Consensus', 'High Throughput'],
    },
    {
      id: 'rec-servicenow-staff',
      title: 'Senior Backend Infrastructure Engineer',
      company: 'ServiceNow',
      logo: 'SN',
      logoBg: 'bg-emerald-600 text-white',
      location: 'Santa Clara, CA (Remote)',
      salary: '$195,000 - $245,000 / yr',
      matchScore: 94,
      referralsAvailable: 2,
      tags: ['Java', 'Microservices', 'Kubernetes', 'p99 Latency'],
    },
    {
      id: 'rec-stripe-staff-infra',
      title: 'Staff Infrastructure Lead (Cloud Platform)',
      company: 'Stripe',
      logo: 'ST',
      logoBg: 'bg-indigo-600 text-white',
      location: 'Remote (Global)',
      salary: '$195,000 - $250,000 / yr',
      matchScore: 95,
      referralsAvailable: 4,
      tags: ['Kubernetes', 'Cloud Infra', 'Terraform', 'Observability'],
    },
    {
      id: 'rec-google-principal-systems',
      title: 'Principal Systems Architect (Cloud Networking)',
      company: 'Google',
      logo: 'GO',
      logoBg: 'bg-blue-600 text-white',
      location: 'Bangalore / Hyderabad / Remote',
      salary: '$220,000 - $290,000 / yr',
      matchScore: 91,
      referralsAvailable: 6,
      tags: ['Distributed Systems', 'C++', 'Go', 'Networking Protocols'],
    },
  ];

  // Display matched jobs (using DB jobs if available, otherwise curated top matches)
  const displayMatchedJobs = jobsList.length > 0
    ? jobsList.slice(0, 4).map((j, idx) => ({
        id: j.id,
        title: j.title || 'Software Engineer',
        company: j.company_name || 'Tech Company',
        logo: (j.company_name || 'TC').slice(0, 2).toUpperCase(),
        logoBg: 'bg-[#0A1B5C] text-white',
        location: j.location || 'Remote',
        salary: j.salary_range || 'Competitive',
        matchScore: 90 + ((idx * 3) % 8),
        tags: (j.requirements || '').split('\n').filter((s: string) => s.trim().length > 3).slice(0, 4),
      }))
    : topMatches;

  // Recent activity stream (preserved for when section is uncommented)
  const activityItems = [
    {
      id: 'act-1',
      type: 'referral',
      title: 'Referral confirmed by Senior Staff Engineer at Uber',
      detail: 'Submitted internal voucher for Staff Distributed Systems Engineer opening.',
      time: '2 hours ago',
      icon: Users,
      iconColor: 'text-[#0A1B5C]',
      iconBg: 'bg-[#0A1B5C]/10',
    },
    {
      id: 'act-2',
      type: 'resume',
      title: 'Master Resume ATS Score climbed to 94 / 100',
      detail: 'Added Google XYZ metrics for Kafka stream processing bullet points.',
      time: '5 hours ago',
      icon: FileText,
      iconColor: 'text-[#0A1B5C]',
      iconBg: 'bg-[#0A1B5C]/10',
    },
    {
      id: 'act-3',
      type: 'agent',
      title: 'AI Agent indexed 6 new high-fit positions',
      detail: 'Matches identified across Stripe, Databricks, and Snowflake.',
      time: '1 day ago',
      icon: Bot,
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
    },
    {
      id: 'act-4',
      type: 'interview',
      title: 'Completed System Design Mock Interview (Score: 91%)',
      detail: 'Bar-raiser performance on Distributed Cache & Rate Limiter rounds.',
      time: '2 days ago',
      icon: Video,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C]">
      {/* 1. Left Hand Panel / Sidebar */}
      <JobsSidebar activeTab="dashboard" />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <JobsNavbar atsScore={latestScore} />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-6">
          {/* Executive Hero Banner / Welcome Message */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0A1B5C] via-[#0D2270] to-[#142d8a] text-white p-6 sm:p-8 lg:p-10 shadow-lg border border-neutral-800/40">
            {/* Background Glow Orbs */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#142d8a]/40 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-[#122b8f]/40 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md border border-white/10">
                  <span>AI Career Acceleration Engine</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  Welcome back{firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="text-sm sm:text-base text-neutral-200 font-medium leading-relaxed">
                  {hasResume
                    ? 'Your Master Resume is active. We are matching your profile against verified tech roles and employee referral opportunities.'
                    : 'Get started by adding your Master Resume to unlock personalized job matches, ATS optimization, and verified corporate referrals.'}
                </p>
              </div>

              {/* Action Buttons: Only shown when resume exists to prevent duplicate CTAs */}
              {/* {hasResume && (
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  <Link
                    href="/jobs/resume"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-neutral-100 text-[#0A1B5C] text-xs sm:text-sm font-black shadow-md transition-all active:scale-95 whitespace-nowrap"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Master Resume Studio</span>
                    <ArrowRight className="h-4 w-4 ml-0.5" />
                  </Link>

                  <Link
                    href="/jobs"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-bold border border-white/20 backdrop-blur-md transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Briefcase className="h-4 w-4 text-white" />
                    <span>Explore Matched Jobs</span>
                  </Link>
                </div>
              )} */}
            </div>
          </section>

          {/* Master Resume Card: Shows resume count if added, or asks to add resume if not */}
          <section className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
            {isLoadingResume ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-neutral-400">Checking resume status...</span>
                </div>
              </div>
            ) : hasResume ? (
              /* State A: User has already added resume */
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                        1 Master Resume
                      </h2>
                      {additionalResumesCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                          +{additionalResumesCount} Additional {additionalResumesCount === 1 ? 'Resume' : 'Resumes'}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active for Job Matching
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed max-w-2xl">
                      {additionalResumesCount > 0
                        ? `Your primary Master Resume is active and calibrated for job matching, with ${additionalResumesCount} additional specialized ${additionalResumesCount === 1 ? 'resume' : 'resumes'} saved in your studio.`
                        : 'Your primary Master Resume is analyzed and active. We continuously calibrate verified company openings against your quantified skills and achievements.'}
                    </p>
                    {latestScore !== null && (
                      <div className="flex items-center gap-2 pt-1 text-xs font-bold text-neutral-700">
                        <span>Master Resume ATS Score:</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#0A1B5C]/10 text-[#0A1B5C] font-extrabold">
                          {latestScore} / 100
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
                  <Link
                    href="/jobs/resume"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                  >
                    <span>Manage in Resume Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </Link>

                  <Link
                    href="/jobs/resume"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Resume</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* State B: User has NOT added resume yet - Single Clear Primary CTA */
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200/60">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                        Add Your Master Resume
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed max-w-2xl">
                      Upload your resume to calculate your Google XYZ compliance score, generate deterministic bullet optimizations, and unlock personalized AI job matches calibrated to your skills.
                    </p>
                  </div>
                </div>

                <Link
                  href="/jobs/resume"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Master Resume</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 text-white" />
                </Link>
              </div>
            )}
          </section>

          {/* Matching Jobs Section (Only visible when user has added a Master Resume) */}
          {hasResume && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                    <span>Matching Jobs</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-[10px] font-black uppercase">
                      Based on Resume
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Engineering roles curated and scored against your Master Resume skills and competencies.
                  </p>
                </div>

                <Link
                  href="/jobs"
                  className="text-xs font-bold text-[#0A1B5C] hover:text-[#0c2277] flex items-center gap-1 group"
                >
                  <span>Explore All Positions</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Matched Jobs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayMatchedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top: Company & Match Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${job.logoBg || 'bg-[#0A1B5C] text-white'} flex items-center justify-center font-black text-xs shrink-0`}>
                            {job.logo}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-neutral-900 line-clamp-1">
                              {job.company}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                              <MapPin className="w-3 h-3" />
                              <span className="line-clamp-1">{job.location}</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 shrink-0">
                          {job.matchScore}% Match
                        </span>
                      </div>

                      {/* Title & Salary */}
                      <div>
                        <h3 className="text-sm font-black text-neutral-900 line-clamp-2 leading-snug">
                          {job.title}
                        </h3>
                        <p className="text-xs font-bold text-neutral-600 mt-1">
                          {job.salary}
                        </p>
                      </div>

                      {/* Skills Tags */}
                      {job.tags && job.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {job.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      href="/jobs"
                      className="inline-flex items-center justify-between w-full pt-3 border-t border-neutral-100 text-xs font-black text-[#0A1B5C] hover:text-[#0c2277] group"
                    >
                      <span>View Role Details</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================================
              COMMENTED OUT FEATURES (Can be re-enabled later based on requirements)
              ========================================================================= */}

          {/*
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200/70 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    +12% this week
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    94 <span className="text-base text-neutral-400 font-bold">/ 100</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-800 mt-0.5">Master Resume ATS Score</div>
                  <div className="text-[11px] text-neutral-500 mt-1">Google XYZ Compliant · 0 blockers</div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600">
                    <span>Impact Quantification</span>
                    <span className="font-extrabold text-[#0A1B5C]">92%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0A1B5C] to-[#142d8a] rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>

              <Link
                href="/jobs/resume"
                className="mt-4 pt-3 border-t border-neutral-100 text-xs font-bold text-[#0A1B5C] hover:text-[#0c2277] flex items-center justify-between group"
              >
                <span>Edit Bullets in Studio</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-[11px] font-black border border-[#0A1B5C]/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#0A1B5C]" />
                    6 new today
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    48 <span className="text-base text-neutral-400 font-bold">Roles</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-800 mt-0.5">High-Vector Tech Matches</div>
                  <div className="text-[11px] text-neutral-500 mt-1">Calibrated to 85%+ semantic fit</div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100">
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">Uber</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">ServiceNow</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">Stripe</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">Google</span>
                </div>
              </div>

              <Link
                href="/jobs"
                className="mt-4 pt-3 border-t border-neutral-100 text-xs font-bold text-[#0A1B5C] hover:text-[#0c2277] flex items-center justify-between group"
              >
                <span>Browse Matched Positions</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-black border border-blue-200/70 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    Skip The Line
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    14 <span className="text-base text-neutral-400 font-bold">Insiders</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-800 mt-0.5">Verified Corporate Referrals</div>
                  <div className="text-[11px] text-neutral-500 mt-1">4.8x higher interview conversion</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-600">
                  <span>Fastest response:</span>
                  <span className="font-extrabold text-emerald-700">~4 hours</span>
                </div>
              </div>

              <Link
                href="/jobs"
                className="mt-4 pt-3 border-t border-neutral-100 text-xs font-bold text-[#0A1B5C] hover:text-[#0c2277] flex items-center justify-between group"
              >
                <span>Request Employee Vouchers</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-[11px] font-black border border-rose-200/70 flex items-center gap-1">
                    <Award className="w-3 h-3 text-rose-600" />
                    Strong Hire
                  </span>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    88 <span className="text-base text-neutral-400 font-bold">/ 100</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-800 mt-0.5">FAANG Bar-Raiser Score</div>
                  <div className="text-[11px] text-neutral-500 mt-1">Top 6% engineering percentile</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-600">
                  <span>System Design:</span>
                  <span className="font-extrabold text-neutral-900">91% Ready</span>
                </div>
              </div>

              <Link
                href="/jobs/mock-interviews"
                className="mt-4 pt-3 border-t border-neutral-100 text-xs font-bold text-[#0A1B5C] hover:text-[#0c2277] flex items-center justify-between group"
              >
                <span>Practice Technical Loops</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                    Application Velocity & Pipeline Funnel
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-[10px] font-extrabold">
                    REAL-TIME
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Track how your verified employee referrals move candidates through company hiring loops.
                </p>
              </div>

              <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-bold text-neutral-600">
                <button
                  type="button"
                  onClick={() => setFunnelTimeframe('7d')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    funnelTimeframe === '7d' ? 'bg-white text-[#0A1B5C] shadow-xs font-extrabold' : 'hover:text-neutral-900'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelTimeframe('30d')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    funnelTimeframe === '30d' ? 'bg-white text-[#0A1B5C] shadow-xs font-extrabold' : 'hover:text-neutral-900'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelTimeframe('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    funnelTimeframe === 'all' ? 'bg-white text-[#0A1B5C] shadow-xs font-extrabold' : 'hover:text-neutral-900'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {currentFunnel.map((step, idx) => (
                <div
                  key={step.stage}
                  className="relative rounded-2xl bg-[#F8FAFC] border border-neutral-200/80 p-4 flex flex-col justify-between hover:bg-neutral-50/80 transition-all"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Step {idx + 1}
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                      {step.count}
                    </div>
                    <div className="text-xs font-extrabold text-neutral-800 leading-tight">
                      {step.stage}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-medium">Conversion</span>
                    <span className="font-extrabold text-emerald-700">{step.rate}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-[#0A1B5C]/5 to-[#0A1B5C]/10 border border-[#0A1B5C]/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0A1B5C] text-white flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#0A1B5C]">
                    Pipeline Velocity: 3.4 Days to Recruiter Screen
                  </h4>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Your verified internal endorsements bypass applicant tracking filters, generating interviews 5.8x faster than standard portals.
                  </p>
                </div>
              </div>

              <Link
                href="/jobs"
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1B5C] text-white hover:bg-[#0d2379] text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <span>View Job Recommendations</span>
                <ChevronRight className="w-4 h-4 text-white" />
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-neutral-900 tracking-tight">
                    Jobs Modules & Features
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Direct access to your AI career copilots and specialized job hunt tools.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-[10px] font-extrabold">
                        48 MATCHES
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900">AI Job Recommendations</h4>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Instant matching algorithm comparing your Master Resume with verified vacancies at ServiceNow, Google, and Uber.
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-900">Staff Distributed Systems</span>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">96% Match</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">Uber · $240,000 - $290,000</div>
                    </div>
                  </div>

                  <Link
                    href="/jobs"
                    className="inline-flex items-center justify-between w-full pt-3 border-t border-neutral-100 text-xs font-black text-[#0A1B5C] hover:text-[#0c2277] group"
                  >
                    <span>Open Recommendations Feed</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold">
                        94 / 100 ATS
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900">Master Resume Studio</h4>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Deterministic 0ms Google XYZ formula rewriter, bullet point impact quantification, and vector PDF export.
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-900">Staff Backend Master v3</span>
                        <span className="text-[10px] text-neutral-500 font-semibold">28 Bullets</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">Google XYZ compliance: 100% verified</div>
                    </div>
                  </div>

                  <Link
                    href="/jobs/resume"
                    className="inline-flex items-center justify-between w-full pt-3 border-t border-neutral-100 text-xs font-black text-[#0A1B5C] hover:text-[#0c2277] group"
                  >
                    <span>Edit in Resume Studio</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-800 text-[10px] font-extrabold">
                        AUTONOMOUS
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900">Candidate Copilot Agent</h4>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        24/7 background agent discovering relevant roles, tracking corporate vacancies, and matching internal referrers.
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-neutral-700">Status: Scanning every 2 hours</span>
                    </div>
                  </div>

                  <Link
                    href="/jobs/agent"
                    className="inline-flex items-center justify-between w-full pt-3 border-t border-neutral-100 text-xs font-black text-[#0A1B5C] hover:text-[#0c2277] group"
                  >
                    <span>Configure AI Agent</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Video className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold">
                        NEW
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-neutral-900">AI Mock Interview Coach</h4>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        Simulate Tier-1 engineering interview loops, technical deep-dives, and STAR format leadership evaluations.
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/60 space-y-1 text-xs">
                      <div className="font-bold text-neutral-800">Next Recommended Practice:</div>
                      <div className="text-[11px] text-neutral-500">Distributed Event Pipeline (45 min)</div>
                    </div>
                  </div>

                  <Link
                    href="/jobs/mock-interviews"
                    className="inline-flex items-center justify-between w-full pt-3 border-t border-neutral-100 text-xs font-black text-[#0A1B5C] hover:text-[#0c2277] group"
                  >
                    <span>Launch Interview Coach</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">
                  Recent Activity Stream
                </h3>
                <p className="text-xs text-neutral-500">
                  Real-time updates on your referrals, scans, and candidate milestones.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="space-y-4">
                  {activityItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="flex items-start gap-3 text-xs pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
                        <div className={`w-8 h-8 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-bold text-neutral-900 leading-snug">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-neutral-500 leading-snug">
                            {item.detail}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {item.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl bg-[#0A1B5C] text-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-white/90">
                    <Sparkles className="w-4 h-4" />
                    <span>AI NEXT BEST ACTION</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    Quantify throughput metrics on your Kafka streaming bullet to unlock 6 additional Staff Distributed Systems positions.
                  </p>
                  <Link
                    href="/jobs/resume"
                    className="inline-flex items-center gap-1.5 text-xs font-black text-white hover:text-neutral-200 transition-colors"
                  >
                    <span>Update Bullet Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
          */}
        </main>
      </div>
    </div>
  );
}

export const JobPassOverviewDashboard = JobsOverviewDashboard;

