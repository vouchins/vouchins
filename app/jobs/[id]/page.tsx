'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Users,
  Copy,
  Check,
  Building2,
  FileText,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { CompanyLogo } from '@/components/jobs/company-logo';
import { Button } from '@/components/ui/button';
import { cleanJobApplyUrl } from '@/lib/jobs/url-cleaner';

interface JobDetailPayload {
  id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  workplace_type: string;
  job_type: string;
  experience_level: string;
  category?: string;
  salary_range?: string;
  description?: string;
  requirements?: string;
  external_apply_url?: string;
  is_internal?: boolean;
  match_score?: number;
  match_breakdown?: {
    skillsScore: number;
    experienceScore: number;
    stackScore: number;
  };
  why_you_match?: string;
  matching_skills?: string[];
  missing_skills?: string[];
  insider_count?: number;
  created_at?: string;
}

function formatPostedAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  } catch {
    return 'Recently';
  }
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [job, setJob] = useState<JobDetailPayload | null>(null);
  const [hasMasterResume, setHasMasterResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadJob() {
      if (!jobId) return;
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
        if (res.status === 404) {
          if (isMounted) setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setJob(data.job || null);
            setHasMasterResume(Boolean(data.hasMasterResume));
          }
        } else if (isMounted) {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load job details:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadJob();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const handleCopyUrl = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success('Job link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const applyUrl = job?.external_apply_url ? cleanJobApplyUrl(job.external_apply_url) : '';

  return (
    <div className="flex h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#4FD1C5]/30 selection:text-[#0A1B5C]">
      {/* Left Sidebar */}
      <JobsSidebar activeTab="jobs" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden pb-14 md:pb-0">
        <JobsNavbar />

        <div className="flex-1 overflow-y-auto">
          <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/jobs/list"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#0A1B5C] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to All Jobs</span>
              </Link>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Share Job</span>
                  </>
                )}
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-neutral-200/90 p-12 flex flex-col items-center justify-center gap-3 shadow-xs">
                <Loader2 className="h-7 w-7 animate-spin text-[#0A1B5C]" />
                <p className="text-xs font-semibold text-neutral-500">Loading job details...</p>
              </div>
            ) : notFound || !job ? (
              <div className="bg-white rounded-3xl border border-neutral-200/90 p-10 text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
                  <Briefcase className="h-6 w-6 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-neutral-900">Job not found</h1>
                  <p className="text-xs text-neutral-500">
                    This position may have closed or the link is no longer active.
                  </p>
                </div>
                <Link
                  href="/jobs/list"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold transition-colors"
                >
                  Browse Open Roles
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header Card */}
                <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <CompanyLogo
                        logoUrl={job.company_logo}
                        companyName={job.company_name}
                        size={56}
                        className="rounded-2xl border border-neutral-200 shrink-0"
                      />
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-md font-bold text-[#0A1B5C] flex items-center gap-1">
                            {job.company_name}
                          </span>
                          <span className="text-neutral-300">•</span>
                          <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatPostedAgo(job.created_at)}
                          </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-snug">
                          {job.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold">
                            <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                            {job.location || 'Remote'}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-[#4FD1C5]/15 text-[#0A1B5C] text-xs font-bold">
                            {job.workplace_type}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold">
                            {job.job_type}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-semibold">
                            {job.experience_level}
                          </span>
                          {job.salary_range && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                              <DollarSign className="h-3.5 w-3.5" />
                              {job.salary_range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                      {hasMasterResume && typeof job.match_score === 'number' && (
                        <div className="px-3.5 py-2 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 text-center">
                          <div className="text-lg font-black text-[#0A1B5C]">{job.match_score}%</div>
                          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            Profile Match
                          </div>
                        </div>
                      )}

                      {applyUrl ? (
                        <a
                          href={applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                        >
                          <span>Apply on Company Site</span>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <Link
                          href={`/jobs/list?id=${encodeURIComponent(job.id)}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                        >
                          <span>Apply on Vouchins</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {typeof job.insider_count === 'number' && job.insider_count > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#4FD1C5]/10 border border-[#4FD1C5]/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0A1B5C]">
                        <Users className="h-4 w-4 text-[#0A1B5C]" />
                        <span>
                          {job.insider_count} verified insider{job.insider_count === 1 ? '' : 's'} at {job.company_name} ready to vouch
                        </span>
                      </div>
                      <Link
                        href={`/jobs/list?id=${encodeURIComponent(job.id)}`}
                        className="text-xs font-bold text-[#0A1B5C] hover:underline shrink-0"
                      >
                        Connect in Jobs →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Skill Alignment Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-white border border-neutral-200/90 space-y-3 shadow-xs">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Matched Competencies ({hasMasterResume ? (job.matching_skills?.length || 0) : 0})
                    </span>
                    {!hasMasterResume ? (
                      <p className="text-xs text-neutral-500 font-medium">
                        Upload your resume to see matching skills
                      </p>
                    ) : job.matching_skills && job.matching_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {job.matching_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">
                        No direct overlap detected with skills on your active resume.
                      </p>
                    )}
                  </div>

                  <div className="p-5 rounded-3xl bg-white border border-neutral-200/90 space-y-3 shadow-xs">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Keywords Missing ({hasMasterResume ? (job.missing_skills?.length || 0) : 0})
                    </span>
                    {!hasMasterResume ? (
                      <p className="text-xs text-neutral-500 font-medium">
                        Upload your resume to see missing keywords
                      </p>
                    ) : job.missing_skills && job.missing_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {job.missing_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                          >
                            + {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 font-medium">
                        ✓ Great alignment - No missing core keywords detected.
                      </p>
                    )}
                  </div>
                </div>

                {/* Description & Requirements Card */}
                <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 shadow-xs space-y-6">
                  {hasMasterResume && job.why_you_match && (
                    <div className="p-4 rounded-2xl bg-[#0A1B5C]/[0.03] border border-[#0A1B5C]/10 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A1B5C] uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5 text-[#4FD1C5]" />
                        <span>Why Your Profile Matches</span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
                        {job.why_you_match}
                      </p>
                    </div>
                  )}

                  {job.description && (
                    <div className="space-y-2.5">
                      <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#0A1B5C]" />
                        Role Description
                      </h2>
                      <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {job.description}
                      </div>
                    </div>
                  )}

                  {job.requirements && (
                    <div className="space-y-2.5 pt-4 border-t border-neutral-100">
                      <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                        Requirements & Skills
                      </h2>
                      <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                        {job.requirements}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
                    <Link href="/resume">
                      <Button
                        variant="outline"
                        className="rounded-xl border-neutral-200 text-xs font-bold text-[#0A1B5C] hover:bg-neutral-50"
                      >
                        Tailor Resume for This Role
                      </Button>
                    </Link>
                    {applyUrl && (
                      <a
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <span>Apply Now</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
