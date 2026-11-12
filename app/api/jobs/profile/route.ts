import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ResumeDocument } from '@/lib/jobs/types';
import { isValidGeographicLocation } from '@/lib/jobs/ats-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCheck.userId;

    // Fetch user profile from Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, city, phone_number, linkedin_url, avatar_url, is_verified, vouch_points, company:companies(name)')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    // Fetch primary or latest resume document
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from('job_resumes')
      .select('id, title, document_schema, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeError) {
      console.warn('Could not fetch resume document:', resumeError);
    }

    const userResult = userData ? { ...userData } : null;
    if (userResult && userResult.city && !isValidGeographicLocation(userResult.city)) {
      userResult.city = null;
    }

    let docResult = resumeData?.document_schema || null;
    if (docResult && docResult.contact?.location && !isValidGeographicLocation(docResult.contact.location)) {
      docResult = {
        ...docResult,
        contact: {
          ...docResult.contact,
          location: userResult?.city && isValidGeographicLocation(userResult.city) ? userResult.city : '',
        },
      };
    }

    return NextResponse.json({
      success: true,
      user: userResult,
      resumeId: resumeData?.id || null,
      document: docResult,
    });
  } catch (err: any) {
    console.error('Jobs Profile GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch candidate profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCheck.userId;
    const body = await request.json();
    const { userUpdates, document }: { userUpdates?: Record<string, any>; document?: ResumeDocument } = body;

    const nowIso = new Date().toISOString();

    // 1. Update user table if userUpdates provided
    if (userUpdates && Object.keys(userUpdates).length > 0) {
      const allowedFields = ['full_name', 'city', 'phone_number', 'linkedin_url'];
      const filteredUpdates: Record<string, any> = { updated_at: nowIso };

      for (const field of allowedFields) {
        if (userUpdates[field] !== undefined) {
          if (field === 'city') {
            const cityVal = typeof userUpdates.city === 'string' ? userUpdates.city.trim() : '';
            if (cityVal && !isValidGeographicLocation(cityVal)) {
              continue; // Reject storing job titles or company names as city
            }
          }
          filteredUpdates[field] = userUpdates[field];
        }
      }

      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update(filteredUpdates)
        .eq('id', userId);

      if (userUpdateError) {
        console.warn('Error updating users table:', userUpdateError);
      }
    }

    // 2. Update or insert document into job_resumes
    if (document) {
      // Sanitize document contact location if invalid
      if (document.contact?.location && !isValidGeographicLocation(document.contact.location)) {
        document.contact.location =
          userUpdates?.city && isValidGeographicLocation(userUpdates.city)
            ? userUpdates.city.trim()
            : '';
      }
      const { data: existingResume } = await supabaseAdmin
        .from('job_resumes')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingResume?.id) {
        await supabaseAdmin
          .from('job_resumes')
          .update({
            document_schema: document,
            updated_at: nowIso,
          })
          .eq('id', existingResume.id);
      } else {
        await supabaseAdmin.from('job_resumes').insert({
          user_id: userId,
          title: 'Master Profile Resume',
          document_schema: document,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    console.error('Jobs Profile POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update candidate profile' },
      { status: 500 }
    );
  }
}

