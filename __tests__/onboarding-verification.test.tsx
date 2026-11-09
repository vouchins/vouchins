import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import OnboardingPage from "@/app/onboarding/page";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/onboarding",
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    startSessionRecording: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock("@/components/user-provider", () => ({
  useUser: () => ({
    user: {
      id: "user-789",
      email: "test.candidate@gmail.com",
      full_name: "Test Candidate",
      avatar_url: null,
      company: { name: "Test Corp", domain: "testcorp.com" },
      is_profile_complete: true,
      profile_completion_percentage: 100,
      vouch_points: 100,
      is_admin: false,
      is_marketing_manager: false,
    },
    loading: false,
    unreadCount: 0,
  }),
}));

const mockUserUpdates: any[] = [];
const mockManualRequests: any[] = [];

jest.mock("@/lib/supabase/browser", () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: {
            user: {
              id: "user-789",
              email: "test.candidate@gmail.com",
              app_metadata: { provider: "google" },
            },
          },
          error: null,
        })
      ),
    },
    from: jest.fn((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({
                  data: { onboarded: false, full_name: "Test Candidate" },
                  error: null,
                })
              ),
            })),
          })),
          update: jest.fn((payload: any) => {
            mockUserUpdates.push(payload);
            return {
              eq: jest.fn(() => Promise.resolve({ error: null })),
            };
          }),
        };
      }

      if (table === "companies") {
        return {
          select: jest.fn(() => ({
            ilike: jest.fn((col: string, val: string) => {
              if (val.toLowerCase().includes("microsoft")) {
                return {
                  limit: jest.fn(() =>
                    Promise.resolve({
                      data: [{ id: "comp-msft", name: "Microsoft" }],
                      error: null,
                    })
                  ),
                  maybeSingle: jest.fn(() =>
                    Promise.resolve({
                      data: { id: "comp-msft", name: "Microsoft" },
                      error: null,
                    })
                  ),
                };
              }
              return {
                limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
                maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
              };
            }),
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: { id: "comp-created" }, error: null })),
            })),
          })),
        };
      }

      if (table === "manual_verification_requests") {
        return {
          insert: jest.fn((payload: any) => {
            mockManualRequests.push(payload);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }

      if (table === "notifications") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ count: 0, error: null })),
              order: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        };
      }

      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      };
    }),
  },
}));

describe("Onboarding Page - Redesigned Flow & Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserUpdates.length = 0;
    mockManualRequests.length = 0;
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes("/api/auth/send-otp")) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as any;
      }
      if (String(url).includes("/api/auth/verify-otp")) {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
  });

  it("renders dedicated onboarding page with normal auth header (no 'Account Setup' text)", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    // "Account Setup" text should be removed
    expect(screen.queryByText(/account setup/i)).not.toBeInTheDocument();

    // Normal auth header elements should be present
    expect(screen.getByAltText("Vouchins")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();

    // Smart input field and agreement checkbox
    expect(
      screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/I agree to the Vouchins/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("validates company name and blocks gibberish and celebrity names", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    const smartInput = screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i);
    const agreeCheckbox = screen.getByRole("checkbox");
    fireEvent.click(agreeCheckbox);

    // 1. Test consecutive dots / gibberish: "vouchins..cfergerg"
    fireEvent.change(smartInput, { target: { value: "vouchins..cfergerg" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Company name cannot contain consecutive dots or punctuation/i)
      ).toBeInTheDocument();
    });

    // Dismiss alert using "x" button
    const closeBtn = screen.getByLabelText("Dismiss error");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(/Company name cannot contain consecutive dots or punctuation/i)
      ).not.toBeInTheDocument();
    });

    // 2. Test celebrity / person name: "Tamanna Bhatia"
    fireEvent.change(smartInput, { target: { value: "Tamanna Bhatia" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText(/We couldn't recognize "Tamanna Bhatia" as a company in our directory/i)
      ).toBeInTheDocument();
    });
  });

  it("when valid company name is entered, shows work email input, and skip button opens dialog with info", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    const smartInput = screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i);
    const agreeCheckbox = screen.getByRole("checkbox");

    fireEvent.change(smartInput, { target: { value: "Microsoft" } });
    fireEvent.click(agreeCheckbox);

    const continueBtn = screen.getByRole("button", { name: "Continue" });
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // Transitions to Step 2
    await waitFor(() => {
      expect(screen.getByText("Verify your role at Microsoft")).toBeInTheDocument();
    });

    // Directly shows work email input box on Step 2
    expect(screen.getByLabelText(/Work Email Address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Verification Code" })).toBeInTheDocument();

    // Clicking "Skip verification" opens the confirmation dialog
    const skipBtn = screen.getByRole("button", { name: "Skip verification" });
    fireEvent.click(skipBtn);

    // Dialog is visible with "With Verification" and "Without Verification" info
    await waitFor(() => {
      expect(screen.getByText("Continue without verification?")).toBeInTheDocument();
    });
    expect(screen.getByText("With Verification")).toBeInTheDocument();
    expect(screen.getByText("Without Verification")).toBeInTheDocument();
    expect(screen.getByText(/Full access to private company channels/i)).toBeInTheDocument();
    expect(screen.getByText(/Company discussions and verified referral requests remain locked/i)).toBeInTheDocument();

    // Test Cancel in dialog
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Continue without verification?")).not.toBeInTheDocument();
    });

    // Click Skip verification again and continue with unverified profile
    fireEvent.click(screen.getByRole("button", { name: "Skip verification" }));
    await waitFor(() => {
      expect(screen.getByText("Continue without verification?")).toBeInTheDocument();
    });

    const continueUnverifiedBtn = screen.getByRole("button", { name: "Continue with unverified profile" });
    fireEvent.click(continueUnverifiedBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });

    expect(mockUserUpdates.length).toBeGreaterThan(0);
    const lastUpdate = mockUserUpdates[mockUserUpdates.length - 1];
    expect(lastUpdate.onboarded).toBe(true);
    expect(lastUpdate.is_verified).toBeUndefined();
  });

  it("when work email is entered, triggers OTP and verifies successfully", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    const smartInput = screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i);
    const agreeCheckbox = screen.getByRole("checkbox");

    fireEvent.change(smartInput, { target: { value: "candidate@apple.com" } });
    fireEvent.click(agreeCheckbox);

    const continueBtn = screen.getByRole("button", { name: "Continue" });
    fireEvent.click(continueBtn);

    // Directly triggers OTP send
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/send-otp",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "candidate@apple.com", firstName: "Test" }),
        })
      );
      expect(screen.getByText("Check your work email")).toBeInTheDocument();
      // "Skip for now" should not be shown on OTP screen
      expect(screen.queryByText(/skip for now/i)).not.toBeInTheDocument();
    });

    // Enter 6-digit OTP
    const otpInput = screen.getByPlaceholderText("• • • • • •");
    fireEvent.change(otpInput, { target: { value: "654321" } });

    const verifyBtn = screen.getByRole("button", { name: "Verify and Enter" });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/verify-otp",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "candidate@apple.com",
            otp: "654321",
            userId: "user-789",
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });

    const verifiedUpdate = mockUserUpdates.find((u) => u.is_verified === true);
    expect(verifiedUpdate).toBeDefined();
    expect(verifiedUpdate.onboarded).toBe(true);
  });

  it("shows timer beside resend code, disables button until timer completes, and re-initiates on click", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i), {
      target: { value: "dev@stripe.com" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Check your work email")).toBeInTheDocument();
      // "Skip for now" should not be shown on OTP screen
      expect(screen.queryByText(/skip for now/i)).not.toBeInTheDocument();
    });

    const verifyBtn = screen.getByRole("button", { name: "Verify and Enter" });
    const resendBtn = screen.getByRole("button", { name: "Resend code" });

    // Verify button is NOT in loading state
    expect(verifyBtn).toHaveTextContent("Verify and Enter");

    // Timer is displayed beside "Resend code" and button is disabled initially
    expect(screen.getByText("(1s)")).toBeInTheDocument();
    expect(resendBtn).toBeDisabled();

    // Wait for timer to finish (1 second in test)
    await waitFor(
      () => {
        expect(screen.queryByText("(1s)")).not.toBeInTheDocument();
        expect(resendBtn).not.toBeDisabled();
      },
      { timeout: 2500 }
    );

    // Click Resend Code 1st time
    fireEvent.click(resendBtn);

    // Wait for 1st resend to complete and timer to re-initiate
    await waitFor(() => {
      expect(screen.getByText("(1s)")).toBeInTheDocument();
      expect(resendBtn).toBeDisabled();
    });

    // Manual verification link should NOT appear yet (only 1 resend)
    expect(screen.queryByRole("button", { name: "Opt for manual verification" })).not.toBeInTheDocument();

    // Wait for timer to finish again
    await waitFor(
      () => {
        expect(screen.queryByText("(1s)")).not.toBeInTheDocument();
        expect(resendBtn).not.toBeDisabled();
      },
      { timeout: 2500 }
    );

    // Click Resend Code 2nd time
    fireEvent.click(resendBtn);

    // After 2nd resend, manual verification link appears!
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Opt for manual verification" })).toBeInTheDocument();
    });

    // Form should not be expanded yet
    expect(screen.queryByPlaceholderText("https://www.linkedin.com/in/username")).not.toBeInTheDocument();

    // Click the link to expand the manual verification form
    fireEvent.click(screen.getByRole("button", { name: "Opt for manual verification" }));

    // Now the form is visible!
    expect(screen.getByPlaceholderText("https://www.linkedin.com/in/username")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Corporate firewall blocks external codes/i)
    ).toBeInTheDocument();

    // Fill LinkedIn URL and Reason
    const linkedinInput = screen.getByPlaceholderText("https://www.linkedin.com/in/username");
    const reasonInput = screen.getByPlaceholderText(/Corporate firewall blocks external codes/i);

    fireEvent.change(linkedinInput, {
      target: { value: "https://www.linkedin.com/in/stripe-dev" },
    });
    fireEvent.change(reasonInput, {
      target: { value: "Company firewall blocks outside verification OTPs" },
    });

    const submitManualBtn = screen.getByRole("button", { name: "Submit for Manual Verification" });
    fireEvent.click(submitManualBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });

    // Check manual verification request table
    expect(mockManualRequests.length).toBe(1);
    expect(mockManualRequests[0].corporate_email).toBe("dev@stripe.com");
    expect(mockManualRequests[0].linkedin_url).toBe("https://www.linkedin.com/in/stripe-dev");
    expect(mockManualRequests[0].admin_notes).toContain("Company firewall blocks outside verification OTPs");

    // Check user update
    const manualUserUpdate = mockUserUpdates.find(
      (u) => u.linkedin_url === "https://www.linkedin.com/in/stripe-dev"
    );
    expect(manualUserUpdate).toBeDefined();
    expect(manualUserUpdate.onboarded).toBe(true);
  });

  it("shows manual verification link after 2 failed OTP attempts and expands on click", async () => {
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).includes("/api/auth/send-otp")) {
        return { ok: true, json: async () => ({ success: true }) } as any;
      }
      if (String(url).includes("/api/auth/verify-otp")) {
        return { ok: false, json: async () => ({ error: "Invalid code" }) } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText("Where do you work?")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Google or name@google\.com/i), {
      target: { value: "dev@datadog.com" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Check your work email")).toBeInTheDocument();
      // "Skip for now" should not be shown on OTP screen
      expect(screen.queryByText(/skip for now/i)).not.toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText("• • • • • •");
    const verifyBtn = screen.getByRole("button", { name: "Verify and Enter" });

    // 1st failed attempt
    fireEvent.change(otpInput, { target: { value: "000000" } });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
    // Link should NOT appear after only 1 attempt
    expect(screen.queryByRole("button", { name: "Opt for manual verification" })).not.toBeInTheDocument();

    // 2nd failed attempt
    fireEvent.change(otpInput, { target: { value: "111111" } });
    fireEvent.click(verifyBtn);

    // Link should now be visible after the 2nd attempt!
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Opt for manual verification" })).toBeInTheDocument();
    });

    // Form should not be expanded initially
    expect(screen.queryByPlaceholderText("https://www.linkedin.com/in/username")).not.toBeInTheDocument();

    // Click link to expand manual review
    fireEvent.click(screen.getByRole("button", { name: "Opt for manual verification" }));

    expect(screen.getByPlaceholderText("https://www.linkedin.com/in/username")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Corporate firewall blocks external codes/i)
    ).toBeInTheDocument();

    // Fill LinkedIn and reason, then submit
    const linkedinInput = screen.getByPlaceholderText("https://www.linkedin.com/in/username");
    const reasonInput = screen.getByPlaceholderText(/Corporate firewall blocks external codes/i);

    fireEvent.change(linkedinInput, {
      target: { value: "https://www.linkedin.com/in/test-candidate" },
    });
    fireEvent.change(reasonInput, {
      target: { value: "Never received code" },
    });

    const submitManualBtn = screen.getByRole("button", { name: "Submit for Manual Verification" });
    fireEvent.click(submitManualBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/feed");
    });

    const manualUpdate = mockUserUpdates.find(
      (u) => u.linkedin_url === "https://www.linkedin.com/in/test-candidate"
    );
    expect(manualUpdate).toBeDefined();
    expect(manualUpdate.onboarded).toBe(true);
  });
});
