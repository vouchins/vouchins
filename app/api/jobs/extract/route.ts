import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { extractResumeText } from '@/lib/jobs/parser';
import { parseRawTextToDocument } from '@/lib/jobs/xyz-evaluator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed) {
      if (authCheck.reason === 'UNAUTHENTICATED') {
        return NextResponse.json(
          { error: 'Please log in to extract resumes.' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        {
          error: 'An active Jobs Pro subscription is required to process custom resumes.',
          code: 'SUBSCRIPTION_REQUIRED',
        },
        { status: 403 }
      );
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
    const document = parseRawTextToDocument(extraction.rawText);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      ...extraction,
      document,
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
