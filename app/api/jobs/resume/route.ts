import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { ResumeDocumentSchema } from '@/lib/jobs/types';
import { computeContentHash } from '@/lib/jobs/cost-guard';
import { evaluateResumeHeuristically, parseRawTextToDocument, sanitizeBulletText } from '@/lib/jobs/xyz-evaluator';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return 'Recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function GET(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: resumes, error } = await supabaseAdmin
      .from('job_resumes')
      .select('id, title, file_name, file_size, document_schema, raw_text, created_at, updated_at')
      .eq('user_id', authCheck.userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Fetch latest evaluations for these resumes
    const resumeIds = (resumes || []).map((r) => r.id);
    const evaluationsMap: Record<string, any> = {};

    if (resumeIds.length > 0) {
      const { data: evals } = await supabaseAdmin
        .from('job_evaluations')
        .select('*')
        .in('resume_id', resumeIds)
        .order('created_at', { ascending: false });

      if (evals) {
        for (const ev of evals) {
          if (!evaluationsMap[ev.resume_id]) {
            evaluationsMap[ev.resume_id] = {
              overallScore: ev.overall_score,
              pillarScores: ev.pillar_scores,
              detectedSeniority: ev.detected_seniority,
              targetRole: ev.target_role,
              strengths: ev.strengths,
              missingKeywords: ev.missing_keywords,
              suggestions: ev.suggestions,
              jobMatchVectors: ev.job_match_vectors,
            };
          }
        }
      }
    }

    const formattedResumes = (resumes || []).map((r, index) => {
      let doc = r.document_schema;
      const isTainted =
        doc?.experience?.some((e: any) => e.company === 'Leading Tech Organization') ||
        doc?.projects?.some((p: any) => p.title === 'Distributed Real-Time Processing Engine');

      if (isTainted && r.raw_text) {
        try {
          doc = parseRawTextToDocument(r.raw_text);
          // Auto-heal legacy database record in background
          supabaseAdmin
            .from('job_resumes')
            .update({ document_schema: doc })
            .eq('id', r.id)
            .then(() => {});
        } catch {
          // Keep existing doc on parse error
        }
      }

      let evaluation = evaluationsMap[r.id] || null;
      if (doc) {
        if (doc.experience) {
          doc.experience.forEach((e: any) => {
            if (Array.isArray(e.bullets)) {
              e.bullets = e.bullets.map(sanitizeBulletText);
            }
          });
        }

        const docBullets = new Set((doc?.experience || []).flatMap((e: any) => e.bullets || []));
        const hasLegacyPlaceholder = evaluation?.suggestions?.some(
          (s: any) =>
            s.originalText?.includes('1.5M daily active requests') ||
            s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%')
        );

        if (hasLegacyPlaceholder || !evaluation) {
          // Stale evaluation from legacy placeholder document or empty: generate fresh
          evaluation = evaluateResumeHeuristically(doc, r.raw_text);
        } else if (evaluation) {
          const fresh = evaluateResumeHeuristically(doc, r.raw_text);
          if (evaluation.suggestions) {
            // Sync applied status with current doc: if doc has suggestedRewrite, mark applied=true
            evaluation.suggestions = evaluation.suggestions.map((s: any) => {
              const isNowInDoc = docBullets.has(s.suggestedRewrite);
              if (isNowInDoc) {
                return { ...s, applied: true };
              }
              return s;
            });
          }
          // Calibrate score with current state of document so applied suggestions maintain improved score
          evaluation.overallScore = Math.max(evaluation.overallScore || 0, fresh.overallScore);
          evaluation.pillarScores = {
            impact: Math.max(evaluation.pillarScores?.impact || 0, fresh.pillarScores.impact),
            relevance: Math.max(evaluation.pillarScores?.relevance || 0, fresh.pillarScores.relevance),
            brevity: Math.max(evaluation.pillarScores?.brevity || 0, fresh.pillarScores.brevity),
          };
          if (!evaluation.strengths || evaluation.strengths.length === 0) {
            evaluation.strengths = fresh.strengths;
          }
        }
      }

      return {
        id: r.id,
        name: r.title || r.file_name || 'Master Resume',
        customSlug: (r as any).custom_slug || (doc as any)?.customSlug || null,
        targetJobTitle: evaluation?.targetRole || evaluationsMap[r.id]?.targetRole || 'Software Engineer',
        lastModified: formatTimeAgo(r.updated_at),
        created: formatTimeAgo(r.created_at),
        isPrimary: index === 0,
        status: 'Analysis Complete' as const,
        initialLetter: (r.title || 'R').charAt(0).toUpperCase(),
        document: doc,
        evaluation,
        updatedAt: r.updated_at,
      };
    });

    // Latest overall ATS score for the user
    const latestScore =
      formattedResumes.length > 0 && formattedResumes[0].evaluation
        ? formattedResumes[0].evaluation.overallScore
        : null;

    return NextResponse.json({
      success: true,
      resumes: formattedResumes,
      rawCount: resumes?.length || 0,
      latestScore,
    });
  } catch (err: any) {
    console.error('List resumes error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list resumes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, document, evaluation, resumeId, changeSummary } = body;

    const validatedDoc = ResumeDocumentSchema.safeParse(document);
    if (!validatedDoc.success) {
      return NextResponse.json(
        { error: 'Invalid resume document schema', details: validatedDoc.error.issues },
        { status: 400 }
      );
    }

    const isUuid = (id?: string | null): boolean =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    let savedId = isUuid(resumeId) ? resumeId : null;

    if (savedId) {
      // Update existing
      const { error: updateErr } = await supabaseAdmin
        .from('job_resumes')
        .update({
          title: title || `${validatedDoc.data.contact.fullName || 'Candidate'} - Resume`,
          document_schema: validatedDoc.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedId)
        .eq('user_id', authCheck.userId);

      if (updateErr) throw updateErr;

      // Create version snapshot
      await supabaseAdmin.from('job_resume_versions').insert({
        resume_id: savedId,
        user_id: authCheck.userId,
        document_schema: validatedDoc.data,
        change_summary: changeSummary || 'Manual update via interactive editor',
      });
    } else {
      // Insert new
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('job_resumes')
        .insert({
          user_id: authCheck.userId,
          title: title || `${validatedDoc.data.contact.fullName || 'Candidate'} - Resume`,
          document_schema: validatedDoc.data,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      savedId = inserted.id;

      await supabaseAdmin.from('job_resume_versions').insert({
        resume_id: savedId,
        user_id: authCheck.userId,
        document_schema: validatedDoc.data,
        change_summary: 'Initial resume creation',
      });
    }

    // Persist latest evaluation record
    let finalEvaluation = evaluation;
    if (!finalEvaluation) {
      finalEvaluation = evaluateResumeHeuristically(validatedDoc.data);
    }

    if (savedId && finalEvaluation) {
      const contentHash = computeContentHash(JSON.stringify(validatedDoc.data));
      await supabaseAdmin.from('job_evaluations').insert({
        resume_id: savedId,
        user_id: authCheck.userId,
        content_hash: contentHash,
        overall_score: finalEvaluation.overallScore,
        pillar_scores: finalEvaluation.pillarScores,
        detected_seniority: finalEvaluation.detectedSeniority,
        target_role: finalEvaluation.targetRole,
        strengths: finalEvaluation.strengths || [],
        missing_keywords: finalEvaluation.missingKeywords || [],
        suggestions: finalEvaluation.suggestions || [],
        job_match_vectors: finalEvaluation.jobMatchVectors || {},
      });
    }

    return NextResponse.json({
      success: true,
      resumeId: savedId,
      evaluation: finalEvaluation,
    });
  } catch (err: any) {
    console.error('Save resume error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save resume' }, { status: 500 });
  }
}
