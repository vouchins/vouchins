import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { extractResumeText } from '@/lib/jobs/parser';
import {
  extractResumeAndProfileWithAI,
  extractResumeFromPdfBufferWithAI,
} from '@/lib/jobs/ai-client';
import {
  checkEntitlement,
  consumeEntitlement,
  markUsageCompleted,
  quotaDeniedResponse,
  refundEntitlement,
  resolveIdempotencyKey,
} from '@/lib/jobs/entitlements';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let userId = '';
  let requestId = '';
  let extractConsumed = false;

  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json(
        { error: 'Please log in to extract resumes.' },
        { status: 401 }
      );
    }

    userId = authCheck.userId;

    const idem = resolveIdempotencyKey(request);
    if (!idem.ok) {
      return NextResponse.json({ error: idem.error }, { status: 400 });
    }
    requestId = idem.key;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawTargetResumeId = formData.get('targetResumeId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    // Verify ownership of targetResumeId if provided; only verified updates bypass new-slot pre-check
    let isVerifiedUpdate = false;
    if (rawTargetResumeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTargetResumeId)) {
      const { data: ownedRow } = await supabaseAdmin
        .from('job_resumes')
        .select('id')
        .eq('id', rawTargetResumeId)
        .eq('user_id', userId)
        .maybeSingle();
      isVerifiedUpdate = Boolean(ownedRow?.id);
    }

    if (!isVerifiedUpdate) {
      const uploadCheck = await checkEntitlement(userId, 'resume_upload');
      if (!uploadCheck.allowed) {
        return quotaDeniedResponse(uploadCheck);
      }
    }

    // Meter LLM PDF/text extraction before invoking Gemini
    const extractGate = await consumeEntitlement(userId, 'resume_extract', requestId);
    if (!extractGate.allowed) {
      return quotaDeniedResponse(extractGate);
    }
    extractConsumed = true;

    const buffer = Buffer.from(await file.arrayBuffer());
    const lowerName = (file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

    // Gemini-First for PDFs (accurate reading order on multi-column/Canva/scanned PDFs)
    if (isPdf) {
      const geminiResult = await extractResumeFromPdfBufferWithAI(buffer, userId);
      if (geminiResult) {
        await markUsageCompleted(userId, 'resume_extract', requestId);
        extractConsumed = false;
        const wordCount = geminiResult.rawText.split(/\s+/).filter(Boolean).length;
        return NextResponse.json({
          success: true,
          fileName: file.name,
          fileSize: file.size,
          rawText: geminiResult.rawText,
          wordCount,
          characterCount: geminiResult.rawText.length,
          detectedFormat: 'pdf',
          document: geminiResult.document,
          extractedProfile: geminiResult.extractedProfile,
          provider: geminiResult.provider,
        });
      }
    }

    // Resilient fallback (also primary path for DOCX / TXT)
    const extraction = await extractResumeText(buffer, file.type, file.name);
    const { document, extractedProfile, provider } = await extractResumeAndProfileWithAI(
      extraction.rawText,
      userId
    );

    await markUsageCompleted(userId, 'resume_extract', requestId);
    extractConsumed = false;

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      ...extraction,
      document,
      extractedProfile,
      provider,
    });
  } catch (error: any) {
    console.error('Resume extraction error:', error);
    const isClientError =
      error.message?.includes('password-protected') ||
      error.message?.includes('meaningful text') ||
      error.message?.includes('image-only') ||
      error.message?.includes('File size');

    if (extractConsumed && userId && requestId && !isClientError) {
      await refundEntitlement(userId, 'resume_extract', requestId, 'extract_error');
    }

    return NextResponse.json(
      { error: error.message || 'Failed to extract text from resume file' },
      { status: isClientError ? 422 : 500 }
    );
  }
}
