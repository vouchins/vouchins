/**
 * @jest-environment node
 */

import { GET } from "@/app/api/cron/verification-reminders/route";

const mockSendVerificationReminderEmail = jest.fn();
const mockGetTargetNotificationEmail = jest.fn();
const mockGetUnsubscribedCampaignEmails = jest.fn();
const mockAdminFrom = jest.fn();

jest.mock("@/lib/email-notifications", () => ({
  sendVerificationReminderEmail: (...args: unknown[]) => mockSendVerificationReminderEmail(...args),
  getTargetNotificationEmail: (user: any) => mockGetTargetNotificationEmail(user),
}));

jest.mock("@/lib/marketing/email-preferences", () => ({
  getUnsubscribedCampaignEmails: (...args: unknown[]) => mockGetUnsubscribedCampaignEmails(...args),
  normalizeCampaignEmail: (email: string) => email?.trim().toLowerCase(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockAdminFrom(...args),
  },
}));

describe("verification reminders cron API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    mockGetTargetNotificationEmail.mockImplementation((u: any) => u.personal_email || u.email);
    mockGetUnsubscribedCampaignEmails.mockResolvedValue(new Set());
  });

  it("returns 401 when authorization header is missing or invalid", async () => {
    const resNoAuth = await GET(new Request("http://localhost/api/cron/verification-reminders"));
    expect(resNoAuth.status).toBe(401);

    const resWrongAuth = await GET(
      new Request("http://localhost/api/cron/verification-reminders", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );
    expect(resWrongAuth.status).toBe(401);
    expect(mockSendVerificationReminderEmail).not.toHaveBeenCalled();
  });

  it("returns message when no unverified users are due for reminder", async () => {
    const mockSelectChain: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockAdminFrom.mockReturnValue(mockSelectChain);

    const res = await GET(
      new Request("http://localhost/api/cron/verification-reminders", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("No unverified users due for reminder");
    expect(mockSendVerificationReminderEmail).not.toHaveBeenCalled();
  });

  it("sends reminder emails to eligible unverified users and marks them as reminded", async () => {
    const mockUsers = [
      {
        id: "user-1",
        email: "alice@company.com",
        personal_email: "alice@gmail.com",
        full_name: "Alice Smith",
        is_verified: false,
        is_active: true,
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        verification_reminder_sent_at: null,
      },
      {
        id: "user-2",
        email: "bob@company.com",
        personal_email: null,
        full_name: "Bob Jones",
        is_verified: null,
        is_active: null,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        verification_reminder_sent_at: null,
      },
    ];

    const mockUpdate = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null }),
    });

    const mockSelectChain: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      update: mockUpdate,
    };

    mockAdminFrom.mockReturnValue(mockSelectChain);
    mockSendVerificationReminderEmail.mockResolvedValue(true);

    const res = await GET(
      new Request("http://localhost/api/cron/verification-reminders", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalEligible).toBe(2);
    expect(body.sentCount).toBe(2);

    expect(mockSendVerificationReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockSendVerificationReminderEmail).toHaveBeenCalledWith("alice@gmail.com", "Alice Smith", "user-1");
    expect(mockSendVerificationReminderEmail).toHaveBeenCalledWith("bob@company.com", "Bob Jones", "user-2");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        verification_reminder_sent_at: expect.any(String),
      }),
    );
  });

  it("filters out unsubscribed users and continues sending to subscribed users", async () => {
    const mockUsers = [
      {
        id: "user-1",
        email: "unsub@company.com",
        personal_email: null,
        full_name: "Unsubscribed User",
        is_verified: false,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        verification_reminder_sent_at: null,
      },
      {
        id: "user-2",
        email: "active@company.com",
        personal_email: null,
        full_name: "Active User",
        is_verified: false,
        created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
        verification_reminder_sent_at: null,
      },
    ];

    const mockUpdate = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null }),
    });

    const mockSelectChain: any = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      update: mockUpdate,
    };

    mockAdminFrom.mockReturnValue(mockSelectChain);
    mockGetUnsubscribedCampaignEmails.mockResolvedValue(new Set(["unsub@company.com"]));
    mockSendVerificationReminderEmail.mockResolvedValue(true);

    const res = await GET(
      new Request("http://localhost/api/cron/verification-reminders", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalEligible).toBe(2);
    expect(body.sentCount).toBe(1);

    expect(mockSendVerificationReminderEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationReminderEmail).toHaveBeenCalledWith("active@company.com", "Active User", "user-2");
  });
});
