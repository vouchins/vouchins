/**
 * @jest-environment node
 */

let mockAuthUser: { userId: string } | null = { userId: 'user-owner-123' };
let mockResumeRows: any[] = [];

jest.mock('@/lib/jobs/auth-guard', () => ({
  verifyJobsAccess: jest.fn(() =>
    Promise.resolve(
      mockAuthUser
        ? { allowed: true, userId: mockAuthUser.userId, isPro: true }
        : { allowed: false, userId: null, error: 'Unauthorized' }
    )
  ),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => {
      if (table === 'job_resumes') {
        const filters: Record<string, any> = {};
        let excludeId: string | null = null;

        const executeQuery = () => {
          return mockResumeRows.filter((r) => {
            if (excludeId && r.id === excludeId) return false;
            if (filters.id && r.id !== filters.id) return false;
            if (filters.user_id && r.user_id !== filters.user_id) return false;
            if (filters.custom_slug && (r.custom_slug || '').toLowerCase() !== filters.custom_slug) {
              return false;
            }
            if (
              filters['document_schema->>customSlug'] &&
              (r.document_schema?.customSlug || '').toLowerCase() !== filters['document_schema->>customSlug']
            ) {
              return false;
            }
            return true;
          });
        };

        const chain: any = {
          select: jest.fn(() => chain),
          eq: jest.fn((col: string, val: any) => {
            filters[col] = val;
            return chain;
          }),
          neq: jest.fn((col: string, val: any) => {
            if (col === 'id') excludeId = val;
            return chain;
          }),
          ilike: jest.fn((col: string, val: any) => {
            filters[col] = val.toLowerCase();
            return chain;
          }),
          order: jest.fn(() => chain),
          limit: jest.fn(() => chain),
          maybeSingle: jest.fn().mockImplementation(() => {
            const matches = executeQuery();
            return Promise.resolve({ data: matches[0] || null, error: null });
          }),
          single: jest.fn().mockImplementation(() => {
            const matches = executeQuery();
            return Promise.resolve({
              data: matches[0] || null,
              error: matches[0] ? null : new Error('Not found'),
            });
          }),
          then: (resolve: any, reject: any) =>
            Promise.resolve({ data: executeQuery(), error: null }).then(resolve, reject),
          update: jest.fn((payload: any) => {
            return {
              eq: jest.fn((c1: string, v1: any) => ({
                eq: jest.fn((c2: string, v2: any) => {
                  const target = mockResumeRows.find((r) => r.id === v1 && r.user_id === v2);
                  if (target) {
                    Object.assign(target, payload);
                  }
                  return Promise.resolve({ error: null });
                }),
              })),
            };
          }),
        };

        return chain;
      }

      if (table === 'users') {
        const chain: any = {
          select: jest.fn(() => chain),
          ilike: jest.fn(() => chain),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        };
        return chain;
      }

      return {};
    }),
  },
}));

import { validateCustomSlug, isSlugAvailable, findResumeBySlugOrId } from '@/lib/jobs/custom-slug';
import { GET as getSlugCheck, POST as postSlugSave } from '@/app/api/resume/custom-slug/route';

describe('Custom Resume Vanity Slug System', () => {
  beforeEach(() => {
    mockAuthUser = { userId: 'user-owner-123' };
    mockResumeRows = [
      {
        id: '11111111-2222-3333-4444-555555555555',
        user_id: 'user-owner-123',
        title: 'Master Resume',
        custom_slug: 'taher-dev',
        document_schema: {
          customSlug: 'taher-dev',
          contact: { fullName: 'Taher Shaik' },
        },
      },
      {
        id: '99999999-8888-7777-6666-555555555555',
        user_id: 'user-other-456',
        title: 'Competitor Resume',
        custom_slug: 'alex-engineer',
        document_schema: {
          customSlug: 'alex-engineer',
          contact: { fullName: 'Alex Rivera' },
        },
      },
    ];
  });

  describe('validateCustomSlug', () => {
    it('rejects empty or null slug', () => {
      expect(validateCustomSlug('').valid).toBe(false);
      expect(validateCustomSlug('   ').valid).toBe(false);
    });

    it('rejects slugs shorter than 3 characters', () => {
      const res = validateCustomSlug('ab');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 3 characters');
    });

    it('rejects slugs longer than 40 characters', () => {
      const longSlug = 'a'.repeat(45);
      const res = validateCustomSlug(longSlug);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('cannot exceed 40 characters');
    });

    it('rejects reserved system route handles', () => {
      expect(validateCustomSlug('admin').valid).toBe(false);
      expect(validateCustomSlug('jobs').valid).toBe(false);
      expect(validateCustomSlug('login').valid).toBe(false);
      expect(validateCustomSlug('resume').valid).toBe(false);
      expect(validateCustomSlug('api').valid).toBe(false);
    });

    it('normalizes spaces and uppercase characters into clean kebab-case', () => {
      const res = validateCustomSlug('  Taher  Shaik  ');
      expect(res.valid).toBe(true);
      expect(res.normalized).toBe('taher-shaik');
    });

    it('allows valid alphanumeric handles with single hyphens', () => {
      expect(validateCustomSlug('taher-shaik').valid).toBe(true);
      expect(validateCustomSlug('john-doe-99').valid).toBe(true);
      expect(validateCustomSlug('devops-ninja').valid).toBe(true);
    });
  });

  describe('isSlugAvailable', () => {
    it('flags already claimed slugs as unavailable', async () => {
      const res = await isSlugAvailable('alex-engineer');
      expect(res.available).toBe(false);
      expect(res.reason).toContain('already taken');
    });

    it('allows user to keep or re-save their own existing slug when excludeResumeId is passed', async () => {
      const res = await isSlugAvailable('taher-dev', '11111111-2222-3333-4444-555555555555');
      expect(res.available).toBe(true);
      expect(res.normalized).toBe('taher-dev');
    });

    it('returns available: true for an unassigned slug', async () => {
      const res = await isSlugAvailable('brand-new-candidate-url');
      expect(res.available).toBe(true);
      expect(res.normalized).toBe('brand-new-candidate-url');
    });
  });

  describe('findResumeBySlugOrId', () => {
    it('resolves resume by standard UUID directly', async () => {
      const resume = await findResumeBySlugOrId('11111111-2222-3333-4444-555555555555');
      expect(resume).not.toBeNull();
      expect(resume?.id).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('resolves resume by custom slug', async () => {
      const resume = await findResumeBySlugOrId('alex-engineer');
      expect(resume).not.toBeNull();
      expect(resume?.id).toBe('99999999-8888-7777-6666-555555555555');
      expect(resume?.title).toBe('Competitor Resume');
    });

    it('returns null if slug does not exist', async () => {
      const resume = await findResumeBySlugOrId('non-existent-candidate-slug');
      expect(resume).toBeNull();
    });
  });

  describe('GET /api/resume/custom-slug', () => {
    it('returns error when slug query parameter is missing', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug');
      const res = await getSlugCheck(req);
      const json = await res.json();

      expect(json.available).toBe(false);
      expect(json.error).toContain('Slug parameter is required');
    });

    it('returns available: false when slug is reserved or taken', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug?slug=admin');
      const res = await getSlugCheck(req);
      const json = await res.json();

      expect(json.available).toBe(false);
      expect(json.reason).toContain('reserved system path');
    });

    it('returns available: true when slug is valid and untaken', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug?slug=my-awesome-resume');
      const res = await getSlugCheck(req);
      const json = await res.json();

      expect(json.available).toBe(true);
      expect(json.normalized).toBe('my-awesome-resume');
    });
  });

  describe('POST /api/resume/custom-slug', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockAuthUser = null;

      const req = new Request('http://localhost:3000/api/resume/custom-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: '11111111-2222-3333-4444-555555555555', customSlug: 'taher-pro' }),
      });

      const res = await postSlugSave(req);
      expect(res.status).toBe(401);
    });

    it('rejects when target resume does not belong to user with 404', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: '99999999-8888-7777-6666-555555555555', customSlug: 'taher-steal' }),
      });

      const res = await postSlugSave(req);
      expect(res.status).toBe(404);
    });

    it('rejects when custom slug is already taken with 409 Conflict', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: '11111111-2222-3333-4444-555555555555',
          customSlug: 'alex-engineer',
        }),
      });

      const res = await postSlugSave(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toContain('already taken');
    });

    it('saves unique custom slug successfully with 200 OK', async () => {
      const req = new Request('http://localhost:3000/api/resume/custom-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: '11111111-2222-3333-4444-555555555555',
          customSlug: 'taher-principal-dev',
        }),
      });

      const res = await postSlugSave(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.customSlug).toBe('taher-principal-dev');
      expect(json.shareableUrl).toBe('/resume/taher-principal-dev');
    });
  });
});
