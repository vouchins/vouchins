import { render, screen, waitFor } from "@testing-library/react";
import UserProfilePage from "@/app/users/[id]/page";
import { supabase } from "@/lib/supabase/browser";

const mockParams = { id: "target-user-123" };
const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => mockRouter,
  usePathname: () => "/users/target-user-123",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/navigation", () => ({
  Navigation: () => <div data-testid="mock-navigation">Navigation</div>,
}));

jest.mock("@/components/footer", () => ({
  Footer: () => <div data-testid="mock-footer">Footer</div>,
}));

jest.mock("@/components/user-provider", () => ({
  useUser: () => ({
    user: { id: "logged-in-user", is_verified: true, city: "Global" },
    refetch: jest.fn(),
    vouchedEntities: {},
    setVouchedEntities: jest.fn(),
    savedPostIds: new Set(),
    setSavedPostIds: jest.fn(),
  }),
}));

jest.mock("@/lib/supabase/browser", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://mock.url/file" } })),
      })),
    },
  },
}));

describe("UserProfilePage Location Fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "logged-in-user" } },
      error: null,
    });

    (supabase.rpc as jest.Mock).mockImplementation((method: string) => {
      if (method === "get_vouch_score") {
        return Promise.resolve({ data: 50, error: null });
      }
      if (method === "get_trust_signals") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("displays 'Global' when user city is null in database", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: "target-user-123",
              full_name: "Alex Smith",
              city: null,
              created_at: "2026-01-01T00:00:00Z",
              bio: "Engineer",
              is_verified: true,
              vouch_points: 50,
              company: { name: "Tech Co", domain: "tech.co" },
            },
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: "logged-in-user", is_verified: true },
            error: null,
          }),
        };
      }
      if (table === "posts" || table === "vouches") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Alex Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.queryByText("Unknown location")).not.toBeInTheDocument();
  });

  it("displays specific city name when user city is set in database", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: "target-user-123",
              full_name: "Priya Sharma",
              city: "Hyderabad",
              created_at: "2026-01-01T00:00:00Z",
              bio: "Product Manager",
              is_verified: true,
              vouch_points: 80,
              company: { name: "Acme", domain: "acme.com" },
            },
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: "logged-in-user", is_verified: true },
            error: null,
          }),
        };
      }
      if (table === "posts" || table === "vouches") {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    render(<UserProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    expect(screen.getByText("Hyderabad")).toBeInTheDocument();
  });
});
