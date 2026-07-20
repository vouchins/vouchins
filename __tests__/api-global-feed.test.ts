/**
 * @jest-environment node
 */

import { GET } from '@/app/api/posts/get-posts/route';

// 1. Mock Next.js Headers & Cookies
const mockCookieStore = {
  get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(async () => mockCookieStore),
}));

// 2. Mock Supabase Server Client
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();
const mockLimit = jest.fn();
const mockTextSearch = jest.fn();

const mockQuery = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  order: mockOrder,
  range: mockRange,
  limit: mockLimit,
  textSearch: mockTextSearch,
};

mockSelect.mockReturnValue(mockQuery);
mockEq.mockReturnValue(mockQuery);
mockSingle.mockReturnValue(mockQuery);
mockMaybeSingle.mockReturnValue(mockQuery);
mockOrder.mockReturnValue(mockQuery);
mockRange.mockReturnValue(mockQuery);
mockLimit.mockReturnValue(mockQuery);
mockTextSearch.mockReturnValue(mockQuery);

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase),
}));

// Set Supabase environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

describe('Global Feed & City Filtering System - API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQuery);
    
    // Set default happy path mocks for the GET endpoint
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'test-user-id',
        full_name: 'Test User',
        email: 'test@example.com',
        city: 'Hyderabad',
        company_id: 'company-123',
        is_verified: true,
        onboarded: true,
        is_admin: false,
        company: { id: 'company-123', name: 'Test Co', domain: 'test.example' },
      },
      error: null,
    });
    mockLimit.mockResolvedValue({
      data: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          text: 'Hello post 1',
          created_at: '2026-07-01T00:00:00.000Z',
          user: { city: 'Hyderabad', company: { name: 'Test Co', domain: 'test.example' } },
          comments: [{ count: 0 }],
          vouches: [{ count: 0 }],
          saved_posts: [{ count: 0 }],
          post_views: [{ count: 0 }],
        },
      ],
      error: null,
    });
  });

  it('should bypass city filtering when city parameter is "All Cities"', async () => {
    const request = new Request('http://localhost/api/posts/get-posts?city=All+Cities');
    const response = await GET(request);
    expect(response.status).toBe(200);

    // Verify user.city filter is NOT applied
    expect(mockEq).not.toHaveBeenCalledWith('user.city', expect.any(String));
    
    // Verify other default filters are applied
    expect(mockEq).toHaveBeenCalledWith('is_removed', false);
    expect(mockEq).toHaveBeenCalledWith('visibility', 'all');
  });

  it('should bypass city filtering when city parameter is "Global"', async () => {
    const request = new Request('http://localhost/api/posts/get-posts?city=Global');
    const response = await GET(request);
    expect(response.status).toBe(200);

    // Verify user.city filter is NOT applied
    expect(mockEq).not.toHaveBeenCalledWith('user.city', expect.any(String));
  });

  it('should filter by a specific city when requested', async () => {
    const request = new Request('http://localhost/api/posts/get-posts?city=Hyderabad');
    const response = await GET(request);
    expect(response.status).toBe(200);

    // Verify user.city filter IS applied
    expect(mockEq).toHaveBeenCalledWith('user.city', 'Hyderabad');
  });

  it('should default to "All Cities" (bypass city filter) if city parameter is omitted', async () => {
    const request = new Request('http://localhost/api/posts/get-posts');
    const response = await GET(request);
    expect(response.status).toBe(200);

    // Verify user.city filter is NOT applied since default city is "All Cities"
    expect(mockEq).not.toHaveBeenCalledWith('user.city', expect.any(String));
  });
});
