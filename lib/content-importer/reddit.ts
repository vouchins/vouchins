import type { ContentSource, ImportedContent, ImportMode, SourceAdapter } from "./types";
import { INDIAN_CITIES } from "@/lib/constants";

const REDDIT_HOSTS = new Set(["reddit.com", "www.reddit.com", "old.reddit.com"]);

const HYDERABAD_LOCALITIES = [
  "Kondapur",
  "Gachibowli",
  "Hitec City",
  "Madhapur",
  "Financial District",
  "Kokapet",
  "Hafeezpet",
  "Manikonda",
  "Kukatpally",
  "Jubilee Hills",
  "Banjara Hills",
  "Nanakramguda",
  "Tellapur",
  "Miyapur",
  "Tolichowki",
  "Begumpet",
  "Ameerpet",
  "Secunderabad",
  "Banjara",
  "Gowlidoddy",
  "Masjid Banda",
  "Chandanagar",
  "Lingampally",
];

export function extractSubreddit(url: URL): string | null {
  const match = url.pathname.match(/^\/r\/([a-zA-Z0-9_]+)/i);
  return match ? match[1] : null;
}

export function detectCity(subreddit: string, text: string): string | null {
  const lowerSub = subreddit.toLowerCase();
  for (const city of INDIAN_CITIES) {
    if (lowerSub.includes(city.toLowerCase())) return city;
  }
  for (const city of INDIAN_CITIES) {
    if (new RegExp(`\\b${city}\\b`, "i").test(text)) return city;
  }
  return null;
}

export function extractLocation(text: string, city: string | null): string | null {
  if (city === "Hyderabad" || !city) {
    for (const loc of HYDERABAD_LOCALITIES) {
      if (new RegExp(`\\b${loc}\\b`, "i").test(text)) {
        return loc;
      }
    }
  }
  return null;
}

export function extractBhk(text: string): string | null {
  const match = text.match(/\b([1-5])\s*(?:bhk|rk|bed|bedroom)\b/i);
  return match ? match[1] : null;
}

export function extractFurnishing(text: string): string | null {
  if (/fully\s*furnished/i.test(text)) return "fully_furnished";
  if (/semi\s*furnished/i.test(text)) return "semi_furnished";
  if (/unfurnished/i.test(text)) return "unfurnished";
  return null;
}

export function extractAccommodationType(text: string): string | null {
  if (/\b(?:flatmate|roommate)\b/i.test(text)) return "flatmates";
  if (/\b(?:pg|paying\s*guest)\b/i.test(text)) return "pg";
  if (/\b(?:room|bedroom)\b/i.test(text)) return "room";
  if (/\b(?:flat|apartment|house)\b/i.test(text)) return "flat";
  return null;
}

export function extractRent(text: string): { min: number | null; max: number | null } {
  // Pattern 1: Range like 15k-20k or 15000-20000 or ₹15k to ₹20k
  const rangeMatch = text.match(
    /(?:₹|rs\.?|rent|price)?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(k)?\s*(?:-|to)\s*(?:₹|rs\.?)?\s*(\d+(?:[.,]\d+)?)\s*(k)?\b/i
  );
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ""));
    let max = parseFloat(rangeMatch[3].replace(/,/g, ""));
    if (rangeMatch[2]?.toLowerCase() === "k" || min < 100) min *= 1000;
    if (rangeMatch[4]?.toLowerCase() === "k" || max < 100) max *= 1000;
    if (min >= 1000 && max <= 300000 && min <= max) {
      return { min, max };
    }
  }

  // Pattern 2: Single amount like "Rent : 26+1k", "20500", "₹15k"
  const singleMatch =
    text.match(/(?:rent|price|deposit)?\s*[:=-]?\s*(?:₹|rs\.?)\s*(\d+(?:[.,]\d+)?)\s*(k)?\b/i) ||
    text.match(/\brent\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(k)?\b/i) ||
    text.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);

  if (singleMatch) {
    let val = parseFloat(singleMatch[1].replace(/,/g, ""));
    if (singleMatch[2]?.toLowerCase() === "k" || (!singleMatch[2] && val < 100)) val *= 1000;
    if (val >= 2000 && val <= 300000) {
      return { min: val, max: val };
    }
  }

  return { min: null, max: null };
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#32;/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // markdown links
    .replace(/[#*_~`]/g, "") // markdown formatting
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchFromPullPush(
  subreddit: string,
  before?: number
): Promise<{ items: any[]; oldestCreatedUtc: number | null }> {
  let apiUrl = `https://api.pullpush.io/reddit/search/submission/?subreddit=${encodeURIComponent(subreddit)}&size=25`;
  if (before) {
    apiUrl += `&before=${before}`;
  }

  const response = await fetch(apiUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: "application/json",
      "User-Agent": "VouchinsContentImporter/1.0",
    },
  });

  if (!response.ok) throw new Error(`PullPush returned ${response.status}`);
  const json = await response.json();
  const posts = Array.isArray(json.data) ? json.data : [];

  let oldest: number | null = null;
  for (const post of posts) {
    if (typeof post.created_utc === "number") {
      if (oldest === null || post.created_utc < oldest) {
        oldest = post.created_utc;
      }
    }
  }

  return { items: posts, oldestCreatedUtc: oldest };
}

export const redditAdapter: SourceAdapter = {
  key: "reddit",
  supports(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      REDDIT_HOSTS.has(host) &&
      /^\/r\/[a-zA-Z0-9_]+/i.test(url.pathname)
    );
  },
  async fetch(sourceUrl: URL, mode: ImportMode, cursor: ContentSource["cursor"]) {
    const subreddit = extractSubreddit(sourceUrl);
    if (!subreddit) throw new Error("Invalid subreddit URL");

    const before = mode === "more" ? (cursor as any)?.before : undefined;
    const { items: posts, oldestCreatedUtc } = await fetchFromPullPush(subreddit, before);

    const items: ImportedContent[] = posts
      .filter((post) => post && post.id && !post.removed_by_category)
      .map((post) => {
        const title = (post.title || "Reddit listing").trim();
        const rawBody = (post.selftext || "").trim();
        const summary = cleanMarkdown(rawBody || title);
        const fullText = `${title}\n${rawBody}`;

        const city = detectCity(subreddit, fullText);
        const location = extractLocation(fullText, city);
        const bhk = extractBhk(fullText);
        const furnishing = extractFurnishing(fullText);
        const accommodationType = extractAccommodationType(fullText);
        const { min: priceMin, max: priceMax } = extractRent(fullText);

        const mediaUrls: string[] = [];
        if (post.url && /\.(jpe?g|png|webp)$/i.test(post.url)) {
          mediaUrls.push(post.url);
        }
        if (post.preview?.images?.[0]?.source?.url) {
          mediaUrls.push(post.preview.images[0].source.url.replace(/&amp;/g, "&"));
        }

        const permalink = post.permalink?.startsWith("/")
          ? `https://www.reddit.com${post.permalink}`
          : `https://www.reddit.com/r/${subreddit}/comments/${post.id}/`;

        const publishedAt = post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : null;

        return {
          externalId: String(post.id),
          sourceListingUrl: permalink,
          originalUrl: permalink,
          title,
          summary,
          location,
          city,
          priceMin,
          priceMax,
          currency: priceMin !== null ? "INR" : null,
          mediaUrls: Array.from(new Set(mediaUrls)),
          accommodationType,
          furnishing,
          bhk,
          publishedAt,
          raw: post,
        };
      });

    return {
      items,
      cursor: {
        page: mode === "more" ? ((cursor?.page ?? 1) + 1) : 1,
        ...(oldestCreatedUtc ? { before: oldestCreatedUtc } : {}),
      },
    };
  },
};
