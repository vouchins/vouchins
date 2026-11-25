import { NextResponse } from 'next/server';
import { verifyJobsAccess, checkIsUserPro } from '@/lib/jobs/auth-guard';
import { extractResumeText } from '@/lib/jobs/parser';
import { extractResumeAndProfileWithAI } from '@/lib/jobs/ai-client';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FREE_PLAN_RESUME_LIMIT = 2;

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json(
        { error: 'Please log in to extract resumes.' },
        { status: 401 }
      );
    }

    const userId = authCheck.userId;
    const isPro = await checkIsUserPro(userId);
    if (!isPro) {
      const { count } = await supabaseAdmin
        .from('job_resumes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count ?? 0) >= FREE_PLAN_RESUME_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan is limited to ${FREE_PLAN_RESUME_LIMIT} resume uploads. Upgrade to Jobs Pro to upload more resumes.`,
            code: 'FREE_LIMIT_REACHED',
          },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 5MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractResumeText(buffer, file.type, file.name);
    const { document, extractedProfile, provider } = await extractResumeAndProfileWithAI(
      extraction.rawText,
      userId
    );

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

    return NextResponse.json(
      { error: error.message || 'Failed to extract text from resume file' },
      { status: isClientError ? 422 : 500 }
    );
  }
}
