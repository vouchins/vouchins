/**
 * @jest-environment node
 */

import { evaluateResumeHeuristically, sanitizeBulletText, parseRawTextToDocument } from '@/lib/jobs/xyz-evaluator';
import { SAMPLE_STAFF_RESUME } from '@/components/jobs/sample-resumes';
import { computeResumeContentHash } from '@/lib/jobs/cost-guard';

describe('Deterministic ATS Resume Evaluator & Hash Guard', () => {
  it('evaluates sample resume deterministically without score fluctuation', () => {
    const eval1 = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);
    const eval2 = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);

    expect(eval1.overallScore).toBe(eval2.overallScore);
    expect(eval1.pillarScores).toEqual(eval2.pillarScores);
    expect(eval1.overallScore).toBeGreaterThanOrEqual(75);
    expect(eval1.overallScore).toBeLessThanOrEqual(95);
  });

  it('increases impact score when Google XYZ suggestions are applied', () => {
    const before = evaluateResumeHeuristically(SAMPLE_STAFF_RESUME);

    // Apply suggestion to replace weak bullet with metric-rich XYZ bullet
    const updatedResume = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    updatedResume.experience[0].bullets[2] =
      'Spearheaded automated CI/CD and developer tooling initiatives across 45+ engineers, cutting average pull request build cycle times from 28 minutes to 6 minutes (78% acceleration).';

    const after = evaluateResumeHeuristically(updatedResume);

    expect(after.pillarScores.impact).toBeGreaterThan(before.pillarScores.impact);
    expect(after.overallScore).toBeGreaterThanOrEqual(before.overallScore);
  });

  it('computes identical content hashes for unchanged resume structures', () => {
    const hash1 = computeResumeContentHash(SAMPLE_STAFF_RESUME);
    const cloned = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    const hash2 = computeResumeContentHash(cloned);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // Valid sha256 hex
  });

  it('detects document modifications and yields a different content hash', () => {
    const originalHash = computeResumeContentHash(SAMPLE_STAFF_RESUME);
    const modifiedResume = JSON.parse(JSON.stringify(SAMPLE_STAFF_RESUME));
    modifiedResume.experience[0].bullets[0] = 'Different bullet text without metrics.';

    const newHash = computeResumeContentHash(modifiedResume);
    expect(newHash).not.toBe(originalHash);
  });

  it('heals broken word hyphenation artifacts like ori-ented and distrib-uted', () => {
    const rawWithBrokenWords = sanitizeBulletText('Architected results-ori-ented microservices with distrib- uted caching.');
    expect(rawWithBrokenWords).toContain('results-oriented');
    expect(rawWithBrokenWords).toContain('distributed');
    expect(rawWithBrokenWords).not.toContain('ori-ented');
    expect(rawWithBrokenWords).not.toContain('distrib- uted');
  });

  it('preserves legitimate compound words like real-time and full-stack', () => {
    const text = sanitizeBulletText('Engineered real-time full-stack distributed systems.');
    expect(text).toContain('real-time');
    expect(text).toContain('full-stack');
  });

  describe('Dynamic Seniority and Latest Work Title Derivation', () => {
    it('evaluates a fresher resume with 0 experience as Associate Software Engineer (L1)', () => {
      const fresherResume = {
        contact: {
          fullName: 'Alice Student',
          email: 'alice@example.com',
          location: 'Hyderabad, India',
        },
        summary: 'Aspiring software engineer passionate about web development, React, and data structures.',
        skills: [
          { category: 'Frontend', items: ['React', 'JavaScript', 'HTML', 'CSS'] },
          { category: 'Backend', items: ['Node.js', 'Express', 'PostgreSQL'] },
        ],
        experience: [],
        projects: [
          {
            title: 'Campus Event Portal',
            techStack: ['React', 'Node.js', 'PostgreSQL'],
            bullets: ['Built a portal for student registrations, serving 500+ attendees.'],
          },
        ],
        education: [
          { degree: 'B.Tech in Computer Science', institution: 'JNTU Hyderabad', year: '2024' },
        ],
      };

      const result = evaluateResumeHeuristically(fresherResume as any);

      expect(result.detectedSeniority).toBe('Associate Software Engineer (L1)');
      expect(result.targetRole).toBe('Junior Frontend Engineer');
      expect(result.detectedSeniority).not.toContain('L2');
      expect(result.detectedSeniority).not.toContain('L3');
      expect(result.targetRole).not.toContain('Senior');
      expect(result.targetRole).not.toContain('Staff');
    });

    it('evaluates an interning student as Engineering Intern (L0)', () => {
      const internResume = {
        contact: {
          fullName: 'Bob Intern',
          email: 'bob@example.com',
          location: 'Bengaluru, India',
        },
        summary: 'Computer Science graduate with internship experience at tech startups.',
        skills: [{ category: 'Core', items: ['Python', 'Django', 'TypeScript'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Tech Innovations',
            roleTitle: 'Software Engineer Intern',
            startDate: 'Jan 2024',
            endDate: 'Jun 2024',
            isCurrent: false,
            bullets: ['Assisted in building REST APIs using Django and PostgreSQL.'],
          },
          {
            id: 'exp-2',
            company: 'Web Solutions',
            roleTitle: 'Frontend Intern',
            startDate: 'Jun 2023',
            endDate: 'Dec 2023',
            isCurrent: false,
            bullets: ['Constructed user interface components with TypeScript and React.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(internResume as any);

      expect(result.detectedSeniority).toBe('Engineering Intern (L0)');
      expect(result.targetRole).toBe('Software Engineer Intern');
    });

    it('derives L1 for an Associate Software Engineer / SDE-1', () => {
      const associateResume = {
        contact: {
          fullName: 'Charlie Dev',
          email: 'charlie@example.com',
          location: 'Pune, India',
        },
        summary: 'Associate engineer building backend services.',
        skills: [{ category: 'Backend', items: ['Java', 'Spring Boot', 'MySQL'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Cloud Corp',
            roleTitle: 'Graduate Engineer Trainee',
            startDate: '2023',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Developed Spring Boot microservices handling 10k requests daily.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(associateResume as any);

      expect(result.detectedSeniority).toBe('Associate Software Engineer (L1)');
      expect(result.targetRole).toBe('Graduate Engineer Trainee');
    });

    it('derives L2 for a Software Engineer / SDE-2 with 2-5 years experience', () => {
      const midResume = {
        contact: {
          fullName: 'Evan Developer',
          email: 'evan@example.com',
          location: 'Hyderabad, India',
        },
        summary: 'Full stack developer building production web applications.',
        skills: [{ category: 'Core', items: ['TypeScript', 'React', 'Node.js'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Nexus Tech',
            roleTitle: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Built full stack features serving 50k users.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(midResume as any);

      expect(result.detectedSeniority).toBe('Software Engineer (L2)');
      expect(result.targetRole).toBe('Software Engineer');
    });

    it('derives L3 for a Senior Software Engineer / Tech Lead with 5-9 years experience', () => {
      const seniorResume = {
        contact: {
          fullName: 'Diana Architect',
          email: 'diana@example.com',
          location: 'Hyderabad, India',
        },
        summary: 'Senior backend engineer with deep experience in distributed systems.',
        skills: [{ category: 'Core', items: ['Go', 'Kafka', 'PostgreSQL', 'Docker'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Scale Inc',
            roleTitle: 'Senior Backend Engineer',
            startDate: '2019',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Architected distributed Kafka pipeline streaming 500k events/sec.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(seniorResume as any);

      expect(result.detectedSeniority).toBe('Senior Software Engineer (L3)');
      expect(result.targetRole).toBe('Senior Backend Engineer');
    });

    it('derives L4 for a Staff Software Engineer / Lead Architect', () => {
      const staffResume = {
        contact: {
          fullName: 'Fiona Staff',
          email: 'fiona@example.com',
          location: 'Bengaluru, India',
        },
        summary: 'Staff engineer leading architectural governance.',
        skills: [{ category: 'Core', items: ['Java', 'Distributed Systems', 'Cloud'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Enterprise Core',
            roleTitle: 'Staff Software Engineer',
            startDate: '2015',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Led cross-functional migration to event-driven services.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(staffResume as any);

      expect(result.detectedSeniority).toBe('Staff Software Engineer (L4)');
      expect(result.targetRole).toBe('Staff Software Engineer');
    });

    it('derives L5+ for a Principal Engineer with 13+ years experience', () => {
      const principalResume = {
        contact: {
          fullName: 'George Principal',
          email: 'george@example.com',
          location: 'San Francisco, CA',
        },
        summary: 'Principal engineer directing distributed platforms.',
        skills: [{ category: 'Core', items: ['Distributed Systems', 'Cloud Infrastructure'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Global Cloud Systems',
            roleTitle: 'Principal Engineer',
            startDate: '2010',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Directed multi-region cloud infrastructure strategy.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(principalResume as any);

      expect(result.detectedSeniority).toBe('Principal Engineer (L5+)');
      expect(result.targetRole).toBe('Principal Engineer');
    });
  });

  describe('Comprehensive Multi-Bullet Suggestions Coverage', () => {
    it('generates suggestions across multiple roles and bullets without premature cutoff', () => {
      const multiRoleResume = {
        contact: {
          fullName: 'Jane Developer',
          email: 'jane@example.com',
          location: 'Hyderabad, India',
        },
        summary: 'Full stack developer building web and cloud applications.',
        skills: [{ category: 'Core', items: ['React', 'Node.js', 'PostgreSQL', 'AWS'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Tech Corp A',
            roleTitle: 'Software Engineer',
            startDate: '2023',
            endDate: 'Present',
            isCurrent: true,
            bullets: [
              'Worked on customer checkout flow and payment gateway integrations.',
              'Assisted senior team members in refactoring backend GraphQL queries.',
              'Responsible for maintaining unit tests and code coverage across modules.',
            ],
          },
          {
            id: 'exp-2',
            company: 'Tech Corp B',
            roleTitle: 'Associate Software Engineer',
            startDate: '2021',
            endDate: '2023',
            isCurrent: false,
            bullets: [
              'Helped implement authentication flow using JWT and OAuth2.',
              'Contributed to the frontend redesign of dashboard analytics tables.',
              'Wrote database migration scripts for PostgreSQL customer records.',
            ],
          },
        ],
        projects: [],
        education: [],
      };

      const evaluation = evaluateResumeHeuristically(multiRoleResume as any);

      // Verify that suggestions cover multiple bullets across both roles
      expect(evaluation.suggestions.length).toBeGreaterThanOrEqual(6);

      // Verify each suggestion has valid coordinates and non-empty rewrites
      const coords = new Set<string>();
      evaluation.suggestions.forEach((sug) => {
        const coordKey = `${sug.roleIndex}-${sug.bulletIndex}`;
        expect(coords.has(coordKey)).toBe(false); // No duplicate suggestions for the same bullet
        coords.add(coordKey);

        expect(sug.suggestedRewrite).toBeDefined();
        expect(sug.suggestedRewrite.length).toBeGreaterThan(10);
        expect(sug.originalText).toBeDefined();
      });
    });
  });

  describe('Healthcare & Clinical Resume Domain Awareness', () => {
    const clinicalResume = {
      contact: {
        fullName: 'Ummu Farwah',
        email: 'ummu@example.com',
        phone: '1234567890',
        location: 'Hyderabad, India',
        linkedinUrl: 'https://linkedin.com/in/ummu-farwah',
      },
      summary: 'Licensed Clinical Pharmacist (Pharm-D) with expertise in Drug Regulatory Affairs, Pharmacovigilance, and Clinical Documentation.',
      skills: [
        {
          category: 'Core Skills',
          items: [
            'Regulatory Affairs',
            'Drug Safety & Pharmacovigilance Awareness',
            'Regulatory Documentation Support',
            'Compliance Review',
            'Clinical Pharmacology',
            'Pharmacokinetics',
            'Pharmacodynamics',
            'Medication Therapy Management',
            'Drug Interaction Evaluation',
          ],
        },
      ],
      experience: [
        {
          id: 'exp-1',
          company: 'Tuffah Hospital',
          roleTitle: 'Clinical Pharmacist',
          startDate: '2023',
          endDate: '2025',
          isCurrent: false,
          bullets: [
            'Worked alongside clinical pharmacists and healthcare professionals to understand evidence-based treatment approaches.',
            'Educated patients on appropriate medication administration, treatment adherence, possible side effects, and precautions.',
            'clinical research-related activities, including reviewing medical information, collecting relevant data, and supporting the analysis of treatment outcomes.',
            'Strengthened understanding of drug safety principles, therapeutic monitoring, and the importance of accurate clinical documentation.',
            'Applied foundational knowledge of pharmacology and therapeutics to support clinical assessments.',
          ],
        },
      ],
      education: [
        { degree: 'Doctor of Pharmacy (Pharm-D)', institution: 'MESCO College of Pharmacy', endDate: '2023' },
      ],
      projects: [],
      certifications: [],
    };

    it('accurately identifies domain as healthcare and detectedSeniority as Clinical Pharmacist (L2)', () => {
      const result = evaluateResumeHeuristically(clinicalResume as any);

      expect(result.detectedSeniority).toBe('Clinical Pharmacist (L2)');
      expect(result.detectedSeniority).not.toContain('Software');
      expect(result.detectedSeniority).not.toContain('Engineer');
      expect(result.targetRole).toBe('Clinical Pharmacist');
    });

    it('evaluates healthcare relevance score with domain taxonomy instead of penalizing for tech stack', () => {
      const result = evaluateResumeHeuristically(clinicalResume as any);

      // Candidate has 9+ relevant clinical/pharmacology skills, should score high in relevance
      expect(result.pillarScores.relevance).toBeGreaterThanOrEqual(70);
    });

    it('generates clinical and regulatory metrics and never generates software tech metrics', () => {
      const result = evaluateResumeHeuristically(clinicalResume as any);

      expect(result.suggestions.length).toBeGreaterThan(0);
      result.suggestions.forEach((sug) => {
        // Must NOT suggest mobile app store ratings, query compute latency, or production workloads
        expect(sug.suggestedRewrite).not.toContain('mobile users');
        expect(sug.suggestedRewrite).not.toContain('app store rating');
        expect(sug.suggestedRewrite).not.toContain('query compute latency');
        expect(sug.suggestedRewrite).not.toContain('production workloads');
        expect(sug.suggestedRewrite).not.toContain('API response latency');

        // Rationales must NOT reference engineering bars like Google, Meta, Uber
        expect(sug.rationale).not.toContain('engineering bars (Google, Meta, Uber)');
      });
    });

    it('extracts LeetCode URLs in parseRawTextToDocument', () => {
      const rawText = `
Jane Doe
jane@example.com
+1 555-123-4567
San Francisco, CA
https://linkedin.com/in/janedoe
https://github.com/janedoe
https://leetcode.com/u/janedoe

PROFESSIONAL SUMMARY
Experienced Software Engineer.
`;
      const doc = parseRawTextToDocument(rawText);
      expect(doc.contact.leetcodeUrl).toBe('https://leetcode.com/u/janedoe');
      expect(doc.contact.linkedinUrl).toBe('https://linkedin.com/in/janedoe');
      expect(doc.contact.githubUrl).toBe('https://github.com/janedoe');
    });

    it('cleanses contaminated tech metric fragments from clinical bullets', () => {
      const dirtyBullet1 =
        'Educated patients on appropriate medication administration, treatment adherence, possible side effects, and precautions associated with prescribed therapies, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating.';
      const cleaned1 = sanitizeBulletText(dirtyBullet1, 'healthcare');
      expect(cleaned1).not.toContain('mobile users');
      expect(cleaned1).not.toContain('app store rating');
      expect(cleaned1).toBe(
        'Educated patients on appropriate medication administration, treatment adherence, possible side effects, and precautions associated with prescribed therapies.'
      );

      const dirtyBullet2 =
        'Strengthened understanding of drug safety principles, therapeutic monitoring, and the importance of accurate clinical documentation in supporting safe pharmaceutical practices, improving system delivery efficiency by 30% across production workloads.';
      const cleaned2 = sanitizeBulletText(dirtyBullet2, 'healthcare');
      expect(cleaned2).not.toContain('production workloads');
      expect(cleaned2).not.toContain('delivery efficiency');
      expect(cleaned2).toBe(
        'Strengthened understanding of drug safety principles, therapeutic monitoring, and the importance of accurate clinical documentation in supporting safe pharmaceutical practices.'
      );
    });

    it('protects healthcare candidates from tech seniority hallucination even if bullets contain workloads or system', () => {
      const resumeWithDirtyBullets = {
        ...clinicalResume,
        experience: [
          {
            ...clinicalResume.experience[0],
            bullets: [
              'Strengthened understanding of drug safety principles, improving system delivery efficiency by 30% across production workloads.',
              'Educated patients on medication administration, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating.',
            ],
          },
        ],
      };

      const result = evaluateResumeHeuristically(resumeWithDirtyBullets as any);
      expect(result.detectedSeniority).toBe('Clinical Pharmacist (L2)');
      expect(result.targetRole).toBe('Clinical Pharmacist');
      expect(result.detectedSeniority).not.toContain('Software');
    });
  });
});
