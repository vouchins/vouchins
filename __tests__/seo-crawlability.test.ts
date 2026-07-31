import fs from "node:fs";
import path from "node:path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

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

  it("generates a sitemap with public absolute URLs", () => {
    const entries = sitemap();

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/(?:www\.)?vouchins\.com(?:\/|$)/);
    }
  });
});
