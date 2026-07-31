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
});
