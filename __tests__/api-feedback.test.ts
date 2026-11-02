/**
 * @jest-environment node
 */

import { POST } from "@/app/api/feedback/route";

const mockFrom = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { email: "authed@vouchins.com", user_metadata: { full_name: "Authed Candidate" } } },
      }),
    },
  }),
}));

describe("Public Feedback Submission API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 if message is missing or empty", async () => {
    const req = new Request("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Feedback message is required.");
  });

  it("successfully inserts feedback into public.feedback table", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "fb-123",
            name: "Candidate One",
            email: "candidate@example.com",
            type: "Jobs Platform",
            message: "Great AI recommendations!",
            status: "pending",
          },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({
      insert: mockInsert,
    });

    const req = new Request("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Candidate One",
        email: "candidate@example.com",
        type: "Jobs Platform",
        message: "Great AI recommendations!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.feedback.id).toBe("fb-123");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Candidate One",
        email: "candidate@example.com",
        type: "Jobs Platform",
        message: "Great AI recommendations!",
        status: "pending",
      })
    );
  });
});
