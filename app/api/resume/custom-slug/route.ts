import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isSlugAvailable, validateCustomSlug } from '@/lib/jobs/custom-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Checks real-time availability of a custom resume URL slug.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = (searchParams.get('slug') || '').trim();
    const resumeId = (searchParams.get('resumeId') || '').trim();

    if (!slug) {
      return NextResponse.json({ available: false, error: 'Slug parameter is required.' });
    }

    let userId: string | undefined;
    try {
      const auth = await verifyJobsAccess(request);
      if (auth.allowed && auth.userId) userId = auth.userId;
    } catch {}

    const result = await isSlugAvailable(slug, resumeId || undefined, userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Custom slug check error:', err);
    return NextResponse.json(
      { available: false, error: err.message || 'Failed to check slug availability' },
      { status: 500 }
    );
  }
}

/**
 * POST: Saves and assigns a unique custom URL slug to the user's resume.
 */
export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resumeId, customSlug } = body;

    if (!resumeId) {
      return NextResponse.json({ error: 'Resume ID is required.' }, { status: 400 });
    }

    // 1. Verify user owns this resume
    const { data: resume, error: fetchErr } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id, document_schema')
      .eq('id', resumeId)
      .eq('user_id', authCheck.userId)
      .maybeSingle();

    if (fetchErr || !resume) {
      return NextResponse.json(
        { error: 'Resume not found or you do not have permission to edit it.' },
        { status: 404 }
      );
    }

    // 2. Validate custom slug format and uniqueness (allow user to reassign their own slug)
    const availability = await isSlugAvailable(customSlug, resumeId, authCheck.userId);
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || 'This custom resume URL is not available.' },
        { status: 409 }
      );
    }

    const cleanSlug = availability.normalized;

    // 3. Update document_schema with customSlug
    const updatedDoc = {
      ...(resume.document_schema || {}),
      customSlug: cleanSlug,
    };

    // Update document_schema and attempt column update
    const updatePayload: Record<string, any> = {
      document_schema: updatedDoc,
      updated_at: new Date().toISOString(),
    };

    try {
      updatePayload.custom_slug = cleanSlug;
      const { error: updateErr } = await supabaseAdmin
        .from('job_resumes')
        .update(updatePayload)
        .eq('id', resumeId)
        .eq('user_id', authCheck.userId);

      if (updateErr) {
        // If custom_slug column doesn't exist yet on DB, fallback to updating document_schema only
        delete updatePayload.custom_slug;
        await supabaseAdmin
          .from('job_resumes')
          .update(updatePayload)
          .eq('id', resumeId)
          .eq('user_id', authCheck.userId);
      }
    } catch {
      delete updatePayload.custom_slug;
      await supabaseAdmin
        .from('job_resumes')
        .update(updatePayload)
        .eq('id', resumeId)
        .eq('user_id', authCheck.userId);
    }

    // 4. Ensure only the primary resume holds the vanity slug by clearing it from other resumes
    try {
      await supabaseAdmin
        .from('job_resumes')
        .update({ custom_slug: null })
        .eq('user_id', authCheck.userId)
        .neq('id', resumeId);
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      customSlug: cleanSlug,
      url: `/resume/${cleanSlug}`,
      shareableUrl: `/resume/${cleanSlug}`,
      message: 'Custom resume URL saved successfully!',
    });
  } catch (err: any) {
    console.error('Custom slug update error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update custom resume URL' },
      { status: 500 }
    );
  }
}
