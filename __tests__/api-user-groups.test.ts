/**
 * @jest-environment node
 */

import { GET } from '@/app/api/admin/user-groups/route';

// Mock Next.js Headers & Cookies
const mockCookieStore = {
  get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(async () => mockCookieStore),
}));

// Mock Supabase Clients
const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockThen = jest.fn();

const mockQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  then: mockThen,
};

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
};

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('User Groups Admin API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQuery);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    
    mockThen.mockImplementationOnce((resolve) => resolve({
      data: { is_admin: false },
      error: null
    }));

    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Forbidden');
  });

  it('should return 200 and list of user groups if user is admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-id' } } });
    
    // Set up ordered resolves for the `.then()` handler of our chain
    mockThen
      .mockImplementationOnce((resolve) => resolve({ data: { is_admin: true }, error: null })) // 1. admin check
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'group-1', name: 'Custom Group', description: 'Test', is_system: false }], error: null })) // 2. custom groups
      .mockImplementationOnce((resolve) => resolve({ data: [{ group_id: 'group-1' }], error: null })) // 3. member counts
      .mockImplementationOnce((resolve) => resolve({ count: 10, error: null })) // 4. total active
      .mockImplementationOnce((resolve) => resolve({ count: 5, error: null })) // 5. verified active
      .mockImplementationOnce((resolve) => resolve({ data: [{ provider: 'google' }], error: null })) // 6. providers
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'comp-1', name: 'Google' }], error: null })) // 7. companies
      .mockImplementationOnce((resolve) => resolve({ data: [{ company_id: 'comp-1' }], error: null })); // 8. user companies

    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.groups).toBeDefined();
    expect(json.groups.length).toBeGreaterThan(0);
  });
});
