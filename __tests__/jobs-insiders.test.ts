/**
 * @jest-environment node
 */

let mockAuthUser: any = null;
let mockUserData: any = null;
let mockCompaniesData: any[] = [];
let mockUsersData: any[] = [];
let mockInsertedMessage: any = null;

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: mockAuthUser },
          error: mockAuthUser ? null : new Error('Unauthorized'),
        })
      ),
    },
  })),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(() => ({ value: 'test-cookie' })),
  }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn((table: string) => {
      if (table === 'companies') {
        return {
          select: jest.fn(() => ({
            or: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: mockCompaniesData, error: null }),
            })),
            ilike: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: mockCompaniesData, error: null }),
            })),
          })),
        };
      }

      if (table === 'users') {
        const createChain = (resolveData: any) => {
          const chain: any = {
            eq: jest.fn(() => chain),
            or: jest.fn(() => chain),
            ilike: jest.fn(() => chain),
            order: jest.fn(() => chain),
            limit: jest.fn().mockImplementation(() => Promise.resolve({ data: resolveData, error: null })),
            single: jest.fn().mockImplementation(() =>
              Promise.resolve({
                data: mockUserData,
                error: mockUserData ? null : new Error('Not found'),
              })
            ),
            maybeSingle: jest.fn().mockImplementation(() =>
              Promise.resolve({
                data: mockUserData,
                error: null,
              })
            ),
          };
          return chain;
        };

        return {
          select: jest.fn(() => createChain(mockUsersData)),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }

      if (table === 'messages') {
        return {
          insert: jest.fn((msg: any) => {
            mockInsertedMessage = msg;
            return Promise.resolve({ data: msg, error: null });
          }),
        };
      }

      return {};
    }),
  },
}));

import { GET as getInsiders, formatPartialName } from '@/app/api/jobs/insiders/route';
import { POST as postReferral } from '@/app/api/jobs/referrals/route';

describe('Jobs: Verified Insiders & Verification Gated Connection', () => {
  beforeEach(() => {
    mockAuthUser = null;
    mockUserData = null;
    mockCompaniesData = [];
    mockUsersData = [];
    mockInsertedMessage = null;
  });

  describe('formatPartialName helper', () => {
    it('masks full names with first letter of first name and first letter of second name', () => {
      expect(formatPartialName('Shaik Taher')).toBe('S**** T****');
      expect(formatPartialName('Stephen John')).toBe('S**** J****');
      expect(formatPartialName('Sabyasachi Gosh')).toBe('S**** G****');
      expect(formatPartialName('Raja Harsh Vardhan Dubey')).toBe('R**** D****');
      expect(formatPartialName('SingleName')).toBe('S****');
      expect(formatPartialName('')).toBe('V**** M****');
    });
  });

  describe('GET /api/jobs/insiders', () => {
    it('should return empty list when no company or domain query param is passed', async () => {
      const req = new Request('http://localhost:3000/api/jobs/insiders');
      const res = await getInsiders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.insiders).toEqual([]);
      expect(json.totalCount).toBe(0);
    });

    it('should return masked partial name when viewer is unverified or guest', async () => {
      mockAuthUser = null;
      mockUserData = null;
      mockCompaniesData = [
        { id: 'comp-oracle-123', name: 'Oracle', domain: 'oracle.com' },
      ];
      mockUsersData = [
        {
          id: 'user-sabyasachi',
          full_name: 'Sabyasachi Gosh',
          email: 'sabyasachi@oracle.com',
          city: 'Hyderabad',
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Senior Principal Staff Architect\nFocusing on high concurrency systems.',
          vouch_points: 50,
          is_verified: true,
          is_active: true,
          company: { id: 'comp-oracle-123', name: 'Oracle', domain: 'oracle.com' },
        },
      ];

      const req = new Request('http://localhost:3000/api/jobs/insiders?company=Oracle&domain=oracle.com');
      const res = await getInsiders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.insiders.length).toBe(1);
      expect(json.insiders[0]).toMatchObject({
        id: 'user-sabyasachi',
        name: 'S**** G****',
        companyName: 'Oracle',
        domain: 'oracle.com',
        city: 'Hyderabad',
        isVerified: true,
        vouchPoints: 50,
        role: 'Senior Principal Staff Architect',
        isRegisteredUser: true,
        isMasked: true,
        avatarUrl: null,
      });
    });

    it('should return full name and active avatar when viewer is corporate verified', async () => {
      mockAuthUser = { id: 'viewer-verified', email: 'taher@oracle.com' };
      mockUserData = {
        id: 'viewer-verified',
        full_name: 'Shaik Taher',
        email: 'taher@oracle.com',
        is_verified: true,
      };
      mockCompaniesData = [
        { id: 'comp-oracle-123', name: 'Oracle', domain: 'oracle.com' },
      ];
      mockUsersData = [
        {
          id: 'user-sabyasachi',
          full_name: 'Sabyasachi Gosh',
          email: 'sabyasachi@oracle.com',
          city: 'Hyderabad',
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Senior Principal Staff Architect\nFocusing on high concurrency systems.',
          vouch_points: 50,
          is_verified: true,
          is_active: true,
          company: { id: 'comp-oracle-123', name: 'Oracle', domain: 'oracle.com' },
        },
      ];

      const req = new Request('http://localhost:3000/api/jobs/insiders?company=Oracle&domain=oracle.com');
      const res = await getInsiders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.insiders.length).toBe(1);
      expect(json.insiders[0]).toMatchObject({
        id: 'user-sabyasachi',
        name: 'Sabyasachi Gosh',
        companyName: 'Oracle',
        domain: 'oracle.com',
        city: 'Hyderabad',
        isVerified: true,
        vouchPoints: 50,
        role: 'Senior Principal Staff Architect',
        isRegisteredUser: true,
        isMasked: false,
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should fallback to curated corporate directory for DE Shaw when DB has 0 registered users', async () => {
      mockAuthUser = { id: 'viewer-admin', email: 'admin@vouchins.com' };
      mockUserData = {
        id: 'viewer-admin',
        full_name: 'Admin User',
        email: 'admin@vouchins.com',
        is_verified: false,
        is_admin: true,
      };
      mockCompaniesData = [];
      mockUsersData = [];

      const req = new Request('http://localhost:3000/api/jobs/insiders?company=DE%20Shaw');
      const res = await getInsiders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.totalCount).toBe(4);
      expect(json.insiders.length).toBe(4);
      expect(json.insiders[0].companyName).toBe('DE Shaw');
      expect(json.insiders[0].name).toBe('Vikram Malhotra');
      expect(json.insiders[0].isMasked).toBe(false);
      expect(json.insiders[0].isVerified).toBe(true);
      expect(json.insiders[1].name).toBe('Ananya Kulkarni');
      expect(json.insiders[2].name).toBe('Rohan Singhania');
      expect(json.insiders[3].name).toBe('Pooja Sharma');
    });

    it('should return masked curated insiders for unverified users looking at DE Shaw', async () => {
      mockAuthUser = null;
      mockUserData = null;
      mockCompaniesData = [];
      mockUsersData = [];

      const req = new Request('http://localhost:3000/api/jobs/insiders?company=DE%20Shaw');
      const res = await getInsiders(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.totalCount).toBe(4);
      expect(json.insiders.length).toBe(4);
      expect(json.insiders[0].name).toBe('V**** M****');
      expect(json.insiders[0].isMasked).toBe(true);
      expect(json.insiders[0].avatarUrl).toBeNull();
    });
  });

  describe('POST /api/jobs/referrals - Verification Gate', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      mockAuthUser = null;

      const req = new Request('http://localhost:3000/api/jobs/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insiderId: 'user-sabyasachi',
          companyName: 'Oracle',
          jobId: 'job-123',
          note: 'Please refer me',
        }),
      });

      const res = await postReferral(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.code).toBe('AUTH_REQUIRED');
    });

    it('should reject unverified users with 403 Forbidden and code VERIFICATION_REQUIRED', async () => {
      mockAuthUser = { id: 'unverified-user-1', email: 'applicant@gmail.com' };
      mockUserData = {
        id: 'unverified-user-1',
        full_name: 'Unverified Applicant',
        email: 'applicant@gmail.com',
        is_verified: false,
      };

      const req = new Request('http://localhost:3000/api/jobs/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insiderId: '9a496a1b-61e4-4906-ae4a-88a603a2737a',
          companyName: 'Oracle',
          jobId: 'job-123',
          note: 'Please refer me',
        }),
      });

      const res = await postReferral(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.code).toBe('VERIFICATION_REQUIRED');
      expect(json.error).toContain('requires a verified corporate account');
      expect(mockInsertedMessage).toBeNull();
    });

    it('should permit verified users to connect and dispatch referral request to insider', async () => {
      mockAuthUser = { id: 'verified-candidate-1', email: 'verified@tech.com' };
      mockUserData = {
        id: 'verified-candidate-1',
        full_name: 'Verified Candidate',
        email: 'verified@tech.com',
        is_verified: true,
      };

      const insiderUuid = '9a496a1b-61e4-4906-ae4a-88a603a2737a';
      const req = new Request('http://localhost:3000/api/jobs/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insiderId: insiderUuid,
          companyName: 'Oracle',
          jobId: 'job-123',
          note: 'Hi, I would love an internal referral.',
        }),
      });

      const res = await postReferral(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockInsertedMessage).toEqual({
        sender_id: 'verified-candidate-1',
        receiver_id: insiderUuid,
        text: expect.stringContaining('[Internal Referral Request · Oracle]'),
      });
    });

    it('should permit platform admin users to request referrals even if is_verified is false', async () => {
      mockAuthUser = { id: 'admin-candidate-1', email: 'admin@vouchins.com' };
      mockUserData = {
        id: 'admin-candidate-1',
        full_name: 'Admin Candidate',
        email: 'admin@vouchins.com',
        is_verified: false,
        is_admin: true,
      };

      const insiderUuid = '9a496a1b-61e4-4906-ae4a-88a603a2737a';
      const req = new Request('http://localhost:3000/api/jobs/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insiderId: insiderUuid,
          companyName: 'DE Shaw',
          jobId: 'curated-deshaw-member-technical-hyd',
          note: 'Hello, looking forward to connecting.',
        }),
      });

      const res = await postReferral(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockInsertedMessage).toEqual({
        sender_id: 'admin-candidate-1',
        receiver_id: insiderUuid,
        text: expect.stringContaining('[Internal Referral Request · DE Shaw]'),
      });
    });
  });
});

