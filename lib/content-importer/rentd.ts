import type { ContentSource, ImportedContent, ImportMode, SourceAdapter } from "./types";

const RENTD_HOST = "rentd.biswanath.me";

function extractJsonArray(document: string, marker: string): unknown[] {
  const markerIndex = document.indexOf(marker);
  const start = document.indexOf("[", markerIndex);
  if (markerIndex < 0 || start < 0) throw new Error("Rentd listing data was not found");

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let index = start; index < document.length; index += 1) {
    const character = document[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) {
      end = index + 1;
      break;
    }
  }
  if (end < 0) throw new Error("Rentd listing data was incomplete");

  return JSON.parse(document.slice(start, end));
}

export function extractRentdRows(html: string): unknown[] {
  // Current Rentd pages use React Server Components and place the page props in
  // JSON-encoded self.__next_f.push payloads. Decode those strings before
  // scanning brackets, otherwise escaped quotes confuse the JSON string state.
  const flightPattern = /<script>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g;
  let match: RegExpExecArray | null;
  while ((match = flightPattern.exec(html)) !== null) {
    try {
      const payload = JSON.parse(match[1]);
      if (typeof payload[1] === "string" && payload[1].includes('"initialListings"')) {
        return extractJsonArray(payload[1], '"initialListings"');
      }
    } catch {
      // Ignore unrelated or incomplete Flight chunks and try the next one.
    }
  }
  // Retain support for the older server-rendered payload used by Rentd.
  return extractJsonArray(html, "initialListings");
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

async function fetchHtml(url: URL, timeoutMs = 15_000) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: BROWSER_HEADERS,
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 5_000_000) throw new Error("Source response was too large");
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error("Source response was too large");
  return html;
}

async function fetchRentdListings(sourceUrl: URL, page: number): Promise<unknown[]> {
  // Strategy 1: Direct JSON API (reliable, fast, avoids Cloudflare HTML challenges)
  try {
    const apiUrl = new URL("/api/listings", `https://${RENTD_HOST}`);
    sourceUrl.searchParams.forEach((v, k) => {
      if (k !== "page" && k !== "offset" && k !== "limit") {
        apiUrl.searchParams.set(k, v);
      }
    });
    apiUrl.searchParams.set("limit", "24");
    apiUrl.searchParams.set("offset", String((page - 1) * 24));

    const response = await fetch(apiUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json, text/plain, */*",
        Referer: sourceUrl.toString(),
      },
    });

    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (Array.isArray(json.listings) && json.listings.length > 0) {
          return json.listings;
        }
      }
    }
  } catch (err) {
    console.warn("Direct Rentd JSON API failed, falling back to HTML scraping:", err);
  }

  // Strategy 2: HTML scraping (retains support for unit test mocks & fallback)
  const url = new URL(sourceUrl);
  url.searchParams.set("page", String(page));
  const html = await fetchHtml(url);
  return extractRentdRows(html);
}

export function extractOriginalFacebookUrl(html: string) {
  const match = html.match(/https:\/\/(?:www\.)?facebook\.com\/groups\/[^"\\\s<]+/i)?.[0];
  return match?.replace(/&amp;/g, "&") ?? null;
}

async function originalUrlFor(id: string) {
  try {
    const detailUrl = new URL(`/listing/${encodeURIComponent(id)}`, `https://${RENTD_HOST}`);
    const html = await fetchHtml(detailUrl, 2_000);
    return extractOriginalFacebookUrl(html);
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>) {
  const result = new Array<R>(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      result[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return result;
}

export const rentdAdapter: SourceAdapter = {
  key: "rentd",
  supports(url) {
    return url.protocol === "https:" && url.hostname === RENTD_HOST;
  },
  async fetch(sourceUrl: URL, mode: ImportMode, cursor: ContentSource["cursor"]) {
    const page = mode === "more" ? Math.max(2, (cursor?.page ?? 1) + 1) : 1;
    const rows = (await fetchRentdListings(sourceUrl, page)) as any[];
    const originals = await mapWithConcurrency(rows, 2, (row) => originalUrlFor(String(row._id)));

    const items: ImportedContent[] = rows.map((row, index) => ({
      externalId: String(row._id),
      sourceListingUrl: `https://${RENTD_HOST}/listing/${encodeURIComponent(row._id)}`,
      originalUrl: originals[index],
      title: row.title || row.summary?.split(". ")?.[0] || "Rental listing",
      summary: row.summary || row.title || "Rental listing",
      location: row.location?.locality || row.location?.area || null,
      city: row.location?.city || null,
      priceMin: row.rentAmount?.min ?? null,
      priceMax: row.rentAmount?.max ?? null,
      currency: row.rentAmount?.currency ?? null,
      mediaUrls: Array.isArray(row.media) ? row.media.map((media: any) => media.url).filter(Boolean) : [],
      accommodationType: row.accommodationType ?? null,
      furnishing: row.furnishing ?? row.furnishingType ?? null,
      bhk: row.bhk ?? row.bhkType ?? null,
      publishedAt: row.postedAt ?? null,
      raw: row,
    }));
    return { items, cursor: { page } };
  },
};
