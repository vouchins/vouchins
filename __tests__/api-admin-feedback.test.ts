/**
 * @jest-environment node
 */

import { GET, POST, PATCH } from "@/app/api/admin/feedback/route";

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

describe("Admin Feedback API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/feedback", () => {
    it("returns 401/403 if unauthorized or not admin", async () => {
      mockRequireActiveAdmin.mockResolvedValueOnce({
        response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
      });

      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("fetches feedback successfully for active admin", async () => {
      mockRequireActiveAdmin.mockResolvedValueOnce({
        user: { id: "admin-1" },
        profile: { is_admin: true, is_active: true },
      });

      const mockFeedbackData = [
        { id: "fb-1", name: "User 1", message: "Great app!", status: "pending" },
      ];

      mockFrom.mockReturnValueOnce({
        select: () => ({
          order: async () => ({ data: mockFeedbackData, error: null }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.feedback).toEqual(mockFeedbackData);
    });
  });

  describe("POST & PATCH /api/admin/feedback", () => {
    it("returns 400 if feedbackId or status is missing", async () => {
      mockRequireActiveAdmin.mockResolvedValueOnce({
        user: { id: "admin-1" },
        profile: { is_admin: true, is_active: true },
      });

      const req = new Request("http://localhost/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ feedbackId: "" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("updates feedback status successfully", async () => {
      mockRequireActiveAdmin.mockResolvedValueOnce({
        user: { id: "admin-1" },
        profile: { is_admin: true, is_active: true },
      });

      mockFrom.mockReturnValueOnce({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      });

      const req = new Request("http://localhost/api/admin/feedback", {
        method: "POST",
        body: JSON.stringify({ feedbackId: "fb-1", status: "reviewed" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("PATCH also updates feedback status successfully", async () => {
      mockRequireActiveAdmin.mockResolvedValueOnce({
        user: { id: "admin-1" },
        profile: { is_admin: true, is_active: true },
      });

      mockFrom.mockReturnValueOnce({
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      });

      const req = new Request("http://localhost/api/admin/feedback", {
        method: "PATCH",
        body: JSON.stringify({ feedbackId: "fb-1", status: "reviewed" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
