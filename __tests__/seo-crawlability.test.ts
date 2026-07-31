import fs from "node:fs";
import path from "node:path";
import robots from "@/app/robots";
import { buildSitemap } from "@/app/sitemap";

describe("public SEO crawl endpoints", () => {
  it("publishes a canonical www sitemap URL in robots.txt", () => {
    const directives = robots();

    expect(directives.sitemap).toBe("https://www.vouchins.com/sitemap.xml");
  });

  it("keeps robots.txt and sitemap.xml outside authentication middleware", () => {
    const middlewareSource = fs.readFileSync(
      path.join(process.cwd(), "middleware.ts"),
      "utf8",
    );

    expect(middlewareSource).toContain("robots\\\\.txt");
    expect(middlewareSource).toContain("sitemap\\\\.xml");
  });

  it("generates canonical public URLs and published blog entries", () => {
    const entries = buildSitemap([
      {
        slug: "trust-guide",
        published_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-02T00:00:00.000Z",
        created_at: "2026-06-30T00:00:00.000Z",
      },
    ]);

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/www\.vouchins\.com(?:\/|$)/);
    }
    expect(entries.map((entry) => entry.url)).toContain(
      "https://www.vouchins.com/blog/trust-guide",
    );
  });

  it("excludes authentication and unfinished pages from the sitemap", () => {
    const urls = buildSitemap().map((entry) => entry.url);

    expect(urls).not.toContain("https://www.vouchins.com/login");
    expect(urls).not.toContain("https://www.vouchins.com/signup");
    expect(urls).not.toContain("https://www.vouchins.com/premium");
  });

  it("keeps advertiser tools protected while leaving the business landing page public", () => {
    const middlewareSource = fs.readFileSync(
      path.join(process.cwd(), "middleware.ts"),
      "utf8",
    );

    expect(middlewareSource).toContain("'/business'");
    expect(middlewareSource).not.toContain("'/blog', '/business', '/posts/'");
  });

  it("defines canonical metadata for every static page in the sitemap", () => {
    const metadataFiles = [
      "app/layout.tsx",
      "app/about/layout.tsx",
      "app/how-it-works/layout.tsx",
      "app/safety/layout.tsx",
      "app/blog/layout.tsx",
      "app/business/layout.tsx",
      "app/contact/layout.tsx",
      "app/privacy/layout.tsx",
      "app/terms/layout.tsx",
    ];

    for (const metadataFile of metadataFiles) {
      const source = fs.readFileSync(
        path.join(process.cwd(), metadataFile),
        "utf8",
      );
      expect(source).toContain("canonical:");
      expect(source).toContain("https://www.vouchins.com");
    }
  });

  it("defines slug-specific canonical and Open Graph URLs for blog posts", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/blog/[slug]/page.tsx"),
      "utf8",
    );

    expect(source).toContain("generateMetadata");
    expect(source).toContain("canonical: canonicalUrl");
    expect(source).toContain("url: canonicalUrl");
  });

  it("uses the canonical www origin for email link fallbacks", () => {
    const emailSources = [
      "lib/email.ts",
      "lib/email-notifications.ts",
      "app/api/admin/campaigns/route.ts",
    ].map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), "utf8"),
    );

    for (const source of emailSources) {
      expect(source).not.toContain('"https://vouchins.com"');
    }
  });

  it("adds noindex protection to authentication and private routes", () => {
    const middlewareSource = fs.readFileSync(
      path.join(process.cwd(), "middleware.ts"),
      "utf8",
    );
    const loginMetadata = fs.readFileSync(
      path.join(process.cwd(), "app/login/layout.tsx"),
      "utf8",
    );
    const signupMetadata = fs.readFileSync(
      path.join(process.cwd(), "app/signup/layout.tsx"),
      "utf8",
    );

    expect(middlewareSource).toContain(
      "response.headers.set('X-Robots-Tag', 'noindex, follow')",
    );
    expect(middlewareSource).toContain("const isIndexableRoute =");
    expect(loginMetadata).toContain("index: false");
    expect(signupMetadata).toContain("index: false");
  });

  it("publishes all five substantive product landing pages", () => {
    const productSlugs = [
      "verified-professional-community",
      "employee-referrals",
      "verified-flatmates",
      "corporate-marketplace",
      "trusted-recommendations",
    ];
    const sitemapUrls = buildSitemap().map((entry) => entry.url);

    for (const slug of productSlugs) {
      expect(
        fs.existsSync(path.join(process.cwd(), `app/${slug}/page.tsx`)),
      ).toBe(true);
      expect(sitemapUrls).toContain(`https://www.vouchins.com/${slug}`);
    }
  });

  it("adds article, breadcrumb, and FAQ structured data", () => {
    const articleSource = fs.readFileSync(
      path.join(process.cwd(), "app/blog/[slug]/page.tsx"),
      "utf8",
    );
    const howItWorksSource = fs.readFileSync(
      path.join(process.cwd(), "app/how-it-works/layout.tsx"),
      "utf8",
    );
    const productSource = fs.readFileSync(
      path.join(process.cwd(), "components/product-landing-page.tsx"),
      "utf8",
    );

    expect(articleSource).toContain('"@type": "BlogPosting"');
    expect(articleSource).toContain('"@type": "BreadcrumbList"');
    expect(howItWorksSource).toContain('"@type": "FAQPage"');
    expect(productSource).toContain('"@type": "FAQPage"');
    expect(productSource).toContain('"@type": "BreadcrumbList"');
  });
});
