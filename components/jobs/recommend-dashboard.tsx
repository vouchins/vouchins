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
  Share2,
  ExternalLink,
  ChevronRight,
  Filter,
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
  } catch {}
  return null;
}

const CURATED_RECOMMENDED_JOBS: RecommendedJob[] = [
  {
    id: 'rec-oracle-principal-architect',
    title: 'Principal Cloud Systems Architect',
    companyName: 'Oracle',
    companyLogo: 'https://www.google.com/s2/favicons?domain=oracle.com&sz=128',
    location: 'Hyderabad / Bangalore',
    workplaceType: 'Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Principal',
    salaryRange: '$190k - $245k / yr',
    postedAt: '1 hour ago',
    matchScore: 98,
    matchBreakdown: {
      skillsScore: 98,
      experienceScore: 97,
      stackScore: 98,
    },
    whyYouMatch:
      'Exceptional alignment with Oracle Cloud Infrastructure (OCI) distributed storage and high-throughput microservices. High density of verified Vouchins insiders ready to connect.',
    matchingSkills: ['Distributed Systems', 'Cloud Infra', 'Java', 'Go', 'Kubernetes', 'High Concurrency'],
    missingSkills: ['OCI SDK', 'Terraform'],
    insiderCount: 15,
    verifiedInsiders: [],
    description: {
      about:
        'Oracle Cloud Infrastructure (OCI) is a deep-tech next-generation cloud designed to run mission-critical enterprise workloads with unmatched performance and security.',
      responsibilities: [
        'Architect planetary-scale cloud services delivering low-latency distributed storage and compute.',
        'Partner with verified engineering staff in Hyderabad and Bangalore to design resilient multi-region architectures.',
        'Mentor principal and senior engineers across high-concurrency systems design and failure domain isolation.',
      ],
      qualifications: [
        '8+ years building enterprise-grade distributed infrastructure with high availability.',
        'Deep production mastery of distributed consensus, ACID storage, and low-latency network primitives.',
      ],
      techStack: ['Java', 'Go', 'Kubernetes', 'OCI', 'Microservices', 'Distributed Systems'],
      benefits: ['Top-tier Oracle RSUs', 'Full medical and comprehensive health coverage', 'Flexible hybrid schedule'],
    },
    tailoredBulletSuggestion: {
      original: 'Led backend infrastructure design and database reliability.',
      tailored:
        'Architected fault-tolerant distributed cloud control plane supporting 12M+ daily operations, reducing cross-region replication lag by 48%.',
      impactMetric: '-48% Replication Lag',
    },
    externalApplyUrl: 'https://careers.oracle.com/jobs/results/24001928374-principal-cloud-architect',
    externalJobId: '24001928374',
    isInternal: false,
  },
  {
    id: 'rec-servicenow-staff',
    title: 'Staff Software Engineer (Platform Infrastructure)',
    companyName: 'ServiceNow',
    companyLogo: 'https://media.licdn.com/dms/image/v2/C560BAQG56fJ6s7t8_Q/company-logo_100_100/company-logo_100_100/0/1630652741617/servicenow_logo?e=2147483647&v=beta&t=example',
    location: 'Hyderabad / Remote',
    workplaceType: 'Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Staff',
    salaryRange: '$180k - $230k / yr',
    postedAt: '2 hours ago',
    matchScore: 96,
    matchBreakdown: {
      skillsScore: 98,
      experienceScore: 95,
      stackScore: 95,
    },
    whyYouMatch:
      'Your 6+ years architecting Kafka streaming clusters and low-latency Go microservices directly satisfies ServiceNow\'s platform tier requirements. Your quantified p99 latency optimization exceeds their hiring bar.',
    matchingSkills: ['Kafka', 'Distributed Systems', 'Go', 'Microservices', 'High Concurrency', 'Redis'],
    missingSkills: ['OpenTelemetry / Datadog', 'Kubernetes Operator SDK'],
    insiderCount: 1,
    verifiedInsiders: [],
    description: {
      about:
        'ServiceNow makes work work better for everyone. Our platform infrastructure teams build the planetary-scale event backbone powering thousands of Fortune 500 enterprises with five-nines availability.',
      responsibilities: [
        'Architect and scale real-time distributed streaming infrastructure handling 100M+ events per minute.',
        'Design fault-tolerant failover patterns and automated shard balancing across multi-region cloud clusters.',
        'Lead architectural bar-raising design reviews and mentor senior engineering staff on system resilience.',
        'Partner closely with platform SRE teams to drive p99 API latencies under 40 milliseconds.',
      ],
      qualifications: [
        '7+ years experience designing mission-critical distributed systems and event-driven architectures.',
        'Deep production expertise with Apache Kafka, Go, or high-throughput Java/C++ services.',
        'Proven track record solving complex concurrency, idempotency, and data replication bottlenecks.',
        'B.Tech/M.S. in Computer Science or equivalent practical industry experience.',
      ],
      techStack: ['Go', 'Kafka', 'Kubernetes', 'Docker', 'Redis', 'AWS', 'gRPC'],
      benefits: ['Top-of-market equity (RSUs)', 'Comprehensive medical & dental coverage', 'Annual learning stipend ($3,000)', 'Flexible remote working setup'],
    },
    tailoredBulletSuggestion: {
      original: 'Maintained event streaming pipelines and fixed latency bugs.',
      tailored:
        'Architected high-throughput Kafka streaming pipelines processing 18M events/day, cutting p99 consumer latency by 43% with zero message loss.',
      impactMetric: '+43% p99 Latency Reduction',
    },
    externalApplyUrl: 'https://careers.servicenow.com/jobs/743999981234567/staff-software-engineer-platform-infrastructure',
    externalJobId: '743999981234567',
    isInternal: false,
  },
  {
    id: 'rec-uber-senior-backend',
    title: 'Senior Backend Engineer (Core Driver Payouts)',
    companyName: 'Uber',
    companyLogo: 'https://media.licdn.com/dms/image/v2/C4D0BAQFiYnR1Mbtxdg/company-logo_100_100/company-logo_100_100/0/1630552741617/uber_com_logo?e=2147483647&v=beta&t=example',
    location: 'Bangalore / Remote',
    workplaceType: 'Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    salaryRange: '$165k - $210k / yr',
    postedAt: '4 hours ago',
    matchScore: 93,
    matchBreakdown: {
      skillsScore: 94,
      experienceScore: 92,
      stackScore: 93,
    },
    whyYouMatch:
      'Strong match across idempotent financial settlement logic and high-volume transaction routing. Your background in distributed locks matches Uber\'s payout gateway requirements.',
    matchingSkills: ['Go', 'PostgreSQL', 'Idempotent APIs', 'Redis', 'Microservices', 'Distributed Locks'],
    missingSkills: ['Temporal Workflows', 'Cassandra'],
    insiderCount: 1,
    verifiedInsiders: [],
    description: {
      about:
        'Uber Payments & FinTech powers the financial lifeblood for millions of drivers and earners worldwide, processing billions of dollars across 70+ countries in real time.',
      responsibilities: [
        'Engineer ultra-reliable payment settlement gateways ensuring zero double-spends and guaranteed delivery.',
        'Scale asynchronous settlement workers utilizing distributed queues and partitioned state machines.',
        'Collaborate with banking integration partners to reduce cross-border disbursement delays.',
      ],
      qualifications: [
        '5+ years building high-concurrency payment, banking, or transactional platforms.',
        'Strong fundamentals in database ACID guarantees, distributed locking, and schema migrations.',
      ],
      techStack: ['Go', 'PostgreSQL', 'Redis', 'Kafka', 'Temporal', 'Docker'],
      benefits: ['Uber credits monthly ($250)', 'Competitive base + equity grants', 'Wellness stipend', 'Parental leave'],
    },
    tailoredBulletSuggestion: {
      original: 'Worked on driver payout service and integrated banking APIs.',
      tailored:
        'Re-engineered real-time driver payout gateway handling 2.4M daily transactions, reducing settlement failures by 78% via idempotent Redis locks.',
      impactMetric: '-78% Settlement Failures',
    },
    externalApplyUrl: 'https://www.uber.com/global/en/careers/list/132948-senior-backend-engineer-core-driver-payouts',
    externalJobId: '132948',
    isInternal: false,
  },
  {
    id: 'rec-stripe-staff-infra',
    title: 'Staff Infrastructure Lead (Cloud Platform)',
    companyName: 'Stripe',
    companyLogo: 'https://media.licdn.com/dms/image/v2/C560BAQG56fJ6s7t8_Q/company-logo_100_100/company-logo_100_100/0/1630652741617/stripe_logo?e=2147483647&v=beta&t=example',
    location: 'Remote (Global)',
    workplaceType: 'Remote',
    jobType: 'Full-time',
    experienceLevel: 'Staff',
    salaryRange: '$195k - $250k / yr',
    postedAt: '1 day ago',
    matchScore: 95,
    matchBreakdown: {
      skillsScore: 96,
      experienceScore: 95,
      stackScore: 94,
    },
    whyYouMatch:
      'Exceptional architectural alignment with multi-region Kubernetes orchestration and high-availability cloud infrastructure. Your Google XYZ metrics score in the top 5% of candidate pools.',
    matchingSkills: ['Kubernetes', 'Cloud Infra', 'Terraform', 'Observability', 'Go', 'AWS'],
    missingSkills: ['Envoy Proxy', 'eBPF'],
    insiderCount: 0,
    verifiedInsiders: [],
    description: {
      about:
        'Stripe is an economic infrastructure platform for the internet. Millions of businesses - from ambitious startups to Fortune 500s - use Stripe\'s software to accept payments and manage businesses online.',
      responsibilities: [
        'Lead multi-region Kubernetes compute infrastructure hosting Stripe\'s core API services.',
        'Build automated self-healing cluster auto-balancers and capacity forecasting engines.',
        'Drive multi-million dollar cloud compute cost-efficiencies without sacrificing 99.999% reliability.',
      ],
      qualifications: [
        '8+ years scaling high-volume cloud infrastructure on AWS or GCP.',
        'Extensive experience managing massive Kubernetes clusters with custom CRDs and operators.',
      ],
      techStack: ['Kubernetes', 'Go', 'Terraform', 'AWS', 'Prometheus', 'Envoy'],
      benefits: ['Generous equity package', 'Full remote flexibility anywhere in approved regions', 'Unlimited PTO', 'Home office budget ($2,500)'],
    },
    tailoredBulletSuggestion: {
      original: 'Handled internal Kubernetes cluster operations and node updates.',
      tailored:
        'Automated multi-region Kubernetes cluster auto-scaling across 1,200 nodes, reducing cloud compute overhead by 31% while sustaining 99.99% uptime.',
      impactMetric: '-31% Cloud Compute Cost',
    },
    externalApplyUrl: 'https://stripe.com/jobs/listing/staff-infrastructure-lead-cloud-platform/5920191',
    externalJobId: '5920191',
    isInternal: false,
  },
  {
    id: 'rec-google-principal-systems',
    title: 'Principal Systems Architect (Cloud Networking)',
    companyName: 'Google',
    location: 'Bangalore / Hyderabad / Remote',
    workplaceType: 'Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Principal',
    salaryRange: '$220k - $290k / yr',
    postedAt: '1 day ago',
    matchScore: 91,
    matchBreakdown: {
      skillsScore: 92,
      experienceScore: 90,
      stackScore: 91,
    },
    whyYouMatch:
      'Your high-throughput network engineering background satisfies Google Cloud\'s systems bar. High conviction in system scalability and distributed trade-offs.',
    matchingSkills: ['Distributed Systems', 'C++', 'Go', 'Networking Protocols', 'Large-Scale Storage'],
    missingSkills: ['BGP / SDN Architecture', 'Spanner'],
    insiderCount: 1,
    verifiedInsiders: [],
    description: {
      about:
        'Google Cloud helps millions of organizations empower their employees, serve their customers, and build what\'s next for their business with innovative technology built in the cloud.',
      responsibilities: [
        'Architect hyper-scale software-defined networking solutions for Google Cloud Platform.',
        'Define 3-year technical roadmaps for next-generation edge routing and zero-trust proxies.',
      ],
      qualifications: [
        '10+ years driving large-scale distributed systems and networking innovations.',
      ],
      techStack: ['C++', 'Go', 'BGP', 'SDN', 'Borg', 'gRPC'],
      benefits: ['Google 401k / PF match', 'World-class wellness & parental support', 'GSU Equity grants'],
    },
    tailoredBulletSuggestion: {
      original: 'Worked on networking configuration and proxy latency.',
      tailored:
        'Engineered high-concurrency edge reverse proxy handling 450k req/sec, shrinking edge TLS handshake overhead by 38ms across global POPs.',
      impactMetric: '-38ms Edge Latency',
    },
    externalApplyUrl: 'https://www.google.com/about/careers/applications/jobs/results/1392817401928374-principal-systems-architect',
    externalJobId: '1392817401928374',
    isInternal: false,
  },
  {
    id: 'rec-meta-staff-backend',
    title: 'Staff Software Engineer (AI Infrastructure)',
    companyName: 'Meta',
    location: 'Remote / Menlo Park',
    workplaceType: 'Remote',
    jobType: 'Full-time',
    experienceLevel: 'Staff',
    salaryRange: '$210k - $275k / yr',
    postedAt: '2 days ago',
    matchScore: 90,
    matchBreakdown: {
      skillsScore: 91,
      experienceScore: 90,
      stackScore: 89,
    },
    whyYouMatch:
      'High alignment with high-performance distributed backend architectures and stateful streaming caches.',
    matchingSkills: ['C++', 'Python', 'Distributed Training', 'PyTorch', 'GPU Clusters'],
    missingSkills: ['NCCL Communication', 'Triton'],
    insiderCount: 1,
    verifiedInsiders: [],
    description: {
      about:
        'Meta builds technologies that help people connect, find communities, and grow businesses. Our AI Infrastructure team builds training clusters powering Llama and next-generation generative models.',
      responsibilities: [
        'Build scalable orchestration layers for clusters of 24,000+ GPUs.',
        'Eliminate checkpointing I/O bottlenecks in multi-node training pipelines.',
      ],
      qualifications: ['6+ years in systems programming, high-performance computing, or AI infra.'],
      techStack: ['Python', 'C++', 'PyTorch', 'CUDA', 'Slurm', 'RDMA'],
      benefits: ['Top-tier RSUs', 'Full remote compensation parity', 'Wellness fund'],
    },
    tailoredBulletSuggestion: {
      original: 'Helped optimize GPU training cluster scripts and checkpoint saves.',
      tailored:
        'Designed asynchronous model checkpointing pipeline reducing snapshot I/O overhead by 62%, recapturing 140 GPU training hours per training run.',
      impactMetric: 'Saved 140 GPU Hours',
    },
    externalApplyUrl: 'https://www.metacareers.com/jobs/918237401928374/staff-software-engineer-ai-infra',
    externalJobId: '918237401928374',
    isInternal: false,
  },
  {
    id: 'job-vouchins-direct-lead',
    title: 'Lead Distributed Systems Architect (Trust & Verification Platform)',
    companyName: 'Nexus Enterprise AI',
    companyLogo: 'https://www.google.com/s2/favicons?domain=nexus.io&sz=128',
    location: 'Hyderabad / Remote',
    workplaceType: 'Hybrid',
    jobType: 'Full-time',
    experienceLevel: 'Lead',
    salaryRange: '$175k - $225k / yr',
    postedAt: 'Just now',
    matchScore: 97,
    matchBreakdown: {
      skillsScore: 98,
      experienceScore: 96,
      stackScore: 97,
    },
    whyYouMatch:
      'Direct employer role posted on Vouchins! The hiring recruiter reviews applications directly on Vouchins with prioritized interview review for verified members.',
    matchingSkills: ['Distributed Systems', 'Go', 'Microservices', 'PostgreSQL', 'Redis', 'Kafka', 'System Architecture'],
    missingSkills: ['OpenTelemetry'],
    insiderCount: 0,
    verifiedInsiders: [],
    description: {
      about:
        'Nexus Enterprise AI builds mission-critical cryptographic verification infrastructure for cloud platforms. The team is hiring directly through Vouchins.',
      responsibilities: [
        'Lead architectural evolution of high-throughput verification pipelines handling 50M+ events/day.',
        'Mentor engineering teams across distributed state consistency, event sourcing, and resilience patterns.',
        'Directly interface with founding executives on architectural roadmap and scaling milestones.',
      ],
      qualifications: [
        '7+ years architecting high-scale distributed backends using Go, Rust, or modern C++.',
        'Deep production experience with Kafka streaming, distributed caches, and ACID data stores.',
      ],
      techStack: ['Go', 'Kafka', 'PostgreSQL', 'Redis', 'Kubernetes', 'Docker', 'gRPC'],
      benefits: ['Direct fast-track interview with hiring manager', 'Top-tier equity grants', 'Full remote flexibility', 'Comprehensive health & wellness coverage'],
    },
    tailoredBulletSuggestion: {
      original: 'Developed scalable backend services and data stores.',
      tailored:
        'Architected real-time distributed verification engine processing 42M daily transactions, reducing verification latency by 51% via pipelined Redis caching.',
      impactMetric: '-51% Latency Reduction',
    },
    isInternal: true,
    externalApplyUrl: null,
    isCurated: true,
    isRecommended: true,
  },
];

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
      'Docker', 'PostgreSQL', 'GraphQL', 'Next.js', 'Kafka', 'Redis', 'Java', 'GCP', 'SQL', 'C++'
    ];
    // Safe substring checking (avoids regex crashes on characters like + in C++)
    const matchingSkills = commonTech.filter((s) => textLower.includes(s.toLowerCase()));
    if (matchingSkills.length === 0) {
      matchingSkills.push('TypeScript', 'React', 'System Design', 'Cloud APIs');
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
        `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`,
      location,
      workplaceType,
      jobType,
      experienceLevel,
      salaryRange: job.salary_range || 'Competitive',
      postedAt,
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
      isInternal: Boolean(
        (!job.external_apply_url || job.external_apply_url.trim() === '') ||
        (job.recruiter_id && job.recruiter_id !== '57d1bab1-1c10-45f8-8835-d1421cab8ca5')
      ),
      recruiterId: job.recruiter_id || null,
      externalJobId: extractJobId(job.external_apply_url),
      externalApplyUrl: hasValidExternalJobId(job.external_apply_url) ? job.external_apply_url.trim() : null,
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
      salaryRange: job?.salary_range || 'Competitive',
      postedAt: 'Recently',
      matchScore: 88,
      matchBreakdown: { skillsScore: 90, experienceScore: 85, stackScore: 88 },
      whyYouMatch: 'Your profile matches the core qualifications for this role.',
      matchingSkills: ['TypeScript', 'React', 'System Design'],
      missingSkills: ['OpenTelemetry'],
      insiderCount: 2,
      verifiedInsiders: [],
      description: {
        about: job?.description?.slice(0, 300) || 'Position details.',
        responsibilities: ['Build and maintain services.'],
        qualifications: ['Engineering experience.'],
        techStack: ['TypeScript', 'React'],
        benefits: ['Standard benefits.'],
      },
      tailoredBulletSuggestion: {
        original: 'Contributed to systems.',
        tailored: 'Led feature execution and reliability optimizations.',
        impactMetric: 'Productivity Gain',
      },
      isInternal: true,
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
  const [selectedJobId, setSelectedJobId] = useState<string>(
    initialJobId || CURATED_RECOMMENDED_JOBS[0].id
  );
  // Mobile responsive view: 'list' (shows job cards) | 'detail' (shows selected role details)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>(initialJobId ? 'detail' : 'list');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const initialTab = searchParams.get('tab') === 'recommended' || pathname === '/jobs/recommend' ? 'recommended' : 'all';
  const [activeChip, setActiveChip] = useState<'all' | 'high_match' | 'insiders' | 'remote' | 'tier1' | 'high_salary'>('all');
  const [activeListTab, setActiveListTab] = useState<'all' | 'recommended' | 'saved' | 'applied'>(initialTab);
  const [savedJobIds, setSavedJobIds] = useState<string[]>(['rec-oracle-principal-architect']);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'match' | 'insiders' | 'description' | 'copilot'>('match');

  // Real Database Jobs State
  const [dbJobs, setDbJobs] = useState<RecommendedJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Fetch real jobs from database via /api/jobs
  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      setIsLoadingJobs(true);
      try {
        const res = await fetch('/api/jobs?limit=150');
        if (res.ok) {
          const json = await res.json();
          if (json.jobs && Array.isArray(json.jobs)) {
            const transformed = json.jobs.map(transformDbJobToRecommendedJob);
            if (isMounted) {
              setDbJobs(transformed);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load database jobs:', err);
      } finally {
        if (isMounted) setIsLoadingJobs(false);
      }
    }

    loadJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Combined master job list (Curated showcase + Database jobs deduplicated)
  // Filters out external jobs that lack external job IDs / direct valid requisition URLs,
  // while preserving internal recruiter jobs posted on Vouchins.
  const allJobs = useMemo(() => {
    const list = [...CURATED_RECOMMENDED_JOBS];
    const seenIds = new Set(CURATED_RECOMMENDED_JOBS.map((j) => j.id));
    const seenTitles = new Set(
      CURATED_RECOMMENDED_JOBS.map((j) => `${j.companyName.toLowerCase()}-${j.title.toLowerCase()}`)
    );

    for (const job of dbJobs) {
      const key = `${job.companyName.toLowerCase()}-${job.title.toLowerCase()}`;
      if (!seenIds.has(job.id) && !seenTitles.has(key)) {
        seenIds.add(job.id);
        seenTitles.add(key);
        list.push(job);
      }
    }
    return list.filter((j) => j.isInternal || hasValidExternalJobId(j.externalApplyUrl));
  }, [dbJobs]);

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
    const targetUrl = pathname === '/jobs' ? `/jobs?id=${jobId}` : `/jobs/recommend?id=${jobId}`;
    router.replace(targetUrl, { scroll: false });
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
    // Note: if activeListTab === 'all', it shows ALL jobs in system!

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
      list = list.filter((j) => j.salaryRange.includes('$180k') || j.salaryRange.includes('$2') || j.salaryRange.toLowerCase().includes('competitive'));
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

    return list;
  }, [allJobs, activeListTab, activeChip, savedJobIds, appliedJobIds, searchQuery]);

  const selectedJob = useMemo(() => {
    return allJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || allJobs[0] || CURATED_RECOMMENDED_JOBS[0];
  }, [selectedJobId, allJobs, filteredJobs]);

  const selectedJobApplyUrl = useMemo(() => {
    if (selectedJob?.isInternal) return '';
    const url = selectedJob?.externalApplyUrl?.trim();
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }, [selectedJob]);

  // Fetch real Vouchins users from the same company as selectedJob
  useEffect(() => {
    let isMounted = true;
    async function loadCompanyInsiders() {
      if (!selectedJob?.companyName) return;
      setIsLoadingInsiders(true);
      try {
        const cleanDomain = selectedJob.companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        const res = await fetch(
          `/api/jobs/insiders?company=${encodeURIComponent(selectedJob.companyName)}&domain=${cleanDomain}`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setCompanyInsiders(json.insiders && Array.isArray(json.insiders) ? json.insiders : []);
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
    const finalUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
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
    // Strict verification requirement: user must be verified to connect
    if (!user || !user.is_verified) {
      setSelectedInsider(insider);
      setVerificationModalOpen(true);
      return;
    }
    setSelectedInsider(insider);
    setReferralModalOpen(true);
  };

  const handleSendReferralRequest = async () => {
    if (!user?.is_verified) {
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
          <div className={`max-w-[1720px] mx-auto mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-neutral-100 items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 ${
            mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
          }`}>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Filters:
            </span>

            {[
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
                    if (activeChip === chip.id) {
                      setActiveChip('all');
                    } else {
                      setActiveChip(chip.id as any);
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
            })}

            {activeChip !== 'all' && (
              <button
                onClick={() => setActiveChip('all')}
                className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 underline ml-1 shrink-0"
              >
                Clear filter
              </button>
            )}

            <div className="ml-auto text-xs font-medium text-neutral-500 shrink-0 hidden md:block">
              Found <span className="font-bold text-[#0A1B5C]">{filteredJobs.length}</span> verified roles ({allJobs.length} total)
            </div>
          </div>
        </JobsNavbar>

        {/* Main Two-Pane Split Dashboard (Desktop: Split / Mobile: List ↔ Detail) */}
        <main className={`flex-1 min-h-0 max-w-[1720px] w-full mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 overflow-hidden ${
          mobileView === 'detail'
            ? 'h-[calc(100dvh-60px)] sm:h-[calc(100dvh-70px)] lg:h-full'
            : 'h-[calc(100dvh-130px)] lg:h-full'
        }`}>
          {/* Left Column (38% on desktop): AI Job Recommendations Feed */}
          <div className={`lg:col-span-5 flex-col h-full min-h-0 overflow-hidden ${
            mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
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
                  <span className="xl:hidden">All</span> ({allJobs.length})
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

            {/* Scrollable Job Cards List (Independently scrollable on left) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1.5 rounded-2xl [scrollbar-width:thin]">
              {filteredJobs.length === 0 ? (
                <div className="h-64 rounded-2xl bg-white border border-neutral-200 p-8 flex flex-col items-center justify-center text-center">
                  <Briefcase className="h-10 w-10 text-neutral-300 mb-3" />
                  <h3 className="font-bold text-sm text-neutral-800">No matching roles found</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Try clearing your search query or switching filter chips.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveChip('all');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#0A1B5C] text-white text-xs font-bold"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => {
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
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-bold text-sm text-[#0A1B5C] shrink-0 shadow-xs">
                            {job.companyName.slice(0, 2).toUpperCase()}
                          </div>
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
                            <Zap className="h-3 w-3 text-emerald-600" />
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
                        {job.isInternal ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#0A1B5C]/10 text-[#0A1B5C] border border-[#0A1B5C]/20">
                            <Building2 className="h-3 w-3 text-[#0A1B5C]" />
                            Direct Recruiter · Apply on Vouchins
                          </span>
                        ) : job.externalJobId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Req #{job.externalJobId}
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
                      <div className="pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                        <span className="text-[#0A1B5C] font-semibold flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                          {job.insiderCount} verified insiders ready to vouch
                        </span>

                        <span className="text-[#0A1B5C] font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (62% on desktop): Deep-Dive Job & Copilot Action Pane */}
          <div className={`lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-sm flex flex-col h-full min-h-0 overflow-hidden ${
            mobileView === 'detail' ? 'flex' : 'hidden lg:flex'
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
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center font-bold text-lg sm:text-xl text-[#0A1B5C] shrink-0">
                      {selectedJob.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="font-semibold text-sm text-neutral-900">{selectedJob.companyName}</span>
                        {selectedJob.isInternal ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0A1B5C] text-white flex items-center gap-1 shadow-xs">
                            <Building2 className="h-3 w-3 text-white" />
                            Direct Recruiter Role · Internal Application
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center gap-1">
                            <ExternalLink className="h-3 w-3 text-[#0A1B5C]" />
                            External ATS Listing {selectedJob.externalJobId ? `(Req #${selectedJob.externalJobId})` : ''}
                          </span>
                        )}
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
                        <Zap className="h-4 sm:h-5 w-4 sm:w-5 text-amber-500" />
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

                  <button
                    onClick={() => {
                      const target = companyInsiders[0] || selectedJob.verifiedInsiders[0];
                      handleInitiateReferral(target);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#4FD1C5] hover:bg-[#3ebcb0] text-[#0A1B5C] text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    {!user?.is_verified ? (
                      <Lock className="h-3.5 w-3.5 text-[#0A1B5C]" />
                    ) : (
                      <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                    )}
                    <span>Request Insider Referral ({companyInsiders.length > 0 ? companyInsiders.length : (isLoadingInsiders ? '...' : selectedJob.insiderCount)})</span>
                  </button>

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
                  <span>Verified Insiders ({companyInsiders.length > 0 ? companyInsiders.length : (isLoadingInsiders ? '...' : selectedJob.insiderCount)})</span>
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
                        Why Your Master Resume Matches This Position
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium">
                      {selectedJob.whyYouMatch}
                    </p>
                  </div>

                  {/* Score Breakdown Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                        Technical Skills
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                        {selectedJob.matchBreakdown.skillsScore}%
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                        Seniority & Scope
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                        {selectedJob.matchBreakdown.experienceScore}%
                      </span>
                    </div>
                    <div className="p-2.5 sm:p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[9px] sm:text-[10px] font-semibold text-neutral-400 uppercase block mb-0.5 sm:mb-1">
                        Tech Stack Fit
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#0A1B5C]">
                        {selectedJob.matchBreakdown.stackScore}%
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
                    </div>

                    {/* Missing Skills (Opportunities to Tailor) */}
                    <div className="p-4 rounded-2xl bg-white border border-neutral-200 space-y-3">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Keywords Missing ({selectedJob.missingSkills.length})
                      </span>
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
                      <button
                        onClick={() => setTailorModalOpen(true)}
                        className="text-[11px] font-semibold text-[#0A1B5C] hover:underline flex items-center gap-1 pt-1"
                      >
                        <span>1-Click add missing keywords via Tailor Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
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
                  {/* Verification Banner */}
                  {!user?.is_verified ? (
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
                    <div className="p-8 rounded-2xl bg-white border border-neutral-200 text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-2xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center mx-auto">
                        <Users className="h-6 w-6 text-[#0A1B5C]" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-neutral-900">
                          No Vouchins Insiders Found for {selectedJob.companyName} Yet
                        </h5>
                        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                          Be the first to invite colleagues from {selectedJob.companyName} to Vouchins and build the company referral network.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {companyInsiders.map((insider, idx) => {
                        const isVerifiedViewer = Boolean(user?.is_verified);
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

              {/* Request Insider Referral */}
              <button
                type="button"
                onClick={() => {
                  const target = companyInsiders[0] || selectedJob.verifiedInsiders[0];
                  handleInitiateReferral(target);
                }}
                className="h-11 px-2.5 sm:px-3.5 rounded-xl bg-[#4FD1C5] hover:bg-[#3ebcb0] text-[#0A1B5C] text-xs font-semibold shadow-xs flex items-center justify-center gap-1 shrink-0 active:scale-95"
              >
                {!user?.is_verified ? (
                  <Lock className="h-3.5 w-3.5 text-[#0A1B5C]" />
                ) : (
                  <Users className="h-3.5 w-3.5 text-[#0A1B5C]" />
                )}
                <span>Referral ({companyInsiders.length > 0 ? companyInsiders.length : (isLoadingInsiders ? '...' : selectedJob.insiderCount)})</span>
              </button>

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
                <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
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

              <div>
                <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                  Resume Link or Master Resume URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... or your online resume URL"
                  value={applyResumeUrl}
                  onChange={(e) => setApplyResumeUrl(e.target.value)}
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Defaulted to your Vouchins Master Resume or paste a shareable Google Drive / PDF link.
                </p>
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
