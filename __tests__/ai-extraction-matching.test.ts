/** @jest-environment node */
import { deriveCandidateProfileFromDoc } from '@/lib/jobs/ai-client';
import { extractJobMetadataDeterministic } from '@/lib/jobs/job-ai-extractor';
import { evaluateJobMatch } from '@/lib/jobs/ats-client';
import { estimatePageFitSummary } from '@/lib/jobs/pagination';
import type { ResumeDocument } from '@/lib/jobs/types';

describe('AI Extraction & Deterministic Matching Pipeline', () => {
  const sampleResume: ResumeDocument = {
    contact: {
      fullName: 'Sreehul R',
      email: 'sreehul@example.com',
      phone: '+91 9999999999',
      location: 'Bengaluru, India',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
    },
    summary: 'Senior Full Stack Engineer with 6+ years of experience building scalable Next.js and PostgreSQL platforms.',
    skills: [
      { category: 'Languages & Frameworks', items: ['TypeScript', 'React', 'Next.js', 'Node.js'] },
      { category: 'Cloud & Data', items: ['AWS', 'PostgreSQL', 'Docker', 'Kubernetes'] },
    ],
    experience: [
      {
        id: 'exp-1',
        company: 'FinTech Labs',
        roleTitle: 'Senior Software Engineer',
        startDate: 'Jan 2022',
        endDate: 'Present',
        isCurrent: true,
        location: 'Bengaluru',
        bullets: [
          'Architected Next.js and PostgreSQL microservices handling 50k requests per minute.',
          'Deployed containerized workloads on AWS EKS with Docker and Kubernetes.',
        ],
      },
      {
        id: 'exp-2',
        company: 'CloudScale Systems',
        roleTitle: 'Software Engineer',
        startDate: 'Jun 2019',
        endDate: 'Dec 2021',
        isCurrent: false,
        location: 'Hyderabad',
        bullets: [
          'Built React dashboards and Node.js REST APIs for enterprise billing.',
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'NIT Karnataka',
        degree: 'B.Tech in Computer Science',
        endDate: 'May 2019',
      },
    ],
    projects: [],
    certifications: ['AWS Certified Solutions Architect'],
  };

  it('derives structured CandidateExtractedProfile from ResumeDocument', () => {
    const profile = deriveCandidateProfileFromDoc(sampleResume);

    expect(profile.fullName).toBe('Sreehul R');
    expect(profile.location).toBe('Bengaluru, India');
    expect(profile.currentJobTitle).toBe('Senior Software Engineer');
    expect(profile.currentCompany).toBe('FinTech Labs');
    expect(profile.seniorityLevel).toBe('Senior');
    expect(profile.totalYearsExperience).toBeGreaterThanOrEqual(4);
    expect(profile.skills).toEqual(expect.arrayContaining(['TypeScript', 'React', 'Next.js']));
    expect(profile.highestEducationLevel).toBe('B.Tech in Computer Science');
    expect(profile.certifications).toContain('AWS Certified Solutions Architect');
  });

  it('extracts structured JobExtractedMetadata deterministically from job description', () => {
    const meta = extractJobMetadataDeterministic({
      title: 'Senior Full Stack Engineer',
      company_name: 'Razorpay',
      location: 'Bengaluru, India (Hybrid)',
      job_type: 'Full-time',
      description:
        "We are looking for a Senior Full Stack Engineer with 5+ years of experience in TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, and Kubernetes. Bachelor's degree required. AWS Certified preferred.",
    });

    expect(meta.normalizedTitle).toBe('Senior Full Stack Engineer');
    expect(meta.companyName).toBe('Razorpay');
    expect(meta.minYearsExperience).toBe(5);
    expect(meta.seniority).toBe('Senior');
    expect(meta.workType).toBe('Hybrid');
    expect(meta.requiredSkills).toEqual(expect.arrayContaining(['TypeScript', 'React', 'Next.js', 'PostgreSQL']));
    expect(meta.toolsAndPlatforms).toEqual(expect.arrayContaining(['Docker', 'Kubernetes']));
    expect(meta.educationRequirement).toBe("Bachelor's degree");
    expect(meta.preferredCertifications).toContain('AWS Certified');
  });

  it('boosts match score when candidate extractedProfile aligns with job aiExtractedMetadata', () => {
    const profile = deriveCandidateProfileFromDoc(sampleResume);
    profile.totalYearsExperience = 6;
    profile.workTypePreference = 'Hybrid';
    profile.toolsAndPlatforms = ['Docker', 'Kubernetes', 'PostgreSQL'];

    const jobMeta = extractJobMetadataDeterministic({
      title: 'Senior Full Stack Engineer',
      company_name: 'Razorpay',
      location: 'Bengaluru, India (Hybrid)',
      description: 'Need 5+ years of experience with TypeScript, React, Next.js, PostgreSQL, Docker, Kubernetes.',
    });

    const res = evaluateJobMatch(
      {
        title: 'Senior Full Stack Engineer',
        companyName: 'Razorpay',
        location: 'Bengaluru, India',
        workplaceType: 'Hybrid',
        experienceLevel: 'Senior',
        aiExtractedMetadata: jobMeta,
      },
      profile.skills,
      'Senior',
      'Bengaluru',
      {
        currentRole: profile.currentJobTitle,
        currentCompany: profile.currentCompany,
        isStillWorking: true,
        extractedProfile: profile,
      }
    );

    expect(res.matchScore).toBeGreaterThanOrEqual(90);
    expect(res.matchingSkills).toEqual(expect.arrayContaining(['TypeScript', 'React', 'Next.js']));
  });

  it('computes PageFitSummary for 1-page and overflowing resumes', () => {
    const onePageSummary = estimatePageFitSummary(sampleResume, 'LETTER');
    expect(onePageSummary.totalPages).toBe(1);
    expect(onePageSummary.status).toBe('fits');
    expect(onePageSummary.pageOneFillPercent).toBeGreaterThan(15);

    const longResume: ResumeDocument = {
      ...sampleResume,
      experience: Array.from({ length: 10 }, (_, idx) => ({
        id: `exp-long-${idx}`,
        company: `Company ${idx + 1}`,
        roleTitle: `Senior Engineer ${idx + 1}`,
        startDate: 'Jan 2020',
        endDate: 'Dec 2022',
        isCurrent: false,
        bullets: [
          'Led architecture and implementation of distributed cloud services processing millions of daily events across multiple global regions with strict SLA guarantees.',
          'Mentored cross-functional engineering squads and improved CI/CD deployment velocity across multiple teams by automating end-to-end integration test pipelines.',
          'Optimized database queries and caching layers to cut p99 API latency by 45 percent while reducing cloud infrastructure spend by 30 percent year-over-year.',
          'Collaborated with product, security, and design leadership to deliver compliant enterprise workflows serving thousands of concurrent active customers.',
        ],
      })),
    };

    const overflowSummary = estimatePageFitSummary(longResume, 'LETTER');
    expect(overflowSummary.totalPages).toBeGreaterThan(1);
    expect(['tight-overflow', 'multi-page']).toContain(overflowSummary.status);
  });
});
