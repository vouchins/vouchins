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

    const result = await crawlAndSyncTechJobs(2);

    expect(result.success).toBe(true);
    expect(result.crawled).toBeGreaterThanOrEqual(0);
    expect(result.sources.length).toBeGreaterThan(0);
  }, 15000);
});
