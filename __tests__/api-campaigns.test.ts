/**
 * @jest-environment node
 */

import { POST, DELETE } from '@/app/api/admin/campaigns/route';

// Mock Next.js Headers & Cookies
const mockCookieStore = {
  get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
  set: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockImplementation(async () => mockCookieStore),
}));

// Mock Nodemailer Transporter
const mockSendMail = jest.fn();
jest.mock('@/lib/email', () => ({
  transporter: {
    sendMail: (...args: any[]) => mockSendMail(...args),
  },
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
  in: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
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

describe('Campaigns Admin API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue(mockQuery);
    process.env.SES_FROM_EMAIL = 'admin@vouchins.com';
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const request = new Request('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Subject',
        body: 'Hello {name}',
        targetType: 'email',
        recipientGroupId: 'default_all',
        recipientGroupName: 'All Users',
        status: 'draft',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should send email with replaced placeholders for registered user group', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-id' } } });

    // Mock query calls:
    // 1. users: check is_admin
    // 2. campaigns: insert row
    // 3. users: select target users
    // 4. campaigns: update row to sent
    mockThen
      .mockImplementationOnce((resolve) => resolve({ data: { is_admin: true }, error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: { id: 'campaign-1', title: 'Hello {{name}}', body: 'Hi {name}!' }, error: null }))
      .mockImplementationOnce((resolve) => resolve({
        data: [
          { id: 'user-1', email: 'user1@vouchins.com', full_name: 'John Doe' }
        ],
        error: null
      }))
      .mockImplementationOnce((resolve) => resolve({ data: { id: 'campaign-1', sent_count: 1 }, error: null }));

    const request = new Request('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Hello {{name}}',
        body: 'Hi {name}!',
        targetType: 'email',
        recipientGroupId: 'default_all',
        recipientGroupName: 'All Users',
        status: 'sent',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify nodemailer sendMail was called with personalized parameters!
    expect(mockSendMail).toHaveBeenCalled();
    const mailOptions = mockSendMail.mock.calls[0][0];
    expect(mailOptions.to).toBe('user1@vouchins.com');
    expect(mailOptions.subject).toBe('Hello John Doe');
    expect(mailOptions.html).toContain('Hi John Doe!');
  });

  it('should parse manual emails and send personalized templates', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-id' } } });

    // Mock query calls:
    // 1. users: check is_admin
    // 2. campaigns: insert row
    // 3. users: parallel check of corporate email
    // 4. users: parallel check of personal email
    // 5. campaigns: update row to sent
    mockThen
      .mockImplementationOnce((resolve) => resolve({ data: { is_admin: true }, error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: { id: 'campaign-2', title: 'Welcome' }, error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'user-2', email: 'registered@vouchins.com', full_name: 'Alice Smith' }], error: null })) // resEmail
      .mockImplementationOnce((resolve) => resolve({ data: [], error: null })) // resPersonal
      .mockImplementationOnce((resolve) => resolve({ data: { id: 'campaign-2', sent_count: 2 }, error: null }));

    const request = new Request('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Hello {name}',
        body: 'Email content for {name}',
        targetType: 'email',
        recipientGroupId: 'manual_emails',
        recipientGroupName: 'registered@vouchins.com, unregistered@vouchins.com',
        status: 'sent',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Should send 2 emails (one for Alice, one fallback for unregistered)
    expect(mockSendMail).toHaveBeenCalledTimes(2);

    const call1 = mockSendMail.mock.calls[0][0];
    expect(call1.to).toBe('registered@vouchins.com');
    expect(call1.subject).toBe('Hello Alice Smith');

    const call2 = mockSendMail.mock.calls[1][0];
    expect(call2.to).toBe('unregistered@vouchins.com');
    expect(call2.subject).toBe('Hello there'); // Fallback name
  });

  it('should delete campaign and return 200', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-id' } } });

    // Mock query calls:
    // 1. users: check is_admin
    // 2. campaigns: delete query
    mockThen
      .mockImplementationOnce((resolve) => resolve({ data: { is_admin: true }, error: null }))
      .mockImplementationOnce((resolve) => resolve({ data: null, error: null }));

    const request = new Request('http://localhost/api/admin/campaigns?id=campaign-to-delete', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
  });
});
