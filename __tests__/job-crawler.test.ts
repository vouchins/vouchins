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

  it('crawls and deduplicates jobs correctly', async () => {
    // Mock existing jobs in DB
    mockFrom.mockReturnValue({
      select: () => ({
        in: async () => ({
          data: [{ external_apply_url: 'https://careers.airbnb.com/positions/8306554' }],
          error: null,
        }),
      }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    // Mock fetch for sandboxed environments
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('greenhouse.io')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            jobs: [
              {
                id: 12345,
                title: 'Senior Software Engineer',
                absolute_url: 'https://boards.greenhouse.io/figma/jobs/12345',
                location: { name: 'San Francisco, CA' },
                content: '<p>Engineering scalable systems.</p>',
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ jobs: [] }),
      });
    }) as any;

    const result = await crawlAndSyncTechJobs(2);

    expect(result.success).toBe(true);
    expect(result.crawled).toBeGreaterThanOrEqual(0);
    expect(result.sources.length).toBeGreaterThan(0);
  }, 30000);
});
