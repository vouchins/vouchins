/**
 * @jest-environment node
 */

import AdminLayout from "@/app/admin/layout";
import { redirect } from "next/navigation";

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
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

describe("AdminLayout Server Guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects unauthenticated users to /login?returnTo=/admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await AdminLayout({ children: "Admin Content" });

    expect(redirect).toHaveBeenCalledWith("/login?returnTo=/admin");
  });

  it("redirects regular non-admin users to /feed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: false, is_active: true } });

    await AdminLayout({ children: "Admin Content" });

    expect(redirect).toHaveBeenCalledWith("/feed");
  });

  it("redirects inactive/suspended administrators to /feed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-123" } } });
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: true, is_active: false } });

    await AdminLayout({ children: "Admin Content" });

    expect(redirect).toHaveBeenCalledWith("/feed");
  });

  it("renders children for active administrators without redirecting", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-123" } } });
    mockMaybeSingle.mockResolvedValue({ data: { is_admin: true, is_active: true } });

    const result = await AdminLayout({ children: "Admin Content" });

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
