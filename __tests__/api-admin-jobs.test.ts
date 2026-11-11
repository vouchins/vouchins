/**
 * @jest-environment node
 */

import { DELETE } from "@/app/api/admin/jobs/route";

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

describe("Admin Jobs DELETE API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401/403 if unauthorized or not admin", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const req = new Request("http://localhost/api/admin/jobs?id=j-1", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 if no job ID or IDs provided", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const req = new Request("http://localhost/api/admin/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Job ID or IDs are required/i);
  });

  it("deletes a single job via query param ?id=...", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const mockDelete = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null, count: 1 }),
    });

    mockFrom.mockReturnValue({
      delete: mockDelete,
    });

    const req = new Request("http://localhost/api/admin/jobs?id=j-1", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith("jobs");
  });

  it("deletes multiple jobs via query param ?ids=j-1,j-2", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const mockDelete = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null, count: 2 }),
    });

    mockFrom.mockReturnValue({
      delete: mockDelete,
    });

    const req = new Request("http://localhost/api/admin/jobs?ids=j-1,j-2", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
  });

  it("deletes multiple jobs via JSON body { ids: [...] }", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const mockDelete = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ error: null, count: 3 }),
    });

    mockFrom.mockReturnValue({
      delete: mockDelete,
    });

    const req = new Request("http://localhost/api/admin/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ["j-1", "j-2", "j-3"] }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(3);
  });

  it("deletes all matching jobs via { allMatching: true, company: 'Google' }", async () => {
    mockRequireActiveAdmin.mockResolvedValueOnce({
      user: { id: "admin-1" },
      profile: { is_admin: true, is_active: true },
    });

    const matchedJobs = [{ id: "j-10" }, { id: "j-11" }];

    // Mock the matching query and delete query
    mockFrom.mockImplementation((table: string) => {
      if (table === "jobs") {
        return {
          select: jest.fn().mockReturnValue({
            ilike: jest.fn().mockResolvedValue({ data: matchedJobs, error: null }),
          }),
          delete: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ error: null, count: 2 }),
          }),
        };
      }
      return {
        delete: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
    });

    const req = new Request("http://localhost/api/admin/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allMatching: true,
        company: "Google",
      }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.allMatching).toBe(true);
    expect(data.count).toBe(2);
  });
});

