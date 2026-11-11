/**
 * @jest-environment node
 */

import {
  containsSkill,
  SKILL_SYNONYMS,
  isSeniorityCompatible,
  evaluateJobMatch,
  detectWorkMode,
  isLocationMatch,
} from '@/lib/jobs/ats-client';
import { buildPostgrestLocationFilter, GET } from '@/app/api/jobs/route';

describe('Resume to Database Job Matching Engine', () => {
  describe('Skill Synonyms & Precise Keyword Extraction', () => {
    it('matches skill synonyms bidirectionally', () => {
      const corpus1 = 'Looking for full-stack engineer with React.js, Node.js, and PostgreSQL expertise.';
      expect(containsSkill(corpus1, 'React')).toBe(true);
      expect(containsSkill(corpus1, 'ReactJS')).toBe(true);
      expect(containsSkill(corpus1, 'Node')).toBe(true);
      expect(containsSkill(corpus1, 'Postgres')).toBe(true);

      const corpus2 = 'Seeking backend developer skilled in K8s, AWS, and Spring Boot microservices.';
      expect(containsSkill(corpus2, 'Kubernetes')).toBe(true);
      expect(containsSkill(corpus2, 'Amazon Web Services')).toBe(true);
      expect(containsSkill(corpus2, 'Spring')).toBe(true);

      const corpus3 = 'Frontend role requiring TS, TailwindCSS, and NextJS.';
      expect(containsSkill(corpus3, 'TypeScript')).toBe(true);
      expect(containsSkill(corpus3, 'Tailwind')).toBe(true);
      expect(containsSkill(corpus3, 'Next.js')).toBe(true);
    });

    it('strictly avoids false positive matches', () => {
      const corpus = 'Maintain Google Cloud algorithms with JavaScript and squeal at bugs.';
      // "Go" must not match "Google" or "algorithms"
      expect(containsSkill(corpus, 'Go')).toBe(false);
      // "Java" must not match "JavaScript"
      expect(containsSkill(corpus, 'Java')).toBe(false);
      // "AI" must not match "Maintain"
      expect(containsSkill(corpus, 'AI')).toBe(false);
      // "SQL" must not match "squeal"
      expect(containsSkill(corpus, 'SQL')).toBe(false);
    });
  });

  describe('Seniority Compatibility', () => {
    it('accurately checks seniority compatibility tiers', () => {
      // Exact matches
      expect(isSeniorityCompatible('Senior', 'Senior')).toEqual({ compatible: true, isExact: true });
      expect(isSeniorityCompatible('Mid', 'mid')).toEqual({ compatible: true, isExact: true });

      // Compatible adjacent levels
      expect(isSeniorityCompatible('Senior', 'Staff')).toEqual({ compatible: true, isExact: false });
      expect(isSeniorityCompatible('Senior', 'Lead')).toEqual({ compatible: true, isExact: false });
      expect(isSeniorityCompatible('Senior', 'Mid')).toEqual({ compatible: true, isExact: false });
      expect(isSeniorityCompatible('Senior', 'lead/director')).toEqual({ compatible: true, isExact: false });

      // Incompatible levels
      expect(isSeniorityCompatible('Entry', 'lead/director')).toEqual({ compatible: false, isExact: false });
      expect(isSeniorityCompatible('Entry', 'Staff')).toEqual({ compatible: false, isExact: false });
      expect(isSeniorityCompatible('Principal', 'Entry')).toEqual({ compatible: false, isExact: false });
    });
  });

  describe('Location Filter PostgREST Generator', () => {
    it('generates double-quoted safe PostgREST filters with aliases', () => {
      const hydFilter = buildPostgrestLocationFilter('Hyderabad, Telangana, India');
      expect(hydFilter).toContain('location.ilike."%hyderabad%"');
      expect(hydFilter).toContain('location.ilike."%telangana%"');
      expect(hydFilter).toContain('location.ilike."%hyd%"');
      expect(hydFilter).toContain('location.ilike."%cyberabad%"');
      // Should not contain commas inside quotes or generic stop word "india" as a city
      expect(hydFilter).not.toContain('location.ilike."%india%"');

      const blrFilter = buildPostgrestLocationFilter('Bengaluru');
      expect(blrFilter).toContain('location.ilike."%bengaluru%"');
      expect(blrFilter).toContain('location.ilike."%bangalore%"');
      expect(blrFilter).toContain('location.ilike."%blr%"');

      expect(buildPostgrestLocationFilter('all')).toBe('');
      expect(buildPostgrestLocationFilter('')).toBe('');
    });
  });

  describe('evaluateJobMatch Candidate Scoring', () => {
    it('scores high match for aligned location, seniority, and matching skills', () => {
      const evaluation = evaluateJobMatch(
        {
          title: 'Senior Software Engineer (Java + React)',
          description: 'We are hiring a Senior Software Engineer with deep experience in Java, Spring Boot, React, and MySQL.',
          requirements: '5+ years building scalable distributed services with Java and Spring.',
          experienceLevel: 'Senior',
          location: 'Hyderabad, Telangana, India',
          companyName: 'Acme Technologies',
        },
        ['Java', 'Spring Boot', 'React', 'MySQL', 'REST APIs'],
        'Senior',
        'Hyderabad'
      );

      expect(evaluation.matchScore).toBeGreaterThanOrEqual(90);
      expect(evaluation.isRecommended).toBe(true);
      expect(evaluation.matchingSkills).toContain('Java');
      expect(evaluation.matchingSkills).toContain('Spring Boot');
      expect(evaluation.matchingSkills).toContain('React');
      expect(evaluation.whyYouMatch).toContain('Hyderabad');
      expect(evaluation.tailoredBulletSuggestion.impactMetric).toBeTruthy();
    });

    it('penalizes onsite jobs with conflicting geographic locations', () => {
      const localEval = evaluateJobMatch(
        {
          title: 'Full Stack Engineer',
          description: 'Full stack development with TypeScript and React.',
          experienceLevel: 'Mid',
          location: 'Hyderabad, India',
          companyName: 'TechCorp',
        },
        ['TypeScript', 'React'],
        'Mid',
        'Hyderabad'
      );

      const distantEval = evaluateJobMatch(
        {
          title: 'Full Stack Engineer',
          description: 'Full stack development with TypeScript and React.',
          experienceLevel: 'Mid',
          location: 'Bengaluru, Karnataka (On-site)',
          companyName: 'TechCorp',
        },
        ['TypeScript', 'React'],
        'Mid',
        'Hyderabad'
      );

      expect(localEval.matchScore).toBeGreaterThan(distantEval.matchScore);
      expect(distantEval.isRecommended).toBe(false);
    });
  });

  describe('GET /api/jobs Route Integration', () => {
    it('returns jobs with database sourceBreakdown and candidateProfile', async () => {
      const req = new Request(
        'http://localhost:3000/api/jobs?limit=20&location=Hyderabad&skills=Java,Spring%20Boot,MySQL'
      );
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.jobs)).toBe(true);
      expect(json.sourceBreakdown.ats).toBe(0);
      expect(json.sourceBreakdown.freehire).toBe(0);
      expect(json.candidateProfile.resolvedSkills).toContain('Java');
      expect(json.candidateProfile.resolvedLocation).toBe('Hyderabad');

      // Top matching job should have complete scoring breakdown
      if (json.jobs.length > 0) {
        const topJob = json.jobs[0];
        expect(topJob.match_score).toBeGreaterThanOrEqual(70);
        expect(topJob.match_breakdown).toBeDefined();
        expect(topJob.why_you_match).toBeDefined();
        expect(topJob.external_apply_url).toBeDefined();
      }
    });
  });
});

