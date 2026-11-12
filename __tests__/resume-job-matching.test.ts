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
  canonicalizeSkill,
  candidateHasSkill,
  isValidGeographicLocation,
} from '@/lib/jobs/ats-client';
import { parseRawTextToDocument } from '@/lib/jobs/xyz-evaluator';
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

    it('correctly canonicalizes versioned skills and prevents false missing skills', () => {
      expect(canonicalizeSkill('JavaScript (ES6+)')).toBe('JavaScript');
      expect(canonicalizeSkill('ReactJS')).toBe('React');
      expect(canonicalizeSkill('Node.js')).toBe('Node.js');
      expect(canonicalizeSkill('Tailwind CSS')).toBe('Tailwind CSS');

      const resumeSkills = ['JavaScript (ES6+)', 'ReactJS', 'Redux', 'Node.js', 'HTML5', 'CSS3'];
      expect(candidateHasSkill('JavaScript', resumeSkills)).toBe(true);
      expect(candidateHasSkill('React', resumeSkills)).toBe(true);
      expect(candidateHasSkill('TypeScript', resumeSkills)).toBe(false);

      const jobPosting = {
        title: 'Software Developer II (Front-end)',
        description: 'Join ABC Fitness to build modern web interfaces.',
        requirements: 'Strong experience with React and modern JavaScript or TypeScript.',
        experienceLevel: 'Mid',
        location: 'Hyderabad Office, India.',
        companyName: 'ABC Fitness',
      };

      const evalResult = evaluateJobMatch(jobPosting, resumeSkills, 'Mid', 'Hyderabad');

      // Candidate has JavaScript (ES6+) and ReactJS, so JavaScript and React MUST match
      expect(evalResult.matchingSkills).toContain('JavaScript');
      expect(evalResult.matchingSkills).toContain('React');

      // Neither JavaScript nor React should ever be flagged as missing
      expect(evalResult.missingSkills).not.toContain('JavaScript');
      expect(evalResult.missingSkills).not.toContain('React');

      // TypeScript is genuinely not on the resume, so it is accurately flagged as missing
      expect(evalResult.missingSkills).toContain('TypeScript');
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

  describe('Resume Header Location Parsing and Geographic Validation', () => {
    it('accurately validates geographic locations and rejects job titles and company names', () => {
      expect(isValidGeographicLocation('Project Lead @ Oracle')).toBe(false);
      expect(isValidGeographicLocation('Software Engineer')).toBe(false);
      expect(isValidGeographicLocation('shaikt30@gmail.com')).toBe(false);
      expect(isValidGeographicLocation('https://linkedin.com/in/shaik-taher')).toBe(false);
      expect(isValidGeographicLocation('Remote')).toBe(false);
      expect(isValidGeographicLocation('All')).toBe(false);

      expect(isValidGeographicLocation('Hyderabad')).toBe(true);
      expect(isValidGeographicLocation('Telangana, India')).toBe(true);
      expect(isValidGeographicLocation('Hyderabad, Telangana, India')).toBe(true);
      expect(isValidGeographicLocation('San Francisco, CA')).toBe(true);
      expect(isValidGeographicLocation('Bengaluru, Karnataka, India')).toBe(true);
    });

    it('extracts real location from resume header without confusing role title with location', () => {
      const sampleResume = `
Shaik Taher
Project Lead @ Oracle
Hyderabad
Telangana, India
Email | shaikt30@gmail.com
LinkedIn | linkedin/in/shaik-taher
Github | github.com/ishaiktaher
+91-8801418257

Professional Summary
Senior Frontend Engineer with 9+ years of experience building scalable web applications using ReactJS, Redux, and JavaScript.

Top Skills
JavaScript (ES6+), ReactJS, Redux, Node.js

Experience
Oracle India Pvt Limited, Hyderabad, INDIA
Software Engineer | Apr 2021 - Present
Built and enhanced storefront framework with React and Node.js.
`;

      const doc = parseRawTextToDocument(sampleResume);
      expect(doc.contact.fullName).toBe('Shaik Taher');
      expect(doc.contact.location).toBe('Hyderabad, Telangana, India');
      expect(doc.contact.email).toBe('shaikt30@gmail.com');
      expect(doc.contact.phone).toBe('+91-8801418257');
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

