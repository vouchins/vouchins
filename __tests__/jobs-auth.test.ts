/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn((token?: string) => {
        if (token === 'valid-token') {
          return Promise.resolve({
            data: { user: { id: 'bearer-user-id', email: 'bearer@example.com' } },
            error: null,
          });
        }
        return Promise.resolve({
          data: { user: null },
          error: new Error('No session'),
        });
      }),
    },
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'mock-user-123', is_admin: false },
            error: null,
          }),
          in: jest.fn(() => ({
            gt: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'mock-dev-user-id', is_admin: true, email: 'dev@localhost' },
              error: null,
            }),
          })),
        })),
      })),
    })),
  },
}));

import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { POST as extractPOST } from '@/app/api/jobs/extract/route';

describe('Jobs Auth & Subdomain Guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows access on jobs.localhost even when cookies are absent', async () => {
    (process.env as any).NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

    const req = new Request('http://jobs.localhost:3000/api/jobs/extract', {
      method: 'POST',
      headers: {
        host: 'jobs.localhost:3000',
      },
    });

    const guard = await verifyJobsAccess(req);
    expect(guard.allowed).toBe(true);
    expect(guard.userId).toBe('mock-dev-user-id');
  });

  it('rejects unauthenticated requests in production even if host header is localhost', async () => {
    (process.env as any).NODE_ENV = 'production';
    const req = new Request('http://localhost:3000/api/jobs/extract', {
      method: 'POST',
      headers: {
        host: 'jobs.localhost:3000',
      },
    });

    const guard = await verifyJobsAccess(req);
    expect(guard.allowed).toBe(false);
    expect(guard.reason).toBe('UNAUTHENTICATED');
  });

  it('authenticates successfully via Bearer token', async () => {
    const req = new Request('https://vouchins.com/api/jobs/extract', {
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    const guard = await verifyJobsAccess(req);
    expect(guard.allowed).toBe(true);
    expect(guard.userId).toBe('bearer-user-id');
  });

  it('/api/jobs/extract does not throw 401 on jobs.localhost when file is missing', async () => {
    (process.env as any).NODE_ENV = 'development';
    const req = new Request('http://jobs.localhost:3000/api/jobs/extract', {
      method: 'POST',
      headers: {
        host: 'jobs.localhost:3000',
      },
      body: new FormData(),
    });

    const res = await extractPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });

  it('keeps /jobs public for SEO discovery but excludes /jobs/profile and /jobs/resume from publicPrefixes', () => {
    const fs = require('fs');
    const path = require('path');
    const middlewareSource = fs.readFileSync(
      path.join(process.cwd(), 'middleware.ts'),
      'utf8'
    );

    // /jobs is in publicPaths
    expect(middlewareSource).toContain("'/jobs'");
    expect(middlewareSource).toContain("'/jobs/dashboard'");
    expect(middlewareSource).toContain("'/jobs/recommend'");

    // /jobs is NOT in publicPrefixes (so /jobs/profile and /jobs/resume require authentication)
    expect(middlewareSource).not.toContain("const publicPrefixes = ['/blog', '/posts/', '/flatmates-in-hyderabad', '/jobs']");
    expect(middlewareSource).toContain("const publicPrefixes = ['/blog', '/posts/', '/flatmates-in-hyderabad']");
  });
});
