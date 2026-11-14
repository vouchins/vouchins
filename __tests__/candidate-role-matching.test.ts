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
  });
});

