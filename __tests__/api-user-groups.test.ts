/**
 * @jest-environment node
 */

import { NextResponse } from 'next/server';
import { GET } from '@/app/api/admin/user-groups/route';

const mockRequireActiveAdmin = jest.fn();
jest.mock('@/lib/admin/auth', () => ({
  requireActiveAdmin: () => mockRequireActiveAdmin(),
}));

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

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe('User Groups Admin API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQuery);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockRequireActiveAdmin.mockResolvedValue({
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    mockRequireActiveAdmin.mockResolvedValue({
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });

    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Forbidden');
  });

  it('should return 200 and list of user groups if user is admin', async () => {
    mockRequireActiveAdmin.mockResolvedValue({
      user: { id: 'test-user-id' },
      profile: { id: 'test-user-id', is_admin: true, is_active: true },
    });

    // Set up ordered resolves for the `.then()` handler of our chain
    mockThen
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'group-1', name: 'Custom Group', description: 'Test', is_system: false }], error: null })) // 1. custom groups
      .mockImplementationOnce((resolve) => resolve({ data: [{ group_id: 'group-1' }], error: null })) // 2. member counts
      .mockImplementationOnce((resolve) => resolve({ count: 10, error: null })) // 3. total active
      .mockImplementationOnce((resolve) => resolve({ count: 5, error: null })) // 4. verified active
      .mockImplementationOnce((resolve) => resolve({ count: 5, error: null })) // 5. unverified active
      .mockImplementationOnce((resolve) => resolve({ data: [{ provider: 'google' }], error: null })) // 6. providers
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'comp-1', name: 'Google' }], error: null })) // 7. companies
      .mockImplementationOnce((resolve) => resolve({ data: [{ company_id: 'comp-1' }], error: null })); // 8. user companies

    const request = new Request('http://localhost/api/admin/user-groups');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.groups).toBeDefined();
    expect(json.groups.length).toBeGreaterThan(0);
    const unverifiedGroup = json.groups.find((g: any) => g.id === 'default_unverified');
    expect(unverifiedGroup).toBeDefined();
    expect(unverifiedGroup.name).toBe('Unverified Users');
    expect(unverifiedGroup.member_count).toBe(5);
  });
});
