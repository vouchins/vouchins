import { generateMetadata } from "@/app/posts/[id]/page";
import PostDetailsPage from "@/app/posts/[id]/page";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { render, screen } from "@testing-library/react";

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("@/components/post-details-client", () => ({
  PostDetailsClient: ({ postId }: { postId: string }) => (
    <div data-testid="post-details-client">Post details for {postId}</div>
  ),
}));

describe("PostDetailsPage Server Component & Metadata", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockPublicPost = {
    id: "post-pub-99",
    text: "Spacious 2BHK flat available for rent in Hitec City, Hyderabad.",
    category: "housing",
    sub_category: "flats",
    visibility: "public",
    image_urls: ["https://example.com/flat.jpg"],
    city: "Hyderabad",
    created_at: "2026-08-30T10:00:00Z",
    updated_at: "2026-08-31T10:00:00Z",
    is_flagged: false,
    is_removed: false,
    user: {
      id: "u-1",
      full_name: "John Doe",
      city: "Hyderabad",
      avatar_url: null,
      company: {
        name: "Acme Corp",
        domain: "acme.com",
      },
    },
  };

  const mockPrivatePost = {
    id: "post-priv-99",
    text: "Internal salary discussions for Acme employees only.",
    category: "referrals",
    visibility: "company",
    is_flagged: false,
    is_removed: false,
    user: {
      id: "u-1",
      full_name: "John Doe",
      company: { name: "Acme Corp" },
    },
  };

  it("generates indexable metadata with canonical URL and OpenGraph data for public posts", async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockPublicPost, error: null }),
            }),
          }),
        }),
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "post-pub-99" }),
    });

    expect(metadata.title).toContain("Spacious 2BHK flat available for rent");
    expect(metadata.title).toContain("Vouchins");
    expect(metadata.alternates?.canonical).toBe("https://www.vouchins.com/posts/post-pub-99");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph?.url).toBe("https://www.vouchins.com/posts/post-pub-99");
  });

  it("generates noindex metadata for private or company-only posts", async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockPrivatePost, error: null }),
            }),
          }),
        }),
      }),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "post-priv-99" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders JSON-LD structured data for public posts and passes post ID to client component", async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockPublicPost, error: null }),
            }),
          }),
        }),
      }),
    });

    const pageElement = await PostDetailsPage({
      params: Promise.resolve({ id: "post-pub-99" }),
    });

    const { container } = render(pageElement);
    const scriptTag = container.querySelector('script[type="application/ld+json"]');
    expect(scriptTag).not.toBeNull();

    const jsonLd = JSON.parse(scriptTag!.textContent || "{}");
    expect(jsonLd["@type"]).toBe("DiscussionForumPosting");
    expect(jsonLd.url).toBe("https://www.vouchins.com/posts/post-pub-99");
    expect(jsonLd.author.name).toBe("J**n D*e");
    expect(screen.getByTestId("post-details-client")).toBeInTheDocument();
  });
});
