import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { evaluateResumeHeuristically } from '@/lib/jobs/xyz-evaluator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: resume, error: resumeErr } = await supabaseAdmin
      .from('job_resumes')
      .select('*')
      .eq('id', id)
      .eq('user_id', authCheck.userId)
      .single();

    if (resumeErr || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Get latest evaluation
    const { data: evaluation } = await supabaseAdmin
      .from('job_evaluations')
      .select('*')
      .eq('resume_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let finalEvaluation: any = evaluation
      ? {
          overallScore: evaluation.overall_score,
          pillarScores: evaluation.pillar_scores,
          detectedSeniority: evaluation.detected_seniority,
          targetRole: evaluation.target_role,
          strengths: evaluation.strengths,
          missingKeywords: evaluation.missing_keywords,
          suggestions: evaluation.suggestions,
          jobMatchVectors: evaluation.job_match_vectors,
        }
      : null;

    const doc = resume?.document_schema;
    if (doc) {
      const docBullets = new Set((doc?.experience || []).flatMap((e: any) => e.bullets || []));
      const fresh = evaluateResumeHeuristically(doc, resume.raw_text);

      const hasMismatchedSuggestions = finalEvaluation?.suggestions?.some(
        (s: any) =>
          s.originalText?.includes('1.5M daily active requests') ||
          s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%') ||
          (!docBullets.has(s.originalText) && !docBullets.has(s.suggestedRewrite))
      );

      if (hasMismatchedSuggestions || !finalEvaluation) {
        finalEvaluation = fresh;
      } else {
        if (finalEvaluation.suggestions) {
          finalEvaluation.suggestions = finalEvaluation.suggestions.map((s: any) => {
            const isNowInDoc = docBullets.has(s.suggestedRewrite);
            if (isNowInDoc) {
              return { ...s, applied: true };
            }
            return s;
          });
        }
        // Calibrate score with current state of document so applied suggestions maintain improved score
        finalEvaluation.overallScore = Math.max(finalEvaluation.overallScore || 0, fresh.overallScore);
        finalEvaluation.pillarScores = {
          impact: Math.max(finalEvaluation.pillarScores?.impact || 0, fresh.pillarScores.impact),
          relevance: Math.max(finalEvaluation.pillarScores?.relevance || 0, fresh.pillarScores.relevance),
          brevity: Math.max(finalEvaluation.pillarScores?.brevity || 0, fresh.pillarScores.brevity),
        };
        if (!finalEvaluation.strengths || finalEvaluation.strengths.length === 0) {
          finalEvaluation.strengths = fresh.strengths;
        }
        if (fresh.targetRole) {
          finalEvaluation.targetRole = fresh.targetRole;
        }
        if (fresh.detectedSeniority) {
          finalEvaluation.detectedSeniority = fresh.detectedSeniority;
        }
        if (fresh.jobMatchVectors) {
          finalEvaluation.jobMatchVectors = fresh.jobMatchVectors;
        }
      }
    }

    return NextResponse.json({
      success: true,
      resume,
      evaluation: finalEvaluation,
    });
  } catch (err: any) {
    console.error('Fetch resume by id error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch resume' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('job_resumes')
      .delete()
      .eq('id', id)
      .eq('user_id', authCheck.userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Resume deleted successfully' });
  } catch (err: any) {
    console.error('Delete resume error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete resume' }, { status: 500 });
  }
}
