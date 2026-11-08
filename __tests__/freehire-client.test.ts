/**
 * @jest-environment node
 */

import {
  transformFreehireJob,
  fetchFreehireJobs,
  FreehireRawJob,
} from '@/lib/jobs/freehire-client';

describe('Freehire API Client & Ingestion Transformer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('transformFreehireJob', () => {
    it('normalizes a raw Freehire job into Vouchins canonical format with dynamic skill matching', () => {
      const rawJob: FreehireRawJob = {
        id: 'job-123',
        title: 'Senior Distributed Systems Engineer',
        company: 'Stripe',
        location: 'San Francisco, CA',
        work_mode: 'remote',
        seniority: 'senior',
        skills: ['Go', 'PostgreSQL', 'Kafka', 'Redis', 'Docker'],
        salary_min: 195000,
        salary_max: 245000,
        salary_currency: 'USD',
        url: 'https://boards.greenhouse.io/stripe/jobs/123456',
        description: 'Stripe is looking for a Senior Distributed Systems Engineer to scale our global core transaction engine.',
        posted_at: '2025-01-15T12:00:00Z',
      };

      const candidateSkills = ['Go', 'Kafka', 'Distributed Systems', 'TypeScript', 'PostgreSQL'];
      const transformed = transformFreehireJob(rawJob, candidateSkills);

      expect(transformed.id).toBe('freehire-job-123');
      expect(transformed.title).toBe('Senior Distributed Systems Engineer');
      expect(transformed.companyName).toBe('Stripe');
      expect(transformed.workplaceType).toBe('Remote');
      expect(transformed.experienceLevel).toBe('Senior');
      expect(transformed.salaryRange).toBe('$195k - $245k / yr');
      expect(transformed.externalApplyUrl).toBe('https://boards.greenhouse.io/stripe/jobs/123456');

      // Check skill overlap detection
      expect(transformed.matchingSkills).toContain('Go');
      expect(transformed.matchingSkills).toContain('Kafka');
      expect(transformed.matchingSkills).toContain('PostgreSQL');

      // Check match score computation
      expect(transformed.matchScore).toBeGreaterThanOrEqual(85);
      expect(transformed.isRecommended).toBe(true);
      expect(transformed.whyYouMatch).toContain('Go');
    });

    it('handles missing or nested company objects gracefully', () => {
      const rawJob: FreehireRawJob = {
        id: 999,
        title: 'Full Stack Developer',
        company: { name: 'Figma', slug: 'figma', domain: 'figma.com' },
        url: 'https://boards.greenhouse.io/figma/jobs/789',
      };

      const transformed = transformFreehireJob(rawJob, ['React', 'TypeScript']);

      expect(transformed.companyName).toBe('Figma');
      expect(transformed.companyLogo).toContain('figma.com');
      expect(transformed.salaryRange).toBe('Competitive / Market Band');
      expect(transformed.workplaceType).toBe('Onsite');
    });
  });

  describe('fetchFreehireJobs', () => {
    it('queries Freehire API with normalized parameters and returns transformed jobs', async () => {
      const mockRawData = [
        {
          id: 'fh-1',
          title: 'Staff Backend Engineer',
          company: 'Uber',
          url: 'https://uber.com/careers/jobs/101',
          work_mode: 'remote',
          seniority: 'lead',
          skills: ['Go', 'Kubernetes'],
          salary_min: 210000,
          salary_max: 275000,
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockRawData }),
      });

      const jobs = await fetchFreehireJobs(
        {
          skills: ['Go', 'Kubernetes'],
          seniority: 'lead',
          workMode: 'remote',
          query: 'Staff Backend',
          limit: 10,
        },
        ['Go', 'Kubernetes']
      );

      expect(global.fetch).toHaveBeenCalled();
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('freehire.me/api/v1/jobs');
      expect(calledUrl).toContain('skills=go%2Ckubernetes');
      expect(calledUrl).toContain('seniority=lead');
      expect(calledUrl).toContain('work_mode=remote');

      expect(jobs.length).toBe(1);
      expect(jobs[0].title).toBe('Staff Backend Engineer');
      expect(jobs[0].companyName).toBe('Uber');
      expect(jobs[0].matchingSkills).toContain('Go');
    });

    it('returns empty array when API encounters an error without throwing', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const jobs = await fetchFreehireJobs({ skills: ['React'] }, ['React']);
      expect(jobs).toEqual([]);
    });

    it('returns empty array when API returns non-200 status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const jobs = await fetchFreehireJobs();
      expect(jobs).toEqual([]);
    });
  });
});
