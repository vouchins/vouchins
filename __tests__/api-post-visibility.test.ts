/**
 * @jest-environment node
 */

import { GET } from '@/app/api/posts/[id]/route';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Mock cookies and Supabase SSR
const mockGetUser = jest.fn();
jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    })
  ),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock supabaseAdmin
jest.mock('@/lib/supabase/admin', () => {
  return {
    supabaseAdmin: {
      from: jest.fn(),
    },
  };
});

describe('API: /api/posts/[id] Post Visibility & Redaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPublicPost = {
    id: 'post-public-1',
    user_id: 'user-1',
    text: 'Looking for a flatmate in Hitec City. Call me at 9876543210 or email test@google.com for photos.',
    visibility: 'public',
    category: 'housing',
    sub_category: 'flatmates',
    image_urls: ['https://example.com/flat.jpg'],
    is_removed: false,
    created_at: '2026-08-30T10:00:00Z',
    user: {
      id: 'user-1',
      full_name: 'Sundar Pichai',
      email: 'sundar@google.com',
      city: 'Hyderabad',
      avatar_url: null,
      company_id: 'comp-1',
      company: { id: 'comp-1', name: 'Google', domain: 'google.com' },
    },
    comments: [],
  };

  const mockVerifiedNetworkPost = {
    id: 'post-all-1',
    user_id: 'user-1',
    text: 'This is an internal verified discussion about compensation and housing near Google Hyderabad campus. Call 9876543210.',
    visibility: 'all',
    category: 'housing',
    sub_category: 'flatmates',
    image_urls: ['https://example.com/internal.jpg'],
    is_removed: false,
    created_at: '2026-08-30T10:00:00Z',
    user: {
      id: 'user-1',
      full_name: 'Sundar Pichai',
      email: 'sundar@google.com',
      city: 'Hyderabad',
      avatar_url: null,
      company_id: 'comp-1',
      company: { id: 'comp-1', name: 'Google', domain: 'google.com' },
    },
    comments: [],
  };

  const mockCompanyPost = {
    id: 'post-company-1',
    user_id: 'user-1',
    text: 'Google internal team announcement.',
    visibility: 'company',
    category: 'referrals',
    is_removed: false,
    created_at: '2026-08-30T10:00:00Z',
    user: {
      id: 'user-1',
      full_name: 'Sundar Pichai',
      company_id: 'comp-1',
      company: { id: 'comp-1', name: 'Google', domain: 'google.com' },
    },
    comments: [],
  };

  it('returns full body with contact details stripped and masked author name for unauthenticated viewer on public post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockPublicPost, error: null }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/posts/post-public-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'post-public-1' }) });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.isLoggedIn).toBe(false);
    expect(json.isVerified).toBe(false);
    expect(json.isPublicPost).toBe(true);
    expect(json.isTruncated).toBe(false);

    // Full text is preserved, but phone numbers and emails are replaced
    expect(json.post.text).toContain('Looking for a flatmate in Hitec City');
    expect(json.post.text).toContain('[Verify corporate email to view contact info]');
    expect(json.post.text).not.toContain('9876543210');
    expect(json.post.text).not.toContain('test@google.com');

    // Author name is masked
    expect(json.post.user.full_name).toBe('S****r P****i');
    expect(json.post.user.email).toBeUndefined();
  });

  it('returns 50-character truncated preview for unauthenticated viewer on Verified Network (all) post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockVerifiedNetworkPost, error: null }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/posts/post-all-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'post-all-1' }) });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.isLoggedIn).toBe(false);
    expect(json.isVerified).toBe(false);
    expect(json.isPublicPost).toBe(false);
    expect(json.isTruncated).toBe(true);
    expect(json.post.text.endsWith('...')).toBe(true);
    expect(json.post.text.length).toBeLessThan(65);
  });

  it('returns 403 Forbidden for unauthenticated viewer on company post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockCompanyPost, error: null }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/posts/post-company-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'post-company-1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 200 full unredacted post for verified member on public post', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'viewer-1' } } });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'posts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: mockPublicPost, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'viewer-1', is_verified: true, company_id: 'comp-2' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });

    const request = new Request('http://localhost/api/posts/post-public-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'post-public-1' }) });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.isLoggedIn).toBe(true);
    expect(json.isVerified).toBe(true);
    expect(json.isPublicPost).toBe(true);
    expect(json.isTruncated).toBe(false);
    expect(json.post.text).toContain('9876543210');
    expect(json.post.user.full_name).toBe('Sundar Pichai');
  });
});
