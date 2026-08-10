/**
 * @jest-environment node
 */

import { POST } from "@/app/api/admin/vouch-score/route";

const mockRequireActiveAdmin = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/admin/auth", () => ({
  requireActiveAdmin: jest.fn(() => mockRequireActiveAdmin()),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: jest.fn(async () => ({ data: 12, error: null })),
  },
}));

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/vouch-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin vouch score API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates a user's score and records the adjustment", async () => {
    mockRequireActiveAdmin.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { id: "admin-1", is_admin: true, is_active: true },
    });

    const insert = jest.fn(async () => ({ error: null }));

    const userQuery = {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "user-1" },
            error: null,
          }),
        }),
      }),
    };

    mockFrom
      .mockImplementationOnce(() => userQuery)
      .mockImplementationOnce(() => ({ insert }));

    const response = await POST(request({ userId: "user-1", delta: 5, reason: "Great contribution" }));

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      admin_id: "admin-1",
      delta: 5,
      previous_score: 12,
      new_score: 17,
      reason: "Great contribution",
      source: "manual",
    }));
  });
});
