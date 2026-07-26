/**
 * @jest-environment node
 */

import { POST } from "@/app/api/reports/route";

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockRecentReportCount(count = 0) {
  return {
    select: () => ({
      eq: () => ({
        gte: async () => ({ count }),
      }),
    }),
  };
}

function mockTarget(data: Record<string, unknown> | null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data }),
      }),
    }),
  };
}

describe("Report submission API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated reports", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST(
      request({ targetType: "post", targetId: "post-1", reason: "Spam" }),
    );

    expect(response.status).toBe(401);
  });

  it("prevents users from reporting their own content", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockFrom
      .mockImplementationOnce(() => mockRecentReportCount())
      .mockImplementationOnce(() =>
        mockTarget({ id: "post-1", user_id: "user-1", is_removed: false }),
      );

    const response = await POST(
      request({
        targetType: "post",
        targetId: "post-1",
        reason: "Inappropriate content",
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("own post");
  });

  it("creates a validated comment report", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "reporter-1" } },
      error: null,
    });
    const insert = jest.fn(async () => ({ error: null }));

    mockFrom
      .mockImplementationOnce(() => mockRecentReportCount())
      .mockImplementationOnce(() =>
        mockTarget({
          id: "comment-1",
          user_id: "author-1",
          is_removed: false,
        }),
      )
      .mockImplementationOnce(() => ({ insert }));

    const response = await POST(
      request({
        targetType: "comment",
        targetId: "comment-1",
        reason: "Harassment",
      }),
    );

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({
      reporter_id: "reporter-1",
      post_id: null,
      comment_id: "comment-1",
      reported_user_id: null,
      reason: "Harassment",
    });
  });

  it("returns a conflict for a duplicate pending report", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "reporter-1" } },
      error: null,
    });

    mockFrom
      .mockImplementationOnce(() => mockRecentReportCount())
      .mockImplementationOnce(() =>
        mockTarget({ id: "user-2" }),
      )
      .mockImplementationOnce(() => ({
        insert: async () => ({ error: { code: "23505" } }),
      }));

    const response = await POST(
      request({
        targetType: "user",
        targetId: "user-2",
        reason: "Spam or misleading",
      }),
    );

    expect(response.status).toBe(409);
  });
});
