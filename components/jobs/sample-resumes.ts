import { ResumeDocument, ResumeEvaluation } from '@/lib/jobs/types';

export const SAMPLE_STAFF_RESUME: ResumeDocument = {
  contact: {
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 432-8910',
    location: 'San Francisco, CA (Open to Remote)',
    linkedinUrl: 'https://linkedin.com/in/john-doe',
    githubUrl: 'https://github.com/johndoe',
    portfolioUrl: 'https://johndoe.dev',
  },
  summary:
    'Staff Full-Stack Engineer with 9+ years of experience architecting distributed web platforms, high-throughput microservices, and design systems for enterprise scale. Proven track record leading multi-team technical initiatives, optimizing p99 latencies, and scaling platforms to 10M+ daily active users.',
  skills: [
    {
      category: 'Languages & Core',
      items: ['TypeScript', 'JavaScript (ESNext)', 'Go', 'Python', 'SQL (PostgreSQL)', 'HTML5 / CSS3'],
    },
    {
      category: 'Frontend & UI Systems',
      items: ['React 18', 'Next.js 14/15 (App Router, SSR)', 'Tailwind CSS', 'Redux Toolkit', 'Design Systems', 'Web Performance'],
    },
    {
      category: 'Backend & Distributed Systems',
      items: ['Node.js', 'PostgreSQL', 'Redis (Caching / Queues)', 'Kafka', 'GraphQL', 'REST APIs', 'gRPC'],
    },
    {
      category: 'Cloud & Infrastructure',
      items: ['AWS (ECS, S3, RDS, CloudFront)', 'Docker', 'Kubernetes', 'CI/CD (GitHub Actions)', 'Terraform', 'Datadog / Prometheus'],
    },
  ],
  experience: [
    {
      id: 'exp-1',
      company: 'Apex Cloud Systems',
      roleTitle: 'Staff Software Engineer - Core Platform',
      location: 'San Francisco, CA',
      startDate: '2022',
      endDate: 'Present',
      isCurrent: true,
      bullets: [
        'Architected and led the migration of a legacy monolithic monolith to event-driven Next.js micro-frontends, reducing p99 page load times by 46% across 6.5M monthly active users.',
        'Engineered distributed Redis caching and edge invalidation layer, slashing database read query volume by 62% and eliminating downtime during peak Black Friday surges.',
        'Worked on improving developer tooling and test automation for the engineering team.',
        'Mentored 8 senior engineers and established organization-wide architectural review standards for TypeScript safety and API backwards compatibility.',
      ],
    },
    {
      id: 'exp-2',
      company: 'HyperScale Networks',
      roleTitle: 'Senior Full-Stack Engineer',
      location: 'New York, NY',
      startDate: '2019',
      endDate: '2022',
      isCurrent: false,
      bullets: [
        'Spearheaded the redesign of consumer onboarding workflows using React and Next.js, lifting signup conversion rates by 22% and generating $1.8M in annualized pipeline.',
        'Responsible for maintaining customer analytics data pipelines and background export workers.',
        'Integrated automated end-to-end testing with Playwright and Jest into GitHub Actions CI, reducing regression release blockers by 74%.',
      ],
    },
    {
      id: 'exp-3',
      company: 'Vanguard Media Tech',
      roleTitle: 'Software Engineer',
      location: 'Boston, MA',
      startDate: '2016',
      endDate: '2019',
      isCurrent: false,
      bullets: [
        'Engineered responsive web applications supporting real-time video collaboration, maintaining sub-100ms websocket latency.',
        'Helped with database query optimizations and Postgres index tuning.',
        'Collaborated with product designers to build a shared design system of 40+ accessible UI components in TypeScript.',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Washington',
      degree: 'Bachelor of Science in Computer Science',
      fieldOfStudy: 'Computer Science & Software Systems',
      startDate: '2012',
      endDate: '2016',
      gpaOrHonors: 'Magna Cum Laude (GPA 3.86/4.0)',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'VectorFlow - Distributed Cache Invalidation Engine',
      techStack: ['TypeScript', 'Go', 'Redis', 'Docker'],
      liveUrl: 'https://vectorflow.dev',
      repoUrl: 'https://github.com/johndoe/vectorflow',
      bullets: [
        'Engineered lightweight edge cache synchronizer processing 10k invalidation broadcasts/sec with zero packet drops.',
        'Adopted by 1,400+ developers on GitHub with 250+ community stars.',
      ],
    },
  ],
  certifications: ['AWS Certified Solutions Architect - Professional', 'Kubernetes Certified Application Developer (CKAD)'],
};

export const SAMPLE_STAFF_EVALUATION: ResumeEvaluation = {
  overallScore: 84,
  pillarScores: {
    impact: 78,
    relevance: 91,
    brevity: 83,
  },
  detectedSeniority: 'Staff Software Engineer (L6 / IC6)',
  targetRole: 'Staff / Principal Full-Stack Engineer',
  strengths: [
    'Strong executive architectural scope with multi-million user scale ($1.8M pipeline, 6.5M MAU)',
    'Exceptional modern tech stack depth (Next.js App Router, TypeScript, Redis, Kafka, AWS)',
    'Demonstrated engineering leadership, mentoring, and org-wide technical governance',
    'ATS single-column structural compliance with clear information hierarchy',
  ],
  missingKeywords: [
    'System Observability (OpenTelemetry / Datadog Tracing)',
    'Zero-Downtime Database Migration Patterns',
    'Distributed Consensus (Raft / Paxos)',
  ],
  suggestions: [
    {
      id: 'sug-1',
      roleIndex: 0,
      bulletIndex: 2,
      pillar: 'impact',
      severity: 'critical',
      originalText: 'Worked on improving developer tooling and test automation for the engineering team.',
      suggestedRewrite:
        'Spearheaded automated CI/CD and developer tooling initiatives across 45+ engineers, cutting average pull request build cycle times from 28 minutes to 6 minutes (78% acceleration).',
      rationale:
        'Replaces weak passive phrasing ("Worked on improving") with the Google XYZ formula ("Accomplished [X], measured by [Y], by doing [Z]") to showcase measurable productivity gains valued by Tier-1 tech hiring bars.',
      applied: false,
    },
    {
      id: 'sug-2',
      roleIndex: 1,
      bulletIndex: 1,
      pillar: 'impact',
      severity: 'critical',
      originalText: 'Responsible for maintaining customer analytics data pipelines and background export workers.',
      suggestedRewrite:
        'Architected fault-tolerant background analytics export workers in Go and Redis, scaling daily batch throughput to 4.2TB while eliminating 99% of out-of-memory timeout incidents.',
      rationale:
        'Eliminates passive "Responsible for maintaining" phrasing and introduces concrete telemetry scale (4.2TB, 99% incident reduction).',
      applied: false,
    },
    {
      id: 'sug-3',
      roleIndex: 2,
      bulletIndex: 1,
      pillar: 'impact',
      severity: 'recommended',
      originalText: 'Helped with database query optimizations and Postgres index tuning.',
      suggestedRewrite:
        'Optimized critical PostgreSQL database indexes and slow queries, reducing p95 database response latency by 38% across top 10 customer-facing dashboards.',
      rationale:
        'Converts vague assistance phrasing ("Helped with") into a quantifiable engineering accomplishment with p95 latency gains.',
      applied: false,
    },
    {
      id: 'sug-4',
      roleIndex: 0,
      bulletIndex: 0,
      pillar: 'brevity',
      severity: 'optional',
      originalText:
        'Architected and led the migration of a legacy monolithic monolith to event-driven Next.js micro-frontends, reducing p99 page load times by 46% across 6.5M monthly active users.',
      suggestedRewrite:
        'Architected migration from legacy monolith to Next.js micro-frontends, reducing p99 load latency by 46% across 6.5M monthly active users.',
      rationale:
        'Removes tautological phrasing ("monolithic monolith") for sharper executive brevity without sacrificing impact metrics.',
      applied: false,
    },
  ],
  jobMatchVectors: {
    detectedRole: 'Staff Full-Stack Engineer',
    seniority: 'Staff Software Engineer (L6 / IC6)',
    primarySkills: ['TypeScript', 'Next.js', 'React', 'Go', 'Distributed Systems', 'Redis'],
    secondarySkills: ['PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'CI/CD'],
    estimatedYearsExperience: 9,
    targetCompanyTier: ['Google', 'Meta', 'Amazon', 'Uber', 'ServiceNow', 'Salesforce'],
    preferredLocations: ['San Francisco, CA', 'Remote', 'New York, NY', 'Seattle, WA'],
  },
};
