'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { useUser } from '@/components/user-provider';
import { fetchCachedResumes } from '@/lib/jobs/client-cache';
import { ImportLinkedinDialog } from '@/components/jobs/import-linkedin-dialog';
import { supabase } from '@/lib/supabase/browser';
import { isValidGeographicLocation } from '@/lib/jobs/ats-client';
import {
  ResumeDocument,
  WorkExperienceItem,
  EducationItem,
  SkillCategory,
  createDefaultResumeDocument,
} from '@/lib/jobs/types';
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';
import {
  User,
  ShieldCheck,
  Mail,
  MapPin,
  Phone,
  Linkedin,
  Github,
  GraduationCap,
  Briefcase,
  Layers,
  Shield,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  FileText,
  HelpCircle,
  Globe,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type ProfileSectionTab = 'personal' | 'education' | 'experience' | 'skills' | 'eeo';

interface EeoPreferences {
  workAuthorization: string;
  requiresSponsorship: string;
  preferredWorkplace: string;
  targetSeniority: string;
}

const DEFAULT_EEO_PREFERENCES: EeoPreferences = {
  workAuthorization: 'Authorized to work in country of application',
  requiresSponsorship: 'No sponsorship required',
  preferredWorkplace: 'Flexible / Remote & Hybrid',
  targetSeniority: 'Senior / Staff IC',
};

export default function JobsProfilePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/login?returnTo=${encodeURIComponent('/jobs/profile')}`);
    }
  }, [user, userLoading, router]);

  const [activeTab, setActiveTab] = useState<ProfileSectionTab>('personal');
  const [latestResume, setLatestResume] = useState<any | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Candidate Document State (initialized clean/empty so new users do not see mock data)
  const [document, setDocument] = useState<ResumeDocument>(() => createDefaultResumeDocument());
  const [eeoPreferences, setEeoPreferences] = useState<EeoPreferences>(DEFAULT_EEO_PREFERENCES);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);

  // Synchronize document contact details with authenticated user profile without object reference loops
  useEffect(() => {
    if (!user) return;
    setDocument((prev) => {
      const uName = user.full_name?.trim() || '';
      const uEmail = user.email || '';
      const uCity = user.city && isValidGeographicLocation(user.city) ? user.city.trim() : '';
      const uPhone = user.phone_number || '';
      const uLinkedin = user.linkedin_url || '';

      const needsUpdate =
        (!prev.contact.fullName && uName) ||
        (!prev.contact.email && uEmail) ||
        ((!prev.contact.location || !isValidGeographicLocation(prev.contact.location)) && uCity) ||
        (!prev.contact.phone && uPhone) ||
        (!prev.contact.linkedinUrl && uLinkedin);

      if (!needsUpdate) return prev;

      return {
        ...prev,
        contact: {
          ...prev.contact,
          fullName: prev.contact.fullName || uName,
          email: prev.contact.email || uEmail,
          location: (prev.contact.location && isValidGeographicLocation(prev.contact.location) ? prev.contact.location : '') || uCity,
          phone: prev.contact.phone || uPhone,
          linkedinUrl: prev.contact.linkedinUrl || uLinkedin,
        },
      };
    });
  }, [user?.id, user?.full_name, user?.email, user?.city, user?.phone_number, user?.linkedin_url]);

  // Section Edit Modal States
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editEducationOpen, setEditEducationOpen] = useState(false);
  const [editExperienceOpen, setEditExperienceOpen] = useState(false);
  const [editSkillsOpen, setEditSkillsOpen] = useState(false);
  const [editEeoOpen, setEditEeoOpen] = useState(false);

  // Draft States for editing
  const [personalDraft, setPersonalDraft] = useState({
    fullName: '',
    location: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    githubUrl: '',
  });

  const [educationDraft, setEducationDraft] = useState<EducationItem[]>([]);
  const [experienceDraft, setExperienceDraft] = useState<WorkExperienceItem[]>([]);
  const [skillsDraft, setSkillsDraft] = useState<SkillCategory[]>([]);
  const [eeoDraft, setEeoDraft] = useState<EeoPreferences>(DEFAULT_EEO_PREFERENCES);

  // Fetch initial profile & resume data
  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('vouchins_dismiss_complete_profile_card') === 'true';
      if (dismissed) setIsAlertDismissed(true);
    }

    async function loadCandidateProfile() {
      setIsLoadingProfile(true);
      try {
        // 1. Check if user has an existing candidate profile via API
        const profileRes = await fetch('/api/jobs/profile').catch(() => null);
        if (profileRes && profileRes.ok) {
          const profileJson = await profileRes.json();
          if (profileJson.document && isMounted) {
            setDocument(profileJson.document);
            if (profileJson.user?.linkedin_url) {
              setDocument((prev) => ({
                ...prev,
                contact: {
                  ...prev.contact,
                  linkedinUrl: profileJson.user.linkedin_url,
                },
              }));
            }
          }
        }

        // 2. Fetch cached master resumes
        const data = await fetchCachedResumes();
        if (isMounted && data.resumes && Array.isArray(data.resumes) && data.resumes.length > 0) {
          const primary = data.resumes.find((r: any) => r.isPrimary) || data.resumes[0];
          setLatestResume(primary);
          if (primary.document) {
            setDocument(primary.document);
          }
          if (typeof data.latestScore === 'number') {
            setLatestScore(data.latestScore);
          } else if (primary?.evaluation?.overallScore) {
            setLatestScore(primary.evaluation.overallScore);
          }
        }
      } catch (err) {
        console.warn('Profile fetch encountered fallback:', err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    }

    loadCandidateProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal opener helpers (initialize draft on open without reactive loops)
  const openPersonalModal = () => {
    const candidateName =
      document.contact.fullName ||
      user?.full_name?.trim() ||
      user?.email?.split('@')[0] ||
      '';

    setPersonalDraft({
      fullName: candidateName,
      location:
        (document.contact.location && isValidGeographicLocation(document.contact.location)
          ? document.contact.location
          : '') ||
        (user?.city && isValidGeographicLocation(user.city) ? user.city : ''),
      email: document.contact.email || user?.email || '',
      phone: document.contact.phone || user?.phone_number || '',
      linkedinUrl: document.contact.linkedinUrl || user?.linkedin_url || '',
      githubUrl: document.contact.githubUrl || '',
    });
    setEditPersonalOpen(true);
  };

  const openEducationModal = () => {
    setEducationDraft(document.education || []);
    setEditEducationOpen(true);
  };

  const openExperienceModal = () => {
    setExperienceDraft(document.experience || []);
    setEditExperienceOpen(true);
  };

  const openSkillsModal = () => {
    setSkillsDraft(document.skills || []);
    setEditSkillsOpen(true);
  };

  const openEeoModal = () => {
    setEeoDraft(eeoPreferences);
    setEditEeoOpen(true);
  };

  // Scroll to section when tab is clicked (Jobright style)
  const handleTabClick = (tabId: ProfileSectionTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const targetElement = window.document.getElementById(tabId);
      if (targetElement) {
        if (typeof targetElement.scrollIntoView === 'function') {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.history.replaceState(null, '', `#${tabId}`);
      }
    }
  };

  // Scrollspy & URL hash listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial hash scroll on mount
    const hash = window.location.hash.replace('#', '') as ProfileSectionTab;
    const validSections: ProfileSectionTab[] = ['personal', 'education', 'experience', 'skills', 'eeo'];
    if (validSections.includes(hash)) {
      setActiveTab(hash);
      setTimeout(() => {
        const el = window.document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }

    // 2. IntersectionObserver for active tab scrollspy
    if (!('IntersectionObserver' in window)) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          const id = entry.target.id as ProfileSectionTab;
          setActiveTab(id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-80px 0px -40% 0px',
      threshold: [0.25],
    });

    validSections.forEach((id) => {
      const el = window.document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Persist updated profile to API
  const persistProfileUpdates = async (
    updatedDoc: ResumeDocument,
    userUpdates?: Record<string, any>
  ) => {
    try {
      let authHeaders: Record<string, string> = {};
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders = { Authorization: `Bearer ${session.access_token}` };
        }
      } catch {}

      const res = await fetch('/api/jobs/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          document: updatedDoc,
          userUpdates,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save profile changes to database.');
      }
      toast.success('Candidate profile updated successfully!');
    } catch (err: any) {
      console.warn('Profile persist warning:', err);
      toast.error(err.message || 'Could not persist updates.');
    }
  };

  // Save Handlers for modals
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDoc: ResumeDocument = {
      ...document,
      contact: {
        ...document.contact,
        fullName: personalDraft.fullName,
        location: personalDraft.location,
        email: personalDraft.email,
        phone: personalDraft.phone,
        linkedinUrl: personalDraft.linkedinUrl,
        githubUrl: personalDraft.githubUrl,
      },
    };
    setDocument(updatedDoc);
    setEditPersonalOpen(false);

    await persistProfileUpdates(updatedDoc, {
      full_name: personalDraft.fullName,
      city: isValidGeographicLocation(personalDraft.location) ? personalDraft.location.trim() : '',
      phone_number: personalDraft.phone,
      linkedin_url: personalDraft.linkedinUrl,
    });
  };

  const handleSaveEducation = async () => {
    const updatedDoc: ResumeDocument = {
      ...document,
      education: educationDraft,
    };
    setDocument(updatedDoc);
    setEditEducationOpen(false);
    await persistProfileUpdates(updatedDoc);
  };

  const handleSaveExperience = async () => {
    const updatedDoc: ResumeDocument = {
      ...document,
      experience: experienceDraft,
    };
    setDocument(updatedDoc);
    setEditExperienceOpen(false);
    await persistProfileUpdates(updatedDoc);
  };

  const handleSaveSkills = async () => {
    const updatedDoc: ResumeDocument = {
      ...document,
      skills: skillsDraft,
    };
    setDocument(updatedDoc);
    setEditSkillsOpen(false);
    await persistProfileUpdates(updatedDoc);
  };

  const handleSaveEeo = () => {
    setEeoPreferences(eeoDraft);
    setEditEeoOpen(false);
    toast.success('Application preferences updated!');
  };

  // Sync from Master Resume
  const handleSyncFromMasterResume = () => {
    if (!latestResume?.document) {
      toast.info('No master resume uploaded yet. You can import from LinkedIn or upload a resume.');
      return;
    }
    setDocument(latestResume.document);
    persistProfileUpdates(latestResume.document);
    toast.success('Profile synced with latest Master Resume!');
  };

  const candidateFullName =
    document.contact.fullName ||
    user?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    '';

  const candidateLocation =
    (document.contact.location && isValidGeographicLocation(document.contact.location)
      ? document.contact.location
      : '') ||
    (user?.city && isValidGeographicLocation(user.city) ? user.city : '');
  const candidateEmail = document.contact.email || user?.email || '';
  const candidatePhone = document.contact.phone || user?.phone_number || '';
  const candidateLinkedin = document.contact.linkedinUrl || user?.linkedin_url || '';
  const candidateGithub = document.contact.githubUrl || '';

  // Comprehensive profile completeness check (Candidate resume sections)
  const profileCompleteness = useMemo(() => {
    // Candidate Profile Section Parameters:
    const hasName = Boolean(candidateFullName && candidateFullName.trim() && candidateFullName !== 'Candidate');
    const hasEmail = Boolean(candidateEmail && candidateEmail.trim());
    const hasLocation = Boolean(candidateLocation && candidateLocation.trim());
    const hasContactMethod = Boolean(candidatePhone?.trim() || candidateLinkedin?.trim() || candidateGithub?.trim());
    const personalComplete = hasName && hasEmail;

    const hasEducation = Array.isArray(document.education) && document.education.length > 0;
    const hasExperience = Array.isArray(document.experience) && document.experience.length > 0;
    const hasSkills =
      Array.isArray(document.skills) &&
      document.skills.length > 0 &&
      document.skills.some((cat) => cat.items && cat.items.length > 0);

    const missingItems: string[] = [];
    if (!personalComplete) missingItems.push('Personal Details');
    if (!hasContactMethod) missingItems.push('Phone or LinkedIn');
    if (!hasExperience) missingItems.push('Work Experience');
    if (!hasEducation) missingItems.push('Education');
    if (!hasSkills) missingItems.push('Skills');

    const totalSections = 4;
    let completedSections = 0;
    if (personalComplete) completedSections++;
    if (hasExperience) completedSections++;
    if (hasEducation) completedSections++;
    if (hasSkills) completedSections++;

    const percentage = Math.round((completedSections / totalSections) * 100);
    // Profile is judged complete if all sections have data
    const isComplete = Boolean(personalComplete && hasEducation && hasExperience && hasSkills);

    return {
      isComplete,
      percentage,
      missingItems,
      personalComplete,
      hasContactMethod,
      hasEducation,
      hasExperience,
      hasSkills,
    };
  }, [
    candidateFullName,
    candidateEmail,
    candidateLocation,
    candidatePhone,
    candidateLinkedin,
    candidateGithub,
    document.education,
    document.experience,
    document.skills,
  ]);

  const hasResume = Boolean(latestResume && (latestResume.id || latestResume.name));
  const isProfileComplete = Boolean(
    profileCompleteness.hasExperience &&
    profileCompleteness.hasEducation &&
    profileCompleteness.hasSkills
  );
  // Show "Import from LinkedIn" ONLY when user has no resume nor is profile complete
  const shouldShowLinkedInImport = !hasResume && !isProfileComplete;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="profile" />

      <main className="flex-1 flex flex-col min-w-0 pb-16">
        <JobsNavbar atsScore={latestScore} />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5">
          {/* Top Title & Privacy Guarantee Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                PROFILE
              </h1>
            </div>

            {/* Privacy Assurance Banner (Jobright style) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-xs text-emerald-800 font-bold shadow-2xs self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Your profile data is kept private and secure.</span>
              <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>

          {/* Section Navigation Tabs (Personal | Education | Work Experience | Skills | Equal Employment) */}
          <div className="sticky top-14 sm:top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 px-4 flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar shadow-xs">
            {[
              { id: 'personal' as const, label: 'Personal' },
              { id: 'education' as const, label: 'Education' },
              { id: 'experience' as const, label: 'Work Experience' },
              { id: 'skills' as const, label: 'Skills' },
              { id: 'eeo' as const, label: 'Equal Employment' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`py-3 text-xs sm:text-sm whitespace-nowrap shrink-0 border-b-2 transition-all ${
                    isActive
                      ? 'border-neutral-900 text-neutral-900 font-bold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-900 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Two-Column Layout (Left Content: 68% / Right Sidebar: 32%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Content Area */}
            <div className="lg:col-span-8 space-y-5">
              {/* SECTION 1: PERSONAL CONTACT DETAILS */}
              <div
                id="personal"
                className="scroll-mt-24 sm:scroll-mt-28 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-xs relative"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    {candidateFullName ? (
                      <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                        {candidateFullName}
                      </h2>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-400 italic">
                          Add your full name
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                          Incomplete
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openPersonalModal}
                    title="Edit Personal Information"
                    className="p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {/* Candidate Contact Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-600 pt-1">
                  {candidateLocation ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{candidateLocation}</span>
                    </span>
                  ) : null}

                  {candidateEmail ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <Mail className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{candidateEmail}</span>
                    </span>
                  ) : null}

                  {candidatePhone ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <Phone className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{candidatePhone}</span>
                    </span>
                  ) : null}

                  {candidateLinkedin ? (
                    <a
                      href={
                        candidateLinkedin.startsWith('http')
                          ? candidateLinkedin
                          : `https://${candidateLinkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0077B5]/10 text-[#0077B5] border border-[#0077B5]/20 hover:underline"
                    >
                      <Linkedin className="h-3.5 w-3.5 fill-[#0077B5]" />
                      <span className="truncate max-w-[200px]">
                        {candidateLinkedin.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={openPersonalModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border border-dashed border-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Linkedin className="h-3.5 w-3.5 text-[#0077B5]" />
                      <span>+ Add LinkedIn</span>
                    </button>
                  )}

                  {candidateGithub ? (
                    <a
                      href={
                        candidateGithub.startsWith('http')
                          ? candidateGithub
                          : `https://${candidateGithub}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 hover:underline"
                    >
                      <Github className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[200px]">
                        {candidateGithub.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </a>
                  ) : null}

                  {!candidateLocation && !candidatePhone && !candidateLinkedin && (
                    <button
                      type="button"
                      onClick={openPersonalModal}
                      className="text-xs text-[#0A1B5C] font-semibold hover:underline inline-flex items-center gap-1 py-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add location, phone &amp; LinkedIn</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 2: EDUCATION TIMELINE (Jobright Style) */}
              <div
                id="education"
                className="scroll-mt-28 sm:scroll-mt-32 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                    Education
                  </h3>

                  <button
                    type="button"
                    onClick={openEducationModal}
                    title="Edit Education"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {document.education && document.education.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-neutral-200">
                    {document.education.map((edu, idx) => (
                      <div key={idx} className="relative space-y-1">
                        {/* Timeline Hollow Circle Node */}
                        <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-neutral-400 bg-white" />

                        {/* Date next to node */}
                        <span className="text-xs font-medium text-neutral-400 block">
                          {edu.endDate || edu.startDate || '2020-01'}
                        </span>

                        {/* Institution Name */}
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900">
                          {edu.institution}
                        </h4>

                        {/* Degree & Field of Study */}
                        <p className="text-xs text-neutral-600 font-normal">
                          {edu.degree}
                          {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                          {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 flex items-center justify-center mx-auto text-[#0A1B5C]">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-900">No education added yet</h4>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        Add your university degrees, colleges, and academic years to boost job match scoring.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openEducationModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Education</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 3: WORK EXPERIENCE TIMELINE (Jobright Style) */}
              <div
                id="experience"
                className="scroll-mt-28 sm:scroll-mt-32 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                    Work Experience
                  </h3>

                  <button
                    type="button"
                    onClick={openExperienceModal}
                    title="Edit Work Experience"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {document.experience && document.experience.length > 0 ? (
                  <div className="relative pl-6 space-y-8 before:absolute before:left-1.5 before:top-2 before:bottom-3 before:w-px before:bg-neutral-200">
                    {document.experience.map((exp, idx) => (
                      <div key={idx} className="relative space-y-1">
                        {/* Timeline Hollow Circle Node */}
                        <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-neutral-400 bg-white" />

                        {/* Dates next to node */}
                        <span className="text-xs font-medium text-neutral-400 block">
                          {exp.startDate} ↔ {exp.endDate || 'Present'}{' '}
                          {exp.location ? `| ${exp.location}` : ''}
                        </span>

                        {/* Role Title */}
                        <h4 className="text-sm sm:text-base font-bold text-neutral-900">
                          {exp.roleTitle}
                        </h4>

                        {/* Company & Department Subtitle */}
                        <p className="text-xs font-normal text-neutral-600">
                          {exp.company}
                        </p>

                        {/* Bullet Points */}
                        <ul className="space-y-1.5 pt-1">
                          {exp.bullets.map((b, bIdx) => (
                            <li
                              key={bIdx}
                              className="text-xs text-neutral-700 leading-relaxed flex items-start gap-2"
                            >
                              <span className="text-neutral-400 shrink-0 select-none">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 flex items-center justify-center mx-auto text-[#0A1B5C]">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-900">No work experience added yet</h4>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        Add past positions, companies, and measurable achievements to unlock tailored applications.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openExperienceModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Work Experience</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 4: SKILLS */}
              <div
                id="skills"
                className="scroll-mt-24 sm:scroll-mt-28 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#0A1B5C]" />
                    <h3 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                      Skills
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={openSkillsModal}
                    title="Edit Skills"
                    className="p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                {document.skills && document.skills.length > 0 ? (
                  <div className="space-y-3">
                    {document.skills.map((skillGroup, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-150 space-y-2">
                        <span className="text-xs font-extrabold text-[#0A1B5C] uppercase tracking-wider block">
                          {skillGroup.category}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skillGroup.items.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-neutral-50/80 border border-neutral-200/90 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 flex items-center justify-center mx-auto text-[#0A1B5C]">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-neutral-900">No skills cataloged yet</h4>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        Add your core tech stack and domain competencies to calculate ATS match scores and keyword alignment.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openSkillsModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Skills</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 5: EQUAL EMPLOYMENT & PREFERENCES */}
              <div
                id="eeo"
                className="scroll-mt-24 sm:scroll-mt-28 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[#0A1B5C]" />
                    <h3 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                      Equal Employment & Work Authorization
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={openEeoModal}
                    title="Edit Preferences"
                    className="p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[10px] uppercase">
                      Work Authorization
                    </span>
                    <span className="text-neutral-800 font-extrabold block">
                      {eeoPreferences.workAuthorization}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[10px] uppercase">
                      Visa Sponsorship Requirement
                    </span>
                    <span className="text-neutral-800 font-extrabold block">
                      {eeoPreferences.requiresSponsorship}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[10px] uppercase">
                      Workplace Preference
                    </span>
                    <span className="text-neutral-800 font-extrabold block">
                      {eeoPreferences.preferredWorkplace}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                    <span className="text-neutral-400 font-bold block text-[10px] uppercase">
                      Target Seniority Band
                    </span>
                    <span className="text-neutral-800 font-extrabold block">
                      {eeoPreferences.targetSeniority}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar (Jobright Style) */}
            <div className="lg:col-span-4 space-y-4">
              {/* 1. Complete Profile Alert Card (Hidden if profile is complete, alert is dismissed, or still loading) */}
              {!isLoadingProfile && !profileCompleteness.isComplete && !isAlertDismissed && (
                <div className="bg-[#FFF1F2] border border-rose-200/90 rounded-2xl p-5 shadow-2xs space-y-3 relative group">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAlertDismissed(true);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('vouchins_dismiss_complete_profile_card', 'true');
                      }
                      toast.info('Complete Profile card dismissed. You can edit sections anytime.');
                    }}
                    title="Dismiss notification"
                    className="absolute top-3.5 right-3.5 p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <span className="text-xs font-bold leading-none block">✕</span>
                  </button>

                  <div className="flex items-start gap-2.5 pr-6">
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-800 font-medium leading-relaxed">
                        Complete your profile to boost job matching accuracy and enable Autofill extension to autofill your applications.
                      </p>
                      {profileCompleteness.missingItems.length > 0 && (
                        <p className="text-[11px] text-rose-700 font-semibold">
                          Missing: {profileCompleteness.missingItems.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!profileCompleteness.personalComplete || !profileCompleteness.hasContactMethod) {
                        openPersonalModal();
                      } else if (!profileCompleteness.hasExperience) {
                        openExperienceModal();
                      } else if (!profileCompleteness.hasEducation) {
                        openEducationModal();
                      } else if (!profileCompleteness.hasSkills) {
                        openSkillsModal();
                      } else {
                        openPersonalModal();
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shadow-xs transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Complete Profile</span>
                    {profileCompleteness.percentage > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/20">
                        {profileCompleteness.percentage}%
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* 2. Manage My Resume Card (Matching Screenshot 2) */}
              <Link
                href="/jobs/resume"
                className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-2xs flex items-center justify-between group hover:border-neutral-300 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-neutral-600" />
                  <span className="text-xs font-bold text-neutral-900">Manage My Resume</span>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 transition-colors" />
              </Link>

              {/* 3. Master Resume Connection Card (Shown when user has a master resume) */}
              {!isLoadingProfile && hasResume && (
                <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#0A1B5C]" />
                      <span className="text-xs font-bold text-neutral-900">Master Resume</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Connected
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed font-normal">
                    Profile synchronized with{' '}
                    <strong className="text-neutral-700">{latestResume?.name || 'Master Resume'}</strong>.
                  </p>

                  <button
                    type="button"
                    onClick={handleSyncFromMasterResume}
                    title="1-Click populate from your master resume"
                    className="w-full py-2 px-3 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-neutral-600" />
                    <span>Sync from Master Resume</span>
                  </button>
                </div>
              )}

              {/* 4. Import from LinkedIn Card (Shown ONLY when user has no resume nor is profile complete) */}
              {!isLoadingProfile && shouldShowLinkedInImport && (
                <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0077B5] fill-[#0077B5]" />
                    <span className="text-xs font-bold text-neutral-900">
                      Import from LinkedIn
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed font-normal">
                    Import your full career history, education, and skills in seconds by uploading your official LinkedIn profile PDF.
                  </p>

                  <button
                    type="button"
                    onClick={() => setLinkedinModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Linkedin className="h-3.5 w-3.5 fill-white" />
                    <span>Import LinkedIn PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL 1: Edit Personal Details */}
        <Dialog open={editPersonalOpen} onOpenChange={setEditPersonalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-neutral-200 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900">
                Edit Personal Information
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Update your contact channels displayed on job applications and insider introductions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePersonal} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={personalDraft.fullName}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, fullName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Location</label>
                <input
                  type="text"
                  placeholder="San Francisco, CA"
                  value={personalDraft.location}
                  onChange={(e) => setPersonalDraft({ ...personalDraft, location: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={personalDraft.email}
                    onChange={(e) => setPersonalDraft({ ...personalDraft, email: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 555 123 4567"
                    value={personalDraft.phone}
                    onChange={(e) => setPersonalDraft({ ...personalDraft, phone: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/username"
                  value={personalDraft.linkedinUrl}
                  onChange={(e) =>
                    setPersonalDraft({ ...personalDraft, linkedinUrl: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">GitHub Profile</label>
                <input
                  type="text"
                  placeholder="https://github.com/username"
                  value={personalDraft.githubUrl}
                  onChange={(e) =>
                    setPersonalDraft({ ...personalDraft, githubUrl: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPersonalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: Edit Education */}
        <Dialog open={editEducationOpen} onOpenChange={setEditEducationOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-neutral-200 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900">
                Edit Education
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Add or edit your academic institutions and degrees.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {educationDraft.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...educationDraft];
                      updated.splice(idx, 1);
                      setEducationDraft(updated);
                    }}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-rose-600"
                    title="Remove education entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                      Institution / University
                    </label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => {
                        const updated = [...educationDraft];
                        updated[idx].institution = e.target.value;
                        setEducationDraft(updated);
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        Degree
                      </label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => {
                          const updated = [...educationDraft];
                          updated[idx].degree = e.target.value;
                          setEducationDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        Graduation Year / Date
                      </label>
                      <input
                        type="text"
                        value={edu.endDate}
                        onChange={(e) => {
                          const updated = [...educationDraft];
                          updated[idx].endDate = e.target.value;
                          setEducationDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setEducationDraft([
                    ...educationDraft,
                    {
                      id: `edu-${Date.now()}`,
                      institution: 'University / College',
                      degree: 'Bachelor of Science in Computer Science',
                      endDate: '2022',
                    },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 hover:border-[#0A1B5C] text-xs font-bold text-[#0A1B5C] flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Institution</span>
              </button>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditEducationOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEducation}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white"
                >
                  Save Education
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: Edit Work Experience */}
        <Dialog open={editExperienceOpen} onOpenChange={setEditExperienceOpen}>
          <DialogContent className="sm:max-w-2xl bg-white border border-neutral-200 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900">
                Edit Work Experience
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Update your career milestones and achievements.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {experienceDraft.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3 relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...experienceDraft];
                      updated.splice(idx, 1);
                      setExperienceDraft(updated);
                    }}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-rose-600"
                    title="Remove experience entry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...experienceDraft];
                          updated[idx].company = e.target.value;
                          setExperienceDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        Role Title
                      </label>
                      <input
                        type="text"
                        value={exp.roleTitle}
                        onChange={(e) => {
                          const updated = [...experienceDraft];
                          updated[idx].roleTitle = e.target.value;
                          setExperienceDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        Start Date
                      </label>
                      <input
                        type="text"
                        placeholder="2021-04 or Apr 2021"
                        value={exp.startDate}
                        onChange={(e) => {
                          const updated = [...experienceDraft];
                          updated[idx].startDate = e.target.value;
                          setExperienceDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                        End Date
                      </label>
                      <input
                        type="text"
                        placeholder="Present or 2023"
                        value={exp.endDate}
                        onChange={(e) => {
                          const updated = [...experienceDraft];
                          updated[idx].endDate = e.target.value;
                          setExperienceDraft(updated);
                        }}
                        className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                      Bullet Points (1 per line)
                    </label>
                    <textarea
                      rows={3}
                      value={exp.bullets.join('\n')}
                      onChange={(e) => {
                        const updated = [...experienceDraft];
                        updated[idx].bullets = e.target.value.split('\n').filter(Boolean);
                        setExperienceDraft(updated);
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setExperienceDraft([
                    ...experienceDraft,
                    {
                      id: `exp-${Date.now()}`,
                      company: 'Company Name',
                      roleTitle: 'Software Engineer',
                      startDate: '2023',
                      endDate: 'Present',
                      isCurrent: true,
                      bullets: ['Spearheaded development of scalable cloud microservices.'],
                    },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 hover:border-[#0A1B5C] text-xs font-bold text-[#0A1B5C] flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Position</span>
              </button>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditExperienceOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveExperience}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white"
                >
                  Save Experience
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 4: Edit Skills */}
        <Dialog open={editSkillsOpen} onOpenChange={setEditSkillsOpen}>
          <DialogContent className="sm:max-w-lg bg-white border border-neutral-200 rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900">
                Edit Skills
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Group your technical skills into clean categories.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {skillsDraft.map((group, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...skillsDraft];
                      updated.splice(idx, 1);
                      setSkillsDraft(updated);
                    }}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-rose-600"
                    title="Remove skill category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                      Category (e.g. Languages, Frontend, Cloud)
                    </label>
                    <input
                      type="text"
                      value={group.category}
                      onChange={(e) => {
                        const updated = [...skillsDraft];
                        updated[idx].category = e.target.value;
                        setSkillsDraft(updated);
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">
                      Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      value={group.items.join(', ')}
                      onChange={(e) => {
                        const updated = [...skillsDraft];
                        updated[idx].items = e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setSkillsDraft(updated);
                      }}
                      className="w-full p-2 text-xs rounded-xl border border-neutral-300 bg-white"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setSkillsDraft([
                    ...skillsDraft,
                    { category: 'Frameworks', items: ['React', 'Node.js'] },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 hover:border-[#0A1B5C] text-xs font-bold text-[#0A1B5C] flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Skill Category</span>
              </button>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditSkillsOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkills}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white"
                >
                  Save Skills
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 5: Edit Equal Employment & Preferences */}
        <Dialog open={editEeoOpen} onOpenChange={setEditEeoOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-neutral-200 rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-neutral-900">
                Edit Application Preferences
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                These preferences power smart autofill and job recommendation filtering.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Work Authorization Status
                </label>
                <select
                  value={eeoDraft.workAuthorization}
                  onChange={(e) =>
                    setEeoDraft({ ...eeoDraft, workAuthorization: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="Authorized to work in country of application">
                    Authorized to work in country of application
                  </option>
                  <option value="US Citizen / Permanent Resident">
                    US Citizen / Permanent Resident
                  </option>
                  <option value="Visa Holder (H-1B, L-1, O-1, OPT)">
                    Visa Holder (H-1B, L-1, O-1, OPT)
                  </option>
                  <option value="Require Visa Sponsorship">Require Visa Sponsorship</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Sponsorship Requirement
                </label>
                <select
                  value={eeoDraft.requiresSponsorship}
                  onChange={(e) =>
                    setEeoDraft({ ...eeoDraft, requiresSponsorship: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="No sponsorship required">No sponsorship required</option>
                  <option value="Will require sponsorship now or in the future">
                    Will require sponsorship now or in the future
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Workplace Mode Preference
                </label>
                <select
                  value={eeoDraft.preferredWorkplace}
                  onChange={(e) =>
                    setEeoDraft({ ...eeoDraft, preferredWorkplace: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="Flexible / Remote & Hybrid">Flexible / Remote & Hybrid</option>
                  <option value="Remote Only">Remote Only</option>
                  <option value="Hybrid / On-site">Hybrid / On-site</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Target Seniority Band
                </label>
                <select
                  value={eeoDraft.targetSeniority}
                  onChange={(e) =>
                    setEeoDraft({ ...eeoDraft, targetSeniority: e.target.value })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="Senior / Staff IC">Senior / Staff IC</option>
                  <option value="Lead / Principal / Architect">Lead / Principal / Architect</option>
                  <option value="Mid-Level IC">Mid-Level IC</option>
                  <option value="Engineering Manager / Director">
                    Engineering Manager / Director
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditEeoOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEeo}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL 6: Import from LinkedIn Dialog */}
        <ImportLinkedinDialog
          isOpen={linkedinModalOpen}
          onClose={() => setLinkedinModalOpen(false)}
          currentLinkedinUrl={candidateLinkedin || personalDraft.linkedinUrl}
          onProfileImported={(importedDoc, url) => {
            if (importedDoc) {
              setDocument(importedDoc);
              persistProfileUpdates(importedDoc, url ? { linkedin_url: url } : undefined);
            }
            if (url) {
              setPersonalDraft((prev) => ({ ...prev, linkedinUrl: url }));
            }
          }}
        />
      </main>
    </div>
  );
}
