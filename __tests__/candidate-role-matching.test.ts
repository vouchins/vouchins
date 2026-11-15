/**
 * @jest-environment node
 */

import {
  evaluateJobMatch,
  detectRoleDomain,
  isSameCompany,
  isRoleRelevant,
} from '@/lib/jobs/ats-client';
import { GET } from '@/app/api/jobs/route';

describe('Candidate Current/Last Role and Company Context Job Matching', () => {
  describe('detectRoleDomain', () => {
    it('accurately classifies roles across major tech engineering and product domains', () => {
      // Frontend
      expect(detectRoleDomain('Senior Frontend Engineer')).toBe('frontend');
      expect(detectRoleDomain('Staff UI Developer')).toBe('frontend');
      expect(detectRoleDomain('React Developer')).toBe('frontend');
      expect(detectRoleDomain('Web Developer')).toBe('frontend');

      // Backend
      expect(detectRoleDomain('Lead Backend Engineer')).toBe('backend');
      expect(detectRoleDomain('Java Developer')).toBe('backend');
      expect(detectRoleDomain('Golang Developer')).toBe('backend');
      expect(detectRoleDomain('Microservices Architect')).toBe('backend');

      // Full Stack
      expect(detectRoleDomain('Software Engineer')).toBe('fullstack');
      expect(detectRoleDomain('Full Stack Developer')).toBe('fullstack');
      expect(detectRoleDomain('SDE II')).toBe('fullstack');

      // DevOps & SRE
      expect(detectRoleDomain('DevOps Engineer')).toBe('devops_sre');
      expect(detectRoleDomain('Site Reliability Engineer')).toBe('devops_sre');
      expect(detectRoleDomain('Cloud Platform Architect')).toBe('devops_sre');

      // Data & AI
      expect(detectRoleDomain('Data Engineer')).toBe('data_ai');
      expect(detectRoleDomain('Machine Learning Engineer')).toBe('data_ai');
      expect(detectRoleDomain('Senior Data Scientist')).toBe('data_ai');

      // Mobile
      expect(detectRoleDomain('iOS Developer')).toBe('mobile');
      expect(detectRoleDomain('Android Engineer')).toBe('mobile');
      expect(detectRoleDomain('React Native Engineer')).toBe('mobile');

      // QA & SDET
      expect(detectRoleDomain('SDET II')).toBe('qa_sdet');
      expect(detectRoleDomain('QA Automation Engineer')).toBe('qa_sdet');

      // Product & Design
      expect(detectRoleDomain('Product Manager')).toBe('product');
      expect(detectRoleDomain('Technical Product Manager')).toBe('product');
      expect(detectRoleDomain('Product Designer')).toBe('design');
      expect(detectRoleDomain('UI/UX Designer')).toBe('design');

      // Management & Security
      expect(detectRoleDomain('Engineering Manager')).toBe('management');
      expect(detectRoleDomain('Director of Engineering')).toBe('management');
      expect(detectRoleDomain('Security Engineer')).toBe('security');
      expect(detectRoleDomain('Cybersecurity Analyst')).toBe('security');
    });
  });

  describe('isSameCompany', () => {
    it('accurately normalizes company suffixes and verifies company equivalence', () => {
      expect(isSameCompany('Google LLC', 'Google')).toBe(true);
      expect(isSameCompany('Amazon Web Services', 'Amazon')).toBe(true);
      expect(isSameCompany('Microsoft Corporation', 'Microsoft')).toBe(true);
      expect(isSameCompany('Swiggy', 'Swiggy')).toBe(true);
      expect(isSameCompany('Swiggy Ltd', 'Swiggy')).toBe(true);
      expect(isSameCompany('Uber Technologies', 'Uber')).toBe(true);
      expect(isSameCompany('Oracle', 'Apple')).toBe(false);
      expect(isSameCompany('', 'Google')).toBe(false);
      expect(isSameCompany(undefined, 'Google')).toBe(false);
    });
  });

  describe('evaluateJobMatch with Candidate Context', () => {
    const sampleFrontendJob = {
      title: 'Senior Frontend Engineer (React/TypeScript)',
      description: 'Looking for a Senior Frontend Engineer to build web apps with React and TypeScript.',
      requirements: 'Experience with React, TypeScript, and modern state management.',
      experienceLevel: 'Senior',
      location: 'Bengaluru, India',
      companyName: 'Razorpay',
    };

    it('boosts match score and tailors copy for currently employed candidate in matching role', () => {
      const match = evaluateJobMatch(
        sampleFrontendJob,
        ['React', 'TypeScript', 'Next.js'],
        'Senior',
        'Bengaluru',
        {
          currentRole: 'Senior Frontend Engineer',
          currentCompany: 'Swiggy',
          isStillWorking: true,
        }
      );

      expect(match.matchScore).toBeGreaterThanOrEqual(90);
      expect(match.isRecommended).toBe(true);
      expect(match.matchBreakdown.experienceScore).toBeGreaterThanOrEqual(82);
      expect(match.whyYouMatch).toContain(
        'Directly aligns with your current role as Senior Frontend Engineer at Swiggy.'
      );
      expect(match.whyYouMatch).toContain('Strong match for your skills in React and TypeScript at Razorpay.');
      expect(match.tailoredBulletSuggestion.original).toContain('as Senior Frontend Engineer');
    });

    it('tailors copy for former / last company experience when candidate is not currently working there', () => {
      const match = evaluateJobMatch(
        sampleFrontendJob,
        ['React', 'TypeScript'],
        'Senior',
        'Bengaluru',
        {
          currentRole: 'Senior Frontend Engineer',
          currentCompany: 'Swiggy',
          isStillWorking: false,
        }
      );

      expect(match.matchScore).toBeGreaterThanOrEqual(90);
      expect(match.whyYouMatch).toContain(
        'Builds on your background as Senior Frontend Engineer at Swiggy.'
      );
      expect(match.whyYouMatch).toContain('Strong match for your skills in React and TypeScript at Razorpay.');
    });

    it('detects Internal Mobility when candidate currently works at the hiring company', () => {
      const googleJob = {
        title: 'Staff Software Engineer',
        description: 'Lead large scale distributed systems engineering.',
        requirements: 'Experience with Go, Java, and Distributed Systems.',
        experienceLevel: 'Staff',
        location: 'Hyderabad, India',
        companyName: 'Google',
      };

      const match = evaluateJobMatch(
        googleJob,
        ['Go', 'Distributed Systems', 'Kubernetes'],
        'Staff',
        'Hyderabad',
        {
          currentRole: 'Senior Software Engineer',
          currentCompany: 'Google LLC',
          isStillWorking: true,
        }
      );

      expect(match.matchScore).toBeGreaterThanOrEqual(90);
      expect(match.whyYouMatch).toContain('Internal mobility opportunity at your current company (Google)');
      expect(match.whyYouMatch).toContain('matching your background as Senior Software Engineer');
      expect(match.isRecommended).toBe(true);
    });

    it('detects Alumni / Boomerang match when candidate previously worked at the hiring company', () => {
      const googleJob = {
        title: 'Senior Software Engineer',
        description: 'Build backend microservices.',
        requirements: 'Experience with Java and Go.',
        experienceLevel: 'Senior',
        location: 'Hyderabad, India',
        companyName: 'Google',
      };

      const match = evaluateJobMatch(
        googleJob,
        ['Java', 'Go'],
        'Senior',
        'Hyderabad',
        {
          currentRole: 'Software Engineer',
          currentCompany: 'Google',
          isStillWorking: false,
        }
      );

      expect(match.whyYouMatch).toContain('Alumni opportunity at your former company (Google)');
      expect(match.whyYouMatch).toContain('matching your experience as Software Engineer');
    });

    it('penalizes severe cross-domain mismatches (e.g. Product Manager vs iOS Developer)', () => {
      const iosJob = {
        title: 'Senior iOS Developer (Swift)',
        description: 'Develop iOS apps using Swift and SwiftUI.',
        requirements: '5+ years building iOS applications in Swift.',
        experienceLevel: 'Senior',
        location: 'Bengaluru, India',
        companyName: 'Flipkart',
      };

      const match = evaluateJobMatch(
        iosJob,
        ['Swift', 'iOS'],
        'Senior',
        'Bengaluru',
        {
          currentRole: 'Product Manager',
          currentCompany: 'Paytm',
          isStillWorking: true,
        }
      );

      // Score should be reduced due to severe role domain mismatch
      expect(match.isRecommended).toBe(false);
      expect(match.matchBreakdown.experienceScore).toBeLessThanOrEqual(68);
      expect(match.whyYouMatch).toContain('Note: Role focuses on Senior iOS Developer (Swift), which differs from your background as Product Manager at Paytm.');
    });

    it('handles candidate context without current company gracefully', () => {
      const match = evaluateJobMatch(
        sampleFrontendJob,
        ['React', 'TypeScript'],
        'Senior',
        'Bengaluru',
        {
          currentRole: 'Frontend Developer',
          isStillWorking: true,
        }
      );

      expect(match.whyYouMatch).toContain('Directly aligns with your current role as Frontend Developer.');
      expect(match.whyYouMatch).not.toContain('at undefined');
    });
  });

  describe('GET /api/jobs Integration with Candidate Role Context', () => {
    it('returns candidate context in candidateProfile response', async () => {
      const req = new Request(
        'http://localhost:3000/api/jobs?limit=10&location=Hyderabad&current_role=Frontend+Engineer&current_company=Swiggy&is_working=true&skills=React,TypeScript'
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidateProfile).toBeTruthy();
      expect(data.candidateProfile.currentRole).toBe('Frontend Engineer');
      expect(data.candidateProfile.currentCompany).toBe('Swiggy');
      expect(data.candidateProfile.isStillWorking).toBe(true);

      // Verify that jobs contain why_you_match mentioning the role
      if (data.jobs && data.jobs.length > 0) {
        const topJob = data.jobs[0];
        expect(topJob.why_you_match).toBeTruthy();
      }
    });

    it('honors past / last company when is_working is false in query params', async () => {
      const req = new Request(
        'http://localhost:3000/api/jobs?limit=10&location=Hyderabad&current_role=Software+Engineer&current_company=Microsoft&is_working=false&skills=Java,Spring'
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.candidateProfile.currentRole).toBe('Software Engineer');
      expect(data.candidateProfile.currentCompany).toBe('Microsoft');
      expect(data.candidateProfile.isStillWorking).toBe(false);
    });

    it('returns jobs with unified ranking where profile-matched roles are prioritized and ordered recently posted first', async () => {
      const req = new Request(
        'http://localhost:3000/api/jobs?limit=15&location=Hyderabad&current_role=Frontend+Engineer&skills=React,TypeScript'
      );

      const res = await GET(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.jobs.length).toBeGreaterThan(0);

      // Verify that all top results have strong match scores (Tier 1: >= 84)
      const topJobs = data.jobs.slice(0, 3);
      for (const job of topJobs) {
        expect(job.match_score).toBeGreaterThanOrEqual(84);
      }

      // Verify that within the top tier, newer or equal timestamps precede older ones
      for (let i = 0; i < topJobs.length - 1; i++) {
        const timeCurr = new Date(topJobs[i].created_at).getTime();
        const timeNext = new Date(topJobs[i + 1].created_at).getTime();
        const diff = timeCurr - timeNext;
        // Current job should be newer than or equal to next job, or within the same 1h window with higher score
        if (Math.abs(diff) > 3600 * 1000) {
          expect(timeCurr).toBeGreaterThanOrEqual(timeNext);
        }
      }
    });
  });

  describe('Unified Ranking Algorithm (Relevance Tiers & Recency Ordering)', () => {
    const getRelevanceTier = (job: any): number => {
      if (job.is_recommended || (job.match_score || 0) >= 84) return 1;
      if ((job.match_score || 0) >= 74) return 2;
      return 3;
    };

    const sortUnified = (jobs: any[]) => {
      return [...jobs].sort((a, b) => {
        const tierA = getRelevanceTier(a);
        const tierB = getRelevanceTier(b);
        if (tierA !== tierB) return tierA - tierB;

        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        const timeDiff = timeB - timeA;
        if (Math.abs(timeDiff) > 3600 * 1000) return timeDiff;

        const scoreDiff = (b.match_score || 0) - (a.match_score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return timeDiff;
      });
    };

    it('prioritizes profile-relevant roles (Tier 1) over recently posted mismatched roles (Tier 3)', () => {
      const now = Date.now();
      const relevantJobOld = {
        id: 'rel-1',
        title: 'Senior Frontend Developer',
        match_score: 92,
        is_recommended: true,
        created_at: new Date(now - 2 * 86400000).toISOString(), // 2 days ago
      };
      const relevantJobNew = {
        id: 'rel-2',
        title: 'React Engineer',
        match_score: 90,
        is_recommended: true,
        created_at: new Date(now - 3 * 3600000).toISOString(), // 3 hours ago
      };
      const unrelatedJobBrandNew = {
        id: 'unrel-3',
        title: 'Accounting Manager',
        match_score: 55,
        is_recommended: false,
        created_at: new Date(now - 5 * 60000).toISOString(), // 5 minutes ago
      };

      const sorted = sortUnified([relevantJobOld, unrelatedJobBrandNew, relevantJobNew]);

      // Newer relevant job comes first
      expect(sorted[0].id).toBe('rel-2');
      // Older relevant job comes second
      expect(sorted[1].id).toBe('rel-1');
      // Unrelated brand new job comes last because it is Tier 3
      expect(sorted[2].id).toBe('unrel-3');
    });

    it('orders jobs in the same relevance tier with recently posted first', () => {
      const now = Date.now();
      const job1DayAgo = {
        id: 'tier1-yesterday',
        match_score: 89,
        is_recommended: true,
        created_at: new Date(now - 24 * 3600000).toISOString(),
      };
      const job2HoursAgo = {
        id: 'tier1-2h',
        match_score: 88,
        is_recommended: true,
        created_at: new Date(now - 2 * 3600000).toISOString(),
      };
      const job3DaysAgo = {
        id: 'tier1-3d',
        match_score: 95,
        is_recommended: true,
        created_at: new Date(now - 72 * 3600000).toISOString(),
      };

      const sorted = sortUnified([job3DaysAgo, job1DayAgo, job2HoursAgo]);

      expect(sorted[0].id).toBe('tier1-2h');
      expect(sorted[1].id).toBe('tier1-yesterday');
      expect(sorted[2].id).toBe('tier1-3d');
    });

    it('breaks ties using match score when jobs are posted within the same hour window', () => {
      const now = Date.now();
      const job10MinScore88 = {
        id: 'job-88',
        match_score: 88,
        is_recommended: true,
        created_at: new Date(now - 10 * 60000).toISOString(),
      };
      const job15MinScore96 = {
        id: 'job-96',
        match_score: 96,
        is_recommended: true,
        created_at: new Date(now - 15 * 60000).toISOString(),
      };

      const sorted = sortUnified([job10MinScore88, job15MinScore96]);

      // Within the same hour window, higher match score (96 vs 88) wins
      expect(sorted[0].id).toBe('job-96');
      expect(sorted[1].id).toBe('job-88');
    });
  });
});

