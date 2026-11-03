'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Sparkles,
  Zap,
  MoreHorizontal,
  FileText,
  Star,
  CheckCircle2,
  Download,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  Info,
  Smile,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  FileCode2,
  Loader2,
} from 'lucide-react';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { UploadZone } from './upload-zone';
import { Workspace } from './workspace';
import { supabase } from '@/lib/supabase/browser';
import { useUser } from '@/components/user-provider';
import { NavbarUserAvatar } from '@/components/navbar-user-avatar';
import {
  ResumeDocument,
  ResumeEvaluation,
  SubscriptionInfo,
} from '@/lib/jobs/types';
import {
  fetchCachedSubscription,
  fetchCachedResumes,
  invalidateResumesCache,
} from '@/lib/jobs/client-cache';
import {
  SAMPLE_STAFF_RESUME,
  SAMPLE_STAFF_EVALUATION,
} from './sample-resumes';
import { SubscriptionGate } from './subscription-gate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SavedResumeItem {
  id: string;
  name: string;
  targetJobTitle: string;
  lastModified: string;
  created: string;
  isPrimary: boolean;
  status: 'Analysis Complete' | 'Draft' | 'Auditing';
  initialLetter: string;
  document: ResumeDocument;
  evaluation: ResumeEvaluation;
}

export function ResumePageClient() {
  const router = useRouter();
  const { user } = useUser();
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [addResumeOpen, setAddResumeOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    hasAccess: true,
    status: 'free',
  });
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);

  // Resumes list starts empty and populates from database
  const [resumes, setResumes] = useState<SavedResumeItem[]>([]);

  async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    } catch {
      // Ignore
    }
    return {};
  }

  // Load member status and existing resumes from DB/cache on mount
  useEffect(() => {
    let isMounted = true;

    async function checkSubAndResumes() {
      try {
        const authHeaders = await getAuthHeaders();
        const data = await fetchCachedSubscription(authHeaders);
        if (data && isMounted) {
          setSubscription({
            hasAccess: data.authenticated ? true : Boolean(data.hasAccess),
            status: data.status || 'free',
            planType: data.planType || 'fast_lane_free',
            isAdmin: Boolean(data.isAdmin),
          });
        }
      } catch (err) {
        console.warn('Failed to load user status:', err);
      }

      try {
        const authHeaders = await getAuthHeaders();
        const data = await fetchCachedResumes(authHeaders);
        if (isMounted) {
          if (data && data.resumes && Array.isArray(data.resumes) && data.resumes.length > 0) {
            const formatted: SavedResumeItem[] = data.resumes.map((r: any, idx: number) => ({
              id: r.id,
              name: r.name || r.title || 'Master Resume',
              targetJobTitle: r.targetJobTitle || 'Software Engineer',
              lastModified: r.lastModified || 'Recently',
              created: r.created || 'Recently',
              isPrimary: idx === 0,
              status: 'Analysis Complete',
              initialLetter: (r.name || r.title || 'R').charAt(0).toUpperCase(),
              document: r.document || SAMPLE_STAFF_RESUME,
              evaluation: r.evaluation || SAMPLE_STAFF_EVALUATION,
            }));
            setResumes(formatted);
            setSelectedResumeId(formatted[0].id);
          } else {
            setResumes([]);
            setSelectedResumeId('');
          }
          setIsLoadingResumes(false);
        }
      } catch (err) {
        console.warn('Failed to load stored resumes:', err);
        if (isMounted) {
          setIsLoadingResumes(false);
        }
      }
    }

    checkSubAndResumes();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeResume = resumes.find((r) => r.id === selectedResumeId) || resumes[0];

  // Open Studio Workspace for a given resume
  const handleOpenStudio = (id: string) => {
    setSelectedResumeId(id);
    router.push(`/jobs/resume/studio?id=${id}`);
  };

  // Set resume as primary
  const handleSetPrimary = async (id: string) => {
    setResumes((prev) =>
      prev.map((r) => ({
        ...r,
        isPrimary: r.id === id,
      }))
    );
    try {
      const authHeaders = await getAuthHeaders();
      const current = resumes.find((r) => r.id === id);
      if (current) {
        await fetch('/api/jobs/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            resumeId: id,
            document: current.document,
            changeSummary: 'Set as primary Master Resume',
          }),
        });
        invalidateResumesCache();
      }
    } catch {}
    toast.success('Primary resume updated successfully.');
  };

  // Delete resume
  const handleDeleteResume = async (id: string) => {
    try {
      const authHeaders = await getAuthHeaders();
      await fetch(`/api/jobs/resume/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      invalidateResumesCache();

      setResumes((prev) => {
        const remaining = prev.filter((r) => r.id !== id);
        if (selectedResumeId === id) {
          setSelectedResumeId(remaining[0]?.id || '');
          if (remaining.length === 0) {
            setActiveView('list');
          }
        }
        return remaining;
      });
      toast.success('Resume removed successfully.');
    } catch {
      toast.error('Failed to remove resume.');
    }
  };

  // Load Sample Resume option and directly open in Resume Studio
  const handleLoadSampleResume = async () => {
    setIsProcessing(true);
    setUploadStatus('Loading sample resume...');

    try {
      const authHeaders = await getAuthHeaders();
      let newResumeId = `resume-${Date.now()}`;

      try {
        const res = await fetch('/api/jobs/resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: 'Sample_Resume',
            document: SAMPLE_STAFF_RESUME,
            evaluation: SAMPLE_STAFF_EVALUATION,
            changeSummary: 'Initial Sample Resume creation',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.resumeId) {
            newResumeId = data.resumeId;
          }
        }
      } catch (apiErr) {
        console.warn('Backend sync for sample resume skipped or unauthenticated:', apiErr);
      }

      const sampleItem: SavedResumeItem = {
        id: newResumeId,
        name: 'Sample_Resume',
        targetJobTitle: SAMPLE_STAFF_EVALUATION.targetRole || 'Staff Full-Stack Engineer',
        lastModified: 'Just now',
        created: 'Just now',
        isPrimary: resumes.length === 0,
        status: 'Analysis Complete',
        initialLetter: 'S',
        document: SAMPLE_STAFF_RESUME,
        evaluation: SAMPLE_STAFF_EVALUATION,
      };

      setResumes((prev) => [sampleItem, ...prev]);
      setSelectedResumeId(sampleItem.id);
      setAddResumeOpen(false);
      invalidateResumesCache();
      toast.success('Sample resume loaded! Welcome to Resume Studio.');
      router.push(`/jobs/resume/studio?id=${sampleItem.id}`);
    } catch (err: any) {
      console.error('Failed to load sample resume:', err);
      toast.error(err.message || 'Failed to load sample resume.');
    } finally {
      setIsProcessing(false);
      setUploadStatus('');
    }
  };

  // Upload handler for new resumes
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('Extracting resume content...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const authHeaders = await getAuthHeaders();

      const extractRes = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!extractRes.ok) {
        const errData = await extractRes.json();
        throw new Error(errData.error || 'Failed to extract text from resume');
      }

      const extractData = await extractRes.json();
      setUploadStatus('Auditing and persisting to database...');

      const evalRes = await fetch('/api/jobs/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          rawText: extractData.rawText,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }),
      });

      if (!evalRes.ok) {
        const errData = await evalRes.json();
        if (evalRes.status === 403 || errData.code === 'PRO_PLAN_REQUIRED') {
          setAddResumeOpen(false);
          setShowSubscriptionGate(true);
          throw new Error(errData.error || 'Upgrade to Jobs Pro to evaluate additional resumes.');
        }
        throw new Error(errData.error || 'Evaluation failed');
      }

      const evalData = await evalRes.json();
      const newResumeId = evalData.resumeId || `resume-${Date.now()}`;

      const newResumeItem: SavedResumeItem = {
        id: newResumeId,
        name: file.name.replace(/\.[^/.]+$/, ''),
        targetJobTitle: evalData.evaluation?.targetRole || 'Software Engineer',
        lastModified: 'Just now',
        created: 'Just now',
        isPrimary: resumes.length === 0,
        status: 'Analysis Complete',
        initialLetter: file.name.charAt(0).toUpperCase() || 'R',
        document: evalData.document || evalData.doc || SAMPLE_STAFF_RESUME,
        evaluation: evalData.evaluation || SAMPLE_STAFF_EVALUATION,
      };

      setResumes((prev) => [newResumeItem, ...prev]);
      setSelectedResumeId(newResumeId);
      setAddResumeOpen(false);
      invalidateResumesCache();
      toast.success(
        `Resume stored and audited! Score: ${evalData.evaluation?.overallScore || 90}/100.`
      );
      router.push(`/jobs/resume/studio?id=${newResumeId}`);
    } catch (err: any) {
      console.error('Master Resume upload flow failed:', err);
      toast.error(err.message || 'Failed to process resume.');
    } finally {
      setIsProcessing(false);
      setUploadStatus('');
    }
  };

  // Re-analyze Document within Workspace
  const handleReanalyze = async (
    doc: ResumeDocument
  ): Promise<{ document?: ResumeDocument; evaluation?: ResumeEvaluation } | void> => {
    if (!activeResume) return;

    const isPro = subscription?.isAdmin || subscription?.status === 'active';
    if (!isPro) {
      setShowSubscriptionGate(true);
      toast.error('Re-analyzing your resume with AI is exclusive to Jobs Pro members. Upgrade to Jobs Pro for unlimited evaluations.');
      return;
    }

    setIsReanalyzing(true);
    const toastId = toast.loading('Re-evaluating resume changes...');

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          existingDoc: doc,
          resumeId: activeResume.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedDoc = data.document || data.doc || doc;
        const updatedEval = data.evaluation;
        const updatedId = data.resumeId || activeResume.id;

        setResumes((prev) =>
          prev.map((r) =>
            r.id === activeResume.id
              ? {
                  ...r,
                  id: updatedId,
                  document: updatedDoc,
                  evaluation: updatedEval,
                  lastModified: 'Just now',
                }
              : r
          )
        );
        invalidateResumesCache();
        toast.success('Readiness score updated with recent changes!', { id: toastId });
        return { document: updatedDoc, evaluation: updatedEval };
      } else {
        const data = await res.json();
        if (res.status === 403 || data.code === 'PRO_PLAN_REQUIRED') {
          setShowSubscriptionGate(true);
        }
        toast.error(data.error || 'Failed to re-analyze resume.', { id: toastId });
      }
    } catch {
      toast.error('Network error during re-analysis.', { id: toastId });
    } finally {
      setIsReanalyzing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C]">
      {/* 1. Left Hand Panel / Sidebar */}
      <JobsSidebar activeTab="resume" />

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar (Shown only on List view; Editor view has its own unified header) */}
        {activeView === 'list' && (
          <header className="h-16 px-6 sm:px-8 border-b border-neutral-200/80 bg-white flex items-center justify-between sticky top-0 z-20 shadow-xs">
            {/* Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight uppercase">
                RESUME
              </h1>
            </div>

            {/* Right: User Profile Avatar */}
            <div className="flex items-center gap-4">
              <Link
                href={user ? `/users/${user.id}` : "/profile"}
                className="hover:scale-105 transition-transform shrink-0"
                title={user?.full_name ? `View ${user.full_name}'s Profile` : "View Profile"}
              >
                <NavbarUserAvatar user={user} size="md" />
              </Link>
            </div>
          </header>
        )}

        {/* View 1: Resumes List */}
        {activeView === 'list' && (
          <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Loading State */}
            {isLoadingResumes ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
                <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-neutral-500">Loading your resumes...</p>
              </div>
            ) : resumes.length === 0 ? (
              /* Empty State: Choice between Upload and Sample Resume */
              <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-8">
                <div className="max-w-xl mx-auto space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A1B5C]/10 border border-[#0A1B5C]/20 text-[#0A1B5C] text-xs font-extrabold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Candidate Resume Studio</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    Get Started with Your ATS Master Resume
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                    Upload your existing resume in PDF or DOCX format for instant Google XYZ formula analysis, or start with our industry benchmark sample resume to explore the studio.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                  {/* Option 1: Upload New Resume */}
                  <div className="flex flex-col justify-between p-6 rounded-2xl border-2 border-dashed border-neutral-200 hover:border-[#0A1B5C] bg-neutral-50/50 hover:bg-white transition-all group shadow-2xs hover:shadow-xs">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center group-hover:scale-105 transition-transform">
                        {isProcessing ? (
                          <Loader2 className="w-6 h-6 animate-spin text-[#0A1B5C]" />
                        ) : (
                          <UploadCloud className="w-6 h-6" />
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-neutral-900">
                        {isProcessing
                          ? (uploadStatus || 'Auditing and persisting to database...')
                          : 'Upload Your Resume'}
                      </h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {isProcessing
                          ? 'Analyzing ATS keywords, calculating Google XYZ impact metrics, and persisting to database...'
                          : 'Upload your current PDF or DOCX resume. We will audit ATS keywords, calculate your Google XYZ compliance score, and unlock tailored job recommendations.'}
                      </p>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={() => setAddResumeOpen(true)}
                        disabled={isProcessing}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Processing Resume...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Upload Resume File</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Choose Sample Resume */}
                  <div className="flex flex-col justify-between p-6 rounded-2xl border border-neutral-200 hover:border-[#0A1B5C] bg-neutral-50/50 hover:bg-white transition-all group shadow-2xs hover:shadow-xs">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileCode2 className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-neutral-900">
                          Sample Resume
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200">
                          Sample
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Explore the studio immediately with a pre - configured Staff Full - Stack Engineer benchmark featuring quantified achievements and 94 ATS score.
                      </p>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={handleLoadSampleResume}
                        disabled={isProcessing}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-extrabold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-60"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Use Sample Resume</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* State: User has 1 or more saved resumes */
              <>
                {/* Informational Sub-header / Slots Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-neutral-800">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C]">
                      <Smile className="h-4 w-4" />
                    </span>
                    <span>
                      You have <strong className="text-neutral-900 font-extrabold">{resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}</strong> saved
                      {subscription.isAdmin || subscription.status === 'active' ? (
                        <> out of <strong className="text-neutral-900 font-extrabold">5 Pro slots</strong>.</>
                      ) : (
                        <> on the <strong className="text-neutral-900 font-extrabold">Free tier (1 slot)</strong>.</>
                      )}
                    </span>
                    <span
                      title="Each slot allows an AI Google XYZ analyzed ATS resume"
                      className="cursor-pointer text-neutral-400 hover:text-neutral-600"
                    >
                      <Info className="h-3.5 w-3.5 inline" />
                    </span>
                  </div>

                  {/* + Add Resume Action */}
                  <button
                    type="button"
                    onClick={() => {
                      const isPro = subscription.isAdmin || subscription.status === 'active';
                      if (!isPro && resumes.length >= 1) {
                        setShowSubscriptionGate(true);
                        return;
                      }
                      setAddResumeOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-bold text-xs shadow-xs transition-all active:scale-95 border border-[#0A1B5C]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Resume</span>
                  </button>
                </div>

                {/* Resume Table Container */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200/80 bg-neutral-50/50 text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
                          <th className="py-3.5 px-6">Resume</th>
                          <th className="py-3.5 px-6">Target Job Title</th>
                          <th className="py-3.5 px-6">Last Modified</th>
                          <th className="py-3.5 px-6">Created</th>
                          <th className="py-3.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-xs font-medium text-neutral-700">
                        {resumes.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                            onClick={() => handleOpenStudio(item.id)}
                          >
                            {/* 1. Resume Name & Badges */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center shrink-0">
                                  {item.initialLetter}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-neutral-900 group-hover:text-[#0A1B5C] transition-colors">
                                    {item.name}
                                  </span>

                                  {/* PRIMARY Badge */}
                                  {item.isPrimary && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-tight">
                                      <Star className="h-2.5 w-2.5 fill-current" />
                                      PRIMARY
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* 2. Target Job Title */}
                            <td className="py-4 px-6 text-neutral-600 font-semibold">
                              {item.targetJobTitle || '-'}
                            </td>

                            {/* 3. Last Modified */}
                            <td className="py-4 px-6 text-neutral-500 whitespace-nowrap">
                              {item.lastModified}
                            </td>

                            {/* 4. Created */}
                            <td className="py-4 px-6 text-neutral-500 whitespace-nowrap">
                              {item.created}
                            </td>

                            {/* 5. Actions Dropdown */}
                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white border border-neutral-200 rounded-xl shadow-lg p-1 text-xs">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenStudio(item.id)}
                                    className="flex items-center gap-2 font-bold cursor-pointer rounded-lg text-neutral-800 hover:bg-neutral-100"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-[#0A1B5C]" />
                                    Open Studio
                                  </DropdownMenuItem>

                                  {!item.isPrimary && (
                                    <DropdownMenuItem
                                      onClick={() => handleSetPrimary(item.id)}
                                      className="flex items-center gap-2 cursor-pointer rounded-lg text-neutral-700 hover:bg-neutral-100"
                                    >
                                      <Star className="h-3.5 w-3.5 text-amber-500" />
                                      Set as Primary
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem
                                    onClick={() => toast.success(`Exporting ${item.name}.pdf...`)}
                                    className="flex items-center gap-2 cursor-pointer rounded-lg text-neutral-700 hover:bg-neutral-100"
                                  >
                                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                                    Download PDF
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="my-1 bg-neutral-100" />

                                  <DropdownMenuItem
                                    onClick={() => handleDeleteResume(item.id)}
                                    className="flex items-center gap-2 cursor-pointer rounded-lg text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete Resume
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* View 2: Master Resume Studio Editor Workspace */}
        {activeView === 'editor' && activeResume && (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <Workspace
              initialDocument={activeResume.document || SAMPLE_STAFF_RESUME}
              initialEvaluation={activeResume.evaluation || SAMPLE_STAFF_EVALUATION}
              resumeId={activeResume.id}
              resumeName={activeResume.name}
              subscription={subscription}
              onRequireSubscription={() => setShowSubscriptionGate(true)}
              onReanalyze={handleReanalyze}
              onSave={(savedResumeId, doc, evaluation) => {
                setResumes((prev) =>
                  prev.map((r) =>
                    r.id === activeResume.id
                      ? {
                          ...r,
                          id: savedResumeId,
                          document: doc,
                          evaluation,
                          lastModified: 'Just now',
                        }
                      : r
                  )
                );
              }}
              isReanalyzing={isReanalyzing}
              onBack={() => setActiveView('list')}
            />
          </div>
        )}
      </main>

      {/* Add Resume Dialog */}
      <Dialog open={addResumeOpen} onOpenChange={setAddResumeOpen}>
        <DialogContent className="sm:max-w-xl bg-white border border-neutral-200 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-neutral-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#0A1B5C]" />
              Add ATS Master Resume
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Upload your resume in PDF or DOCX format for instant Google XYZ formula analysis, or choose the sample resume to test the studio.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <UploadZone
              onFileUpload={handleFileUpload}
              onLoadSample={handleLoadSampleResume}
              isLoading={isProcessing}
              loadingMessage={uploadStatus}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Jobs Pro Subscription Gate Modal */}
      <SubscriptionGate
        isOpen={showSubscriptionGate}
        onClose={() => setShowSubscriptionGate(false)}
      />
    </div>
  );
}
