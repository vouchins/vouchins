/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '@/app/api/admin/jobs/crawl/restrictions/route';

jest.mock('@/lib/admin/auth', () => ({
  requireActiveAdmin: jest.fn().mockResolvedValue({ user: { id: 'admin-1', is_admin: true } }),
}));

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe('Admin Crawl Restrictions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/jobs/crawl/restrictions', () => {
    it('returns restricted companies list from database', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          order: jest.fn().mockResolvedValue({
            data: [
              { id: '1', name: 'Infosys', company_id: 'comp-1', created_at: '2026-11-14T00:00:00Z' },
              { id: '2', name: 'TCS', company_id: null, created_at: '2026-11-14T00:00:00Z' },
            ],
            error: null,
          }),
        }),
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.restrictedCompanies).toEqual(['Infosys', 'TCS']);
    });

    it('handles missing table gracefully when migration has not run yet', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '42P01', message: 'relation "crawl_restricted_companies" does not exist' },
          }),
        }),
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.restrictedCompanies).toEqual([]);
      expect(body.tableMissing).toBe(true);
    });
  });

  describe('POST /api/admin/jobs/crawl/restrictions', () => {
    it('saves restricted company to Supabase database', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'companies') {
          return {
            select: () => ({
              ilike: () => ({
                limit: () => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'c-1', name: 'Wipro' } }),
                }),
              }),
            }),
            update: () => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'crawl_restricted_companies') {
          return {
            upsert: mockUpsert,
            select: () => ({
              order: jest.fn().mockResolvedValue({
                data: [{ name: 'Wipro' }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost/api/admin/jobs/crawl/restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'Wipro' }),
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.restrictedCompanies).toContain('Wipro');
      expect(mockUpsert).toHaveBeenCalledWith(
        { name: 'Wipro', company_id: 'c-1' },
        { onConflict: 'name' }
      );
    });
  });

  describe('DELETE /api/admin/jobs/crawl/restrictions', () => {
    it('removes a restricted company by name', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        ilike: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'crawl_restricted_companies') {
          return {
            delete: mockDelete,
            select: () => ({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        if (table === 'companies') {
          return {
            update: () => ({
              ilike: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {};
      });

      const req = new Request('http://localhost/api/admin/jobs/crawl/restrictions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: 'Wipro' }),
      });

      const res = await DELETE(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.restrictedCompanies).toEqual([]);
    });
  });
});

