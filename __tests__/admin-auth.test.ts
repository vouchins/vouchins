/**
 * @jest-environment node
 */

import { requireActiveAdmin } from "@/lib/admin/auth";

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();

const mockServerFrom = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
    })),
  },
}));

describe("requireActiveAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a missing or expired session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    const result = await requireActiveAdmin();
    expect(result.response?.status).toBe(401);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects a regular user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-1", is_admin: false, is_active: true } });
    const result = await requireActiveAdmin();
    expect(result.response?.status).toBe(403);
  });

  it("rejects an inactive administrator", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: "admin-1", is_admin: true, is_active: false } });
    const result = await requireActiveAdmin();
    expect(result.response?.status).toBe(403);
  });

  it("allows an active administrator", async () => {
    const user = { id: "admin-1" };
    const profile = { id: "admin-1", is_admin: true, is_active: true };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: profile });
    const result = await requireActiveAdmin();
    expect(result).toEqual({ user, profile });
  });

  it("allows an administrator when is_active is null or undefined", async () => {
    const user = { id: "admin-1" };
    const profile = { id: "admin-1", is_admin: true, is_active: null };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: profile });
    const result = await requireActiveAdmin();
    expect(result).toEqual({ user, profile });
  });

  it("falls back to authenticated server client if supabaseAdmin returns null", async () => {
    const user = { id: "admin-1" };
    const profile = { id: "admin-1", is_admin: true, is_active: true };
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null });
    mockServerFrom.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle: jest.fn().mockResolvedValue({ data: profile }) })),
      })),
    });
    const result = await requireActiveAdmin();
    expect(result).toEqual({ user, profile });
  });
});
