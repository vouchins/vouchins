/**
 * @jest-environment node
 */

const mockVerifyJobsAccess = jest.fn();
jest.mock('@/lib/jobs/auth-guard', () => ({
  verifyJobsAccess: (...args: unknown[]) => mockVerifyJobsAccess(...args),
}));

const mockGetActiveResumeRow = jest.fn();
jest.mock('@/lib/jobs/active-resume', () => ({
  getActiveResumeRow: (...args: unknown[]) => mockGetActiveResumeRow(...args),
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { POST as profilePOST } from '@/app/api/jobs/profile/route';
import { GET as jobsGET } from '@/app/api/jobs/route';
import { GET as jobDetailGET } from '@/app/api/jobs/[id]/route';

describe('POST /api/jobs/profile (add-skills) & Active Resume Parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyJobsAccess.mockResolvedValue({ allowed: true, userId: 'user-1' });
  });

  function makeResumeRow(overrides: Partial<any> = {}) {
    return {
      id: 'res-active-1',
      user_id: 'user-1',
      updated_at: '2026-11-28T10:00:00.123456+00:00',
      document_schema: {
        contact: { fullName: 'Test User', email: 'test@example.com' },
        skills: [{ category: 'Technical', items: ['TypeScript', 'React'] }],
        experience: [{ company: 'Acme', roleTitle: 'Engineer', bullets: ['Built APIs'] }],
      },
      ...overrides,
    };
  }

  it('rejects non-array, empty, and >20 skill batches with 400', async () => {
    const res1 = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: 'Docker' }),
      })
    );
    expect(res1.status).toBe(400);

    const res2 = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: ['   ', ''] }),
      })
    );
    expect(res2.status).toBe(400);

    const twentyOne = Array.from({ length: 21 }, (_, i) => `Skill_${i + 1}`);
    const res3 = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: twentyOne }),
      })
    );
    expect(res3.status).toBe(400);
  });

  it('returns 403 when passed resumeId belongs to another user', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 'res-foreign', user_id: 'user-other' }, error: null }),
        }),
      }),
    }));

    const res = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', resumeId: 'res-foreign', skills: ['Docker'] }),
      })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toContain('user-other');
  });

  it('returns 404 when user has no active resume and 500 on DB lookup error', async () => {
    mockGetActiveResumeRow.mockResolvedValueOnce({ row: null, error: null });
    const res404 = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: ['Docker'] }),
      })
    );
    expect(res404.status).toBe(404);

    mockGetActiveResumeRow.mockResolvedValueOnce({ row: null, error: { message: 'DB down' } });
    const res500 = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: ['Docker'] }),
      })
    );
    expect(res500.status).toBe(500);
  });

  it('uses exact microsecond updated_at string, ignores stale same-user resumeId, and retries once on conflict', async () => {
    const initialRow = makeResumeRow();
    const concurrentRow = makeResumeRow({
      updated_at: '2026-11-28T10:00:01.654321+00:00',
      document_schema: {
        ...initialRow.document_schema,
        experience: [{ company: 'Acme', roleTitle: 'Staff Engineer', bullets: ['Concurrent edit'] }],
      },
    });

    mockGetActiveResumeRow.mockResolvedValueOnce({ row: initialRow, error: null });

    let updateCalls = 0;
    const eqUpdatedAts: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'job_resumes') return {};
      return {
        // Ownership check for stale same-user resumeId
        select: (cols: string) => ({
          eq: () => ({
            maybeSingle: async () => {
              if (cols.includes('document_schema')) {
                return { data: concurrentRow, error: null };
              }
              return { data: { id: 'res-stale-same-user', user_id: 'user-1' }, error: null };
            },
          }),
        }),
        update: (payload: any) => ({
          eq: () => ({
            eq: (_col: string, val: string) => {
              eqUpdatedAts.push(val);
              updateCalls += 1;
              return {
                select: async () => {
                  if (updateCalls === 1) {
                    // Simulate concurrent edit between read and first write
                    return { data: [], error: null };
                  }
                  return { data: [{ id: initialRow.id, updated_at: payload.updated_at }], error: null };
                },
              };
            },
          }),
        }),
      };
    });

    const res = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-skills',
          resumeId: 'res-stale-same-user',
          skills: ['Docker', 'Kubernetes'],
        }),
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.resumeId).toBe('res-active-1');
    expect(json.addedSkills).toEqual(['Docker', 'Kubernetes']);
    // Preserved concurrent experience edit from retry refetch
    expect(json.document.experience[0].roleTitle).toBe('Staff Engineer');
    // Exact microsecond updated_at strings passed without Date truncation
    expect(eqUpdatedAts).toEqual([
      '2026-11-28T10:00:00.123456+00:00',
      '2026-11-28T10:00:01.654321+00:00',
    ]);
  });

  it('returns 409 when both conditional update attempts collide', async () => {
    const initialRow = makeResumeRow();
    mockGetActiveResumeRow.mockResolvedValueOnce({ row: initialRow, error: null });

    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: initialRow, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    }));

    const res = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: ['Docker'] }),
      })
    );
    expect(res.status).toBe(409);
  });

  it('seeds Technical from extractedProfile.skills when docSchema.skills is empty', async () => {
    const legacyRow = makeResumeRow({
      document_schema: {
        skills: [],
        extractedProfile: { skills: ['PostgreSQL', 'Redis'] },
      },
    });
    mockGetActiveResumeRow.mockResolvedValueOnce({ row: legacyRow, error: null });

    mockFrom.mockImplementation(() => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: async () => ({ data: [{ id: legacyRow.id }], error: null }),
          }),
        }),
      }),
    }));

    const res = await profilePOST(
      new Request('http://localhost/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-skills', skills: ['Docker', 'Kubernetes'] }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document.skills[0]).toEqual({
      category: 'Technical',
      items: ['PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
    });
  });

  it('returns 500 on /api/jobs and /api/jobs/[id] when getActiveResumeRow errors', async () => {
    mockGetActiveResumeRow.mockResolvedValue({ row: null, error: { message: 'timeout' } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'jobs') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({
            data: {
              id: 'job-1',
              title: 'Platform Engineer',
              company_name: 'Acme',
              location: 'Remote',
              is_active: true,
            },
            error: null,
          }),
        };
        return chain;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    });

    const listRes = await jobsGET(new Request('http://localhost/api/jobs'));
    expect(listRes.status).toBe(500);

    const detailRes = await jobDetailGET(new Request('http://localhost/api/jobs/job-1'), {
      params: Promise.resolve({ id: 'job-1' }),
    });
    expect(detailRes.status).toBe(500);
  });

  it('ignores stale ?skills= on /api/jobs when authenticated user has Master Resume and matches /api/jobs/[id]', async () => {
    const activeRow = makeResumeRow({
      document_schema: {
        skills: [
          {
            category: 'Technical',
            items: [
              'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10',
              'Docker', 'Kubernetes',
            ],
          },
        ],
        experience: [],
      },
    });
    mockGetActiveResumeRow.mockResolvedValue({ row: activeRow, error: null });

    const jobRow = {
      id: 'job-1',
      title: 'Platform Engineer',
      company_name: 'Acme',
      location: 'Remote',
      description: 'Looking for Docker and Kubernetes expertise.',
      requirements: 'Docker, Kubernetes',
      experience_level: 'Senior',
      external_apply_url: 'https://acme.com/jobs/1',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { city: 'Remote', company: null }, error: null }),
            }),
          }),
        };
      }
      if (table === 'job_insiders') {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === 'jobs') {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          or: () => chain,
          ilike: () => chain,
          gte: () => chain,
          order: () => chain,
          range: async () => ({ data: [jobRow], count: 1, error: null }),
          maybeSingle: async () => ({ data: jobRow, error: null }),
        };
        return chain;
      }
      return {};
    });

    // Pass stale 10-skill ?skills= without Docker/Kubernetes
    const listRes = await jobsGET(
      new Request('http://localhost/api/jobs?skills=S1,S2,S3,S4,S5,S6,S7,S8,S9,S10')
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();

    const detailRes = await jobDetailGET(new Request('http://localhost/api/jobs/job-1'), {
      params: Promise.resolve({ id: 'job-1' }),
    });
    expect(detailRes.status).toBe(200);
    const detailJson = await detailRes.json();

    expect(listJson.jobs[0].matching_skills).toEqual(detailJson.job.matching_skills);
    expect(listJson.jobs[0].missing_skills).toEqual(detailJson.job.missing_skills);
    expect(listJson.jobs[0].matching_skills).toEqual(expect.arrayContaining(['Docker', 'Kubernetes']));
    expect(listJson.jobs[0].missing_skills).toEqual([]);
  });
});
