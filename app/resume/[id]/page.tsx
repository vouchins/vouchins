import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseRawTextToDocument } from '@/lib/jobs/xyz-evaluator';
import { ResumeDocument } from '@/lib/jobs/types';
import { PublicResumeViewer } from '@/components/jobs/public-resume-viewer';
import { findResumeBySlugOrId } from '@/lib/jobs/custom-slug';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  if (!id) return { title: 'Resume | Vouchins' };

  try {
    const resume = await findResumeBySlugOrId(id);
    const doc = resume?.document_schema as ResumeDocument | null;
    const name = doc?.contact?.fullName || resume?.title || resume?.file_name || 'Candidate';

    return {
      title: `${name} - Resume | Vouchins`,
      description: `View and download the verified candidate resume for ${name} on Vouchins.`,
    };
  } catch {
    return { title: 'Candidate Resume | Vouchins' };
  }
}

export default async function PublicResumePage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const resume = await findResumeBySlugOrId(id);

  if (!resume) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="mb-6">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Image
              src="/images/logo.png"
              alt="Vouchins"
              width={140}
              height={36}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 sm:p-10 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200/80">
            <span className="text-xl font-black">!</span>
          </div>
          <div>
            <h1 className="text-lg font-black text-neutral-900 tracking-tight">
              Resume Not Found
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              This custom resume link may have expired, or the user may not have published this handle yet.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/jobs"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold transition-all shadow-xs"
            >
              Explore Vouchins Jobs
            </a>
          </div>
        </div>
      </div>
    );
  }

  let doc: ResumeDocument | null = resume.document_schema as ResumeDocument | null;

  if (!doc && resume.raw_text) {
    try {
      doc = parseRawTextToDocument(resume.raw_text);
    } catch (err) {
      console.warn('Could not parse resume raw text:', err);
    }
  }

  // Fallback document if schema is completely empty
  if (!doc) {
    doc = {
      contact: {
        fullName: resume.title || 'Candidate',
        email: '',
        phone: '',
        location: '',
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
      },
      summary: '',
      skills: [],
      experience: [],
      education: [],
      projects: [],
      certifications: [],
    };
  }

  // Check if candidate user is verified (or platform admin)
  let isVerifiedCandidate = false;

  if (resume.user_id) {
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('full_name, email, city, is_verified, is_admin')
      .eq('id', resume.user_id)
      .maybeSingle();

    if (profile) {
      isVerifiedCandidate = Boolean(profile.is_verified || profile.is_admin);

      if (!doc.contact?.fullName && profile.full_name) {
        doc.contact = {
          ...doc.contact,
          fullName: profile.full_name,
          email: doc.contact?.email || profile.email || '',
          location: doc.contact?.location || profile.city || '',
        };
      }
    }
  }

  const customSlug = (resume as any).custom_slug || (doc as any)?.customSlug;
  const canonicalIdentifier = customSlug || resume.id;

  // Canonical redirection: If visitor accessed a non-canonical path (e.g. old UUID or non-primary ID),
  // redirect them directly to the primary resume's canonical vanity handle or primary ID
  if (canonicalIdentifier && id.toLowerCase() !== canonicalIdentifier.toLowerCase()) {
    redirect(`/resume/${canonicalIdentifier}`);
  }

  return (
    <PublicResumeViewer
      resumeId={customSlug || resume.id}
      title={resume.title || resume.file_name || 'Master Resume'}
      document={doc}
      isVerifiedCandidate={isVerifiedCandidate}
    />
  );
}
