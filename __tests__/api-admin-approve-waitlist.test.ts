/**
 * @jest-environment node
 */

import { POST } from "@/app/api/admin/approve-waitlist/route";

const mockRequireActiveAdmin = jest.fn();
jest.mock("@/lib/admin/auth", () => ({
  requireActiveAdmin: () => mockRequireActiveAdmin(),
}));

const mockRpc = jest.fn();
const mockFrom = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockSendApprovalEmail = jest.fn();
const mockSendRejectionEmail = jest.fn();
jest.mock("@/lib/email", () => ({
  sendApprovalEmail: (...args: unknown[]) => mockSendApprovalEmail(...args),
  sendRejectionEmail: (...args: unknown[]) => mockSendRejectionEmail(...args),
}));

describe("Admin Approve Waitlist API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401/403 if unauthorized or not admin", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const req = new Request("http://localhost/api/admin/approve-waitlist", {
      method: "POST",
      body: JSON.stringify({ waitlistId: "w1", action: "approve" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if required payload is missing", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const req = new Request("http://localhost/api/admin/approve-waitlist", {
      method: "POST",
      body: JSON.stringify({ waitlistId: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("handles rejection flow correctly", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    mockRpc.mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { email: "applicant@company.com" } }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/admin/approve-waitlist", {
      method: "POST",
      body: JSON.stringify({ waitlistId: "w1", action: "reject", notes: "Domain not verified" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("reject_manual_verification", {
      p_waitlist_id: "w1",
      p_admin_id: "admin-1",
      p_notes: "Domain not verified",
    });
    expect(mockSendRejectionEmail).toHaveBeenCalledWith("applicant@company.com");
  });

  it("handles approval flow correctly", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    mockRpc.mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { email: "applicant@company.com" } }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/admin/approve-waitlist", {
      method: "POST",
      body: JSON.stringify({ waitlistId: "w1", action: "approve", notes: "Approved", domain: "company.com" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("approve_manual_verification", {
      p_waitlist_id: "w1",
      p_admin_id: "admin-1",
      p_notes: "Approved",
      p_domain: "company.com",
    });
    expect(mockSendApprovalEmail).toHaveBeenCalledWith("applicant@company.com");
  });
});
