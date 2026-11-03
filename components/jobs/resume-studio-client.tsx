'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Workspace } from './workspace';
import {
  SAMPLE_STAFF_RESUME,
  SAMPLE_STAFF_EVALUATION,
} from './sample-resumes';
import { SubscriptionGate } from './subscription-gate';
import {
  fetchCachedResumes,
  fetchCachedSubscription,
  invalidateResumesCache,
} from '@/lib/jobs/client-cache';
import { supabase } from '@/lib/supabase/browser';
import {
  ResumeDocument,
  ResumeEvaluation,
  SubscriptionInfo,
} from '@/lib/jobs/types';
import { toast } from 'sonner';

interface SavedResumeItem {
  id: string;
  name: string;
  targetJobTitle: string;
  lastModified: string;
  created: string;
  isPrimary: boolean;
  status: 'Analysis Complete' | 'Auditing...' | 'Needs Re-analysis';
  initialLetter: string;
  document?: ResumeDocument;
  evaluation?: ResumeEvaluation;
}

export function ResumeStudioClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get('id');
  const isSampleRequested = searchParams.get('sample') === 'true';

  const [loading, setLoading] = useState(true);
  const [activeResume, setActiveResume] = useState<SavedResumeItem | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | undefined>(undefined);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);

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

  // Fetch Resumes & Subscription data
  const loadStudioData = useCallback(async () => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();

      // Subscription check
      try {
        const subData = await fetchCachedSubscription(authHeaders);
        if (subData?.subscription) {
          setSubscription(subData.subscription);
        }
      } catch (err) {
        console.warn('Subscription fetch skipped:', err);
      }

      // Check cache / fetch resumes
      const { resumes } = await fetchCachedResumes(authHeaders);
      const resumeList: SavedResumeItem[] = resumes || [];

      // Determine active resume
      if (isSampleRequested) {
        setActiveResume({
          id: 'sample-resume',
          name: 'Sample Resume',
          targetJobTitle: SAMPLE_STAFF_EVALUATION.targetRole || 'Staff Full-Stack Engineer',
          lastModified: 'Just now',
          created: 'Just now',
          isPrimary: false,
          status: 'Analysis Complete',
          initialLetter: 'S',
          document: SAMPLE_STAFF_RESUME,
          evaluation: SAMPLE_STAFF_EVALUATION,
        });
      } else if (requestedId) {
        const match = resumeList.find((r) => r.id === requestedId);
        if (match) {
          setActiveResume(match);
        } else if (resumeList.length > 0) {
          setActiveResume(resumeList[0]);
        } else {
          // Fallback to sample if requested id not found and no resumes exist
          setActiveResume({
            id: 'sample-resume',
            name: 'Sample Resume',
            targetJobTitle: SAMPLE_STAFF_EVALUATION.targetRole || 'Staff Full-Stack Engineer',
            lastModified: 'Just now',
            created: 'Just now',
            isPrimary: true,
            status: 'Analysis Complete',
            initialLetter: 'S',
            document: SAMPLE_STAFF_RESUME,
            evaluation: SAMPLE_STAFF_EVALUATION,
          });
        }
      } else if (resumeList.length > 0) {
        // Default to primary or first resume
        setActiveResume(resumeList[0]);
      } else {
        // Fallback to sample resume
        setActiveResume({
          id: 'sample-resume',
          name: 'Sample Resume',
          targetJobTitle: SAMPLE_STAFF_EVALUATION.targetRole || 'Staff Full-Stack Engineer',
          lastModified: 'Just now',
          created: 'Just now',
          isPrimary: true,
          status: 'Analysis Complete',
          initialLetter: 'S',
          document: SAMPLE_STAFF_RESUME,
          evaluation: SAMPLE_STAFF_EVALUATION,
        });
      }
    } catch (err: any) {
      console.error('Failed to load studio resume:', err);
      toast.error('Failed to load resume in studio.');
      // Fallback
      setActiveResume({
        id: 'sample-resume',
        name: 'Sample Resume',
        targetJobTitle: SAMPLE_STAFF_EVALUATION.targetRole || 'Staff Full-Stack Engineer',
        lastModified: 'Just now',
        created: 'Just now',
        isPrimary: true,
        status: 'Analysis Complete',
        initialLetter: 'S',
        document: SAMPLE_STAFF_RESUME,
        evaluation: SAMPLE_STAFF_EVALUATION,
      });
    } finally {
      setLoading(false);
    }
  }, [requestedId, isSampleRequested]);

  useEffect(() => {
    loadStudioData();
  }, [loadStudioData]);

  // Handle Re-analyze within Workspace
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
    const toastId = toast.loading('Re-evaluating resume changes with Google XYZ formula...');

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

        setActiveResume((prev) =>
          prev
            ? {
                ...prev,
                id: updatedId,
                document: updatedDoc,
                evaluation: updatedEval,
                lastModified: 'Just now',
              }
            : null
        );
        invalidateResumesCache();
        toast.success(`Score updated: ${updatedEval?.overallScore ?? 85}/100!`, { id: toastId });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0A1B5C] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-neutral-500">Opening Resume Studio...</p>
        </div>
      </div>
    );
  }

  if (!activeResume) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-neutral-200 text-center flex flex-col items-center gap-4 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">Resume Not Found</h2>
          <p className="text-xs text-neutral-500">
            The requested resume could not be located. You can navigate back to your master resumes or launch with the sample resume.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => router.push('/jobs/resume')}
              className="px-4 py-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Back to Resumes
            </button>
            <button
              onClick={() => router.push('/jobs/resume/studio?sample=true')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0A1B5C] hover:bg-[#0c2277] rounded-xl transition-colors"
            >
              Use Sample Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white">
      <Workspace
        initialDocument={activeResume.document || SAMPLE_STAFF_RESUME}
        initialEvaluation={activeResume.evaluation || SAMPLE_STAFF_EVALUATION}
        resumeId={activeResume.id}
        resumeName={activeResume.name}
        subscription={subscription}
        onRequireSubscription={() => setShowSubscriptionGate(true)}
        onReanalyze={handleReanalyze}
        onSave={(savedResumeId, doc, evaluation) => {
          setActiveResume((prev) =>
            prev
              ? {
                  ...prev,
                  id: savedResumeId,
                  document: doc,
                  evaluation,
                  lastModified: 'Just now',
                }
              : null
          );
        }}
        isReanalyzing={isReanalyzing}
        onBack={() => router.push('/jobs/resume')}
      />

      <SubscriptionGate
        isOpen={showSubscriptionGate}
        onClose={() => setShowSubscriptionGate(false)}
      />
    </div>
  );
}
