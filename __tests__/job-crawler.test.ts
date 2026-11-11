/**
 * @jest-environment node
 */

import { crawlAndSyncTechJobs } from '@/lib/jobs/crawler';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('Job Crawler Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crawls and deduplicates jobs correctly using Freehire API in batches', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

    // Mock Supabase tables
    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'companies') {
        return {
          select: () => ({
            order: () => Promise.resolve({
              data: [
                { id: 'comp-1', name: 'Google', domain: 'google.com' },
                { id: 'comp-2', name: 'Meta', domain: 'meta.com' },
              ],
              count: 2,
            }),
          }),
        };
      }
      if (tableName === 'recruiters') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'test-rec-id' }, error: null }),
            }),
            limit: () => ({
              maybeSingle: async () => ({ data: { id: 'test-rec-id' }, error: null }),
            }),
          }),
        };
      }
      if (tableName === 'jobs') {
        return {
          delete: () => ({
            lt: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
          select: () => ({
            in: async () => ({
              data: [{ external_apply_url: 'https://careers.google.com/jobs/12345' }],
              error: null,
            }),
          }),
          insert: mockInsert,
        };
      }
      return {
        select: () => ({ order: () => Promise.resolve({ data: [], count: 0 }) }),
      };
    });

    // Mock Freehire fetch endpoint
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('freehire.me')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'fh-1',
                title: 'Senior Software Engineer',
                company: 'Google',
                url: 'https://careers.google.com/jobs/12345?utm_source=freehire.me',
                location: 'Hyderabad, India',
                description: '<p>Distributed systems and cloud architecture.</p>',
                enrichment: {
                  employment_type: 'full_time',
                  seniority: 'senior',
                  category: 'engineering',
                },
              },
              {
                id: 'fh-2',
                title: 'Staff Full Stack Developer',
                company: 'Google',
                url: 'https://careers.google.com/jobs/67890?utm_source=freehire.me',
                location: 'Bengaluru, India',
                description: '<p>Frontend and backend microservices.</p>',
                enrichment: {
                  employment_type: 'full_time',
                  seniority: 'staff',
                  category: 'engineering',
                },
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      });
    }) as any;

    const result = await crawlAndSyncTechJobs({ batchIndex: 0, batchSize: 2, perCompanyLimit: 5 });

    expect(result.success).toBe(true);
    expect(result.totalCompanies).toBe(2);
    expect(result.batchIndex).toBe(0);
    expect(result.crawled).toBeGreaterThanOrEqual(1);
    expect(result.inserted).toBe(1); // 1 new job, 1 duplicate skipped
    expect(result.skippedDuplicates).toBe(1);
    expect(result.sources.length).toBeGreaterThan(0);

    // Verify inserted jobs adhere strictly to database constraints
    expect(mockInsert).toHaveBeenCalled();
    const insertedPayload = mockInsert.mock.calls[0][0];
    expect(Array.isArray(insertedPayload)).toBe(true);
    expect(insertedPayload.length).toBe(1);
    const insertedJob = insertedPayload[0];
    expect(['entry', 'mid', 'senior', 'lead/director']).toContain(insertedJob.experience_level);
    expect(['full-time', 'part-time', 'contract', 'internship']).toContain(insertedJob.job_type);
  }, 30000);

  it('filters crawled jobs by city and country correctly', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

    mockFrom.mockImplementation((tableName: string) => {
      if (tableName === 'companies') {
        return {
          select: () => ({
            order: () => Promise.resolve({
              data: [{ id: 'comp-1', name: 'Google', domain: 'google.com' }],
              count: 1,
            }),
          }),
        };
      }
      if (tableName === 'recruiters') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { id: 'test-rec-id' }, error: null }) }),
            limit: () => ({ maybeSingle: async () => ({ data: { id: 'test-rec-id' }, error: null }) }),
          }),
        };
      }
      if (tableName === 'jobs') {
        return {
          delete: () => ({ lt: jest.fn().mockResolvedValue({ data: null, error: null }) }),
          select: () => ({ in: async () => ({ data: [], error: null }) }),
          insert: mockInsert,
        };
      }
      return {
        select: () => ({ order: () => Promise.resolve({ data: [], count: 0 }) }),
      };
    });

    const requestedUrls: string[] = [];
    global.fetch = jest.fn().mockImplementation((url: string) => {
      requestedUrls.push(url);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'fh-hyd',
              title: 'Hyderabad Software Engineer',
              company: 'Google',
              url: 'https://careers.google.com/jobs/hyd-1',
              location: 'Hyderabad, Telangana, India',
              cities: ['Hyderabad'],
              countries: ['in'],
            },
            {
              id: 'fh-sf',
              title: 'SF Software Engineer',
              company: 'Google',
              url: 'https://careers.google.com/jobs/sf-1',
              location: 'San Francisco, CA, USA',
              cities: ['San Francisco'],
              countries: ['us'],
            },
          ],
        }),
      });
    }) as any;

    const result = await crawlAndSyncTechJobs({
      batchIndex: 0,
      batchSize: 1,
      country: 'in',
      city: 'Hyderabad',
    });

    expect(result.success).toBe(true);
    expect(requestedUrls[0]).toContain('countries=in');
    expect(requestedUrls[0]).toContain('cities=Hyderabad');

    // Only the Hyderabad job should be kept, SF job filtered out
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertedJobs = mockInsert.mock.calls[0][0];
    expect(insertedJobs.length).toBe(1);
    expect(insertedJobs[0].title).toBe('Hyderabad Software Engineer');
  });
});
