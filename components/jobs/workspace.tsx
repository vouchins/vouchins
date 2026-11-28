'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ResumeDocument,
  ResumeEvaluation,
  ResumeSuggestion,
  SubscriptionInfo,
  isUserProOrElite,
  JobMatchVectors,
} from '@/lib/jobs/types';
import { evaluateResumeHeuristically, detectResumeDomain, sanitizeBulletText } from '@/lib/jobs/xyz-evaluator';
import { invalidateResumesCache } from '@/lib/jobs/client-cache';
import { formatLocalizedSalary } from './recommend-dashboard';
import { cleanJobApplyUrl } from '@/lib/jobs/url-cleaner';
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
  Save,
  Briefcase,
  RefreshCw,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/browser';
import { useUser } from '@/components/user-provider';
import { NavbarUserAvatar } from '@/components/navbar-user-avatar';
import { CompanyLogo } from './company-logo';
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

function hasCompletedWord(prev: ResumeDocument, next: ResumeDocument): boolean {
  const extractStrings = (doc: ResumeDocument): string[] => {
    const list: string[] = [
      doc.contact?.fullName || '',
      doc.contact?.location || '',
      doc.summary || '',
    ];
    doc.experience?.forEach((r) => {
      list.push(r.company || '', r.roleTitle || '', r.location || '', ...(r.bullets || []));
    });
    doc.education?.forEach((e) => {
      list.push(e.institution || '', e.degree || '', e.fieldOfStudy || '');
    });
    doc.projects?.forEach((p) => {
      list.push(p.title || '', ...(p.bullets || []));
    });
    doc.skills?.forEach((s) => {
      list.push(s.category || '', ...(s.items || []));
    });
    return list;
  };

  const prevStrings = extractStrings(prev);
  const nextStrings = extractStrings(next);

  for (let i = 0; i < nextStrings.length; i++) {
    const p = prevStrings[i] || '';
    const n = nextStrings[i] || '';
    if (n !== p) {
      if (n.length > p.length && /[\s,.;:!?\n]$/.test(n)) {
        return true;
      }
    }
  }
  return false;
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
  const router = useRouter();
  const [document, setDocument] = useState<ResumeDocument>(() => {
    const base = initialDocument || SAMPLE_STAFF_RESUME;
    const isHealthcare = detectResumeDomain('', base) === 'healthcare';
    if (isHealthcare && base.experience) {
      return {
        ...base,
        experience: base.experience.map((exp) => ({
          ...exp,
          bullets: (exp.bullets || []).map((b) => sanitizeBulletText(b, 'healthcare')),
        })),
      };
    }
    return base;
  });
  const [evaluation, setEvaluation] = useState<ResumeEvaluation>(() => {
    const baseDoc = initialDocument || SAMPLE_STAFF_RESUME;
    const isHealthcare = detectResumeDomain('', baseDoc) === 'healthcare';
    if (isHealthcare) {
      const cleanedDoc: ResumeDocument = {
        ...baseDoc,
        experience: (baseDoc.experience || []).map((exp) => ({
          ...exp,
          bullets: (exp.bullets || []).map((b) => sanitizeBulletText(b, 'healthcare')),
        })),
      };
      return evaluateResumeHeuristically(cleanedDoc);
    }
    return initialEvaluation || SAMPLE_STAFF_EVALUATION;
  });
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
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [isApplyingJobId, setIsApplyingJobId] = useState<string | null>(null);

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
      const docDomain = detectResumeDomain('', initialDocument);
      const isHealthcare = docDomain === 'healthcare';

      const docBullets = new Set((initialDocument.experience || []).flatMap((e) => e.bullets || []));
      const hasLegacyPlaceholder = initialEvaluation.suggestions?.some(
        (s) =>
          s.originalText?.includes('1.5M daily active requests') ||
          s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%')
      );

      const hasMismatchedTechSuggestions = isHealthcare && (
        initialEvaluation.suggestions?.some(
          (s) =>
            s.suggestedRewrite?.includes('mobile users') ||
            s.suggestedRewrite?.includes('compute latency') ||
            s.suggestedRewrite?.includes('production workloads') ||
            s.suggestedRewrite?.includes('API response latency') ||
            s.rationale?.includes('engineering bars (Google, Meta, Uber)')
        ) ||
        initialEvaluation.detectedSeniority?.includes('Software Engineer')
      );

      const hasContaminatedBullets = isHealthcare && (initialDocument.experience || []).some((exp) =>
        (exp.bullets || []).some((b) =>
          /500k\+ mobile users|compute latency|production workloads|API response latency|automated test coverage/i.test(b)
        )
      );

      if (hasLegacyPlaceholder || hasMismatchedTechSuggestions || hasContaminatedBullets) {
        // Automatically cleanse contaminated bullets from document
        const cleanedDoc: ResumeDocument = {
          ...initialDocument,
          experience: (initialDocument.experience || []).map((exp) => ({
            ...exp,
            bullets: (exp.bullets || []).map((b) => sanitizeBulletText(b, docDomain)),
          })),
        };
        setDocument(cleanedDoc);
        const fresh = evaluateResumeHeuristically(cleanedDoc);
        setEvaluation(fresh);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: fresh.overallScore } }));
        }
      } else {
        const fresh = evaluateResumeHeuristically(initialDocument);
        const syncedSuggestions = (initialEvaluation.suggestions || []).map((s) => {
          if (docBullets.has(s.suggestedRewrite)) {
            return { ...s, applied: true };
          }
          return s;
        });

        const calibratedScore = isHealthcare ? fresh.overallScore : Math.max(initialEvaluation.overallScore || 0, fresh.overallScore);
        const calibratedPillars = isHealthcare ? fresh.pillarScores : {
          impact: Math.max(initialEvaluation.pillarScores?.impact || 0, fresh.pillarScores.impact),
          relevance: Math.max(initialEvaluation.pillarScores?.relevance || 0, fresh.pillarScores.relevance),
          brevity: Math.max(initialEvaluation.pillarScores?.brevity || 0, fresh.pillarScores.brevity),
        };

        setEvaluation({
          ...initialEvaluation,
          overallScore: calibratedScore,
          pillarScores: calibratedPillars,
          suggestions: syncedSuggestions,
          strengths: fresh.strengths,
          detectedSeniority: fresh.detectedSeniority,
          targetRole: fresh.targetRole,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: calibratedScore } }));
        }
      }
    } else if (initialEvaluation) {
      setEvaluation(initialEvaluation);
    }
  }, [initialEvaluation, initialDocument]);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<ResumeDocument[]>([initialDocument || SAMPLE_STAFF_RESUME]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDocRef = useRef<ResumeDocument | null>(null);

  useEffect(() => {
    if (initialDocument) {
      setDocument(initialDocument);
      setHistory([initialDocument]);
      setHistoryIndex(0);
      pendingDocRef.current = null;
    }
  }, [initialDocument]);

  const pushToHistory = useCallback((newDoc: ResumeDocument) => {
    pendingDocRef.current = null;
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      if (sliced.length >= 50) {
        sliced.shift();
      }
      return [...sliced, newDoc];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If user was actively typing an uncommitted word, revert to the last committed state
    if (pendingDocRef.current && history[historyIndex]) {
      pendingDocRef.current = null;
      const targetDoc = history[historyIndex];
      setDocument(targetDoc);
      const fresh = evaluateResumeHeuristically(targetDoc);
      setEvaluation((prev) => ({
        ...prev,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        detectedSeniority: fresh.detectedSeniority,
        targetRole: fresh.targetRole,
        jobMatchVectors: fresh.jobMatchVectors,
      }));
      toast.info('Change undone (⌘Z)', { duration: 1500 });
      return;
    }

    if (historyIndex > 0) {
      pendingDocRef.current = null;
      const newIndex = historyIndex - 1;
      const targetDoc = history[newIndex];
      setHistoryIndex(newIndex);
      setDocument(targetDoc);
      const fresh = evaluateResumeHeuristically(targetDoc);
      setEvaluation((prev) => ({
        ...prev,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        detectedSeniority: fresh.detectedSeniority,
        targetRole: fresh.targetRole,
        jobMatchVectors: fresh.jobMatchVectors,
      }));
      toast.info('Change undone (⌘Z)', { duration: 1500 });
    }
  }, [historyIndex, history]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDocRef.current = null;

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const targetDoc = history[newIndex];
      setHistoryIndex(newIndex);
      setDocument(targetDoc);
      const fresh = evaluateResumeHeuristically(targetDoc);
      setEvaluation((prev) => ({
        ...prev,
        overallScore: fresh.overallScore,
        pillarScores: fresh.pillarScores,
        strengths: fresh.strengths,
        detectedSeniority: fresh.detectedSeniority,
        targetRole: fresh.targetRole,
        jobMatchVectors: fresh.jobMatchVectors,
      }));
      toast.info('Change redone (⌘⇧Z)', { duration: 1500 });
    }
  }, [historyIndex, history]);

  // Global Keyboard Shortcuts for Undo (Cmd/Ctrl+Z) and Redo (Cmd/Ctrl+Shift+Z or Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Tracks which bullet point in the canvas is currently pulsing with highlight
  const [highlightedCoordinate, setHighlightedCoordinate] = useState<{
    roleIndex: number;
    bulletIndex: number;
  } | null>(null);

  // Handle document edits in the canvas and live-recalculate readiness score
  const handleDocumentChange = (updatedDoc: ResumeDocument) => {
    const prevDoc = document;
    setDocument(updatedDoc);
    setMatchedJobs([]);
    const fresh = evaluateResumeHeuristically(updatedDoc);
    setEvaluation((prev) => ({
      ...prev,
      overallScore: Math.max(prev.overallScore, fresh.overallScore),
      pillarScores: {
        impact: Math.max(prev.pillarScores.impact, fresh.pillarScores.impact),
        relevance: Math.max(prev.pillarScores.relevance, fresh.pillarScores.relevance),
        brevity: Math.max(prev.pillarScores.brevity, fresh.pillarScores.brevity),
      },
      strengths: fresh.strengths,
      detectedSeniority: fresh.detectedSeniority,
      targetRole: fresh.targetRole,
      jobMatchVectors: fresh.jobMatchVectors,
    }));

    // Detect structural change (delete, add, list length change) vs text editing
    const currentDoc = history[historyIndex] || prevDoc;
    const isStructural =
      (updatedDoc.experience?.length || 0) !== (currentDoc.experience?.length || 0) ||
      (updatedDoc.education?.length || 0) !== (currentDoc.education?.length || 0) ||
      (updatedDoc.projects?.length || 0) !== (currentDoc.projects?.length || 0) ||
      (updatedDoc.skills?.length || 0) !== (currentDoc.skills?.length || 0) ||
      (updatedDoc.certifications?.length || 0) !== (currentDoc.certifications?.length || 0) ||
      Boolean(updatedDoc.summary) !== Boolean(currentDoc.summary) ||
      updatedDoc.experience.some(
        (role, rIdx) => (role.bullets?.length || 0) !== (currentDoc.experience[rIdx]?.bullets?.length || 0)
      ) ||
      updatedDoc.skills.some(
        (cat, cIdx) => (cat.items?.length || 0) !== (currentDoc.skills[cIdx]?.items?.length || 0)
      );

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (isStructural) {
      // Immediate push to history for deletions and additions
      pendingDocRef.current = null;
      pushToHistory(updatedDoc);
    } else if (hasCompletedWord(prevDoc, updatedDoc)) {
      // Word boundary reached (typed space, comma, period, newline) -> commit completed word
      pendingDocRef.current = null;
      pushToHistory(updatedDoc);
    } else {
      // Active typing inside a word -> debounce so each letter doesn't create an undo step
      pendingDocRef.current = updatedDoc;
      debounceTimerRef.current = setTimeout(() => {
        pendingDocRef.current = null;
        pushToHistory(updatedDoc);
      }, 500);
    }
  };

  // Apply a rewrite suggestion to the live document canvas and update readiness score
  const handleApplySuggestion = (suggestion: ResumeSuggestion) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDocRef.current = null;

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
      pushToHistory(updatedDoc);
      setMatchedJobs([]);

      // Re-evaluate document dynamically with the metric-rich rewrite
      const fresh = evaluateResumeHeuristically(updatedDoc);

      // Score monotonicity: applying suggestions must never reduce the score below current levels
      const calibratedOverallScore = Math.max(evaluation.overallScore, fresh.overallScore);
      const calibratedPillars = {
        impact: Math.max(evaluation.pillarScores.impact, fresh.pillarScores.impact),
        relevance: Math.max(evaluation.pillarScores.relevance, fresh.pillarScores.relevance),
        brevity: Math.max(evaluation.pillarScores.brevity, fresh.pillarScores.brevity),
      };

      // Update evaluation suggestion state
      const updatedSuggestions = evaluation.suggestions.map((s) =>
        s.id === suggestion.id ? { ...s, applied: true } : s
      );

      setEvaluation({
        ...evaluation,
        overallScore: calibratedOverallScore,
        pillarScores: calibratedPillars,
        strengths: fresh.strengths,
        suggestions: updatedSuggestions,
        jobMatchVectors: fresh.jobMatchVectors,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: calibratedOverallScore } }));
      }

      // Trigger visual pulse highlight on the target bullet in canvas
      setHighlightedCoordinate({ roleIndex, bulletIndex });
      setTimeout(() => {
        setHighlightedCoordinate(null);
      }, 2500);

      toast.success(`Rewrite applied! Readiness score boosted to ${calibratedOverallScore}/100.`);
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
      pushToHistory(updatedDoc);
      setMatchedJobs([]);

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
        jobMatchVectors: fresh.jobMatchVectors,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: fresh.overallScore } }));
      }

      toast.info('Suggestion reverted to original phrasing.');
    }
  };

  // Apply all pending rewrite suggestions in a single batch
  const handleApplyAllSuggestions = (suggestionsToApply: ResumeSuggestion[]) => {
    if (!suggestionsToApply || suggestionsToApply.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDocRef.current = null;

    const updatedExperience = document.experience.map((role) => ({
      ...role,
      bullets: [...role.bullets],
    }));

    const appliedIds = new Set<string>();

    suggestionsToApply.forEach((sug) => {
      const { roleIndex, bulletIndex, suggestedRewrite } = sug;
      if (
        updatedExperience[roleIndex] &&
        updatedExperience[roleIndex].bullets[bulletIndex] !== undefined
      ) {
        updatedExperience[roleIndex].bullets[bulletIndex] = suggestedRewrite;
        appliedIds.add(sug.id);
      }
    });

    if (appliedIds.size === 0) return;

    const updatedDoc: ResumeDocument = {
      ...document,
      experience: updatedExperience,
    };

    setDocument(updatedDoc);
    pushToHistory(updatedDoc);
    setMatchedJobs([]);

    const fresh = evaluateResumeHeuristically(updatedDoc);

    const updatedSuggestions = evaluation.suggestions.map((s) =>
      appliedIds.has(s.id) ? { ...s, applied: true } : s
    );

    const oldScore = evaluation.overallScore;
    const calibratedOverallScore = Math.max(oldScore, fresh.overallScore);
    const calibratedPillars = {
      impact: Math.max(evaluation.pillarScores.impact, fresh.pillarScores.impact),
      relevance: Math.max(evaluation.pillarScores.relevance, fresh.pillarScores.relevance),
      brevity: Math.max(evaluation.pillarScores.brevity, fresh.pillarScores.brevity),
    };

    setEvaluation({
      ...evaluation,
      overallScore: calibratedOverallScore,
      pillarScores: calibratedPillars,
      strengths: fresh.strengths,
      suggestions: updatedSuggestions,
      jobMatchVectors: fresh.jobMatchVectors,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: calibratedOverallScore } }));
    }

    toast.success(
      `Applied ${appliedIds.size} rewrites! ATS readiness boosted from ${oldScore} to ${calibratedOverallScore}/100.`
    );
  };

  // Revert all applied suggestions back to original phrasing
  const handleRevertAllSuggestions = (suggestionsToRevert: ResumeSuggestion[]) => {
    if (!suggestionsToRevert || suggestionsToRevert.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingDocRef.current = null;

    const updatedExperience = document.experience.map((role) => ({
      ...role,
      bullets: [...role.bullets],
    }));

    const revertedIds = new Set<string>();

    suggestionsToRevert.forEach((sug) => {
      const { roleIndex, bulletIndex, originalText } = sug;
      if (
        updatedExperience[roleIndex] &&
        updatedExperience[roleIndex].bullets[bulletIndex] !== undefined
      ) {
        updatedExperience[roleIndex].bullets[bulletIndex] = originalText;
        revertedIds.add(sug.id);
      }
    });

    if (revertedIds.size === 0) return;

    const updatedDoc: ResumeDocument = {
      ...document,
      experience: updatedExperience,
    };

    setDocument(updatedDoc);
    pushToHistory(updatedDoc);
    setMatchedJobs([]);

    const fresh = evaluateResumeHeuristically(updatedDoc);

    const updatedSuggestions = evaluation.suggestions.map((s) =>
      revertedIds.has(s.id) ? { ...s, applied: false } : s
    );

    setEvaluation({
      ...evaluation,
      overallScore: fresh.overallScore,
      pillarScores: fresh.pillarScores,
      strengths: fresh.strengths,
      suggestions: updatedSuggestions,
      jobMatchVectors: fresh.jobMatchVectors,
    });

    toast.info(`Reverted ${revertedIds.size} suggestions to original phrasing.`);
  };

  // Save current document state and persistent evaluation to Supabase
  const handleSave = async () => {
    setMatchedJobs([]);
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
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ats-score-updated', { detail: { score: currentEval.overallScore } }));
        }
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
      const candidateLoc = document?.contact?.location || 'Hyderabad, India';
      const fresh = evaluateResumeHeuristically(document);
      const latestVectors: JobMatchVectors = {
        ...(fresh.jobMatchVectors || evaluation.jobMatchVectors),
        preferredLocations: [candidateLoc, 'Remote'],
        detectedRole: document?.experience?.[0]?.roleTitle || fresh.targetRole || evaluation.targetRole || 'Software Engineer',
      };

      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/match-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          vectors: latestVectors,
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

  // Seamlessly apply to or inspect matched job in the Vouchins Jobs portal
  const handleApplyToJob = async (job: any) => {
    // 1. External ATS Job (Greenhouse, Lever, Ashby, etc.): open direct career page
    if (job.externalApplyUrl) {
      window.open(cleanJobApplyUrl(job.externalApplyUrl), '_blank', 'noopener,noreferrer');
      if (!appliedJobIds.includes(job.id)) {
        setAppliedJobIds((prev) => [...prev, job.id]);
      }
      toast.success(
        `Opening ${job.companyName} portal. You can also view company insiders on the Jobs page to ask for a referral!`,
        {
          action: {
            label: 'View job details',
            onClick: () => {
              window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
            },
          },
          duration: 6000,
        }
      );
      return;
    }

    // 2. Direct internal application on Vouchins
    setIsApplyingJobId(job.id);
    const toastId = toast.loading(`Submitting application to ${job.companyName}...`);

    try {
      const resumeUrl = window.location.origin + `/jobs/resume?id=${currentResumeId || 'master'}`;
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          resumeUrl,
          coverLetter: `Hi ${job.companyName} Recruiting Team, I am applying for the ${job.title} role with my verified Vouchins Master Resume.`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (!appliedJobIds.includes(job.id)) {
          setAppliedJobIds((prev) => [...prev, job.id]);
        }
        toast.success(`Application submitted to ${job.companyName} for ${job.title}!`, {
          id: toastId,
          action: {
            label: 'View job details',
            onClick: () => {
              window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
            },
          },
          duration: 5000,
        });
      } else if (res.status === 409 || data.error?.includes('already applied')) {
        if (!appliedJobIds.includes(job.id)) {
          setAppliedJobIds((prev) => [...prev, job.id]);
        }
        toast.info(`You have already applied for this role.`, {
          id: toastId,
          action: {
            label: 'View job details',
            onClick: () => {
              window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
            },
          },
        });
      } else if (res.status === 403) {
        toast.error(data.error || 'Only verified Vouchins users can apply directly.', {
          id: toastId,
          action: {
            label: 'View job details',
            onClick: () => {
              window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
            },
          },
        });
      } else {
        // Fallback: open dedicated job details page so candidate can review details and apply/request referral
        window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
    } finally {
      setIsApplyingJobId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white">
      {/* ================================================================== */}
      {/* Unified Resume Studio Header (Navigation, Metadata & Studio Actions) */}
      {/* ================================================================== */}
      <header className="h-16 shrink-0 border-b border-neutral-200/90 bg-white px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-20 shadow-xs select-none overflow-x-auto no-scrollbar">
        {/* Left: Back Button + Breadcrumbs + Resume Title + Target Role */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 md:min-w-0">
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
            </div>
            <span className="text-[10px] text-neutral-500 hidden md:inline truncate max-w-xs">
              Targeting {document?.experience?.[0]?.roleTitle || evaluation?.targetRole || 'Software Engineer'}
            </span>
          </div>
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
          {/* Undo / Redo Toolbar */}
          <div className="flex items-center border border-neutral-200/90 rounded-lg p-0.5 bg-neutral-50/80 shadow-2xs select-none">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0 && !pendingDocRef.current}
              aria-label="Undo change (⌘Z)"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-white hover:shadow-2xs active:scale-[0.98] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 pointer-events-none shrink-0" />
              <span className="pointer-events-none">Undo</span>
              <kbd className="text-[10px] text-neutral-400 font-mono pointer-events-none">⌘Z</kbd>
            </button>
            <div className="h-3.5 w-px bg-neutral-200 mx-0.5" />
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              aria-label="Redo change (⌘⇧Z)"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-white hover:shadow-2xs active:scale-[0.98] disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5 pointer-events-none shrink-0" />
              <span className="pointer-events-none">Redo</span>
              <kbd className="text-[10px] text-neutral-400 font-mono pointer-events-none">⌘⇧Z</kbd>
            </button>
          </div>

          {onReanalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const isPro = isUserProOrElite(subscription);
                if (!isPro && !onReanalyze) {
                  if (onRequireSubscription) {
                    onRequireSubscription();
                  }
                  toast.error('Re-analyzing your resume with AI is exclusive to Jobs Pro and Elite members. Upgrade to Jobs Pro for unlimited evaluations.');
                  return;
                }
                const result = await onReanalyze(document);
                const targetDoc = result?.document || document;
                if (result?.document) {
                  setDocument(result.document);
                }
                if (result?.evaluation) {
                  setEvaluation(result.evaluation);
                }
              }}
              disabled={isReanalyzing}
              className="h-8 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 gap-1.5 inline-flex shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isReanalyzing ? 'animate-spin text-[#0A1B5C]' : ''}`} />
              Re-analyze
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleFetchMatchedJobs}
            className="h-8 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 gap-1.5 inline-flex shrink-0"
          >
            <Briefcase className="h-3.5 w-3.5 text-[#0A1B5C]" />
            Matched Jobs
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#0c2277] text-white gap-1.5 shadow-xs shrink-0"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <PDFDownloadButton document={document} resumeName={resumeName} />

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
                onApplyAllSuggestions={handleApplyAllSuggestions}
                onRevertSuggestion={handleRevertSuggestion}
                onRevertAllSuggestions={handleRevertAllSuggestions}
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
              onApplyAllSuggestions={handleApplyAllSuggestions}
              onRevertSuggestion={handleRevertSuggestion}
              onRevertAllSuggestions={handleRevertAllSuggestions}
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
                    className="p-4 rounded-2xl border border-neutral-200 hover:border-[#0A1B5C]/30 bg-neutral-50/50 hover:bg-white transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <CompanyLogo
                          companyName={job.companyName}
                          logoUrl={job.companyLogo}
                          size={40}
                          className="rounded-xl shrink-0 border border-neutral-200/80 mt-0.5"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-neutral-900 truncate">{job.title}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[#0A1B5C]">
                              {job.companyName}
                            </span>
                            <span className="text-xs text-neutral-400">•</span>
                            <span className="text-xs text-neutral-500 truncate">{job.location}</span>
                          </div>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0">
                        {job.matchScore}% Match
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-neutral-600 pl-1">
                      {job.reasons?.map((reason: string, rIdx: number) => (
                        <div key={rIdx} className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{reason}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-neutral-200/60 mt-0.5 gap-2">
                      <span className="text-xs font-semibold text-neutral-700 truncate">
                        {formatLocalizedSalary(job.salaryRange, job.location || document?.contact?.location, job.experienceLevel, job.title)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(`/jobs/${encodeURIComponent(job.id)}`, '_blank', 'noopener,noreferrer');
                          }}
                          className="h-8 px-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200 rounded-xl gap-1"
                        >
                          <ExternalLink className="h-3 w-3 text-neutral-500" />
                          View job details
                        </Button>

                        <Button
                          size="sm"
                          disabled={isApplyingJobId === job.id || appliedJobIds.includes(job.id)}
                          onClick={() => handleApplyToJob(job)}
                          className="h-8 px-3 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#11287e] text-white rounded-xl gap-1 disabled:opacity-60"
                        >
                          {appliedJobIds.includes(job.id) ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Applied
                            </>
                          ) : isApplyingJobId === job.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin text-white" />
                              Applying...
                            </>
                          ) : (
                            <>
                              Apply with Resume
                              <ChevronRight className="h-3 w-3 text-white/80" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">
                Looking for more tech opportunities?
              </span>
              <Link
                href="/jobs/list"
                onClick={() => setMatchedJobsOpen(false)}
                className="text-xs font-bold text-[#0A1B5C] hover:text-[#11287e] flex items-center gap-1.5 transition-colors"
              >
                <span>Explore All Jobs & Referrals</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
