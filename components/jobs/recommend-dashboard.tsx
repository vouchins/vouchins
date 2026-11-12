'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  Users,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  FileText,
  SlidersHorizontal,
  Flame,
  X,
  Send,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Copy,
  Target,
  Zap,
  Bot,
  Loader2,
  Building2,
  ChevronLeft,
  Lock,
  RotateCw,
  Check,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { EnterpriseBuildingIcon } from '@/components/icons/enterprise-building-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { InviteDialog, triggerNativeShare } from '@/components/invite-dialog';
import posthog from 'posthog-js';
import { NavbarUserAvatar } from '@/components/navbar-user-avatar';
import { JobsSidebar } from './jobs-sidebar';
import { JobsNavbar } from './jobs-navbar';
import { useUser } from '@/components/user-provider';
import { supabase } from '@/lib/supabase/browser';
import { isLocationMatch, LOCATION_ALIASES, evaluateJobMatch, containsSkill, COMMON_TECH_TAXONOMY, canonicalizeSkill, isValidGeographicLocation } from '@/lib/jobs/ats-client';
import { cleanJobApplyUrl } from '@/lib/jobs/url-cleaner';
import { CompanyLogo } from './company-logo';
import { getGoogleFaviconUrl } from '@/lib/utils';
import { CURATED_TECH_JOBS } from '@/lib/jobs/curated-tech-jobs';

export interface RecommendedJob {
  id: string;
  title: string;
  companyName: string;
  companyLogo?: string;
  location: string;
  workplaceType: 'Remote' | 'Hybrid' | 'Onsite';
  jobType: 'Full-time' | 'Contract' | 'Part-time';
  experienceLevel: 'Senior' | 'Staff' | 'Lead' | 'Principal' | 'Mid';
  salaryRange: string;
  postedAt: string;
  createdAt?: string | number;
  matchScore: number;
  matchBreakdown: {
    skillsScore: number;
    experienceScore: number;
    stackScore: number;
  };
  whyYouMatch: string;
  matchingSkills: string[];
  missingSkills: string[];
  insiderCount: number;
  verifiedInsiders: {
    name: string;
    role: string;
    domain: string;
    avatarUrl?: string;
    responseRate: string;
  }[];
  description: {
    about: string;
    responsibilities: string[];
    qualifications: string[];
    techStack: string[];
    benefits: string[];
  };
  tailoredBulletSuggestion: {
    original: string;
    tailored: string;
    impactMetric: string;
  };
  externalApplyUrl?: string | null;
  externalJobId?: string | null;
  isInternal?: boolean;
  recruiterId?: string | null;
  isCurated?: boolean;
  isRecommended?: boolean;
}

export interface CompanyInsider {
  id: string;
  name: string;
  role: string;
  city?: string | null;
  domain: string;
  companyName: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  vouchPoints: number;
  responseRate: string;
  isRegisteredUser?: boolean;
}

export function formatPartialName(fullName: string): string {
  if (!fullName) return 'V**** M****';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0].toUpperCase();
    const second = parts[parts.length - 1][0].toUpperCase();
    return `${first}**** ${second}****`;
  }
  if (parts.length === 1) {
    const first = parts[0][0].toUpperCase();
    return `${first}****`;
  }
  return 'V**** M****';
}

/**
 * Validates whether an external URL represents a direct job requisition
 * rather than a generic root career portal or Google search fallback.
 */
export function hasValidExternalJobId(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('javascript:')) return false;

  // Reject Google search fallback links
  if (trimmed.includes('google.com/search')) return false;

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = parsed.pathname.toLowerCase();

    // Check for root domain or generic landing pages with no specific job requisition
    const genericRoots = [
      '',
      '/',
      '/careers',
      '/careers/',
      '/jobs',
      '/jobs/',
      '/about/careers',
      '/about/careers/',
      '/positions',
      '/positions/',
      '/careers/applications/jobs/results',
    ];
    if (genericRoots.includes(pathname) && !parsed.search && !parsed.hash) {
      return false;
    }

    const atsDomains = [
      'greenhouse.io',
      'lever.co',
      'ashbyhq.com',
      'workday.com',
      'myworkdayjobs.com',
      'smartrecruiters.com',
      'bamboohr.com',
      'jobvite.com',
      'icims.com',
      'breezy.hr',
      'workable.com',
      'rippling-ats.com',
    ];

    const isAts = atsDomains.some((d) => parsed.hostname.includes(d));
    if (isAts) {
      const pathParts = pathname.split('/').filter(Boolean);
      return pathParts.length >= 2;
    }

    const hasRequisitionParam =
      parsed.searchParams.has('gh_jid') ||
      parsed.searchParams.has('jobId') ||
      parsed.searchParams.has('job_id') ||
      parsed.searchParams.has('id') ||
      parsed.searchParams.has('requisition_id');

    if (hasRequisitionParam) return true;

    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const lastPart = pathParts[pathParts.length - 1];
      const hasIdPattern = /\d{4,}/.test(lastPart) || /[a-f0-9-]{12,}/.test(lastPart) || lastPart.includes('-');
      const isJobSection = pathParts.some((p) =>
        ['jobs', 'job', 'positions', 'position', 'openings', 'role', 'roles', 'careers', 'list', 'listing'].includes(p)
      );
      return isJobSection && hasIdPattern && !genericRoots.includes(`/${lastPart}`);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts a compact external job ID / requisition slug from a direct URL.
 */
export function extractJobId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.searchParams.get('gh_jid')) return parsed.searchParams.get('gh_jid');
    if (parsed.searchParams.get('jobId')) return parsed.searchParams.get('jobId');
    if (parsed.searchParams.get('job_id')) return parsed.searchParams.get('job_id');
    if (parsed.searchParams.get('id')) return parsed.searchParams.get('id');

    const parts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      const numMatch = lastPart.match(/\b\d{5,}\b/);
      if (numMatch) return numMatch[0];
      const prefixMatch = lastPart.match(/^(\d+)-/);
      if (prefixMatch) return prefixMatch[1];
      const uuidMatch = lastPart.match(/[a-f0-9-]{16,}/i);
      if (uuidMatch) return uuidMatch[0].slice(0, 8);
      return lastPart.slice(0, 16);
    }
  } catch { }
  return null;
}

/**
 * Detects whether a location string represents an Indian city, state, or region.
 */
export function isIndianLocation(location?: string | null): boolean {
  if (!location) return false;
  const loc = location.toLowerCase();
  const indianKeywords = [
    'india',
    'hyderabad',
    'bangalore',
    'bengaluru',
    'pune',
    'mumbai',
    'delhi',
    'ncr',
    'gurgaon',
    'gurugram',
    'noida',
    'chennai',
    'telangana',
    'karnataka',
    'maharashtra',
    'tamil nadu',
    'haryana',
    'kolkata',
    'ahmedabad',
  ];
  return indianKeywords.some((k) => loc.includes(k));
}

/**
 * Formats compensation in a location-aware manner.
 * For Indian locations, formats or converts into INR Lakhs (e.g. ₹28L - ₹45L / yr).
 */
export function formatLocalizedSalary(salaryRange?: string | null, location?: string | null): string {
  if (!salaryRange || salaryRange.trim() === '') {
    return isIndianLocation(location) ? '₹25L - ₹40L / yr' : 'Competitive / Market Band';
  }

  const trimmed = salaryRange.trim();

  // If already in INR, format nicely
  if (trimmed.startsWith('₹') || trimmed.toLowerCase().includes('lpa') || trimmed.toLowerCase().includes('lakh')) {
    return trimmed;
  }

  // If Indian location but raw salary contains USD ($), convert to realistic INR CTC band
  if (isIndianLocation(location)) {
    if (trimmed.includes('$')) {
      const matches = trimmed.match(/\$(\d+)(?:k)?(?:\s*-\s*\$(\d+)(?:k)?)?/i);
      if (matches) {
        const minK = parseInt(matches[1], 10);
        const maxK = matches[2] ? parseInt(matches[2], 10) : undefined;
        const minLakhs = Math.max(18, Math.round(minK * 0.22));
        const maxLakhs = maxK ? Math.max(minLakhs + 10, Math.round(maxK * 0.25)) : undefined;
        return maxLakhs ? `₹${minLakhs}L - ₹${maxLakhs}L / yr` : `From ₹${minLakhs}L / yr`;
      }
    }
    if (trimmed.toLowerCase().includes('competitive')) {
      return '₹28L - ₹45L / yr';
    }
  }

  return trimmed;
}

const CURATED_RECOMMENDED_JOBS: RecommendedJob[] = CURATED_TECH_JOBS.map((cj) => ({
  id: cj.id,
  title: cj.title,
  companyName: cj.companyName,
  companyLogo: cj.companyLogo,
  location: cj.location,
  workplaceType: cj.workplaceType,
  jobType: cj.jobType,
  experienceLevel: cj.experienceLevel as any,
  salaryRange: formatLocalizedSalary(cj.salaryRange, cj.location),
  postedAt: cj.postedAt,
  matchScore: 95,
  matchBreakdown: {
    skillsScore: 96,
    experienceScore: 94,
    stackScore: 95,
  },
  whyYouMatch: `Strong alignment with your technical background and ${cj.companyName}'s engineering standards.`,
  matchingSkills: cj.matchingSkills,
  missingSkills: cj.missingSkills,
  insiderCount: cj.insiderCount,
  verifiedInsiders: [],
  description: cj.description,
  tailoredBulletSuggestion: {
    original: `Developed backend services and database optimizations for ${cj.companyName}.`,
    tailored: `Architected high-throughput service components using ${cj.matchingSkills.slice(0, 2).join(' and ')}, reducing p99 latency by 38% across production environments.`,
    impactMetric: '-38% Latency',
  },
  externalApplyUrl: cj.externalApplyUrl,
  externalJobId: cj.externalJobId,
  isInternal: false,
  isCurated: true,
  isRecommended: true,
}));

function getJobTimestamp(job: RecommendedJob): number {
  if (job.createdAt) {
    const t = new Date(job.createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  const p = (job.postedAt || '').toLowerCase().trim();
  const now = Date.now();
  if (p.includes('just now')) return now;
  if (p.includes('yesterday')) return now - 86400000;
  const hMatch = p.match(/(\d+)\s*(?:hour|h)/);
  if (hMatch) return now - parseInt(hMatch[1], 10) * 3600000;
  const dMatch = p.match(/(\d+)\s*(?:day|d)/);
  if (dMatch) return now - parseInt(dMatch[1], 10) * 86400000;
  const wMatch = p.match(/(\d+)\s*(?:week|w)/);
  if (wMatch) return now - parseInt(wMatch[1], 10) * 7 * 86400000;
  return now - 3 * 86400000;
}

function transformDbJobToRecommendedJob(job: any): RecommendedJob {
  try {
    const company = job.company_name || 'Tech Innovator';
    const title = job.title || 'Software Engineer';
    const location = job.location || 'Remote';
    const locLower = location.toLowerCase();
    const workplaceType: 'Remote' | 'Hybrid' | 'Onsite' = locLower.includes('remote')
      ? 'Remote'
      : locLower.includes('hybrid')
        ? 'Hybrid'
        : 'Onsite';

    const jobTypeStr = (job.job_type || 'full-time').toLowerCase();
    const jobType: 'Full-time' | 'Contract' | 'Part-time' = jobTypeStr.includes('contract')
      ? 'Contract'
      : jobTypeStr.includes('part')
        ? 'Part-time'
        : 'Full-time';

    const expLower = (job.experience_level || 'mid').toLowerCase();
    const experienceLevel: 'Senior' | 'Staff' | 'Lead' | 'Principal' | 'Mid' =
      expLower.includes('lead') || expLower.includes('director')
        ? 'Lead'
        : expLower.includes('principal')
          ? 'Principal'
          : expLower.includes('staff')
            ? 'Staff'
            : expLower.includes('senior')
              ? 'Senior'
              : 'Mid';

    // Base match score heuristic
    let baseScore = 85;
    if (experienceLevel === 'Senior' || experienceLevel === 'Staff') baseScore += 4;
    if (workplaceType === 'Remote') baseScore += 2;
    const matchScore = Math.min(97, Math.max(78, baseScore));

    const textLower = `${job.requirements || ''} ${job.description || ''} ${title}`.toLowerCase();
    const commonTech = [
      'React', 'TypeScript', 'Node.js', 'Python', 'Go', 'AWS', 'Kubernetes',
      'Docker', 'PostgreSQL', 'GraphQL', 'Next.js', 'Kafka', 'Redis', 'Java', 'GCP', 'SQL', 'C++',
      'Distributed Systems', 'Cloud Infrastructure', 'Microservices', 'REST', 'APIs'
    ];
    // Accurate word boundary skill checking
    const matchingSkills = commonTech.filter((s) => containsSkill(textLower, s));
    if (matchingSkills.length === 0) {
      if (job.requirements) {
        const fromReq = job.requirements
          .split(/[,;\n]+/)
          .map((s: string) => s.trim().replace(/^[-*•]\s*/, ''))
          .filter((s: string) => s.length >= 3 && s.length <= 32);
        if (fromReq.length > 0) {
          matchingSkills.push(...fromReq.slice(0, 4));
        }
      }
      if (matchingSkills.length === 0) {
        matchingSkills.push('Software Architecture', 'Cloud Services', 'System Design');
      }
    }

    const descLines = (job.description || '')
      .split(/\n+/)
      .map((s: string) => s.trim().replace(/^[-*•]\s*/, ''))
      .filter((s: string) => s.length > 20);

    const reqLines = (job.requirements || '')
      .split(/\n+/)
      .map((s: string) => s.trim().replace(/^[-*•]\s*/, ''))
      .filter((s: string) => s.length > 15);

    const responsibilities = descLines.slice(0, 4);
    if (responsibilities.length === 0) {
      responsibilities.push(
        `Develop and scale core product capabilities for ${company}.`,
        `Design robust APIs and microservices with high availability.`,
        `Collaborate across engineering, product, and design teams to ship quality code.`
      );
    }

    const qualifications = reqLines.slice(0, 4);
    if (qualifications.length === 0) {
      qualifications.push(
        `Experience with ${matchingSkills.slice(0, 3).join(', ')} or related production stacks.`,
        `Solid grasp of algorithms, system architecture, and scalable design patterns.`,
        `Proven track record of taking initiatives from conception to production.`
      );
    }

    let postedAt = 'Recently';
    if (job.created_at) {
      try {
        const diffMs = Date.now() - new Date(job.created_at).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) postedAt = 'Just now';
        else if (diffHours < 24) postedAt = `${diffHours} hours ago`;
        else if (diffDays === 1) postedAt = 'Yesterday';
        else if (diffDays < 7) postedAt = `${diffDays} days ago`;
        else postedAt = `${Math.floor(diffDays / 7)}w ago`;
      } catch {
        postedAt = 'Recently';
      }
    }

    const cleanDomain = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

    return {
      id: job.id,
      title,
      companyName: company,
      companyLogo:
        job.company_logo ||
        job.recruiter?.company_logo ||
        getGoogleFaviconUrl(cleanDomain, 64),
      location,
      workplaceType,
      jobType,
      experienceLevel,
      salaryRange: formatLocalizedSalary(job.salary_range, location),
      postedAt,
      createdAt: job.created_at || undefined,
      matchScore: job.match_score || matchScore,
      matchBreakdown: job.match_breakdown || {
        skillsScore: Math.min(98, (job.match_score || matchScore) + 3),
        experienceScore: Math.max(78, (job.match_score || matchScore) - 4),
        stackScore: job.match_score || matchScore,
      },
      whyYouMatch:
        job.why_you_match ||
        `Your background in modern software engineering aligns with ${company}'s hiring bar for ${title}. Your core competencies in ${matchingSkills.slice(0, 3).join(', ')} directly support their current initiatives.`,
      matchingSkills:
        job.matching_skills && job.matching_skills.length > 0
          ? job.matching_skills
          : matchingSkills.slice(0, 6),
      missingSkills:
        job.missing_skills && job.missing_skills.length > 0
          ? job.missing_skills
          : ['OpenTelemetry / Datadog', 'Distributed Tracing'],
      insiderCount: typeof job.insider_count === 'number' ? job.insider_count : 0,
      verifiedInsiders: [],
      description: {
        about:
          job.description?.slice(0, 450) ||
          `${company} is looking for a driven ${title} to join our high-impact engineering organization.`,
        responsibilities,
        qualifications,
        techStack:
          job.matching_skills && job.matching_skills.length > 0
            ? job.matching_skills
            : matchingSkills,
        benefits: [
          'Comprehensive health, dental, and vision insurance',
          'Competitive equity and annual performance incentives',
          'Flexible remote / hybrid schedule and wellness stipend',
        ],
      },
      tailoredBulletSuggestion: {
        original: `Contributed to ${title.toLowerCase()} systems and feature development.`,
        tailored: `Architected high-throughput service components using ${(job.matching_skills && job.matching_skills[0]) || matchingSkills[0] || 'modern tech'}, accelerating response latency by 36% and increasing reliability across 1.5M+ requests.`,
        impactMetric: '36% Latency Reduction',
      },
      isInternal: Boolean(job.is_internal || job.recruiter_id),
      recruiterId: job.recruiter_id || null,
      externalJobId: extractJobId(cleanJobApplyUrl(job.external_apply_url)),
      externalApplyUrl: cleanJobApplyUrl(job.external_apply_url) || null,
      isCurated: false,
      isRecommended: (job.match_score || matchScore) >= 88,
    };
  } catch {
    return {
      id: job?.id || `fallback-${Math.random()}`,
      title: job?.title || 'Software Engineer',
      companyName: job?.company_name || 'Tech Company',
      companyLogo: job?.company_logo || undefined,
      location: job?.location || 'Remote',
      workplaceType: 'Remote',
      jobType: 'Full-time',
      experienceLevel: 'Senior',
      salaryRange: formatLocalizedSalary(job?.salary_range, job?.location),
      postedAt: 'Recently',
      matchScore: 88,
      matchBreakdown: { skillsScore: 90, experienceScore: 85, stackScore: 88 },
      whyYouMatch: 'Your profile matches the core qualifications for this role.',
      matchingSkills: ['Software Architecture', 'System Design'],
      missingSkills: ['OpenTelemetry'],
      insiderCount: 2,
      verifiedInsiders: [],
      description: {
        about: job?.description?.slice(0, 300) || 'Position details.',
        responsibilities: ['Build and maintain services.'],
        qualifications: ['Engineering experience.'],
        techStack: ['Software Architecture', 'Cloud Services'],
        benefits: ['Standard benefits.'],
      },
      tailoredBulletSuggestion: {
        original: 'Contributed to systems.',
        tailored: 'Led feature execution and reliability optimizations.',
        impactMetric: 'Productivity Gain',
      },
      isInternal: false,
      recruiterId: null,
      externalJobId: null,
      externalApplyUrl: null,
      isCurated: false,
      isRecommended: false,
    };
  }
}

export function JobRecommendationsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useUser();
  const isUserVerifiedOrAdmin = Boolean(user?.is_verified || user?.is_admin);

  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Dynamic user display name and initials
  const displayName = useMemo(() => {
    if (user?.full_name?.trim()) return user.full_name.trim();
    if (user?.email) return user.email.split('@')[0];
    return '';
  }, [user?.full_name, user?.email]);

  const handleLogout = async () => {
    try {
      posthog.capture("Logout");
    } catch {
      // safe fallback if posthog blocked
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Fetch dynamic ATS readiness score for current candidate
  useEffect(() => {
    let isMounted = true;

    async function fetchATSScore() {
      // 1. Try directly from Supabase if user has active session
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('job_evaluations')
            .select('overall_score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data && typeof data.overall_score === 'number') {
            if (isMounted) {
              setAtsScore(data.overall_score);
              return;
            }
          }
        } catch {
          // Continue to fallback API
        }
      }

      // 2. Fallback to /api/jobs/resume (supports token, cookies, and localhost dev auth)
      try {
        const res = await fetch('/api/jobs/resume');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && typeof json.latestScore === 'number') {
            setAtsScore(json.latestScore);
          }
        }
      } catch {
        // Fallback or guest mode
      }
    }

    fetchATSScore();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Active Job Selection (Defaults to first or reads ?id=)
  const initialJobId = searchParams.get('id');
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  // Mobile responsive view: 'list' (shows job cards) | 'detail' (shows selected role details)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>(initialJobId ? 'detail' : 'list');

  // Search & Filter State
  const initialSearchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const initialTab = searchParams.get('tab') === 'recommended' || pathname === '/jobs/recommend' ? 'recommended' : 'all';
  const [activeChip, setActiveChip] = useState<'all' | 'high_match' | 'insiders' | 'remote' | 'tier1' | 'high_salary'>('all');
  const [activeListTab, setActiveListTab] = useState<'all' | 'recommended' | 'saved' | 'applied'>(initialTab);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'match' | 'insiders' | 'description' | 'copilot'>('match');
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');

  // Location & City Filter State (Prioritizes user's home city)
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    const initial = user?.city?.trim() || '';
    return isValidGeographicLocation(initial) ? initial : '';
  });
  const [customCityInput, setCustomCityInput] = useState<string>('');
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);

  // Workplace Type Filter: 'all' | 'onsite' | 'hybrid' | 'remote' (default: 'all')
  const [workModeFilter, setWorkModeFilter] = useState<'all' | 'onsite' | 'hybrid' | 'remote'>('all');
  const [isWorkModeMenuOpen, setIsWorkModeMenuOpen] = useState(false);

  // Candidate Profile Skills & Seniority from master resume
  const [candidateProfileSkills, setCandidateProfileSkills] = useState<string[]>([]);
  const [candidateSeniority, setCandidateSeniority] = useState<string>('Senior');

  // Company Filter State (Supports multi-select checkboxes & custom added companies)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companySearchInput, setCompanySearchInput] = useState<string>('');
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [customCompanies, setCustomCompanies] = useState<string[]>([]);

  // Zero-flicker In-Memory Insiders Cache
  const companyInsidersCacheRef = React.useRef<Map<string, CompanyInsider[]>>(new Map());

  // Resumes list for Apply on Vouchins modal
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isCustomResumeUrl, setIsCustomResumeUrl] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);

  // Fetch candidate profile & master resume skills
  useEffect(() => {
    let isMounted = true;
    async function loadCandidateProfile() {
      try {
        const res = await fetch('/api/jobs/profile');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.document) {
              const skills: string[] = [];
              if (Array.isArray(data.document.skills)) {
                data.document.skills.forEach((cat: any) => {
                  if (typeof cat === 'string' && cat.trim()) {
                    skills.push(cat.trim());
                  } else if (Array.isArray(cat?.items)) {
                    cat.items.forEach((item: any) => {
                      if (typeof item === 'string' && item.trim()) {
                        skills.push(item.trim());
                      }
                    });
                  }
                });
              }
              if (Array.isArray(data.document.projects)) {
                data.document.projects.forEach((p: any) => {
                  if (Array.isArray(p?.techStack)) {
                    p.techStack.forEach((t: any) => {
                      if (typeof t === 'string' && t.trim() && !skills.includes(t.trim())) {
                        skills.push(t.trim());
                      }
                    });
                  }
                });
              }
              if (Array.isArray(data.document.experience)) {
                data.document.experience.forEach((exp: any) => {
                  const bulletsText = Array.isArray(exp.bullets) ? exp.bullets.join(' ') : '';
                  const fullExpText = `${exp.roleTitle || ''} ${bulletsText}`;
                  COMMON_TECH_TAXONOMY.forEach((tech) => {
                    if (containsSkill(fullExpText, tech)) {
                      const canon = canonicalizeSkill(tech);
                      if (!skills.includes(canon)) {
                        skills.push(canon);
                      }
                    }
                  });
                });
              }
              if (skills.length > 0) {
                setCandidateProfileSkills(skills);
              }
              if (Array.isArray(data.document.experience) && data.document.experience[0]?.roleTitle) {
                setCandidateSeniority(data.document.experience[0].roleTitle);
              }
              if (!selectedCity || !isValidGeographicLocation(selectedCity)) {
                if (user?.city?.trim() && isValidGeographicLocation(user.city)) {
                  setSelectedCity(user.city.trim());
                } else if (data.document?.contact?.location && isValidGeographicLocation(data.document.contact.location)) {
                  setSelectedCity(data.document.contact.location.trim());
                } else {
                  setSelectedCity('');
                }
              }
            }
            if (typeof data.latestScore === 'number') {
              setAtsScore(data.latestScore);
            }
          }
        }
      } catch (err) {
        console.warn('Candidate profile loading note:', err);
      }
    }
    loadCandidateProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyLocation = (city?: string) => {
    const target = (city !== undefined ? city : customCityInput).trim();
    if (target && target.toLowerCase() !== 'all') {
      setSelectedCity(target);
      toast.success(`Showing roles in ${target}`);
      setCustomCityInput('');
    } else {
      setSelectedCity('');
      toast.info('Location filter cleared - Showing all locations');
      setCustomCityInput('');
    }
    setIsLocationMenuOpen(false);
  };

  useEffect(() => {
    if (user?.city?.trim() && isValidGeographicLocation(user.city)) {
      if (!selectedCity || !isValidGeographicLocation(selectedCity)) {
        setSelectedCity(user.city.trim());
      }
    }
  }, [user?.city, selectedCity]);

  // Real Database Jobs State (Server-Side Paginated)
  const [dbJobs, setDbJobs] = useState<RecommendedJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [totalRolesCount, setTotalRolesCount] = useState<number | null>(null);

  // Fetch real jobs from database & live ATS sources with server-side pagination & exact count
  const loadJobs = React.useCallback(async (targetPage = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingJobs(true);
    }
    try {
      const locQuery =
        selectedCity && selectedCity.toLowerCase() !== 'all' && isValidGeographicLocation(selectedCity)
          ? `&location=${encodeURIComponent(selectedCity)}`
          : '';
      const workModeQuery = workModeFilter !== 'all' ? `&work_mode=${workModeFilter}` : '';
      const skillsQuery =
        candidateProfileSkills.length > 0
          ? `&skills=${encodeURIComponent(candidateProfileSkills.slice(0, 10).join(','))}`
          : '';
      const companiesQuery =
        selectedCompanies.length > 0 && !selectedCompanies.includes('all')
          ? `&companies=${encodeURIComponent(selectedCompanies.join(','))}`
          : '';
      const sortQuery = `&sort=${sortBy}`;
      const searchParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : '';

      const res = await fetch(
        `/api/jobs?page=${targetPage}&limit=50${locQuery}${workModeQuery}${skillsQuery}${companiesQuery}${sortQuery}${searchParam}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.jobs && Array.isArray(json.jobs)) {
          const transformed = json.jobs.map(transformDbJobToRecommendedJob);
          if (append) {
            setDbJobs((prev) => {
              const seen = new Set(prev.map((j) => j.id));
              const fresh = transformed.filter((j: RecommendedJob) => !seen.has(j.id));
              return [...prev, ...fresh];
            });
          } else {
            setDbJobs(transformed);
          }
          if (typeof json.totalCount === 'number') {
            setTotalRolesCount(json.totalCount);
          }
          setHasMore(Boolean(json.hasMore));
        }
      }
    } catch (err) {
      console.error('Failed to load live jobs:', err);
    } finally {
      setIsLoadingJobs(false);
      setIsLoadingMore(false);
    }
  }, [selectedCity, workModeFilter, candidateProfileSkills, selectedCompanies, sortBy, searchQuery]);

  useEffect(() => {
    setPage(1);
    loadJobs(1, false);
  }, [loadJobs]);

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadJobs(nextPage, true);
  };

  // Load user resumes for application modal
  const loadUserResumes = React.useCallback(async () => {
    setIsLoadingResumes(true);
    try {
      const res = await fetch('/api/jobs/resume');
      if (res.ok) {
        const json = await res.json();
        if (json.resumes && Array.isArray(json.resumes)) {
          setUserResumes(json.resumes);
          if (json.resumes.length > 0) {
            setSelectedResumeId(json.resumes[0].id);
            setApplyResumeUrl(`${window.location.origin}/jobs/resume?id=${json.resumes[0].id}`);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load user resumes:', err);
    } finally {
      setIsLoadingResumes(false);
    }
  }, []);

  // Company management helpers
  const allAvailableCompanies = useMemo(() => {
    const set = new Set<string>();
    const sourceJobs = dbJobs.length > 0 ? dbJobs : CURATED_RECOMMENDED_JOBS;
    for (const j of sourceJobs) {
      if (j.companyName?.trim()) set.add(j.companyName.trim());
    }
    for (const c of customCompanies) {
      if (c.trim()) set.add(c.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dbJobs, customCompanies]);

  const filteredCompanyList = useMemo(() => {
    if (!companySearchInput.trim()) return allAvailableCompanies;
    const q = companySearchInput.toLowerCase().trim();
    return allAvailableCompanies.filter((c) => c.toLowerCase().includes(q));
  }, [allAvailableCompanies, companySearchInput]);

  const handleAddCustomCompany = () => {
    const trimmed = companySearchInput.trim();
    if (!trimmed) return;
    if (!customCompanies.includes(trimmed)) {
      setCustomCompanies((prev) => [...prev, trimmed]);
    }
    setSelectedCompanies((prev) => {
      const withoutAll = prev.filter((c) => c.toLowerCase() !== 'all');
      return withoutAll.includes(trimmed) ? withoutAll : [...withoutAll, trimmed];
    });
    setCompanySearchInput('');
    toast.success(`Filtering jobs by company: ${trimmed}`);
  };

  const toggleCompany = (companyName: string) => {
    setSelectedCompanies((prev) => {
      const withoutAll = prev.filter((c) => c.toLowerCase() !== 'all');
      if (withoutAll.includes(companyName)) {
        return withoutAll.filter((c) => c !== companyName);
      } else {
        return [...withoutAll, companyName];
      }
    });
  };

  const selectAllCompanies = () => {
    setSelectedCompanies([]);
    toast.info('Showing jobs from all companies');
  };

  // Combined master job list (Prioritizes live database and live ATS jobs exclusively when available)
  // Falls back to curated showcase only if dbJobs is empty (e.g. offline/initial state).
  // Filters out external jobs that lack external job IDs / direct valid requisition URLs,
  // while preserving internal recruiter jobs posted on Vouchins.
  // Ranked by location alignment and candidate match score descending.
  const allJobs = useMemo(() => {
    const sourceJobs = dbJobs.length > 0 ? dbJobs : CURATED_RECOMMENDED_JOBS;

    const list = sourceJobs.map((j) => {
      // Real database jobs already contain full-corpus server evaluation (including complete description and requirements).
      // Preserve the server metrics to prevent overwriting with truncated description snippets.
      if (!j.isCurated && j.matchingSkills && j.matchingSkills.length > 0) {
        return j;
      }

      if (candidateProfileSkills.length > 0) {
        const evaluation = evaluateJobMatch(
          {
            title: j.title,
            description: j.description?.about,
            requirements: j.description?.qualifications?.join('\n'),
            experienceLevel: j.experienceLevel,
            workplaceType: j.workplaceType,
            location: j.location,
            companyName: j.companyName,
          },
          candidateProfileSkills,
          candidateSeniority,
          selectedCity
        );
        return {
          ...j,
          matchScore: evaluation.matchScore,
          matchBreakdown: evaluation.matchBreakdown,
          whyYouMatch: evaluation.whyYouMatch,
          matchingSkills: evaluation.matchingSkills,
          missingSkills: evaluation.missingSkills,
          isRecommended: evaluation.isRecommended,
        };
      }
      return j;
    });

    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    const deduplicatedList: RecommendedJob[] = [];

    for (const job of list) {
      const key = `${job.companyName.toLowerCase()}-${job.title.toLowerCase()}`;
      if (!seenIds.has(job.id) && !seenTitles.has(key)) {
        seenIds.add(job.id);
        seenTitles.add(key);
        deduplicatedList.push(job);
      }
    }
    const validList = deduplicatedList.filter(
      (j) => !j.isCurated || j.isInternal || hasValidExternalJobId(j.externalApplyUrl) || Boolean(j.externalApplyUrl)
    );
    const ninetyDaysAgoMs = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    // Strict 3-month (90-day) job pruning
    const freshList = validList.filter((j) => (now - getJobTimestamp(j)) <= ninetyDaysAgoMs);

    return freshList.sort((a, b) => {
      // Prioritize candidate selected city and workplace mode
      if (selectedCity && selectedCity.toLowerCase() !== 'all' && isValidGeographicLocation(selectedCity)) {
        const aMatches = isLocationMatch(a.location, selectedCity, a.workplaceType, workModeFilter);
        const bMatches = isLocationMatch(b.location, selectedCity, b.workplaceType, workModeFilter);

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        // If both match, prioritize direct home city over remote
        const aLoc = (a.location || '').toLowerCase();
        const bLoc = (b.location || '').toLowerCase();
        const cLoc = selectedCity.toLowerCase();
        const aSpecific =
          aLoc.includes(cLoc) ||
          (LOCATION_ALIASES[cLoc] || []).some((al) => !al.includes('remote') && aLoc.includes(al));
        const bSpecific =
          bLoc.includes(cLoc) ||
          (LOCATION_ALIASES[cLoc] || []).some((al) => !al.includes('remote') && bLoc.includes(al));

        if (aSpecific && !bSpecific) return -1;
        if (!aSpecific && bSpecific) return 1;
      }
      return b.matchScore - a.matchScore;
    });
  }, [dbJobs, selectedCity, candidateProfileSkills, candidateSeniority, workModeFilter]);

  const recommendedJobs = useMemo(() => {
    return allJobs.filter((j) => j.isRecommended || j.isCurated || j.matchScore >= 90);
  }, [allJobs]);

  // Interactive Modals
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedInsider, setSelectedInsider] = useState<any>(null);
  const [referralNote, setReferralNote] = useState('');
  const [isSendingReferral, setIsSendingReferral] = useState(false);
  const [sentReferralInsiderIds, setSentReferralInsiderIds] = useState<string[]>([]);

  // Dynamic Company Insiders from Vouchins Platform
  const [companyInsiders, setCompanyInsiders] = useState<CompanyInsider[]>([]);
  const [isLoadingInsiders, setIsLoadingInsiders] = useState(false);

  // Internal Vouchins Application State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyResumeUrl, setApplyResumeUrl] = useState('');
  const [applyCoverLetter, setApplyCoverLetter] = useState('');
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);

  useEffect(() => {
    if (isApplyModalOpen) {
      loadUserResumes();
    }
  }, [isApplyModalOpen, loadUserResumes]);

  // Fetch user master resume URL if available to prefill internal application
  useEffect(() => {
    async function fetchUserResume() {
      if (!user?.id) return;
      try {
        const res = await fetch('/api/jobs/resume');
        if (res.ok) {
          const json = await res.json();
          if (json.resumes && json.resumes.length > 0) {
            setApplyResumeUrl((prev) => prev || `https://vouchins.com/jobs/resume?id=${json.resumes[0].id}`);
          }
        }
      } catch {
        // Ignore fallback
      }
    }
    fetchUserResume();
  }, [user?.id]);

  // AI Copilot interactive state
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Sync selected job with searchParams or initial allJobs
  useEffect(() => {
    if (initialJobId && allJobs.some((j) => j.id === initialJobId)) {
      setSelectedJobId(initialJobId);
      setMobileView('detail');
    }
  }, [initialJobId, allJobs]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setMobileView('detail');
    const basePath = pathname === '/jobs/recommend' ? '/jobs/recommend' : '/jobs/list';
    const targetUrl = `${basePath}?id=${jobId}`;
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', targetUrl);
    }
  };

  // Filtered jobs calculation
  const filteredJobs = useMemo(() => {
    let list = allJobs;

    // Filter by list tab
    if (activeListTab === 'recommended') {
      list = list.filter((j) => j.isRecommended || j.isCurated || j.matchScore >= 90);
    } else if (activeListTab === 'saved') {
      list = list.filter((j) => savedJobIds.includes(j.id));
    } else if (activeListTab === 'applied') {
      list = list.filter((j) => appliedJobIds.includes(j.id));
    }

    // Filter by Quick Chip
    if (activeChip === 'high_match') {
      list = list.filter((j) => j.matchScore >= 92);
    } else if (activeChip === 'insiders') {
      list = list.filter((j) => j.insiderCount > 0);
    } else if (activeChip === 'remote') {
      list = list.filter((j) => j.workplaceType === 'Remote');
    } else if (activeChip === 'tier1') {
      list = list.filter((j) =>
        ['ServiceNow', 'Uber', 'Stripe', 'Google', 'Meta', 'Figma', 'DoorDash', 'Spotify', 'Airbnb'].includes(j.companyName)
      );
    } else if (activeChip === 'high_salary') {
      list = list.filter(
        (j) =>
          j.salaryRange.includes('$180k') ||
          j.salaryRange.includes('$2') ||
          j.salaryRange.includes('₹') ||
          /\b[3-9]\d\s*L\b/i.test(j.salaryRange) ||
          j.salaryRange.toLowerCase().includes('competitive')
      );
    }

    // Filter by Selected Location / City and Workplace Mode
    if (selectedCity && selectedCity.toLowerCase() !== 'all' && isValidGeographicLocation(selectedCity)) {
      list = list.filter((j) => isLocationMatch(j.location, selectedCity, j.workplaceType, workModeFilter));
    } else if (workModeFilter !== 'all') {
      list = list.filter((j) => isLocationMatch(j.location, '', j.workplaceType, workModeFilter));
    }

    // Filter by Selected Companies
    if (selectedCompanies.length > 0 && !selectedCompanies.includes('all')) {
      list = list.filter((j) => {
        const jobComp = (j.companyName || '').toLowerCase().trim();
        return selectedCompanies.some((c) => {
          const cLower = c.toLowerCase().trim();
          return jobComp.includes(cLower) || cLower.includes(jobComp);
        });
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.companyName.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.matchingSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Sort according to selected sort option (Relevance vs Date Posted)
    const sorted = [...list];
    if (sortBy === 'date') {
      sorted.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
    } else {
      sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return sorted;
  }, [allJobs, activeListTab, activeChip, savedJobIds, appliedJobIds, searchQuery, selectedCity, selectedCompanies, workModeFilter, sortBy]);

  const selectedJob = useMemo(() => {
    return (
      (selectedJobId ? allJobs.find((j) => j.id === selectedJobId) : null) ||
      filteredJobs[0] ||
      allJobs[0] ||
      (CURATED_RECOMMENDED_JOBS.length > 0 ? CURATED_RECOMMENDED_JOBS[0] : null)
    );
  }, [selectedJobId, allJobs, filteredJobs]);

  const selectedJobApplyUrl = useMemo(() => {
    if (selectedJob?.isInternal) return '';
    const url = selectedJob?.externalApplyUrl?.trim();
    if (!url) return '';
    const cleaned = cleanJobApplyUrl(url);
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      return `https://${cleaned}`;
    }
    return cleaned;
  }, [selectedJob]);

  // Effective Verified Insiders Count for Selected Job
  const effectiveInsiderCount = isLoadingInsiders
    ? (companyInsiders.length > 0 ? companyInsiders.length : (selectedJob?.insiderCount || 0))
    : companyInsiders.length;

  // Synchronize URL search params (?id=, ?action=apply, ?applied=true) with selected job state
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && paramId !== selectedJobId) {
      setSelectedJobId(paramId);
      setMobileView('detail');
    }

    const applied = searchParams.get('applied');
    if (applied === 'true' && paramId) {
      setAppliedJobIds((prev) => (prev.includes(paramId) ? prev : [...prev, paramId]));
    }

    const action = searchParams.get('action');
    if (action === 'apply' && selectedJob) {
      if (selectedJob.isInternal) {
        setIsApplyModalOpen(true);
      } else if (selectedJob.externalApplyUrl) {
        toast.info(
          `Review role details and ask verified insiders for a referral below, or click "Apply on Site" to complete your application.`,
          { duration: 5000 }
        );
      }
    }
  }, [searchParams, selectedJobId, selectedJob]);

  // Fetch real Vouchins users from the same company as selectedJob (with zero-flicker cache)
  useEffect(() => {
    let isMounted = true;
    async function loadCompanyInsiders() {
      if (!selectedJob?.companyName) {
        setCompanyInsiders([]);
        return;
      }
      const compKey = selectedJob.companyName.toLowerCase().trim();
      const cached = companyInsidersCacheRef.current.get(compKey);
      if (cached) {
        setCompanyInsiders(cached);
        setIsLoadingInsiders(false);
        return;
      }

      setCompanyInsiders([]);
      setIsLoadingInsiders(true);
      try {
        const cleanDomain = compKey.replace(/[^a-z0-9]/g, '') + '.com';
        const res = await fetch(
          `/api/jobs/insiders?company=${encodeURIComponent(selectedJob.companyName)}&domain=${cleanDomain}`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            const list = json.insiders && Array.isArray(json.insiders) ? json.insiders : [];
            companyInsidersCacheRef.current.set(compKey, list);
            setCompanyInsiders(list);
          }
        }
      } catch (err) {
        console.warn('Failed to load company insiders:', err);
        if (isMounted) {
          setCompanyInsiders([]);
        }
      } finally {
        if (isMounted) setIsLoadingInsiders(false);
      }
    }

    loadCompanyInsiders();
    return () => {
      isMounted = false;
    };
  }, [selectedJob?.companyName, selectedJob?.id]);

  const toggleSaveJob = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (savedJobIds.includes(id)) {
      setSavedJobIds((prev) => prev.filter((item) => item !== id));
      toast.info('Job removed from saved bookmarks');
    } else {
      setSavedJobIds((prev) => [...prev, id]);
      toast.success('Job saved to your bookmarks');
    }
  };

  const handleApplyNow = (id: string) => {
    const jobToApply = allJobs.find((j) => j.id === id) || selectedJob;
    if (jobToApply?.isInternal) {
      setSelectedJobId(jobToApply.id);
      setIsApplyModalOpen(true);
      return;
    }

    const url = jobToApply?.externalApplyUrl?.trim();
    if (!url || !hasValidExternalJobId(url)) {
      toast.error('Exact requisition URL is not available for this role.');
      return;
    }

    if (!appliedJobIds.includes(id)) {
      setAppliedJobIds((prev) => [...prev, id]);
    }
    const cleaned = cleanJobApplyUrl(url);
    const finalUrl = cleaned.startsWith('http://') || cleaned.startsWith('https://') ? cleaned : `https://${cleaned}`;
    toast.success(`Redirecting to ${jobToApply.companyName} careers portal...`);
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleInternalApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to apply for this position.');
      router.push('/login');
      return;
    }

    if (!applyResumeUrl.trim()) {
      toast.error('Please provide a resume URL or link to apply.');
      return;
    }

    setIsSubmittingApplication(true);
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          resumeUrl: applyResumeUrl.trim(),
          coverLetter: applyCoverLetter.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info('You have already applied to this job.');
          if (!appliedJobIds.includes(selectedJob.id)) {
            setAppliedJobIds((prev) => [...prev, selectedJob.id]);
          }
          setIsApplyModalOpen(false);
          return;
        }
        if (res.status === 403) {
          toast.error(data.error || 'Only verified Vouchins members can apply to recruiter postings.');
          return;
        }
        throw new Error(data.error || 'Failed to submit application');
      }

      toast.success(`Application submitted directly to ${selectedJob.companyName}!`);
      if (!appliedJobIds.includes(selectedJob.id)) {
        setAppliedJobIds((prev) => [...prev, selectedJob.id]);
      }
      setIsApplyModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const handleInitiateReferral = (insider: any) => {
    if (!insider) {
      if (companyInsiders.length === 0) {
        setIsInviteOpen(true);
        return;
      }
      insider = companyInsiders[0];
    }
    // Strict verification requirement: user must be verified or admin to connect
    if (!user || (!user.is_verified && !user.is_admin)) {
      setSelectedInsider(insider);
      setVerificationModalOpen(true);
      return;
    }
    setSelectedInsider(insider);
    setReferralModalOpen(true);
  };

  const handleSendReferralRequest = async () => {
    if (!user?.is_verified && !user?.is_admin) {
      toast.error('Connecting with company insiders requires a verified corporate account.');
      setReferralModalOpen(false);
      setVerificationModalOpen(true);
      return;
    }

    setIsSendingReferral(true);
    try {
      const res = await fetch('/api/jobs/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insiderId: selectedInsider?.id,
          jobId: selectedJob.id,
          companyName: selectedJob.companyName,
          note:
            referralNote ||
            `Hi ${selectedInsider?.name?.split(' ')[0] || 'there'}, I noticed your work at ${selectedJob.companyName}. My Master Resume matches the ${selectedJob.title} hiring bar with quantified achievements. Would you be open to an internal referral?`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'VERIFICATION_REQUIRED') {
          setReferralModalOpen(false);
          setVerificationModalOpen(true);
          toast.error(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to dispatch referral request');
      }

      toast.success(data.message || `Referral request dispatched to ${selectedInsider?.name}! They have been notified.`);
      if (selectedInsider?.id) {
        setSentReferralInsiderIds((prev) => [...prev, selectedInsider.id]);
      }
      setReferralModalOpen(false);
      setReferralNote('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch referral request');
    } finally {
      setIsSendingReferral(false);
    }
  };

  const handleRunCopilotPrompt = (promptText: string) => {
    setCopilotLoading(true);
    setCopilotPrompt(promptText);
    setTimeout(() => {
      setCopilotLoading(false);
      if (promptText.includes('cover letter')) {
        setCopilotResponse(
          `Dear ${selectedJob.companyName} Hiring Team,\n\nI am writing to express my strong enthusiasm for the ${selectedJob.title} role. With over 6 years of experience scaling low-latency event-driven infrastructure, my background aligns seamlessly with your requirements.\n\nRecently, I re-architected high-throughput Kafka streaming pipelines handling 18M+ daily events, cutting p99 consumer latency by 43% with zero data loss. Furthermore, my hands-on production expertise across ${selectedJob.matchingSkills.slice(0, 4).join(', ')} directly matches your current stack initiatives.\n\nI look forward to discussing how my experience can deliver immediate impact.\n\nBest regards,\n${displayName}`
        );
      } else if (promptText.includes('interview questions')) {
        setCopilotResponse(
          `Top 5 Interview Questions for ${selectedJob.title} at ${selectedJob.companyName}:\n\n1. How would you design a distributed event log that guarantees exactly-once processing across partitioned Kafka consumers?\n2. What strategies do you employ when tuning p99 tail latency for high-concurrency gRPC microservices?\n3. Describe an outage where distributed locks failed under high contention, and how you resolved the race condition.\n4. How would you handle cross-region multi-master data replication with minimal eventual consistency lag?\n5. Walk through your approach to architectural capacity planning during sudden 10x traffic surges.`
        );
      } else {
        setCopilotResponse(
          `ATS Keyword Analysis for ${selectedJob.title}:\n\n• High-Priority Technical Keywords: ${selectedJob.matchingSkills.join(', ')}\n• Recommended Additions: ${selectedJob.missingSkills.join(', ')}\n• ATS Screening Compatibility: 96% match against Workday, Greenhouse, and Lever scrapers.`
        );
      }
    }, 700);
  };

  return (
    <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#4FD1C5]/30 selection:text-[#0A1B5C]">
      {/* 1. Left Hand Panel / Sidebar */}
      <JobsSidebar activeTab="jobs" hideMobileNav={mobileView === 'detail'} />

      {/* 2. Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden ${mobileView === 'detail' ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        {/* Top Application Header Bar */}
        <JobsNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          atsScore={atsScore}
        >
          {/* Quick Filter Chips (Jobright Style) */}
          <div className={`max-w-[1720px] mx-auto mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-neutral-100 items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
            }`}>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Filters:
            </span>

            {/* Interactive Location / City Filter Dropdown */}
            <DropdownMenu open={isLocationMenuOpen} onOpenChange={setIsLocationMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${selectedCity && selectedCity.toLowerCase() !== 'all' && isValidGeographicLocation(selectedCity)
                    ? 'bg-[#0A1B5C] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
                    }`}
                >
                  <MapPin className="h-3.5 w-3.5 text-[#4FD1C5]" />
                  <span>
                    {selectedCity && selectedCity.toLowerCase() !== 'all' && isValidGeographicLocation(selectedCity)
                      ? `${selectedCity}`
                      : 'All Locations'}
                  </span>
                  <ChevronRight className="h-3 w-3 rotate-90 opacity-70 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2 rounded-2xl shadow-xl border border-neutral-200 bg-white z-50">
                <div className="px-2 py-1.5 text-xs font-bold text-[#0A1B5C] flex items-center justify-between">
                  <span>Filter by Location</span>
                  {selectedCity && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApplyLocation('');
                      }}
                      className="text-[10px] text-neutral-400 hover:text-neutral-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Custom City Input Form */}
                <div className="p-1 mb-1">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleApplyLocation();
                    }}
                    className="flex items-center gap-1.5 bg-neutral-50 rounded-xl px-2.5 py-1.5 border border-neutral-200 focus-within:border-[#0A1B5C] focus-within:bg-white transition-all"
                  >
                    <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyLocation();
                        }
                      }}
                      placeholder="Enter custom city (e.g. New Jersey)..."
                      className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApplyLocation();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#0A1B5C] text-white text-[10px] font-bold shrink-0 hover:bg-[#11287e] transition-colors"
                    >
                      Set
                    </button>
                  </form>
                </div>

                <DropdownMenuSeparator className="my-1" />

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {user?.city && isValidGeographicLocation(user.city) && (
                    <DropdownMenuItem
                      onClick={() => handleApplyLocation(user.city!.trim())}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${selectedCity.toLowerCase() === user.city.toLowerCase()
                        ? 'bg-[#0A1B5C]/10 text-[#0A1B5C]'
                        : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#0A1B5C]" />
                        <span>{user.city}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Profile City
                      </span>
                    </DropdownMenuItem>
                  )}

                  {[
                    { label: '🌐 All Locations (Worldwide)', value: '' },
                    { label: '🏠 Remote (Global / Anywhere)', value: 'remote' },
                    { label: 'New Jersey, US', value: 'New Jersey' },
                    { label: 'New York, US', value: 'New York' },
                    { label: 'Hyderabad, India', value: 'Hyderabad' },
                    { label: 'Bangalore, India', value: 'Bangalore' },
                    { label: 'Pune / Mumbai, India', value: 'Pune' },
                    { label: 'Delhi NCR, India', value: 'Delhi' },
                    { label: 'San Francisco Bay Area, US', value: 'San Francisco' },
                    { label: 'London, UK', value: 'London' },
                  ].map((loc) => {
                    const isLocSelected =
                      (!selectedCity && !loc.value) ||
                      (selectedCity.toLowerCase() === loc.value.toLowerCase());
                    return (
                      <DropdownMenuItem
                        key={loc.label}
                        onClick={() => handleApplyLocation(loc.value)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${isLocSelected
                          ? 'bg-[#0A1B5C] text-white font-bold'
                          : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                      >
                        <span>{loc.label}</span>
                        {isLocSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#4FD1C5]" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Interactive Workplace Mode Filter Dropdown (All, Onsite, Hybrid, Remote) */}
            <DropdownMenu open={isWorkModeMenuOpen} onOpenChange={setIsWorkModeMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${workModeFilter !== 'all'
                    ? 'bg-[#0A1B5C] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
                    }`}
                >
                  <Briefcase className="h-3.5 w-3.5 text-[#4FD1C5]" />
                  <span>
                    {workModeFilter === 'all'
                      ? 'All Workplaces'
                      : workModeFilter === 'onsite'
                        ? 'Onsite Only'
                        : workModeFilter === 'hybrid'
                          ? 'Hybrid Only'
                          : 'Remote Only'}
                  </span>
                  <ChevronRight className="h-3 w-3 rotate-90 opacity-70 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl border border-neutral-200 bg-white z-50">
                <div className="px-2 py-1.5 text-xs font-bold text-[#0A1B5C]">
                  <span>Workplace Type</span>
                </div>
                <DropdownMenuSeparator className="my-1" />
                {[
                  { value: 'all', label: '🌐 All (Onsite, Hybrid, Remote)' },
                  { value: 'onsite', label: '🏢 Onsite Only' },
                  { value: 'hybrid', label: '🔄 Hybrid (Office + Remote)' },
                  { value: 'remote', label: '🏠 Remote Only' },
                ].map((mode) => {
                  const isSelected = workModeFilter === mode.value;
                  return (
                    <DropdownMenuItem
                      key={mode.value}
                      onClick={() => {
                        setWorkModeFilter(mode.value as any);
                        if (mode.value === 'remote') {
                          setActiveChip('remote');
                        } else if (activeChip === 'remote') {
                          setActiveChip('all');
                        }
                        setIsWorkModeMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer ${isSelected
                        ? 'bg-[#0A1B5C] text-white font-bold'
                        : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                    >
                      <span>{mode.label}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#4FD1C5]" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Interactive Company Filter Dropdown with Checkboxes and "All" */}
            <DropdownMenu open={isCompanyMenuOpen} onOpenChange={setIsCompanyMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${selectedCompanies.length > 0 && !selectedCompanies.includes('all')
                    ? 'bg-[#0A1B5C] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
                    }`}
                >
                  <Building2 className="h-3.5 w-3.5 text-[#4FD1C5]" />
                  <span>
                    {selectedCompanies.length === 0 || selectedCompanies.includes('all')
                      ? 'All Companies'
                      : selectedCompanies.length === 1
                        ? selectedCompanies[0]
                        : `${selectedCompanies[0]} +${selectedCompanies.length - 1}`}
                  </span>
                  <ChevronRight className="h-3 w-3 rotate-90 opacity-70 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-2 rounded-2xl shadow-xl border border-neutral-200 bg-white z-50">
                <div className="px-2 py-1.5 text-xs font-bold text-[#0A1B5C] flex items-center justify-between">
                  <span>Filter by Company</span>
                  {selectedCompanies.length > 0 && !selectedCompanies.includes('all') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectAllCompanies();
                      }}
                      className="text-[10px] text-neutral-400 hover:text-neutral-700 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Search or Add Custom Company Form */}
                <div className="p-1 mb-1">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddCustomCompany();
                    }}
                    className="flex items-center gap-1.5 bg-neutral-50 rounded-xl px-2.5 py-1.5 border border-neutral-200 focus-within:border-[#0A1B5C] focus-within:bg-white transition-all"
                  >
                    <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={companySearchInput}
                      onChange={(e) => setCompanySearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCompany();
                        }
                      }}
                      placeholder="Search or add company..."
                      className="w-full text-xs bg-transparent outline-none placeholder:text-neutral-400 text-neutral-800"
                    />
                    {companySearchInput.trim() && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddCustomCompany();
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#0A1B5C] text-white text-[10px] font-bold shrink-0 hover:bg-[#11287e] transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </form>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Option 1: All Companies Checkbox */}
                <div
                  onClick={selectAllCompanies}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${selectedCompanies.length === 0 || selectedCompanies.includes('all')
                    ? 'bg-[#0A1B5C] text-white'
                    : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedCompanies.length === 0 || selectedCompanies.includes('all')
                        ? 'bg-[#4FD1C5] border-[#4FD1C5] text-[#0A1B5C]'
                        : 'border-neutral-300 bg-white'
                        }`}
                    >
                      {(selectedCompanies.length === 0 || selectedCompanies.includes('all')) && (
                        <Check className="h-3 w-3 stroke-[3]" />
                      )}
                    </div>
                    <span>All Companies (Show All)</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedCompanies.length === 0 || selectedCompanies.includes('all')
                      ? 'bg-white/20 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                      }`}
                  >
                    {allJobs.length} roles
                  </span>
                </div>

                <DropdownMenuSeparator className="my-1" />

                {/* Scrollable list of companies with checkboxes */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 [scrollbar-width:thin]">
                  {filteredCompanyList.map((comp) => {
                    const isChecked = selectedCompanies.includes(comp);
                    const jobCount = allJobs.filter((j) => j.companyName?.toLowerCase() === comp.toLowerCase()).length;

                    return (
                      <div
                        key={comp}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCompany(comp);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${isChecked
                          ? 'bg-[#0A1B5C]/10 text-[#0A1B5C] font-semibold'
                          : 'text-neutral-700 hover:bg-neutral-100'
                          }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked
                              ? 'bg-[#0A1B5C] border-[#0A1B5C] text-white'
                              : 'border-neutral-300 bg-white'
                              }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <CompanyLogo
                            companyName={comp}
                            size={32}
                            className="w-5 h-5 rounded-md"
                            initialsClassName="text-[9px] font-bold text-[#0A1B5C]"
                          />
                          <span className="truncate">{comp}</span>
                        </div>
                        {jobCount > 0 && (
                          <span className="text-[10px] font-medium text-neutral-400 shrink-0 ml-2">
                            {jobCount} {jobCount === 1 ? 'role' : 'roles'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {filteredCompanyList.length === 0 && companySearchInput.trim() && (
                    <div className="p-3 text-center">
                      <p className="text-xs text-neutral-500 mb-2">
                        Company &quot;{companySearchInput}&quot; not in list
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddCustomCompany();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#0A1B5C] text-white text-xs font-bold hover:bg-[#11287e] transition-colors"
                      >
                        Add &quot;{companySearchInput}&quot; to filter
                      </button>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* {[
              { id: 'high_match', label: '🔥 90%+ Match', icon: Flame },
              { id: 'insiders', label: '🤝 Insiders Ready', icon: Users },
              { id: 'remote', label: '🏠 Remote Only', icon: MapPin },
              { id: 'tier1', label: '🏢 Tier-1 Tech', icon: EnterpriseBuildingIcon },
              { id: 'high_salary', label: '💰 $180k+ / Competitive', icon: DollarSign },
            ].map((chip) => {
              const isSelected = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    if (chip.id === 'remote') {
                      if (activeChip === 'remote') {
                        setActiveChip('all');
                        setWorkModeFilter('all');
                      } else {
                        setActiveChip('remote');
                        setWorkModeFilter('remote');
                      }
                    } else {
                      if (activeChip === chip.id) {
                        setActiveChip('all');
                      } else {
                        setActiveChip(chip.id as any);
                      }
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected
                    ? 'bg-[#0A1B5C] text-white shadow-xs'
                    : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
                    }`}
                >
                  <span>{chip.label}</span>
                  {isSelected && (
                    <span className="text-[10px] ml-0.5 opacity-80" title="Click to unselect">✕</span>
                  )}
                </button>
              );
            })} */}

            {activeChip !== 'all' && (
              <button
                onClick={() => {
                  if (activeChip === 'remote') setWorkModeFilter('all');
                  setActiveChip('all');
                }}
                className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline ml-1 shrink-0"
              >
                Clear filter
              </button>
            )}

            <div className="ml-auto text-xs font-medium text-neutral-500 shrink-0 hidden md:flex items-center gap-2">
              <span>Found <span className="font-bold text-[#0A1B5C]">{filteredJobs.length}</span> verified roles ({allJobs.length} total)</span>
              <button
                onClick={() => loadJobs()}
                disabled={isLoadingJobs}
                title="Refresh live job requisitions"
                className="p-1 rounded-lg text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isLoadingJobs ? 'animate-spin text-[#0A1B5C]' : ''}`} />
              </button>
            </div>
          </div>
        </JobsNavbar>

        {/* Main Two-Pane Split Dashboard (Desktop: Split / Mobile: List ↔ Detail) */}
        <main className={`flex-1 min-h-0 max-w-[1720px] w-full mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 overflow-hidden ${mobileView === 'detail'
          ? 'h-[calc(100dvh-60px)] sm:h-[calc(100dvh-70px)] lg:h-full'
          : 'h-[calc(100dvh-130px)] lg:h-full'
          }`}>
          {/* Left Column (38% on desktop): AI Job Recommendations Feed */}
          <div className={`lg:col-span-5 flex-col h-full min-h-0 overflow-hidden ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
            }`}>
            {/* Feed Tabs: All Jobs | Recommended | Saved | Applied */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-1 flex items-center gap-1.5 mb-2.5 shrink-0 shadow-xs overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setActiveListTab('all');
                  setActiveChip('all');
                }}
                className={`flex-1 shrink-0 min-w-fit py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeListTab === 'all'
                  ? 'bg-[#0A1B5C] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
              >
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="hidden xl:inline">All Jobs</span>
                  <span className="xl:hidden">All</span> ({totalRolesCount ?? allJobs.length})
                </span>
              </button>

              <button
                onClick={() => {
                  if (activeListTab === 'recommended') {
                    // Unselect filter
                    setActiveListTab('all');
                    setActiveChip('all');
                    toast.info('Filter unselected - Showing all jobs');
                  } else {
                    setActiveListTab('recommended');
                  }
                }}
                className={`flex-1 shrink-0 min-w-fit py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeListTab === 'recommended'
                  ? 'bg-[#0A1B5C] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
              >
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="hidden xl:inline">Recommended</span>
                  <span className="xl:hidden">Recs</span> ({recommendedJobs.length})
                </span>
                {activeListTab === 'recommended' && (
                  <span className="text-[10px] ml-0.5 opacity-80" title="Click to unselect filter">✕</span>
                )}
              </button>

              <button
                onClick={() => setActiveListTab('saved')}
                className={`flex-1 shrink-0 min-w-fit py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeListTab === 'saved'
                  ? 'bg-[#0A1B5C] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
              >
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                <span>Saved ({savedJobIds.length})</span>
              </button>

              <button
                onClick={() => setActiveListTab('applied')}
                className={`flex-1 shrink-0 min-w-fit py-2 px-2.5 sm:px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeListTab === 'applied'
                  ? 'bg-[#0A1B5C] text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Applied ({appliedJobIds.length})</span>
              </button>
            </div>

            {/* Active Filter Helper Banner when filtered by Recommended */}
            {activeListTab === 'recommended' && (
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#eefaf6] border border-emerald-200/80 flex items-center justify-between text-xs text-[#0A1B5C] shrink-0">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Target className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Showing top recommended matches ({recommendedJobs.length} roles)</span>
                </div>
                <button
                  onClick={() => {
                    setActiveListTab('all');
                    setActiveChip('all');
                    toast.info('Filter unselected - Showing all jobs');
                  }}
                  className="text-[11px] font-semibold text-[#0A1B5C] hover:underline flex items-center gap-1"
                >
                  Unselect filter (View all {allJobs.length} jobs)
                </button>
              </div>
            )}

            {/* Active Location & Workplace Filter Helper Banner */}
            {/* {((selectedCity && selectedCity.toLowerCase() !== 'all') || workModeFilter !== 'all') && (
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-between text-xs text-[#0A1B5C] shrink-0 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>
                    {selectedCity && selectedCity.toLowerCase() !== 'all' ? (
                      workModeFilter === 'all' ? (
                        <>Showing roles in <strong className="text-neutral-900">{selectedCity}</strong> ({filteredJobs.length} roles)</>
                      ) : workModeFilter === 'remote' ? (
                        <>Showing Remote roles in <strong className="text-neutral-900">{selectedCity}</strong> ({filteredJobs.length} roles)</>
                      ) : workModeFilter === 'onsite' ? (
                        <>Showing Onsite roles in <strong className="text-neutral-900">{selectedCity}</strong> ({filteredJobs.length} roles)</>
                      ) : (
                        <>Showing Hybrid roles in <strong className="text-neutral-900">{selectedCity}</strong> ({filteredJobs.length} roles)</>
                      )
                    ) : (
                      <>
                        Showing{' '}
                        <strong className="text-neutral-900">
                          {workModeFilter === 'remote'
                            ? 'Remote'
                            : workModeFilter === 'onsite'
                              ? 'Onsite'
                              : 'Hybrid'}
                        </strong>{' '}
                        roles worldwide ({filteredJobs.length} roles)
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCity && selectedCity.toLowerCase() !== 'all' && (
                    <button
                      onClick={() => {
                        setSelectedCity('');
                        toast.info('Location filter cleared');
                      }}
                      className="text-[11px] font-semibold text-[#0A1B5C] hover:underline"
                    >
                      Clear location
                    </button>
                  )}
                  {workModeFilter !== 'all' && (
                    <button
                      onClick={() => {
                        setWorkModeFilter('all');
                        if (activeChip === 'remote') setActiveChip('all');
                        toast.info('Workplace filter reset to all');
                      }}
                      className="text-[11px] font-semibold text-[#0A1B5C] hover:underline"
                    >
                      All workplaces
                    </button>
                  )}
                </div>
              </div>
            )} */}

            {/* Active Company Filter Helper Banner */}
            {selectedCompanies.length > 0 && !selectedCompanies.includes('all') && (
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-purple-50/90 border border-purple-200/80 flex items-center justify-between text-xs text-[#0A1B5C] shrink-0">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Building2 className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>
                    Filtered by company:{' '}
                    <strong className="text-neutral-900">{selectedCompanies.join(', ')}</strong> ({filteredJobs.length} roles)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={selectAllCompanies}
                  className="text-[11px] font-semibold text-[#0A1B5C] hover:underline"
                >
                  Show all companies
                </button>
              </div>
            )}

            {/* Sort & Count Header Bar */}
            <div className="flex items-center justify-between mb-2 px-1 text-xs text-neutral-500 shrink-0">
              <span className="font-medium text-neutral-600">
                Found <strong className="text-neutral-900 font-bold">{totalRolesCount ?? filteredJobs.length}</strong> {(totalRolesCount ?? filteredJobs.length) === 1 ? 'role' : 'roles'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-neutral-500">Sort by:</span>
                <div className="inline-flex rounded-xl border border-neutral-200/90 bg-white p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSortBy('relevance')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${sortBy === 'relevance'
                      ? 'bg-[#0A1B5C] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                  >
                    Relevance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('date')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${sortBy === 'date'
                      ? 'bg-[#0A1B5C] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                  >
                    Date Posted
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Job Cards List (Independently scrollable on left) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1.5 rounded-2xl [scrollbar-width:thin]">
              {isLoadingJobs && dbJobs.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border border-neutral-200/80 bg-white animate-pulse">
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100" />
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-24 bg-neutral-200 rounded" />
                            <div className="h-2.5 w-32 bg-neutral-100 rounded" />
                          </div>
                        </div>
                        <div className="h-6 w-20 bg-emerald-50 rounded-full" />
                      </div>
                      <div className="h-4 w-3/4 bg-neutral-200 rounded mb-2" />
                      <div className="h-3 w-1/2 bg-neutral-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="h-64 rounded-2xl bg-white border border-neutral-200 p-8 flex flex-col items-center justify-center text-center">
                  <Briefcase className="h-10 w-10 text-neutral-300 mb-3" />
                  <h3 className="font-bold text-sm text-neutral-800">No matching roles found</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    {selectedCompanies.length > 0
                      ? `No matching roles found for company "${selectedCompanies.join(', ')}". Try resetting your company filter.`
                      : selectedCity && isValidGeographicLocation(selectedCity)
                        ? `No matching roles found for "${selectedCity}". Try resetting your location or search filters.`
                        : 'Try clearing your search query or switching filter chips.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveChip('all');
                      setSelectedCity('');
                      setSelectedCompanies([]);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <>
                  {filteredJobs.map((job) => {
                    const isSelected = selectedJob.id === job.id;
                    const isSaved = savedJobIds.includes(job.id);
                    const isApplied = appliedJobIds.includes(job.id);

                    return (
                      <div
                        key={job.id}
                        onClick={() => handleSelectJob(job.id)}
                        className={`group p-4 rounded-2xl border transition-all cursor-pointer text-left relative bg-white ${isSelected
                          ? 'border-[#0A1B5C] shadow-md ring-2 ring-[#0A1B5C]/10 bg-white'
                          : 'border-neutral-200/90 hover:border-neutral-300 hover:shadow-xs'
                          }`}
                      >
                        {/* Header Row: Company & Match Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              companyName={job.companyName}
                              logoUrl={job.companyLogo}
                              externalUrl={job.externalApplyUrl}
                              className="w-10 h-10 rounded-xl"
                              size={64}
                            />
                            <div>
                              <span className="font-semibold text-xs text-neutral-900 group-hover:text-[#0A1B5C] transition-colors flex items-center gap-1">
                                {job.companyName}
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              </span>
                              <span className="text-[11px] text-neutral-500 font-medium">
                                {job.location} · {job.workplaceType}
                              </span>
                            </div>
                          </div>

                          {/* Match Score Ring / Badge */}
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1 shadow-xs">
                              {/* <Zap className="h-3 w-3 text-emerald-600" /> */}
                              <span>{job.matchScore}% Match</span>
                            </div>

                            <button
                              onClick={(e) => toggleSaveJob(e, job.id)}
                              aria-label="Bookmark Job"
                              className={`p-1.5 rounded-lg border transition-colors ${isSaved
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
                                }`}
                            >
                              <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Job Title */}
                        <h3 className="font-semibold text-sm text-neutral-900 mb-1.5 leading-snug line-clamp-1">
                          {job.title}
                        </h3>

                        {/* Application Routing Tag */}
                        <div className="flex items-center gap-1.5 mb-2">
                          {job.externalJobId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                              Req #{job.externalJobId}
                            </span>
                          ) : job.isCurated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20">
                              <Building2 className="h-3 w-3 text-[#0A1B5C]" />
                              Verified Enterprise Role
                            </span>
                          ) : null}
                        </div>

                        {/* Salary & Meta Row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-600 mb-3">
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 font-semibold text-[11px]">
                            {job.salaryRange}
                          </span>
                          <span className="text-neutral-400">·</span>
                          <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3 text-neutral-400" /> {job.postedAt}
                          </span>
                          {isApplied && (
                            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              Applied
                            </span>
                          )}
                        </div>

                        {/* Matching Skills Chips */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.matchingSkills.slice(0, 4).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded-md bg-[#eefaf6] text-[#0A1B5C] text-[10px] font-medium border border-emerald-100"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                          {job.matchingSkills.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-neutral-100 text-neutral-500 text-[10px] font-medium">
                              +{job.matchingSkills.length - 4} more
                            </span>
                          )}
                        </div>

                        {/* Verified Insider Callout (Jobright Secret Weapon) */}
                        {job.insiderCount > 0 && (
                          <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                            <span className="text-[#0A1B5C] font-semibold flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />

                              {`${job.insiderCount} verified insider${job.insiderCount === 1 ? '' : 's'} ready to vouch`}

                            </span>
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {hasMore && (
                    <div className="pt-2 pb-6 text-center">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-5 py-2.5 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 text-[#0A1B5C] text-xs font-bold shadow-xs hover:bg-neutral-50 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0A1B5C]" />
                            <span>Loading more roles...</span>
                          </>
                        ) : (
                          <span>
                            Load more roles ({totalRolesCount ? Math.max(0, totalRolesCount - filteredJobs.length) : 'more'} remaining)
                          </span>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column (62% on desktop): Deep-Dive Job & Copilot Action Pane */}
          <div className={`lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col h-full min-h-0 overflow-hidden ${mobileView === 'detail' ? 'flex' : 'hidden lg:flex'
            }`}>
            {/* 1. Mobile Back to List Header */}
            <div className="lg:hidden px-3.5 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 z-20 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A1B5C] bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-xl border border-neutral-200 shadow-xs active:scale-95 transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-[#0A1B5C]" />
                <span>Back to Jobs</span>
              </button>
              <div className="text-right min-w-0 pl-2">
                <span className="text-xs font-semibold text-neutral-900 truncate block max-w-[170px]">
                  {selectedJob.companyName}
                </span>
                <span className="text-[10px] text-neutral-500 font-medium truncate block max-w-[170px]">
                  {selectedJob.title}
                </span>
              </div>
            </div>

            {/* 2. Unified Scroll Container (Scrolls header, tabs, and details seamlessly) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
              {/* Selected Job Top Bar */}
              <div className="p-4 sm:p-6 border-b border-neutral-200/80 bg-gradient-to-b from-neutral-50/50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <CompanyLogo
                      key={selectedJob.id}
                      companyName={selectedJob.companyName}
                      logoUrl={selectedJob.companyLogo}
                      externalUrl={selectedJob.externalApplyUrl}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl"
                      size={64}
                      initialsClassName="text-lg sm:text-xl font-bold text-[#0A1B5C]"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{selectedJob.companyName}</span>
                        {/* {selectedJob.isInternal ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0A1B5C] text-white flex items-center gap-1 shadow-xs">
                            <Building2 className="h-3 w-3 text-white" />
                            Verified Recruiter Role
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-[#0A1B5C]" />
                            External ATS Listing {selectedJob.externalJobId ? `(Req #${selectedJob.externalJobId})` : ''}
                          </span>
                        )} */}
                      </div>
                      <h1 className="text-lg sm:text-2xl font-bold text-neutral-900 leading-snug">
                        {selectedJob.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-xs text-neutral-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" /> {selectedJob.location} ({selectedJob.workplaceType})
                        </span>
                        <span>·</span>
                        <span className="font-semibold text-neutral-900">{selectedJob.salaryRange}</span>
                        <span>·</span>
                        <span>{selectedJob.jobType}</span>
                        <span>·</span>
                        <span>Posted {selectedJob.postedAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Score Gauge Header */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xl sm:text-2xl font-bold text-[#0A1B5C] flex items-center gap-1">
                        {selectedJob.matchScore}%
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                        High Conviction Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons Row (Hidden on mobile; mobile uses the dedicated sticky bottom action bar) */}
                <div className="hidden lg:flex flex-wrap items-center gap-2 pt-2">
                  {selectedJob.isInternal ? (
                    <button
                      onClick={() => setIsApplyModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-95"
                    >
                      {appliedJobIds.includes(selectedJob.id) ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <span>Applied on Vouchins</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-white" />
                          <span>Apply on Vouchins</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href={selectedJobApplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!appliedJobIds.includes(selectedJob.id)) {
                          setAppliedJobIds((prev) => [...prev, selectedJob.id]);
                        }
                        toast.success(`Redirecting to ${selectedJob.companyName} careers portal...`);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                    >
                      <span>Apply on Site</span>
                      <ExternalLink className="h-3.5 w-3.5 text-white" />
                    </a>
                  )}

                  {effectiveInsiderCount > 0 ? (
                    <button
                      onClick={() => {
                        const target = companyInsiders[0] || selectedJob.verifiedInsiders[0];
                        handleInitiateReferral(target);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#4FD1C5] hover:bg-[#3ebcb0] text-[#0A1B5C] text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      {!isUserVerifiedOrAdmin ? (
                        <Lock className="h-3.5 w-3.5 text-[#0A1B5C]" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                      )}
                      <span>Request Insider Referral ({effectiveInsiderCount})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!user) {
                          window.location.href = '/login?returnTo=/jobs';
                        } else {
                          setIsInviteOpen(true);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl border border-[#0A1B5C]/20 hover:bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Send className="h-3.5 w-3.5 text-[#0A1B5C]" />
                      <span>Invite Insiders</span>
                    </button>
                  )}

                  <button
                    onClick={() => setTailorModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-700" />
                    <span>Tailor Resume</span>
                  </button>

                  <button
                    onClick={(e) => toggleSaveJob(e, selectedJob.id)}
                    className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
                    aria-label="Bookmark"
                  >
                    <Bookmark className={`h-4 w-4 ${savedJobIds.includes(selectedJob.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Deep-Dive Navigation Tabs (Sticky as you scroll) */}
              <div className="sticky top-0 z-10 px-3 sm:px-6 border-b border-neutral-200 bg-white/95 backdrop-blur-md flex items-center gap-3 sm:gap-6 text-xs font-semibold text-neutral-500 shrink-0 overflow-x-auto no-scrollbar shadow-xs">
                <button
                  onClick={() => setActiveDetailTab('match')}
                  className={`py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeDetailTab === 'match'
                    ? 'border-[#0A1B5C] text-[#0A1B5C] font-semibold'
                    : 'border-transparent hover:text-neutral-900'
                    }`}
                >
                  <TrendingUp className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>Match Insights</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('insiders')}
                  className={`py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeDetailTab === 'insiders'
                    ? 'border-[#0A1B5C] text-[#0A1B5C] font-semibold'
                    : 'border-transparent hover:text-neutral-900'
                    }`}
                >
                  <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>Verified Insiders ({effectiveInsiderCount})</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('description')}
                  className={`py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeDetailTab === 'description'
                    ? 'border-[#0A1B5C] text-[#0A1B5C] font-semibold'
                    : 'border-transparent hover:text-neutral-900'
                    }`}
                >
                  <FileText className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>Job Description</span>
                </button>

                <button
                  onClick={() => setActiveDetailTab('copilot')}
                  className={`py-3 sm:py-3.5 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${activeDetailTab === 'copilot'
                    ? 'border-[#0A1B5C] text-[#0A1B5C] font-semibold'
                    : 'border-transparent hover:text-neutral-900'
                    }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>AI Copilot & Prep</span>
                </button>
              </div>

              {/* Deep-Dive Body Scroll Container */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 lg:pb-6">
                {/* TAB 1: MATCH INSIGHTS */}
                {activeDetailTab === 'match' && (
                  <div className="space-y-6">
                    {/* AI Why You Match Banner */}
                    <div className="rounded-2xl bg-[#eefaf6] border border-emerald-200/80 p-5 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-emerald-600 text-white">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="font-bold text-xs text-[#0A1B5C] uppercase tracking-wider">
                          {candidateProfileSkills.length > 0
                            ? 'Why Your Master Resume Matches This Position'
                            : `Location Match - Based in ${selectedCity || 'Your Location'}`}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
                        {selectedJob.whyYouMatch}
                      </p>
                    </div>

                    {/* Upload Resume Callout if candidate has no resume skills */}
                    {candidateProfileSkills.length === 0 && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A1B5C]/5 to-[#4FD1C5]/10 border border-[#0A1B5C]/15 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-[#0A1B5C]">Want personalized AI skill scoring?</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Upload your Master Resume to unlock instant ATS keyword matching and Google XYZ bullet tailoring.
                          </p>
                        </div>
                        <Link
                          href="/resume"
                          className="px-3.5 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
                        >
                          Upload Resume
                        </Link>
                      </div>
                    )}

                    {/* Score Breakdown Cards */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                      <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                          Technical Skills
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                          {candidateProfileSkills.length > 0 && selectedJob.matchBreakdown.skillsScore > 0
                            ? `${selectedJob.matchBreakdown.skillsScore}%`
                            : 'Resume Needed'}
                        </span>
                      </div>
                      <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                          {candidateProfileSkills.length > 0 ? 'Seniority & Scope' : 'Location Fit'}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                          {candidateProfileSkills.length > 0
                            ? `${selectedJob.matchBreakdown.experienceScore}%`
                            : '100%'}
                        </span>
                      </div>
                      <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                          Tech Stack Fit
                        </span>
                        <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                          {candidateProfileSkills.length > 0 && selectedJob.matchBreakdown.stackScore > 0
                            ? `${selectedJob.matchBreakdown.stackScore}%`
                            : 'Resume Needed'}
                        </span>
                      </div>
                    </div>

                    {/* Matched Skills vs Missing Skills Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Matched Skills */}
                      <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-3">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Matched Competencies ({selectedJob.matchingSkills.length})
                        </span>
                        {selectedJob.matchingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedJob.matchingSkills.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold"
                              >
                                ✓ {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400 italic">
                            No direct overlap detected with skills on your active resume.
                          </p>
                        )}
                      </div>

                      {/* Missing Skills (Opportunities to Tailor) */}
                      <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-3">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Keywords Missing ({selectedJob.missingSkills.length})
                        </span>
                        {selectedJob.missingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedJob.missingSkills.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                              >
                                + {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 font-medium">
                            ✓ Great alignment - No missing core keywords detected.
                          </p>
                        )}
                        {/* <button
                          onClick={() => setTailorModalOpen(true)}
                          className="text-[11px] font-semibold text-[#0A1B5C] hover:underline flex items-center gap-1 pt-1"
                        >
                          <span>1-Click add missing keywords via Tailor Studio</span>
                          <ArrowRight className="h-3 w-3" />
                        </button> */}
                      </div>
                    </div>

                    {/* 1-Click Tailor Preview Card */}
                    <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                          Google XYZ Tailored Bullet Transformation
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {selectedJob.tailoredBulletSuggestion.impactMetric}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-white border border-neutral-200 text-neutral-500 line-through">
                          &ldquo;{selectedJob.tailoredBulletSuggestion.original}&rdquo;
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium leading-relaxed">
                          &ldquo;{selectedJob.tailoredBulletSuggestion.tailored}&rdquo;
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: VERIFIED INSIDERS (REFERRALS) */}
                {activeDetailTab === 'insiders' && (
                  <div className="space-y-4">
                    {/* Banners: ONLY render if there are insiders (companyInsiders.length > 0) */}
                    {companyInsiders.length > 0 && (
                      !isUserVerifiedOrAdmin ? (
                        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Lock className="h-4 w-4 text-amber-700" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                Corporate Verification Required to Connect
                              </h4>
                              <p className="text-xs text-amber-900/80 mt-0.5">
                                You can view verified colleagues at {selectedJob.companyName}, but connecting and requesting referrals requires a verified corporate work email.
                              </p>
                            </div>
                          </div>
                          <Link
                            href={user ? '/verify-email' : '/login?returnTo=%2Fjobs'}
                            className="px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-xs shrink-0 text-center transition-all active:scale-95"
                          >
                            {user ? 'Verify Work Email' : 'Sign In to Verify'}
                          </Link>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 flex items-center justify-between shadow-xs">
                          <div>
                            <h4 className="font-bold text-xs text-[#0A1B5C] uppercase tracking-wider">
                              Internal Corporate Referrals at {selectedJob.companyName}
                            </h4>
                            <p className="text-xs text-neutral-600 mt-0.5">
                              Verified via corporate email domain. Candidates with insider referrals have a 4x higher interview callback rate.
                            </p>
                          </div>
                        </div>
                      )
                    )}

                    {/* Insiders List */}
                    {isLoadingInsiders ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className="p-4 rounded-2xl border border-neutral-200 bg-white animate-pulse flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-neutral-200 shrink-0" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-neutral-200 rounded" />
                                <div className="h-3 w-48 bg-neutral-100 rounded" />
                              </div>
                            </div>
                            <div className="h-8 w-28 bg-neutral-200 rounded-xl" />
                          </div>
                        ))}
                      </div>
                    ) : companyInsiders.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white border border-neutral-200 text-center space-y-4 shadow-xs">
                        <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center mx-auto">
                          <Users className="h-6 w-6 text-[#0A1B5C]" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-bold text-sm text-neutral-900">
                            No Vouchins Insiders Found for {selectedJob.companyName} Yet
                          </h5>
                          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                            Be the first to invite colleagues from {selectedJob.companyName} to Vouchins and build the company referral network.
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!user) {
                                window.location.href = '/login?returnTo=/jobs';
                              } else {
                                setIsInviteOpen(true);
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Invite Colleagues from {selectedJob.companyName}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {companyInsiders.map((insider, idx) => {
                          const isVerifiedViewer = isUserVerifiedOrAdmin;
                          const displayName = isVerifiedViewer
                            ? insider.name
                            : formatPartialName(insider.name);
                          const isAlreadyRequested = sentReferralInsiderIds.includes(insider.id);

                          const avatarInitials = displayName
                            .split(' ')
                            .map((p) => p[0])
                            .filter(Boolean)
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <div
                              key={insider.id || idx}
                              className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 bg-white hover:border-[#4FD1C5] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-center gap-3">
                                {insider.avatarUrl && isVerifiedViewer ? (
                                  <Image
                                    src={insider.avatarUrl}
                                    alt={displayName}
                                    width={44}
                                    height={44}
                                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-neutral-200 shadow-xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-[#0A1B5C] font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                                    {avatarInitials}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {insider.isRegisteredUser && isVerifiedViewer ? (
                                      <Link
                                        href={`/users/${insider.id}`}
                                        target="_blank"
                                        className="font-semibold text-sm text-neutral-900 hover:text-[#0A1B5C] transition-colors hover:underline flex items-center gap-1"
                                      >
                                        <span>{displayName}</span>
                                        <ExternalLink className="h-3 w-3 text-neutral-400" />
                                      </Link>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-sm text-neutral-900">{displayName}</span>
                                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center gap-1">
                                          <Lock className="h-2.5 w-2.5 text-amber-600" />
                                          Partial info
                                        </span>
                                      </div>
                                    )}

                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                      @{insider.domain}
                                    </span>

                                    {insider.vouchPoints > 0 && (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#0A1B5C]/10 text-[#0A1B5C]">
                                        ★ {insider.vouchPoints} Vouch Points
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-neutral-500 font-medium flex items-center gap-2 mt-0.5 truncate">
                                    <span>{insider.role}</span>
                                    {insider.city && (
                                      <>
                                        <span>·</span>
                                        <span className="flex items-center gap-0.5">
                                          <MapPin className="h-3 w-3 text-neutral-400" /> {insider.city}
                                        </span>
                                      </>
                                    )}
                                    <span>·</span>
                                    <span className="text-emerald-700 font-bold">{insider.responseRate}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isVerifiedViewer ? (
                                  isAlreadyRequested ? (
                                    <span className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      Referral Requested
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleInitiateReferral(insider)}
                                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold transition-all shadow-xs text-center active:scale-95"
                                    >
                                      Request Referral
                                    </button>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateReferral(insider)}
                                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold border border-neutral-300 transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                                  >
                                    <Lock className="h-3.5 w-3.5 text-neutral-500" />
                                    <span>Connect (Verify to Unlock)</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: FULL JOB DESCRIPTION */}
                {activeDetailTab === 'description' && (
                  <div className="space-y-6 text-left">
                    {/* About Company */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        About {selectedJob.companyName}
                      </h4>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                        {selectedJob.description.about}
                      </p>
                    </div>

                    {/* Responsibilities */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
                        What You&apos;ll Do
                      </h4>
                      <ul className="space-y-2">
                        {selectedJob.description.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#0A1B5C] mt-2 shrink-0" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Qualifications */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
                        Qualifications & Hiring Bar
                      </h4>
                      <ul className="space-y-2">
                        {selectedJob.description.qualifications.map((qual, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{qual}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Tech Stack */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        Primary Tech Stack
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedJob.description.techStack.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Compensation & Benefits */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
                        Benefits & Perks
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedJob.description.benefits.map((benefit, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-medium"
                          >
                            ✓ {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: AI COPILOT & PREP */}
                {activeDetailTab === 'copilot' && (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-[#0A1B5C] text-white flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-amber-400" />
                          Jobs Career Copilot
                        </h4>
                        <p className="text-xs text-neutral-300 mt-0.5">
                          Tailor application materials and simulate hiring manager questions for {selectedJob.title}.
                        </p>
                      </div>
                    </div>

                    {/* One-Click Action Prompts */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Generate role-tailored cover letter',
                        'Top 5 interview questions for this role',
                        'Analyze hiring manager keywords',
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleRunCopilotPrompt(prompt)}
                          className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:border-[#0A1B5C] hover:bg-neutral-50 text-xs font-bold text-neutral-800 transition-all flex items-center gap-1.5"
                        >
                          <ArrowRight className="h-3 w-3 text-[#0A1B5C]" />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>

                    {/* AI Output Response Box */}
                    {copilotLoading ? (
                      <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-2">
                        <Loader2 className="h-6 w-6 text-[#0A1B5C] animate-spin mx-auto" />
                        <span className="text-xs font-bold text-neutral-600 block">
                          Synthesizing hiring insights for {selectedJob.companyName}...
                        </span>
                      </div>
                    ) : copilotResponse ? (
                      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                          <span className="text-xs font-bold text-[#0A1B5C] uppercase tracking-wider">
                            Prompt: &ldquo;{copilotPrompt}&rdquo;
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(copilotResponse);
                              toast.success('Copied to clipboard!');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>

                        <pre className="text-xs text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed">
                          {copilotResponse}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 text-center text-xs text-neutral-500">
                        Click any prompt chip above to generate instant role-tailored materials.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Mobile Dedicated Bottom Action Bar */}
            <div className="lg:hidden sticky bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 px-2.5 sm:px-3 py-2 flex items-center gap-1.5 sm:gap-2 shadow-[0_-8px_25px_-5px_rgba(0,0,0,0.1)] pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
              {/* Bookmark Button */}
              <button
                type="button"
                onClick={(e) => toggleSaveJob(e, selectedJob.id)}
                aria-label="Bookmark"
                className="h-11 w-11 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 shrink-0 transition-colors active:scale-95 bg-white shadow-xs"
              >
                <Bookmark className={`h-4 w-4 ${savedJobIds.includes(selectedJob.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>

              {/* Tailor Resume Button */}
              <button
                type="button"
                onClick={() => setTailorModalOpen(true)}
                className="h-11 px-2.5 sm:px-3 rounded-xl border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800 text-xs font-bold flex items-center justify-center gap-1 shrink-0 active:scale-95 shadow-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-700" />
                <span>Tailor</span>
              </button>

              {/* Request Insider Referral / Invite Insiders */}
              {effectiveInsiderCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = companyInsiders[0] || selectedJob.verifiedInsiders[0];
                    handleInitiateReferral(target);
                  }}
                  className="h-11 px-2.5 sm:px-3.5 rounded-xl bg-[#4FD1C5] hover:bg-[#3ebcb0] text-[#0A1B5C] text-xs font-semibold shadow-xs flex items-center justify-center gap-1 shrink-0 active:scale-95"
                >
                  {!isUserVerifiedOrAdmin ? (
                    <Lock className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  ) : (
                    <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  )}
                  <span>Referral ({effectiveInsiderCount})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      window.location.href = '/login?returnTo=/jobs';
                    } else {
                      setIsInviteOpen(true);
                    }
                  }}
                  className="h-11 px-2.5 sm:px-3.5 rounded-xl border border-[#0A1B5C]/20 hover:bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-semibold shadow-xs flex items-center justify-center gap-1 shrink-0 active:scale-95"
                >
                  <Send className="h-3.5 w-3.5 text-[#0A1B5C]" />
                  <span>Invite</span>
                </button>
              )}

              {/* Primary Apply CTA */}
              {selectedJob.isInternal ? (
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(true)}
                  className="flex-1 h-11 px-3 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all truncate"
                >
                  {appliedJobIds.includes(selectedJob.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="truncate">Applied</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 text-white shrink-0" />
                      <span className="truncate">Apply on Vouchins</span>
                    </>
                  )}
                </button>
              ) : (
                <a
                  href={selectedJobApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (!appliedJobIds.includes(selectedJob.id)) {
                      setAppliedJobIds((prev) => [...prev, selectedJob.id]);
                    }
                    toast.success(`Redirecting to ${selectedJob.companyName} careers portal...`);
                  }}
                  className="flex-1 h-11 px-3 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all truncate"
                >
                  <span className="truncate">Apply on Site</span>
                  <ExternalLink className="h-3.5 w-3.5 text-white shrink-0" />
                </a>
              )}
            </div>
          </div>
        </main>

        {/* TAILOR RESUME MODAL */}
        <Dialog open={tailorModalOpen} onOpenChange={setTailorModalOpen}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#0A1B5C]" />
                Tailor Resume for {selectedJob.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Align your Master Resume with {selectedJob.companyName}&apos;s target keywords in 1-click without manual rewriting.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
                <span className="font-semibold text-neutral-700 block">Target Role Keyword Ingestion</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.matchingSkills.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                      ✓ {s}
                    </span>
                  ))}
                  {selectedJob.missingSkills.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-medium">
                      + {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-800 block">
                  Targeted Bullet Point Transformation:
                </span>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 font-medium leading-relaxed">
                  &ldquo;{selectedJob.tailoredBulletSuggestion.tailored}&rdquo;
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-100 text-xs text-neutral-600 flex items-center justify-between">
                <span>Predicted ATS Score Increase:</span>
                <span className="font-bold text-emerald-700 text-sm">94 ➔ 99 / 100</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTailorModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <Link
                href="/jobs/resume"
                className="px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <span>Apply to Master Resume</span>
                <ArrowRight className="h-3.5 w-3.5 text-white" />
              </Link>
            </div>
          </DialogContent>
        </Dialog>

        {/* REQUEST REFERRAL MODAL */}
        <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0A1B5C]" />
                Request Corporate Referral
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Connect directly with verified employees at {selectedJob.companyName}.
              </DialogDescription>
            </DialogHeader>

            {selectedInsider && (
              <div className="space-y-4 py-2">
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A1B5C] text-white font-bold flex items-center justify-center text-sm">
                    {selectedInsider.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-neutral-900 flex items-center gap-1">
                      {selectedInsider.name}
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded-md">
                        @{selectedInsider.domain}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">{selectedInsider.role}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                    Introduction Note & Match Highlights:
                  </label>
                  <textarea
                    rows={4}
                    value={
                      referralNote ||
                      `Hi ${selectedInsider.name.split(' ')[0]}, I noticed your work at ${selectedJob.companyName}. My Master Resume matches 96% of the ${selectedJob.title} hiring bar with quantified achievements in Kafka and Go. Would you be open to an internal referral?`
                    }
                    onChange={(e) => setReferralNote(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                  />
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-800 font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Verified corporate email guarantees direct routing to internal employee inbox.</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReferralModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReferralRequest}
                disabled={isSendingReferral}
                className="px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isSendingReferral ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <span>Send Referral Request</span>
                    <Send className="h-3.5 w-3.5 text-white" />
                  </>
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CORPORATE VERIFICATION REQUIRED MODAL */}
        <Dialog open={verificationModalOpen} onOpenChange={setVerificationModalOpen}>
          <DialogContent className="max-w-md w-[95vw] sm:w-full bg-white rounded-3xl p-6 shadow-xl">
            <DialogHeader className="text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-xl font-bold text-neutral-900">
                Corporate Verification Required
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 mt-1">
                Connecting with verified insiders at <strong className="text-neutral-800">{selectedJob.companyName}</strong> requires an active verified corporate account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-900 block">Protecting Insider Privacy</span>
                  <span>Employees at {selectedJob.companyName} only receive outreach from verified professionals in the Vouchins network.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                {/* <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> */}
                <div>
                  <span className="font-semibold text-neutral-900 block">4x Referral Callback Rate</span>
                  <span>Verified employee referrals bypass external ATS filters and land directly in internal HR priority queues.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVerificationModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              {user ? (
                <Link
                  href="/verify-email"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm text-center flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Verify Work Email</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white" />
                </Link>
              ) : (
                <Link
                  href="/login?returnTo=%2Fjobs"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm text-center flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Sign In to Verify</span>
                  <ArrowRight className="h-3.5 w-3.5 text-white" />
                </Link>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* APPLY ON VOUCHINS MODAL (FOR INTERNAL RECRUITER POSTINGS) */}
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0A1B5C]" />
                Apply on Vouchins
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Direct application to <strong className="text-neutral-800">{selectedJob.companyName}</strong> for <strong className="text-neutral-800">{selectedJob.title}</strong>. The hiring team reviews your verified profile and candidate materials directly on Vouchins.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInternalApply} className="space-y-4 py-3">
              <div className="p-3.5 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-[#0A1B5C] uppercase tracking-wider block">
                    Verified Candidate Fast-Track
                  </span>
                  <span className="text-xs text-neutral-600 font-medium">
                    Your application is prioritized directly in the {selectedJob.companyName} recruiter dashboard.
                  </span>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 ml-3" />
              </div>

              {/* Resume Selection UI */}
              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-2">
                  Select Resume for Application <span className="text-red-500">*</span>
                </label>

                {isLoadingResumes ? (
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center gap-2 text-xs text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0A1B5C]" />
                    <span>Loading your saved resumes...</span>
                  </div>
                ) : userResumes.length > 0 && !isCustomResumeUrl ? (
                  <div className="space-y-2">
                    {userResumes.map((resume) => {
                      const isSelected = selectedResumeId === resume.id;
                      const score = resume.evaluation?.overallScore;
                      return (
                        <div
                          key={resume.id}
                          onClick={() => {
                            setSelectedResumeId(resume.id);
                            setApplyResumeUrl(`${window.location.origin}/jobs/resume?id=${resume.id}`);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${isSelected
                            ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 ring-2 ring-[#0A1B5C]/10'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-[#0A1B5C] bg-[#0A1B5C]' : 'border-neutral-300'
                                }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-neutral-900 truncate block">
                                {resume.name}
                              </span>
                              <span className="text-[10px] text-neutral-500 truncate block">
                                {resume.targetJobTitle} · {resume.lastModified}
                              </span>
                            </div>
                          </div>

                          {typeof score === 'number' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                              {score}/100 ATS Score
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setIsCustomResumeUrl(true)}
                      className="text-[11px] font-semibold text-[#0A1B5C] hover:underline pt-1 block"
                    >
                      Or enter external resume URL (Google Drive / PDF / Doc)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userResumes.length === 0 && (
                      <div className="p-3.5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center text-center gap-2">
                        <FileText className="h-6 w-6 text-neutral-400" />
                        <div>
                          <p className="text-xs font-semibold text-neutral-800">
                            No saved resumes found on Vouchins
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Upload or build your resume in Resume Studio for 1-click verified applications.
                          </p>
                        </div>
                        <Link
                          href="/jobs/resume"
                          className="px-3.5 py-1.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Upload in Resume Studio</span>
                        </Link>
                      </div>
                    )}

                    <div>
                      <input
                        type="url"
                        required
                        placeholder="https://drive.google.com/... or your online resume URL"
                        value={applyResumeUrl}
                        onChange={(e) => setApplyResumeUrl(e.target.value)}
                        className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                      />
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Paste a publicly viewable Google Drive, Dropbox, or PDF link.
                      </p>
                    </div>

                    {userResumes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomResumeUrl(false);
                          if (userResumes.length > 0) {
                            setSelectedResumeId(userResumes[0].id);
                            setApplyResumeUrl(`${window.location.origin}/jobs/resume?id=${userResumes[0].id}`);
                          }
                        }}
                        className="text-[11px] font-semibold text-[#0A1B5C] hover:underline block"
                      >
                        ← Back to saved resumes
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                  Cover Letter or Note to Recruiter (Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder={`Hi ${selectedJob.companyName} Recruiting Team, I am excited to apply for the ${selectedJob.title} position...`}
                  value={applyCoverLetter}
                  onChange={(e) => setApplyCoverLetter(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
              </div>

              {user && !user.is_verified && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Note: Your profile is currently unverified. Only verified members can apply to recruiter postings.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApplication}
                  className="px-5 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingApplication ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application</span>
                      <Send className="h-3.5 w-3.5 text-white" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {isInviteOpen && user && (
          <InviteDialog
            isOpen={isInviteOpen}
            onClose={() => setIsInviteOpen(false)}
            userId={user.id}
          />
        )}
      </div>
    </div>
  );
}
