/**
 * @jest-environment node
 */

import { evaluateResumeHeuristically, sanitizeBulletText } from '@/lib/jobs/xyz-evaluator';
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
    it('evaluates a fresher resume with 0 experience without forcing L4 or L5 senior titles', () => {
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

      expect(result.detectedSeniority).toBe('Entry-Level / Fresher (L3)');
      expect(result.targetRole).toBe('Junior Frontend Engineer');
      expect(result.detectedSeniority).not.toContain('L4');
      expect(result.detectedSeniority).not.toContain('L5');
      expect(result.targetRole).not.toContain('Senior');
      expect(result.targetRole).not.toContain('Staff');
    });

    it('derives seniority and title from latest role when candidate has an internship', () => {
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

      expect(result.detectedSeniority).toBe('Engineering Intern (L1)');
      expect(result.targetRole).toBe('Software Engineer Intern');
      expect(result.detectedSeniority).not.toContain('L5');
      expect(result.targetRole).not.toContain('Senior');
    });

    it('derives seniority and title for an Associate Software Engineer', () => {
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
            roleTitle: 'Associate Software Engineer',
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

      expect(result.detectedSeniority).toBe('Associate Software Engineer (L3)');
      expect(result.targetRole).toBe('Associate Software Engineer');
      expect(result.detectedSeniority).not.toContain('L5');
    });

    it('derives seniority and exact title for a Senior Engineer', () => {
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
            startDate: '2020',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Architected distributed Kafka pipeline streaming 500k events/sec.'],
          },
        ],
        projects: [],
        education: [],
      };

      const result = evaluateResumeHeuristically(seniorResume as any);

      expect(result.detectedSeniority).toBe('Senior Software Engineer (L5)');
      expect(result.targetRole).toBe('Senior Backend Engineer');
    });
  });
});
