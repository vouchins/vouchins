/**
 * @jest-environment node
 */

import { GET } from "@/app/api/cron/campaigns/route";
import { POST } from "@/app/api/admin/campaigns/route";

const mockDeliverApprovedCampaign = jest.fn();
const mockGetMarketingPrincipal = jest.fn();
const mockAdminFrom = jest.fn();
const mockAuthGetUser = jest.fn();
const mockThen = jest.fn();

jest.mock("@/lib/marketing/campaign-delivery", () => ({
  deliverApprovedCampaign: (...args: unknown[]) => mockDeliverApprovedCampaign(...args),
}));

jest.mock("@/lib/marketing/auth", () => ({
  getMarketingPrincipal: () => mockGetMarketingPrincipal(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockAdminFrom(...args),
  },
}));

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: mockAuthGetUser },
  })),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockAdminFrom(...args),
  })),
}));

const mockCookieStore = {
  get: jest.fn().mockReturnValue({ value: "mock-cookie-value" }),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockImplementation(async () => mockCookieStore),
}));

const mockQuery = {
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  maybeSingle: mockThen,
  single: jest.fn().mockReturnThis(),
};

describe("campaign scheduling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminFrom.mockReturnValue(mockQuery);
    process.env.CRON_SECRET = "cron-secret";
    mockGetMarketingPrincipal.mockResolvedValue({ id: "admin-1", isAdmin: true });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  });

  it("creates a scheduled campaign without sending immediately", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({ data: { is_admin: true }, error: null })),
            })),
          })),
        };
      }
      if (table === "campaigns") {
        return {
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: {
                  id: "campaign-1",
                  title: "Scheduled",
                  status: "scheduled",
                  scheduled_at: "2026-08-10T10:00:00.000Z",
                },
                error: null,
              })),
            })),
          })),
        };
      }
      return mockQuery;
    });

    const response = await POST(
      new Request("http://localhost/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title: "Scheduled",
          body: "Hello",
          targetType: "email",
          recipientGroupId: "default_all",
          recipientGroupName: "All Users",
          status: "scheduled",
          scheduledAt: "2026-08-10T10:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockDeliverApprovedCampaign).not.toHaveBeenCalled();
  });

  it("claims due scheduled campaigns and delivers them", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "campaigns") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(async () => ({
                  data: [{ id: "campaign-1", status: "scheduled", created_by: "admin-1" }],
                  error: null,
                })),
              })),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  maybeSingle: jest.fn(async () => ({ data: { id: "campaign-1" }, error: null })),
                })),
              })),
            })),
          })),
        };
      }
      return mockQuery;
    });

    const response = await GET(
      new Request("http://localhost/api/cron/campaigns", {
        headers: { Authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockDeliverApprovedCampaign).toHaveBeenCalledWith("campaign-1", "admin-1");
  });
});
