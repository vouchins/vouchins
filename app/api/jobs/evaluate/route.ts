import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { checkAICostGuard, computeContentHash, computeResumeContentHash } from '@/lib/jobs/cost-guard';
import { evaluateResumeAI } from '@/lib/jobs/ai-client';
import { parseRawTextToDocument, evaluateResumeHeuristically, detectResumeDomain } from '@/lib/jobs/xyz-evaluator';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  consumeMultiEntitlements,
  markUsageCompleted,
  quotaDeniedResponse,
  refundEntitlement,
  resolveIdempotencyKey,
  type FeatureKey,
} from '@/lib/jobs/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed) {
      if (authCheck.reason === 'UNAUTHENTICATED') {
        return NextResponse.json(
          { error: 'Please sign in to analyze resumes.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: 'An active Jobs Pro subscription is required to run AI evaluation.',
          code: 'SUBSCRIPTION_REQUIRED',
        },
        { status: 403 }
      );
    }

    const userId = authCheck.userId!;
    const idem = resolveIdempotencyKey(request);
    if (!idem.ok) {
      return NextResponse.json({ error: idem.error }, { status: 400 });
    }
    const requestId = idem.key;

    const body = await request.json();
    const { rawText, resumeId, title, forceHeuristic } = body;
    const existingDoc = body.existingDoc || body.document;

    const isUuid = (id?: string | null): boolean =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
    let targetResumeId = isUuid(resumeId) ? resumeId : null;

    // Server-side ownership verification: prevent foreign/stale IDs from bypassing resume_upload gate
    if (targetResumeId) {
      const { data: ownedResume } = await supabaseAdmin
        .from('job_resumes')
        .select('id')
        .eq('id', targetResumeId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!ownedResume?.id) {
        targetResumeId = null;
      }
    }

    if (!rawText && !existingDoc) {
      return NextResponse.json(
        { error: 'Either rawText or existingDoc is required for evaluation.' },
        { status: 400 }
      );
    }

    const textToAnalyze = rawText || JSON.stringify(existingDoc);
    const contentHash = computeResumeContentHash(existingDoc || textToAnalyze);

    // 1. Check AI Cost & Abuse Guard Rails (with Pro plan gating & 3/month rate limit)
    const guardCheck = await checkAICostGuard(
      userId,
      textToAnalyze,
      Boolean(existingDoc),
      Boolean(forceHeuristic)
    );
    if (!guardCheck.allowed) {
      // Seamless Free Tier Heuristic Re-scoring:
      // If the user has exhausted their 3 monthly deep AI evaluations but is modifying
      // their existing resume, calculate their updated ATS readiness score deterministically
      // without incurring LLM cost or failing the request.
      if (existingDoc && guardCheck.code === 'PRO_PLAN_REQUIRED') {
        const fallbackDoc = existingDoc;
        const fallbackHeuristic = evaluateResumeHeuristically(fallbackDoc, textToAnalyze);

        if (targetResumeId) {
          await supabaseAdmin
            .from('job_resumes')
            .update({
              document_schema: fallbackDoc,
              content_hash: contentHash,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetResumeId)
            .eq('user_id', userId);

          await supabaseAdmin.from('job_evaluations').insert({
            resume_id: targetResumeId,
            user_id: userId,
            content_hash: contentHash,
            overall_score: fallbackHeuristic.overallScore,
            pillar_scores: fallbackHeuristic.pillarScores,
            detected_seniority: fallbackHeuristic.detectedSeniority,
            target_role: fallbackHeuristic.targetRole,
            strengths: fallbackHeuristic.strengths,
            missing_keywords: fallbackHeuristic.missingKeywords,
            suggestions: fallbackHeuristic.suggestions,
            job_match_vectors: fallbackHeuristic.jobMatchVectors,
          });
        }

        return NextResponse.json({
          success: true,
          unchanged: false,
          fromCache: false,
          provider: 'heuristic',
          doc: fallbackDoc,
          document: fallbackDoc,
          evaluation: fallbackHeuristic,
          resumeId: targetResumeId,
          quotaExceeded: true,
          notice: 'Readiness score updated via ATS scanner. Upgrade to Jobs Pro for unlimited AI-generated rewrites.',
        });
      }

      const isProRequired = guardCheck.code === 'PRO_PLAN_REQUIRED';
      return NextResponse.json(
        {
          error: guardCheck.reason || 'Rate limit exceeded.',
          code: guardCheck.code || 'RATE_LIMIT_EXCEEDED',
          upgradeUrl: isProRequired ? '/premium' : undefined,
        },
        { status: isProRequired ? 403 : 429 }
      );
    }

    // 2. Return cached evaluation if available ($0 cost, instant response, 0 score jitter)
    // If resume content has not changed since last evaluation, return cached state directly
    if (guardCheck.cachedEvaluation) {
      const cached = guardCheck.cachedEvaluation;
      let doc = existingDoc || null;

      if (!doc && cached.resume_id) {
        const { data: resumeRow } = await supabaseAdmin
          .from('job_resumes')
          .select('document_schema')
          .eq('id', cached.resume_id)
          .maybeSingle();

        if (resumeRow?.document_schema) {
          doc = resumeRow.document_schema;
        }
      }

      if (!doc && rawText) {
        doc = parseRawTextToDocument(rawText);
      }

      // Check if cached document was tainted with legacy fallback placeholders or hollow
      const isHollow =
        (!doc?.experience || doc.experience.length === 0) &&
        (!doc?.skills || doc.skills.length === 0) &&
        Boolean(rawText && rawText.trim().length > 100);

      const isTainted =
        isHollow ||
        doc?.experience?.some((e: any) => e.company === 'Leading Tech Organization') ||
        doc?.projects?.some((p: any) => p.title === 'Distributed Real-Time Processing Engine') ||
        (doc?.contact?.location === 'San Francisco, CA / Remote' && !rawText?.includes('San Francisco'));

      const docBullets = new Set((doc?.experience || []).flatMap((e: any) => e.bullets || []));

      const domain = doc ? detectResumeDomain('', doc) : 'general';
      const isMismatched =
        !cached.suggestions ||
        cached.suggestions.length === 0 ||
        (domain === 'healthcare' && cached.detected_seniority?.includes('Software Engineer')) ||
        (domain === 'healthcare' && cached.suggestions.some((s: any) =>
          s.suggestedRewrite?.includes('500k+ mobile users') ||
          s.suggestedRewrite?.includes('cutting query compute latency') ||
          s.suggestedRewrite?.includes('production workloads') ||
          s.suggestedRewrite?.includes('API response latency')
        )) ||
        cached.suggestions.some(
          (s: any) =>
            s.originalText?.includes('1.5M daily active requests') ||
            s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%') ||
            s.suggestedRewrite?.includes('scalable architectural workflows') ||
            (!s.applied && !docBullets.has(s.originalText) && !docBullets.has(s.suggestedRewrite))
        );

      if (!isTainted && !isMismatched && doc) {
        const fresh = evaluateResumeHeuristically(doc, rawText);
        const evaluation = {
          overallScore: cached.overall_score,
          pillarScores: cached.pillar_scores,
          detectedSeniority: fresh.detectedSeniority || cached.detected_seniority,
          targetRole: fresh.targetRole || cached.target_role,
          strengths: cached.strengths || [],
          missingKeywords: cached.missing_keywords || [],
          suggestions: cached.suggestions,
          jobMatchVectors: fresh.jobMatchVectors || cached.job_match_vectors || cached.jobMatchVectors || {},
        };

        return NextResponse.json({
          success: true,
          unchanged: Boolean(existingDoc),
          fromCache: true,
          provider: 'cache',
          doc,
          document: doc,
          evaluation,
          resumeId: cached.resume_id || resumeId,
        });
      }
    }

    // 3. Retrieve previous evaluation context if re-analyzing an existing resume
    let previousSuggestions: any[] = [];
    let previousScore = 0;

    if (targetResumeId) {
      const { data: prevEval } = await supabaseAdmin
        .from('job_evaluations')
        .select('suggestions, overall_score')
        .eq('resume_id', targetResumeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevEval) {
        if (Array.isArray(prevEval.suggestions)) {
          previousSuggestions = prevEval.suggestions;
        }
        previousScore = prevEval.overall_score || 0;
      }
    }

    // 3b. Atomically consume all required gates BEFORE calling Gemini
    const gatesToConsume: FeatureKey[] = [];
    if (!targetResumeId) gatesToConsume.push('resume_upload');
    if (!forceHeuristic) gatesToConsume.push('ai_evaluate');

    let consumedUpload = false;
    let consumedEvaluate = false;
    if (gatesToConsume.length > 0) {
      const gateRes = await consumeMultiEntitlements(userId, gatesToConsume, requestId);
      if (!gateRes.allowed) {
        return quotaDeniedResponse(gateRes);
      }
      consumedUpload = gatesToConsume.includes('resume_upload');
      consumedEvaluate = gatesToConsume.includes('ai_evaluate');
    }

    // 4. Execute AI evaluation calibrated against current document state
    let evalResult;
    try {
      evalResult = await evaluateResumeAI({
        userId,
        rawText: textToAnalyze,
        existingDoc,
        baselineScore: previousScore,
        previousSuggestions,
        forceHeuristic,
      });
    } catch (evalErr: any) {
      if (consumedUpload) {
        await refundEntitlement(userId, 'resume_upload', requestId, 'llm_error');
      }
      if (consumedEvaluate) {
        await refundEntitlement(userId, 'ai_evaluate', requestId, 'llm_error');
      }
      if (evalErr.code === 'PRO_PLAN_REQUIRED' || evalErr.message?.includes('PRO_PLAN_REQUIRED')) {
        throw evalErr;
      }
      console.warn('[API Evaluate] evaluateResumeAI threw unexpectedly, applying safe heuristic fallback:', evalErr);
      const fallbackDoc = existingDoc || parseRawTextToDocument(textToAnalyze);
      const fallbackHeuristic = evaluateResumeHeuristically(fallbackDoc, textToAnalyze);
      evalResult = {
        doc: fallbackDoc,
        evaluation: fallbackHeuristic,
        provider: 'heuristic' as const,
      };
    }
    const { doc, evaluation, provider } = evalResult;

    // 5. Persist or update resume record in Supabase

    if (!targetResumeId) {
      const insertPayload: Record<string, any> = {
        user_id: userId,
        title: title || `${doc.contact.fullName || 'Candidate'} - Resume`,
        raw_text: textToAnalyze.slice(0, 15000),
        content_hash: contentHash,
        document_schema: doc,
      };
      if (doc.extractedProfile) {
        insertPayload.extracted_profile = doc.extractedProfile;
        insertPayload.ai_extracted_at = new Date().toISOString();
      }
      let { data: newResume, error: resumeErr } = await supabaseAdmin
        .from('job_resumes')
        .insert(insertPayload)
        .select('id')
        .single();

      if (resumeErr && resumeErr.code === '42703') {
        delete insertPayload.extracted_profile;
        delete insertPayload.ai_extracted_at;
        const retry = await supabaseAdmin
          .from('job_resumes')
          .insert(insertPayload)
          .select('id')
          .single();
        newResume = retry.data;
        resumeErr = retry.error;
      }

      if (!resumeErr && newResume) {
        targetResumeId = newResume.id;
        // Row persisted: mark resume_upload completed immediately so it is never refunded
        if (consumedUpload) {
          await markUsageCompleted(userId, 'resume_upload', requestId);
          consumedUpload = false;
        }
      } else if (consumedUpload) {
        await refundEntitlement(userId, 'resume_upload', requestId, 'db_insert_error');
        consumedUpload = false;
      }
    } else {
      const updatePayload: Record<string, any> = {
        title: title || `${doc.contact.fullName || 'Candidate'} - Resume`,
        document_schema: doc,
        content_hash: contentHash,
        raw_text: textToAnalyze.slice(0, 15000),
        updated_at: new Date().toISOString(),
      };
      if (doc.extractedProfile) {
        updatePayload.extracted_profile = doc.extractedProfile;
        updatePayload.ai_extracted_at = new Date().toISOString();
      }
      const { error: updateErr } = await supabaseAdmin
        .from('job_resumes')
        .update(updatePayload)
        .eq('id', targetResumeId)
        .eq('user_id', userId);

      if (updateErr && updateErr.code === '42703') {
        delete updatePayload.extracted_profile;
        delete updatePayload.ai_extracted_at;
        await supabaseAdmin
          .from('job_resumes')
          .update(updatePayload)
          .eq('id', targetResumeId)
          .eq('user_id', userId);
      }
    }

    // 5. Persist evaluation record
    if (targetResumeId) {
      await supabaseAdmin.from('job_evaluations').insert({
        resume_id: targetResumeId,
        user_id: userId,
        content_hash: contentHash,
        overall_score: evaluation.overallScore,
        pillar_scores: evaluation.pillarScores,
        detected_seniority: evaluation.detectedSeniority,
        target_role: evaluation.targetRole,
        strengths: evaluation.strengths,
        missing_keywords: evaluation.missingKeywords,
        suggestions: evaluation.suggestions,
        job_match_vectors: evaluation.jobMatchVectors,
      });
    }

    if (consumedEvaluate) {
      await markUsageCompleted(userId, 'ai_evaluate', requestId);
    }

    return NextResponse.json({
      success: true,
      unchanged: false,
      fromCache: false,
      provider,
      doc,
      document: doc,
      evaluation,
      resumeId: targetResumeId,
    });
  } catch (error: any) {
    console.error('Resume evaluation error:', error);
    const isProRequired =
      error.code === 'PRO_PLAN_REQUIRED' ||
      error.message?.includes('PRO_PLAN_REQUIRED') ||
      error.message?.includes('Upgrade to Jobs Pro');

    return NextResponse.json(
      {
        error: error.message || 'Evaluation engine encountered an error',
        code: isProRequired ? 'PRO_PLAN_REQUIRED' : (error.code || 'EVALUATION_ERROR'),
        upgradeUrl: isProRequired ? '/premium' : undefined,
      },
      { status: isProRequired ? 403 : 500 }
    );
  }
}
