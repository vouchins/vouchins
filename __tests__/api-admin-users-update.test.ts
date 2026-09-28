/**
 * @jest-environment node
 */

import { POST } from "@/app/api/admin/users/update/route";

const mockRequireActiveAdmin = jest.fn();
jest.mock("@/lib/admin/auth", () => ({
  requireActiveAdmin: () => mockRequireActiveAdmin(),
}));

const mockFrom = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("Admin Users Update API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401/403 if unauthorized or not admin", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const req = new Request("http://localhost/api/admin/users/update", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", updates: { is_active: false } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("updates allowed user fields successfully and ignores disallowed fields", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const mockUpdate = jest.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: { id: "u1", is_active: false, full_name: "New Name" },
            error: null,
          }),
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({
      update: mockUpdate,
    });

    const req = new Request("http://localhost/api/admin/users/update", {
      method: "POST",
      body: JSON.stringify({
        userId: "u1",
        updates: {
          is_active: false,
          full_name: "New Name",
          disallowed_field: "should_be_stripped",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.user.full_name).toBe("New Name");

    // Ensure disallowed_field was stripped from the update payload
    expect(mockUpdate).toHaveBeenCalledWith({
      is_active: false,
      full_name: "New Name",
    });
  });
});
