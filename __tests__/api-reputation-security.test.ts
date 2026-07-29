/** @jest-environment node */

import bcrypt from "bcryptjs";
import { POST as verifyOtp } from "@/app/api/auth/verify-otp/route";
import { POST as updateUser } from "@/app/api/users/update/route";

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabase: jest.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

function request(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("reputation security regressions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an OTP request carrying another user's id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
    const response = await verifyOtp(request("/api/auth/verify-otp", {
      email: "actor@example.com", otp: "123456", userId: "victim",
    }));
    expect(response.status).toBe(403);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires a session for OTP verification", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await verifyOtp(request("/api/auth/verify-otp", {
      email: "actor@example.com", otp: "123456",
    }));
    expect(response.status).toBe(401);
  });

  it("locks OTP verification after the fifth failed attempt", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
    const hash = await bcrypt.hash("654321", 4);
    const attemptsQuery = {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { attempt_count: 4, locked_until: null } }) }) }),
    };
    const otpQuery = {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { otp_hash: hash, expires_at: new Date(Date.now() + 60_000).toISOString() },
      }) }) }),
    };
    const upsert = jest.fn(async () => ({ error: null }));
    mockFrom.mockImplementationOnce(() => attemptsQuery)
      .mockImplementationOnce(() => otpQuery)
      .mockImplementationOnce(() => ({ upsert }));

    const response = await verifyOtp(request("/api/auth/verify-otp", {
      email: "actor@example.com", otp: "123456",
    }));
    expect(response.status).toBe(429);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ attempt_count: 5 }));
  });

  it("blocks non-admin cross-user updates", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_admin: false } }) }) }),
    }));
    const response = await updateUser(request("/api/users/update", {
      userId: "victim", updates: { full_name: "Changed" },
    }));
    expect(response.status).toBe(403);
  });

  it.each(["is_verified", "vouch_points", "verification_method"])(
    "rejects protected update field %s",
    async (field) => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "actor" } }, error: null });
      const response = await updateUser(request("/api/users/update", {
        userId: "actor", updates: { [field]: true },
      }));
      expect(response.status).toBe(400);
      expect(mockFrom).not.toHaveBeenCalled();
    },
  );
});
