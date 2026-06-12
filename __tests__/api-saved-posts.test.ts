/**
 * @jest-environment node
 */

import { GET } from '@/app/api/posts/saved/route';

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
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockRange = jest.fn();

const mockQuery = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
  order: mockOrder,
  range: mockRange,
};

mockSelect.mockReturnValue(mockQuery);
mockEq.mockReturnValue(mockQuery);
mockSingle.mockReturnValue(mockQuery);
mockOrder.mockReturnValue(mockQuery);
mockRange.mockReturnValue(mockQuery);

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase),
}));

describe('Saved Posts API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQuery);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new Request('http://localhost/api/posts/saved');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 404 if user data is not found in the users table', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    mockSingle.mockResolvedValue({ data: null }); // Simulate missing user record
    
    const request = new Request('http://localhost/api/posts/saved');
    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it('should return 403 Forbidden if user is unverified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    mockSingle.mockResolvedValue({
      data: { is_verified: false },
    });
    
    const request = new Request('http://localhost/api/posts/saved');
    const response = await GET(request);
    
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Forbidden: Verified users only');
  });

  it('should return 200 and list of posts if user is verified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    mockSingle.mockResolvedValue({
      data: { is_verified: true },
    });
    
    mockRange.mockResolvedValue({
      data: [
        { post: { id: 'post-1', text: 'Saved Post 1', is_removed: false } },
        { post: { id: 'post-2', text: 'Saved Post 2', is_removed: false } },
      ],
      error: null,
    });
    
    const request = new Request('http://localhost/api/posts/saved');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.posts).toHaveLength(2);
    expect(json.hasMore).toBe(false); // Since we mocked 2 items and limit is 50
  });
});
