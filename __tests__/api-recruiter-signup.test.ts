/**
 * @jest-environment node
 */

import { POST } from "@/app/api/recruiter/signup/route";

const mockSignUp = jest.fn();
const mockFrom = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockCookieStore = {
  getAll: jest.fn(() => []),
  set: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockImplementation(async () => mockCookieStore),
}));

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/recruiter/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("recruiter signup API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("guides existing users to sign in instead of retrying auth", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const response = await POST(
      request({
        email: "recruiter@example.com",
        password: "Password123!",
        company_name: "Example Co",
        billing_email: "billing@example.com",
        website: "https://example.com",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        code: "already_registered",
      }),
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
