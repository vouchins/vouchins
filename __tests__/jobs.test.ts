/**
 * @jest-environment node
 */

jest.mock('@/lib/jobs/auth-guard', () => {
  const actual = jest.requireActual('@/lib/jobs/auth-guard');
  return {
    ...actual,
    checkIsUserPro: jest.fn((userId: string) => Promise.resolve(userId.includes('pro'))),
  };
});

jest.mock('@/lib/supabase/admin', () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      neq: jest.fn(() => builder),
      in: jest.fn(() => builder),
      gt: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    };
    return builder;
  };

  return {
    supabaseAdmin: {
      from: jest.fn(() => createQueryBuilder()),
    },
  };
});

import {
  ResumeDocumentSchema,
  ResumeEvaluationSchema,
  JobMatchVectorsSchema,
  createDefaultResumeDocument,
} from '@/lib/jobs/types';
import {
  evaluateResumeHeuristically,
  parseRawTextToDocument,
  sanitizeBulletText,
} from '@/lib/jobs/xyz-evaluator';
import {
  computeContentHash,
  checkAILlmRateLimit,
  checkAICostGuard,
  resetAIRateLimit,
} from '@/lib/jobs/cost-guard';
import { matchJobsForProfile } from '@/lib/jobs/job-matcher';
import {
  SAMPLE_STAFF_RESUME,
  SAMPLE_STAFF_EVALUATION,
} from '@/components/jobs/sample-resumes';

describe('Jobs: Resume Intelligence & Interactive Editor', () => {
  describe('Canonical Schemas & Types', () => {
    it('should validate sample staff resume document schema successfully', () => {
      const parsed = ResumeDocumentSchema.safeParse(SAMPLE_STAFF_RESUME);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.contact.fullName).toBe('John Doe');
        expect(parsed.data.experience.length).toBeGreaterThan(0);
        expect(parsed.data.skills.length).toBeGreaterThan(0);
      }
    });

    it('should validate sample evaluation schema successfully', () => {
      const parsed = ResumeEvaluationSchema.safeParse(SAMPLE_STAFF_EVALUATION);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overallScore).toBe(84);
        expect(parsed.data.pillarScores.impact).toBe(78);
        expect(parsed.data.pillarScores.relevance).toBe(91);
        expect(parsed.data.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should reject invalid document schema with missing full name', () => {
      const invalidDoc = {
        ...SAMPLE_STAFF_RESUME,
        contact: {
          ...SAMPLE_STAFF_RESUME.contact,
          fullName: '',
        },
      };
      const parsed = ResumeDocumentSchema.safeParse(invalidDoc);
      expect(parsed.success).toBe(false);
    });

    it('should construct valid default resume document', () => {
      const defaultDoc = createDefaultResumeDocument({
        contact: {
          fullName: 'Test Candidate',
          email: 'test@example.com',
          phone: '',
          location: '',
          linkedinUrl: '',
          githubUrl: '',
          portfolioUrl: '',
        },
      });
      const parsed = ResumeDocumentSchema.safeParse(defaultDoc);
      expect(parsed.success).toBe(true);
      expect(defaultDoc.contact.fullName).toBe('Test Candidate');
    });
  });

  describe('Google XYZ Evaluator & Heuristic Engine', () => {
    it('should detect weak passive verbs and generate Google XYZ rewrite suggestions', () => {
      const docWithWeakVerb = {
        ...SAMPLE_STAFF_RESUME,
        experience: [
          {
            id: 'exp-test',
            company: 'Test Corp',
            roleTitle: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            isCurrent: true,
            bullets: [
              'Worked on backend APIs and database queries.',
              'Responsible for maintaining customer analytics pipeline.',
            ],
          },
        ],
      };

      const evaluation = evaluateResumeHeuristically(docWithWeakVerb);
      expect(evaluation.overallScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.overallScore).toBeLessThanOrEqual(100);
      expect(evaluation.suggestions.length).toBeGreaterThanOrEqual(2);

      const firstSuggestion = evaluation.suggestions[0];
      expect(firstSuggestion.pillar).toBe('impact');
      expect(firstSuggestion.roleIndex).toBe(0);
      expect(firstSuggestion.bulletIndex).toBe(0);
      // Verify rewrite contains quantifiable metric / Google XYZ structure
      expect(firstSuggestion.suggestedRewrite).toMatch(/latency|requests|efficiency|throughput/i);
    });

    it('should increase readiness and impact scores when Google XYZ rewrites are applied', () => {
      const initialDoc = {
        ...SAMPLE_STAFF_RESUME,
        experience: [
          {
            id: 'exp-test',
            company: 'Test Corp',
            roleTitle: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            isCurrent: true,
            bullets: [
              'Worked on backend APIs and database queries.',
              'Responsible for maintaining customer analytics pipeline.',
              'Helped with bug fixes and code refactoring.',
            ],
          },
        ],
      };

      const initialEval = evaluateResumeHeuristically(initialDoc);

      // Apply first suggestion rewrite
      const updatedDoc = {
        ...initialDoc,
        experience: [
          {
            ...initialDoc.experience[0],
            bullets: [
              initialEval.suggestions[0].suggestedRewrite,
              initialDoc.experience[0].bullets[1],
              initialDoc.experience[0].bullets[2],
            ],
          },
        ],
      };

      const updatedEval = evaluateResumeHeuristically(updatedDoc);

      // Verify that impact score and overall readiness score increase
      expect(updatedEval.pillarScores.impact).toBeGreaterThan(initialEval.pillarScores.impact);
      expect(updatedEval.overallScore).toBeGreaterThanOrEqual(initialEval.overallScore);
    });

    it('should parse raw plaintext resume into structured document schema', () => {
      const sampleRawText = `
Jane Doe
jane.doe@example.com | (555) 123-4567 | San Francisco, CA | linkedin.com/in/janedoe

Professional Summary
Senior Software Engineer with 7 years of experience building distributed systems and high-throughput web APIs.

Technical Skills
Languages: TypeScript, Go, Python, SQL
Frameworks: React, Next.js, Node.js
Databases: PostgreSQL, Redis, DynamoDB

Experience
Acme Cloud Tech
Lead Software Engineer
2021 - Present
- Architected microservices handling 2M requests daily with 99.99% availability.
- Reduced p99 database query latency by 45% using Redis caching layers.
- Spearheaded team migration to TypeScript and Next.js.

Education
University of California, Berkeley
Bachelor of Science in Computer Science
2017
      `.trim();

      const doc = parseRawTextToDocument(sampleRawText);
      expect(doc.contact.fullName).toBe('Jane Doe');
      expect(doc.contact.email).toBe('jane.doe@example.com');
      expect(doc.experience.length).toBeGreaterThan(0);
      expect(doc.skills.length).toBeGreaterThan(0);
    });

    it('should parse complex multi-role ATS resume without hardcoded placeholders or fake companies', () => {
      const shaikResumeRaw = `
SHAIK TAHER
Project Lead
 91 8801418257 shaikt30@gmail.com linkedin.com/in/shaik-taher Hyderabad, India
SUMMARY
Senior Software Engineer with 8 years of experience building enterprise-grade web applications in Agile environments. Specialized in React, JavaScript, and Java for developing scalable UI frameworks, reusable components, and robust API integrations.
EXPERIENCE
Project Lead
Oracle
04/2021 - Present Hyderabad, India
Oracle CX Commerce is a comprehensive platform for both B2C and B2B businesses by connecting customer, sales, and back-office data.
Developed Oracle Commerce's next-generation storefront framework with support for server-side rendering, SEO optimization, and configurable widgets using JavaScript, React, and Node.js.
Built and maintained scalable features for both cloud and on-premise commerce applications, ensuring seamless functionality across deployment environments.
Software Engineer
Qvantel
06/2019 - 03/2021 Hyderabad, India
Developed enterprise-grade web apps for telecom clients using React, Redux, and TypeScript, integrating POS and billing systems.
System Engineer
TCS
08/2016 - 06/2019 Hyderabad, India
Developed a wallet feature and gold renewal product for ICICI Bank's iMobile Application using Cordova, AngularJS, and the MobileFirst platform
KEY ACHIEVEMENTS
Hackathon Winner
Secured second place in a hackathon at Oracle for the project 'Personalized cart summary for OSF using Generative AI' in January 2024
SPOT award
Recognized as the best contributor for Q3 2024 in a team of 22 in Commerce division
SKILLS
React JavaScript HTML CSS Git Jest Bootstrap Redux Visual Studio Unit Testing Node.js Knockout.js
EDUCATION
Bachelor of Technology (EEE)
JNTU Hyderabad
07/2012 - 05/2016
Intermediate
Narayana Junior College
07/2010 - 04/2012
SSC
Castletown high school
04/2010 - 04/2010
      `.trim();

      const doc = parseRawTextToDocument(shaikResumeRaw);
      expect(doc.contact.fullName).toBe('SHAIK TAHER');
      expect(doc.contact.email).toBe('shaikt30@gmail.com');
      expect(doc.contact.location).toBe('Hyderabad, India');
      expect(doc.experience.length).toBe(3);

      const companies = doc.experience.map((e) => e.company);
      expect(companies).toContain('Oracle');
      expect(companies).toContain('Qvantel');
      expect(companies).toContain('TCS');

      // Verify zero hardcoded placeholders
      expect(companies).not.toContain('Leading Tech Organization');
      expect(doc.contact.location).not.toBe('San Francisco, CA / Remote');
      expect(doc.projects?.some((p) => p.title.includes('Distributed Real-Time'))).toBe(false);

      // Verify real achievements were mapped to projects
      expect(doc.projects?.length).toBeGreaterThan(0);
      expect(doc.projects?.some((p) => p.title.includes('Hackathon Winner'))).toBe(true);

      // Verify education
      expect(doc.education.length).toBe(3);
      expect(doc.education[0].degree).toBe('Bachelor of Technology (EEE)');
      expect(doc.education[0].institution).toBe('JNTU Hyderabad');
    });

    it('should sanitize duplicate repeating clauses and broken words from bullets', () => {
      const duplicated =
        "Developed web apps using React, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating.";
      const sanitized = sanitizeBulletText(duplicated);
      expect(sanitized).toBe(
        "Developed web apps using React, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating."
      );

      const broken =
        "Built features across environments, expan, boosting execution efficiency by 25%.";
      const sanitizedBroken = sanitizeBulletText(broken);
      expect(sanitizedBroken).not.toContain('expan,');
      expect(sanitizedBroken).toContain('boosting execution efficiency by 25%.');
    });

    it('should not duplicate or hallucinate metrics on bullets that already have quantifiable metrics', () => {
      const docWithMetrics = {
        ...SAMPLE_STAFF_RESUME,
        experience: [
          {
            id: 'exp-test',
            company: 'Test Corp',
            roleTitle: 'Software Engineer',
            startDate: '2022',
            endDate: 'Present',
            isCurrent: true,
            bullets: [
              'Developed mobile features, expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating.',
            ],
          },
        ],
      };

      const evalResult = evaluateResumeHeuristically(docWithMetrics);
      // It should NOT generate a suggestion to append "expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating" again
      const duplicateMetricSug = evalResult.suggestions.find((s) =>
        s.suggestedRewrite.includes('expanding active user adoption to 500k+ mobile users with a 4.8-star app store rating, expanding active user adoption')
      );
      expect(duplicateMetricSug).toBeUndefined();
    });
  });

  describe('Cost Guard & SHA-256 Deduplication', () => {
    it('should generate consistent SHA-256 hashes for identical normalized text', () => {
      const text1 = 'Senior Full-Stack Engineer   with Next.js and TypeScript  ';
      const text2 = 'senior full-stack engineer with next.js and typescript';
      expect(computeContentHash(text1)).toBe(computeContentHash(text2));
    });

    it('should generate different hashes for distinct content', () => {
      const text1 = 'Senior Frontend Engineer';
      const text2 = 'Senior Backend Engineer';
      expect(computeContentHash(text1)).not.toBe(computeContentHash(text2));
    });

    it('should enforce strict 1-time rate limit on LLM / AI model calls for free users', async () => {
      const testUserId = 'test-user-rate-limit-1';
      resetAIRateLimit(testUserId);

      // First LLM call should be allowed
      const firstCheck = await checkAILlmRateLimit(testUserId, 'evaluate');
      expect(firstCheck.allowed).toBe(true);

      // Second LLM call for the free user must require Pro plan upgrade
      const secondCheck = await checkAILlmRateLimit(testUserId, 'evaluate');
      expect(secondCheck.allowed).toBe(false);
      expect(secondCheck.code).toBe('PRO_PLAN_REQUIRED');
      expect(secondCheck.reason).toContain('Jobs Pro');

      // Resetting the rate limit enables it again
      resetAIRateLimit(testUserId);
      const resetCheck = await checkAILlmRateLimit(testUserId, 'evaluate');
      expect(resetCheck.allowed).toBe(true);
    });

    it('should require Pro plan upgrade when free user requests additional AI suggestions or resumes', async () => {
      const testUserId = 'test-user-rate-limit-2';
      resetAIRateLimit(testUserId);

      const resume1 = 'Candidate A software engineer with TypeScript experience';
      const resume2 = 'Candidate B data engineer with Python and SQL experience';

      // First AI evaluation call allowed for free user
      const check1 = await checkAICostGuard(testUserId, resume1, false);
      expect(check1.allowed).toBe(true);

      // Second AI evaluation call for new resume asks user to upgrade to Jobs Pro
      const check2 = await checkAICostGuard(testUserId, resume2, false);
      expect(check2.allowed).toBe(false);
      expect(check2.code).toBe('PRO_PLAN_REQUIRED');
      expect(check2.reason).toContain('Upgrade to Jobs Pro');

      // Getting more suggestions on existing resume also prompts for Jobs Pro without falling back to heuristic
      const reanalyzeCheck = await checkAICostGuard(testUserId, resume2, true);
      expect(reanalyzeCheck.allowed).toBe(false);
      expect(reanalyzeCheck.code).toBe('PRO_PLAN_REQUIRED');
      expect(reanalyzeCheck.reason).toContain('exclusive to Jobs Pro members');
    });

    it('should reject re-analyzing existing resume for free users even on their first call', async () => {
      const freshFreeUser = 'fresh-free-user-first-call';
      resetAIRateLimit(freshFreeUser);

      // Even without any prior usage, re-analyzing existingDoc requires a Pro plan
      const check = await checkAICostGuard(freshFreeUser, 'Sample resume text', true);
      expect(check.allowed).toBe(false);
      expect(check.code).toBe('PRO_PLAN_REQUIRED');
      expect(check.reason).toContain('exclusive to Jobs Pro members');
    });

    it('should allow re-analyzing existing resume for pro users and bypass cache deduplication', async () => {
      const proUser = 'test-pro-member-user-1';
      resetAIRateLimit(proUser);

      const check = await checkAICostGuard(proUser, 'Updated resume text after edits', true);
      expect(check.allowed).toBe(true);
      // Cache deduplication MUST be bypassed so re-evaluation generates fresh score and suggestions
      expect(check.cachedEvaluation).toBeUndefined();
    });
  });

  describe('Downstream Job Matching Hook', () => {
    it('should return matched jobs based on candidate profile vectors', async () => {
      const vectors = SAMPLE_STAFF_EVALUATION.jobMatchVectors;
      const parsed = JobMatchVectorsSchema.safeParse(vectors);
      expect(parsed.success).toBe(true);

      const matched = await matchJobsForProfile(vectors);
      expect(matched.length).toBeGreaterThan(0);
      expect(matched[0].matchScore).toBeGreaterThanOrEqual(70);
      expect(matched[0].companyName).toBeDefined();
    });
  });
});
