/**
 * @jest-environment node
 */

import {
  cleanHtmlText,
  detectCategory,
  detectExperienceLevel,
  detectWorkMode,
  evaluateJobMatch,
  fetchLiveAtsJobs,
  isLocationMatch,
  GREENHOUSE_TARGETS,
  LEVER_TARGETS,
  ASHBY_TARGETS,
} from '@/lib/jobs/ats-client';

describe('Live ATS Aggregator & Match Engine', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Classification & Cleaning Helpers', () => {
    it('cleans HTML tags and entities', () => {
      const raw = '<p>We are hiring a <strong>Staff Engineer</strong>.&nbsp;Apply now &amp; grow!</p>';
      expect(cleanHtmlText(raw)).toBe('We are hiring a Staff Engineer. Apply now & grow!');
    });

    it('detects job category accurately', () => {
      expect(detectCategory('Senior Machine Learning Engineer')).toBe('Data / AI');
      expect(detectCategory('Principal Product Manager')).toBe('Product Management');
      expect(detectCategory('Staff Product Designer')).toBe('Design');
      expect(detectCategory('Enterprise Account Executive')).toBe('Sales');
      expect(detectCategory('Senior Backend Engineer')).toBe('Engineering');
    });

    it('detects experience level accurately', () => {
      expect(detectExperienceLevel('Principal Systems Architect')).toBe('Principal');
      expect(detectExperienceLevel('Staff Infrastructure Engineer')).toBe('Staff');
      expect(detectExperienceLevel('Engineering Team Lead')).toBe('Lead');
      expect(detectExperienceLevel('Senior Full Stack Developer')).toBe('Senior');
      expect(detectExperienceLevel('Software Engineering Intern')).toBe('Entry');
      expect(detectExperienceLevel('Software Engineer')).toBe('Mid');
    });

    it('detects workplace type accurately', () => {
      expect(detectWorkMode('Remote - US')).toBe('Remote');
      expect(detectWorkMode('Anywhere in EMEA')).toBe('Remote');
      expect(detectWorkMode('New York, NY (Hybrid)')).toBe('Hybrid');
      expect(detectWorkMode('San Francisco, CA')).toBe('Onsite');
    });
  });

  describe('isLocationMatch', () => {
    it('matches custom entered city with state abbreviations and metro areas', () => {
      expect(isLocationMatch('Jersey City, NJ', 'New Jersey')).toBe(true);
      expect(isLocationMatch('Newark, NJ', 'New Jersey')).toBe(true);
      expect(isLocationMatch('New Brunswick, NJ', 'New Jersey')).toBe(true);
      expect(isLocationMatch('Remote - US', 'New Jersey')).toBe(true);
      expect(isLocationMatch('Newark, NJ', 'NJ')).toBe(true);
    });

    it('does not falsely match distinct cities due to stop words like new or san', () => {
      // "New Jersey" should not match "New York, NY" (avoid matching on stop word "new")
      expect(isLocationMatch('New York, NY', 'New Jersey')).toBe(false);
      // "San Francisco" should not match "San Diego, CA" (avoid matching on stop word "san")
      expect(isLocationMatch('San Diego, CA', 'San Francisco')).toBe(false);
    });

    it('matches Indian tech hubs with regional aliases', () => {
      expect(isLocationMatch('Hitec City, Hyderabad', 'Hyderabad')).toBe(true);
      expect(isLocationMatch('Bangalore / Bengaluru', 'Bangalore')).toBe(true);
      expect(isLocationMatch('Remote', 'Hyderabad')).toBe(true);
    });
  });

  describe('evaluateJobMatch', () => {
    it('computes personalized matching skills and whyYouMatch statement', () => {
      const jobInfo = {
        title: 'Senior Distributed Systems Engineer',
        description: 'Building global transactional platforms using Go, Kafka, and Kubernetes.',
        requirements: 'Experience with PostgreSQL and distributed caches.',
        experienceLevel: 'Senior',
        workplaceType: 'Remote',
        companyName: 'Stripe',
      };

      const candidateSkills = ['Go', 'Kafka', 'TypeScript', 'Kubernetes', 'PostgreSQL'];
      const match = evaluateJobMatch(jobInfo, candidateSkills, 'Senior');

      expect(match.matchingSkills).toContain('Go');
      expect(match.matchingSkills).toContain('Kafka');
      expect(match.matchingSkills).toContain('Kubernetes');
      expect(match.matchScore).toBeGreaterThanOrEqual(88);
      expect(match.isRecommended).toBe(true);
      expect(match.whyYouMatch).toContain('Stripe');
      expect(match.tailoredBulletSuggestion.impactMetric).toBe('-38% Latency');
    });

    it('handles candidate with no direct skill overlap gracefully', () => {
      const jobInfo = {
        title: 'iOS Platform Engineer',
        description: 'Swift and Objective-C mobile engineering.',
        companyName: 'Spotify',
      };

      const match = evaluateJobMatch(jobInfo, ['Python', 'Django'], 'Mid');
      expect(match.matchScore).toBeGreaterThanOrEqual(76);
      expect(match.matchingSkills.length).toBeGreaterThan(0);
      expect(match.missingSkills.length).toBeGreaterThan(0);
    });

    it('prioritizes candidate city and penalizes non-matching onsite location', () => {
      const hyderabadJob = {
        title: 'Principal Cloud Systems Architect',
        description: 'Distributed cloud systems using Java and Go.',
        experienceLevel: 'Principal',
        workplaceType: 'Hybrid',
        location: 'Hyderabad / Bangalore',
        companyName: 'Oracle',
      };

      const californiaOnsiteJob = {
        title: 'Principal Cloud Systems Architect',
        description: 'Distributed cloud systems using Java and Go.',
        experienceLevel: 'Principal',
        workplaceType: 'Onsite',
        location: 'San Francisco, CA',
        companyName: 'Tech Co',
      };

      const candidateSkills = ['Java', 'Go', 'Distributed Systems'];
      const hydMatch = evaluateJobMatch(hyderabadJob, candidateSkills, 'Principal', 'Hyderabad');
      const caMatch = evaluateJobMatch(californiaOnsiteJob, candidateSkills, 'Principal', 'Hyderabad');

      expect(hydMatch.matchScore).toBeGreaterThan(caMatch.matchScore);
      expect(hydMatch.whyYouMatch).toContain('Hyderabad');
      expect(hydMatch.isRecommended).toBe(true);

      // California onsite job must have a lower score and not be recommended for Hyderabad candidate
      expect(caMatch.matchScore).toBeLessThan(88);
      expect(caMatch.isRecommended).toBe(false);
      expect(caMatch.whyYouMatch).toContain('San Francisco, CA');
    });
  });

  describe('fetchLiveAtsJobs', () => {
    it('fetches and normalizes Greenhouse, Lever, and Ashby boards in parallel', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/boards/figma/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jobs: [
                {
                  id: 101,
                  title: 'Senior Frontend Engineer',
                  absolute_url: 'https://boards.greenhouse.io/figma/jobs/101',
                  location: { name: 'Remote' },
                  content: '<p>React, TypeScript, Next.js web application architecture.</p>',
                },
              ],
            }),
          });
        }
        if (typeof url === 'string' && url.includes('/spotify')) {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: '202',
                text: 'Staff Backend Engineer',
                hostedUrl: 'https://jobs.lever.co/spotify/202',
                categories: { location: 'Stockholm, Sweden', commitment: 'Full-time' },
                descriptionPlain: 'Java, Python, Kubernetes cloud microservices.',
                additionalPlain: '$180,000 - $220,000',
              },
            ],
          });
        }
        if (typeof url === 'string' && url.includes('/linear')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jobs: [
                {
                  id: '303',
                  title: 'Staff Product Engineer',
                  jobUrl: 'https://jobs.ashbyhq.com/linear/303',
                  location: 'Remote',
                  employmentType: 'Full-time',
                  compensation: { summary: '$200k - $250k' },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
        });
      }) as any;

      const jobs = await fetchLiveAtsJobs({
        skills: ['React', 'TypeScript', 'Next.js'],
        seniority: 'Senior',
        limit: 10,
      });

      expect(jobs.length).toBeGreaterThanOrEqual(3);

      const figmaJob = jobs.find((j) => j.company_name === 'Figma');
      expect(figmaJob).toBeDefined();
      expect(figmaJob?.external_apply_url).toBe('https://boards.greenhouse.io/figma/jobs/101');
      expect(figmaJob?.matching_skills).toContain('React');

      const spotifyJob = jobs.find((j) => j.company_name === 'Spotify');
      expect(spotifyJob).toBeDefined();
      expect(spotifyJob?.external_apply_url).toBe('https://jobs.lever.co/spotify/202');

      const linearJob = jobs.find((j) => j.company_name === 'Linear');
      expect(linearJob).toBeDefined();
      expect(linearJob?.external_apply_url).toBe('https://jobs.ashbyhq.com/linear/303');
    });

    it('returns empty array when network fails without throwing unhandled exceptions', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('DNS resolution failure'));

      const jobs = await fetchLiveAtsJobs({ skills: ['Go'] });
      expect(jobs).toEqual([]);
    });

    it('filters properly by query string and workplace type', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/boards/figma/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              jobs: [
                {
                  id: 1,
                  title: 'Senior Frontend Engineer',
                  absolute_url: 'https://boards.greenhouse.io/figma/jobs/1',
                  location: { name: 'Remote' },
                  content: 'React and CSS.',
                },
                {
                  id: 2,
                  title: 'Data Analyst',
                  absolute_url: 'https://boards.greenhouse.io/figma/jobs/2',
                  location: { name: 'San Francisco, CA' },
                  content: 'SQL and Excel.',
                },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 500 });
      }) as any;

      const remoteFrontendJobs = await fetchLiveAtsJobs({
        query: 'Frontend',
        workMode: 'remote',
      });

      expect(remoteFrontendJobs.length).toBe(1);
      expect(remoteFrontendJobs[0].title).toBe('Senior Frontend Engineer');
      expect(remoteFrontendJobs[0].workplace_type).toBe('Remote');
    });
  });
});
