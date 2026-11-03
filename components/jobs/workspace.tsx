'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ResumeDocument,
  ResumeEvaluation,
  ResumeSuggestion,
  SubscriptionInfo,
} from '@/lib/jobs/types';
import { evaluateResumeHeuristically } from '@/lib/jobs/xyz-evaluator';
import { invalidateResumesCache } from '@/lib/jobs/client-cache';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { EvaluationDashboard } from './evaluation-dashboard';
import { ResumeCanvas } from './resume-canvas';
import { PDFDownloadButton } from './pdf-download-button';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Save,
  Briefcase,
  Share2,
  RefreshCw,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/browser';
import { useUser } from '@/components/user-provider';
import { NavbarUserAvatar } from '@/components/navbar-user-avatar';
import {
  SAMPLE_STAFF_RESUME,
  SAMPLE_STAFF_EVALUATION,
} from './sample-resumes';

interface WorkspaceProps {
  initialDocument?: ResumeDocument;
  initialEvaluation?: ResumeEvaluation;
  resumeId?: string;
  resumeName?: string;
  subscription?: SubscriptionInfo;
  onRequireSubscription?: () => void;
  onReanalyze?: (doc: ResumeDocument) => Promise<{ document?: ResumeDocument; evaluation?: ResumeEvaluation } | void>;
  onSave?: (savedResumeId: string, doc: ResumeDocument, evaluation: ResumeEvaluation) => void;
  isReanalyzing?: boolean;
  onBack?: () => void;
}

export function Workspace({
  initialDocument,
  initialEvaluation,
  resumeId,
  resumeName,
  subscription,
  onRequireSubscription,
  onReanalyze,
  onSave,
  isReanalyzing = false,
  onBack,
}: WorkspaceProps) {
  const { user } = useUser();
  const [document, setDocument] = useState<ResumeDocument>(() => initialDocument || SAMPLE_STAFF_RESUME);
  const [evaluation, setEvaluation] = useState<ResumeEvaluation>(() => initialEvaluation || SAMPLE_STAFF_EVALUATION);
  const [currentResumeId, setCurrentResumeId] = useState<string | undefined>(resumeId);

  useEffect(() => {
    if (resumeId) {
      setCurrentResumeId(resumeId);
    }
  }, [resumeId]);
  const [activeTab, setActiveTab] = useState<'both' | 'dashboard' | 'canvas'>('both');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [matchedJobsOpen, setMatchedJobsOpen] = useState(false);
  const [matchedJobs, setMatchedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

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

  // Synchronize state when parent triggers an updated evaluation or document (e.g. via Re-analyze)
  useEffect(() => {
    if (initialEvaluation && initialDocument) {
      const docBullets = new Set((initialDocument.experience || []).flatMap((e) => e.bullets || []));
      const hasLegacyPlaceholder = initialEvaluation.suggestions?.some(
        (s) =>
          s.originalText?.includes('1.5M daily active requests') ||
          s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%')
      );

      if (hasLegacyPlaceholder) {
        const fresh = evaluateResumeHeuristically(initialDocument);
        setEvaluation(fresh);
      } else {
        const syncedSuggestions = (initialEvaluation.suggestions || []).map((s) => {
          if (docBullets.has(s.suggestedRewrite)) {
            return { ...s, applied: true };
          }
          return s;
        });
        setEvaluation({
          ...initialEvaluation,
          suggestions: syncedSuggestions,
        });
      }
    } else if (initialEvaluation) {
      setEvaluation(initialEvaluation);
    }
  }, [initialEvaluation, initialDocument]);

  useEffect(() => {
    if (initialDocument) {
      setDocument(initialDocument);
    }
  }, [initialDocument]);

  // Tracks which bullet point in the canvas is currently pulsing with highlight
  const [highlightedCoordinate, setHighlightedCoordinate] = useState<{
    roleIndex: number;
    bulletIndex: number;
  } | null>(null);

  // Handle document edits in the canvas and live-recalculate readiness score
  const handleDocumentChange = (updatedDoc: ResumeDocument) => {
    setDocument(updatedDoc);
    const fresh = evaluateResumeHeuristically(updatedDoc);
    setEvaluation((prev) => ({
      ...prev,
      overallScore: fresh.overallScore,
      pillarScores: fresh.pillarScores,
      strengths: fresh.strengths,
      detectedSeniority: fresh.detectedSeniority,
      targetRole: fresh.targetRole,
    }));
  };

  // Apply a rewrite suggestion to the live document canvas and update readiness score
  const handleApplySuggestion = (suggestion: ResumeSuggestion) => {

    const { roleIndex, bulletIndex, suggestedRewrite } = suggestion;

    if (
      document.experience[roleIndex] &&
      document.experience[roleIndex].bullets[bulletIndex] !== undefined
    ) {
      const updatedExperience = [...document.experience];
      updatedExperience[roleIndex] = {
        ...updatedExperience[roleIndex],
        bullets: [...updatedExperience[roleIndex].bullets],
      };
      updatedExperience[roleIndex].bullets[bulletIndex] = suggestedRewrite;

      const updatedDoc: ResumeDocument = {
        ...document,
        experience: updatedExperience,
      };

      setDocument(updatedDoc);

      // Re-evaluate document dynamically with the metric-rich rewrite
      const fresh = evaluateResumeHeuristically(updatedDoc);

      // Update evaluation suggestion state
      const updatedSuggestions = evaluation.suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, applied: true } : s
      );

      setEvaluation({
        ...evaluation,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        suggestions: updatedSuggestions,
      });

      // Trigger visual pulse highlight on the target bullet in canvas
      setHighlightedCoordinate({ roleIndex, bulletIndex });
      setTimeout(() => {
        setHighlightedCoordinate(null);
      }, 2500);

      toast.success(`Rewrite applied! Readiness score boosted to ${fresh.overallScore}/100.`);
    }
  };

  // Revert an applied suggestion back to original
  const handleRevertSuggestion = (suggestion: ResumeSuggestion) => {
    const { roleIndex, bulletIndex, originalText } = suggestion;

    if (
      document.experience[roleIndex] &&
      document.experience[roleIndex].bullets[bulletIndex] !== undefined
    ) {
      const updatedExperience = [...document.experience];
      updatedExperience[roleIndex] = {
        ...updatedExperience[roleIndex],
        bullets: [...updatedExperience[roleIndex].bullets],
      };
      updatedExperience[roleIndex].bullets[bulletIndex] = originalText;

      const updatedDoc: ResumeDocument = {
        ...document,
        experience: updatedExperience,
      };

      setDocument(updatedDoc);

      const fresh = evaluateResumeHeuristically(updatedDoc);

      const updatedSuggestions = evaluation.suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, applied: false } : s
      );

      setEvaluation({
        ...evaluation,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        suggestions: updatedSuggestions,
      });

      toast.info('Suggestion reverted to original phrasing.');
    }
  };

  // Save current document state and persistent evaluation to Supabase
  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading('Saving resume draft and readiness score...');

    try {
      const fresh = evaluateResumeHeuristically(document);
      const currentEval: ResumeEvaluation = {
        ...evaluation,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        detectedSeniority: fresh.detectedSeniority,
        targetRole: fresh.targetRole,
      };

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          document,
          evaluation: currentEval,
          resumeId: currentResumeId || resumeId,
          title: `${document?.contact?.fullName || 'Candidate'} - Resume`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const savedEvaluation = data.evaluation || currentEval;
        if (data.evaluation) {
          setEvaluation(data.evaluation);
        }
        const savedId = data.resumeId || currentResumeId || resumeId;
        if (savedId) {
          setCurrentResumeId(savedId);
        }
        if (onSave && savedId) {
          onSave(savedId, document, savedEvaluation);
        }
        invalidateResumesCache();
        toast.success(`Resume draft and readiness score (${currentEval.overallScore}/100) saved!`, { id: toastId });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save resume.', { id: toastId });
      }
    } catch {
      toast.error('Network error saving resume.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Sync to Vouchins public.users profile
  const handleSyncProfile = async () => {
    setIsSyncing(true);
    const toastId = toast.loading('Syncing to Vouchins profile...');

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/resume/sync-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          jobSearchStatus: 'open_to_opportunities',
        }),
      });

      if (res.ok) {
        toast.success('Profile synced with job search preferences!', { id: toastId });
      } else {
        toast.error('Failed to sync to profile.', { id: toastId });
      }
    } catch {
      toast.error('Network error syncing profile.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Load Downstream Job Matching Hook
  const handleFetchMatchedJobs = async () => {
    setMatchedJobsOpen(true);
    if (matchedJobs.length > 0) return;

    setLoadingJobs(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/match-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          vectors: evaluation.jobMatchVectors,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMatchedJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load matched jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white">
      {/* ================================================================== */}
      {/* Unified Resume Studio Header (Navigation, Metadata & Studio Actions) */}
      {/* ================================================================== */}
      <header className="h-16 shrink-0 border-b border-neutral-200/90 bg-white px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs select-none">
        {/* Left: Back Button + Breadcrumbs + Resume Title + Target Role */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:text-[#0A1B5C] transition-colors shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to Resumes</span>
              <span className="sm:hidden">Back</span>
            </button>
          )}

          <span className="text-neutral-300 font-light select-none">|</span>

          {/* Title and metadata */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 truncate max-w-[150px] sm:max-w-xs md:max-w-sm">
                {resumeName || `${document?.contact?.fullName || 'Candidate'} - Master Resume`}
              </span>
              <span className="hidden lg:inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#0A1B5C]/10 text-[#0A1B5C] shrink-0">
                Job Pass
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 hidden md:inline truncate max-w-xs">
              Targeting {evaluation?.targetRole || 'Software Engineer'}
            </span>
          </div>

          {/* Readiness Score Badge */}
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Readiness: {evaluation?.overallScore ?? 0}/100
          </span>
        </div>

        {/* Center: Mobile View Toggle */}
        <div className="flex md:hidden items-center p-1 rounded-lg bg-neutral-100 text-xs shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded-md text-xs font-semibold ${
              activeTab === 'dashboard' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-600'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1 rounded-md text-xs font-semibold ${
              activeTab === 'canvas' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-600'
            }`}
          >
            Resume
          </button>
        </div>

        {/* Right: Actions + Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onReanalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const isPro = subscription?.isAdmin || subscription?.status === 'active';
                if (!isPro) {
                  if (onRequireSubscription) {
                    onRequireSubscription();
                  }
                  toast.error('Re-analyzing your resume with AI is exclusive to Jobs Pro members. Upgrade to Jobs Pro for unlimited evaluations.');
                  return;
                }
                const result = await onReanalyze(document);
                if (result?.document) {
                  setDocument(result.document);
                }
                if (result?.evaluation) {
                  setEvaluation(result.evaluation);
                }
              }}
              disabled={isReanalyzing}
              className="h-8 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 gap-1.5 hidden lg:inline-flex"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReanalyzing ? 'animate-spin text-[#0A1B5C]' : ''}`} />
              Re-analyze
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchMatchedJobs}
            className="h-8 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 gap-1.5 hidden sm:inline-flex"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#0A1B5C]" />
            Matched Jobs
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#0c2277] text-white gap-1.5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <PDFDownloadButton document={document} />

          {/* User Profile Avatar */}
          <span className="hidden sm:inline text-neutral-200 font-light select-none ml-1">|</span>
          <Link
            href={user ? `/users/${user.id}` : "/jobs/profile"}
            className="hover:scale-105 transition-transform shrink-0"
            title={user?.full_name ? `View ${user.full_name}'s Profile` : "View Profile"}
          >
            <NavbarUserAvatar user={user} size="md" />
          </Link>
        </div>
      </header>

      {/* ================================================================== */}
      {/* Two-Pane Resizable Workspace */}
      {/* ================================================================== */}
      <div className="flex-1 w-full overflow-hidden">
        {/* Desktop Split View */}
        <div className="hidden md:block h-full w-full">
          <ResizablePanelGroup direction="horizontal">
            {/* Left Pane: Evaluation Dashboard */}
            <ResizablePanel defaultSize={42} minSize={30} maxSize={55}>
              <EvaluationDashboard
                evaluation={evaluation}
                experience={document.experience}
                onApplySuggestion={handleApplySuggestion}
                onRevertSuggestion={handleRevertSuggestion}
              />
            </ResizablePanel>

            {/* Resizable Divider Handle */}
            <ResizableHandle withHandle />

            {/* Right Pane: Live ATS Canvas */}
            <ResizablePanel defaultSize={58} minSize={45}>
              <ResumeCanvas
                document={document}
                highlightedCoordinate={highlightedCoordinate}
                onChange={handleDocumentChange}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Tabbed View */}
        <div className="md:hidden h-full w-full overflow-hidden">
          {activeTab === 'dashboard' ? (
            <EvaluationDashboard
              evaluation={evaluation}
              experience={document.experience}
              onApplySuggestion={handleApplySuggestion}
              onRevertSuggestion={handleRevertSuggestion}
            />
          ) : (
            <ResumeCanvas
              document={document}
              highlightedCoordinate={highlightedCoordinate}
              onChange={handleDocumentChange}
            />
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* Downstream Job Matching Modal */}
      {/* ================================================================== */}
      {matchedJobsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C]">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    Verified Job Matches for Your Profile
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Algorithmic match based on your detected role, seniority, and technical skills.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMatchedJobsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {loadingJobs ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Matching profile vectors against active career opportunities...
                </div>
              ) : matchedJobs.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  No direct open job matches found right now. Check back soon!
                </div>
              ) : (
                matchedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl border border-neutral-200 hover:border-[#0A1B5C]/30 bg-neutral-50/50 hover:bg-white transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">{job.title}</h4>
                        <span className="text-xs font-semibold text-[#0A1B5C]">
                          {job.companyName}
                        </span>
                        <span className="text-xs text-neutral-500"> • {job.location}</span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        {job.matchScore}% Match
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-neutral-600">
                      {job.reasons?.map((reason: string, rIdx: number) => (
                        <div key={rIdx} className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 mt-1">
                      <span className="text-xs font-semibold text-neutral-700">
                        {job.salaryRange || 'Competitive compensation'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          toast.success(`Application initiated for ${job.title} at ${job.companyName}`);
                          setMatchedJobsOpen(false);
                        }}
                        className="h-7 px-3 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white rounded-lg"
                      >
                        Apply with Resume
                        <ChevronRight className="h-3 w-3 text-[#4FD1C5]" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
