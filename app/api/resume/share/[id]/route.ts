import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseRawTextToDocument, sanitizeBulletText } from '@/lib/jobs/xyz-evaluator';
import { ResumeDocument } from '@/lib/jobs/types';
import { findResumeBySlugOrId } from '@/lib/jobs/custom-slug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Resume identifier is required' }, { status: 400 });
    }

    const resume = await findResumeBySlugOrId(id);

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    let doc: ResumeDocument | null = resume.document_schema as ResumeDocument | null;

    if (!doc && resume.raw_text) {
      try {
        doc = parseRawTextToDocument(resume.raw_text);
      } catch (err) {
        console.warn('Could not parse raw text to document:', err);
      }
    }

    // Check candidate verification status and enrich contact if fullName is missing
    let isVerifiedCandidate = false;
    if (resume.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('full_name, email, city, is_verified, is_admin')
        .eq('id', resume.user_id)
        .maybeSingle();

      if (profile) {
        isVerifiedCandidate = Boolean(profile.is_verified || profile.is_admin);

        if (doc && !doc.contact?.fullName && profile.full_name) {
          doc.contact = {
            ...doc.contact,
            fullName: profile.full_name,
            email: doc.contact?.email || profile.email || '',
            location: doc.contact?.location || profile.city || '',
          };
        }
      }
    }

    if (doc?.experience) {
      doc.experience.forEach((e) => {
        if (Array.isArray(e.bullets)) {
          e.bullets = e.bullets.map(sanitizeBulletText);
        }
      });
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        title: resume.title || resume.file_name || 'Master Resume',
        customSlug: (resume as any).custom_slug || (doc as any)?.customSlug || null,
        isVerified: isVerifiedCandidate,
        document: doc,
        rawText: resume.raw_text || null,
        updatedAt: resume.updated_at,
        createdAt: resume.created_at,
      },
    });
  } catch (err: any) {
    console.error('Shareable resume API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve shareable resume' },
      { status: 500 }
    );
  }
}
