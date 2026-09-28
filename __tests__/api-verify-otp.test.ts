/**
 * @jest-environment node
 */

import { POST } from "@/app/api/auth/verify-otp/route";
import { clearAllRateLimits } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const mockGetUser = jest.fn();
jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockFrom = jest.fn();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createRequest(body: Record<string, unknown>, ip = "127.0.0.1") {
  return new Request("http://localhost/api/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("Verify OTP API with Rate Limiting and Lockout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits();
  });

  it("returns 400 if email or otp is missing", async () => {
    const req = createRequest({ email: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const req = createRequest({ email: "user@corp.com", otp: "123456" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if OTP does not exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    });

    const req = createRequest({ email: "user@corp.com", otp: "123456", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired code");
  });

  it("returns 400 and deletes code if expired", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                email: "user@corp.com",
                otp_hash: "hash",
                expires_at: new Date(Date.now() - 10000).toISOString(),
                attempts: 0,
              },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        delete: mockDelete,
      });

    const req = createRequest({ email: "user@corp.com", otp: "123456", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("expired");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 429 and deletes code if already reached max attempts", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                email: "user@corp.com",
                otp_hash: "hash",
                expires_at: new Date(Date.now() + 60000).toISOString(),
                attempts: 5,
              },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        delete: mockDelete,
      });

    const req = createRequest({ email: "user@corp.com", otp: "123456", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Too many failed attempts");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("increments attempts and returns remaining attempts on incorrect code", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const realHash = await bcrypt.hash("654321", 10);

    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                email: "user@corp.com",
                otp_hash: realHash,
                expires_at: new Date(Date.now() + 60000).toISOString(),
                attempts: 2,
              },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: mockUpdate,
      });

    const req = createRequest({ email: "user@corp.com", otp: "111111", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Incorrect code. 2 attempts remaining.");
    expect(mockUpdate).toHaveBeenCalledWith({ attempts: 3 });
  });

  it("locks out and deletes code when failed attempts reach limit", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const realHash = await bcrypt.hash("654321", 10);

    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                email: "user@corp.com",
                otp_hash: realHash,
                expires_at: new Date(Date.now() + 60000).toISOString(),
                attempts: 4,
              },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        delete: mockDelete,
      });

    const req = createRequest({ email: "user@corp.com", otp: "111111", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Too many failed attempts");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("blocks rapid requests exceeding IP rate limit with 429 and Retry-After header", async () => {
    // Send 15 requests from the same IP
    for (let i = 0; i < 15; i++) {
      const req = createRequest({ email: "" }, "198.51.100.1");
      await POST(req);
    }

    // 16th request should trigger IP rate limit
    const req = createRequest({ email: "user@corp.com", otp: "123456" }, "198.51.100.1");
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const json = await res.json();
    expect(json.error).toContain("Too many verification attempts from this IP");
  });

  it("successfully verifies valid code and cleans up", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
    const mockUserUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const realHash = await bcrypt.hash("123456", 10);

    // 1. email_otps select
    // 2. users select for corporate email check
    // 3. companies select
    // 4. users update
    // 5. email_otps delete
    mockFrom
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                email: "user@corp.com",
                otp_hash: realHash,
                expires_at: new Date(Date.now() + 60000).toISOString(),
                attempts: 0,
              },
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: () => ({
          or: () => ({
            neq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "comp-1" } }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: mockUserUpdate,
      })
      .mockReturnValueOnce({
        delete: mockDelete,
      });

    const req = createRequest({ email: "user@corp.com", otp: "123456", userId: "u1" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        is_verified: true,
        company_id: "comp-1",
        verification_method: "otp",
      })
    );
    expect(mockDelete).toHaveBeenCalled();
  });
});
