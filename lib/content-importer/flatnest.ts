import type { ContentSource, ImportedContent, ImportMode, SourceAdapter } from "./types";

const FLATNEST_HOST = "flatnest.in";
const FLATNEST_API_HOST = "api.flatnest.in";
const PAGE_SIZE = 15;

const DIRECT_FILTERS = new Set([
  "type", "city", "localities", "society", "maxRent", "roomTypes", "amenities",
  "deposit", "minAge", "maxAge", "smoking", "drinking", "sleepStyle", "petPolicy",
  "cleaningHabit", "coupleFriendly", "bachelorsAllowed", "foodPreference", "gender",
  "sort", "search", "earlyBird",
]);

function appendValues(target: URLSearchParams, key: string, values: string[]) {
  for (const value of values.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean)) {
    target.append(key, value);
  }
}

export function flatnestApiUrl(sourceUrl: URL, page: number) {
  const api = new URL(`https://${FLATNEST_API_HOST}/api/listings`);
  api.searchParams.set("page", String(page));
  api.searchParams.set("pageSize", String(PAGE_SIZE));

  for (const key of Array.from(DIRECT_FILTERS)) appendValues(api.searchParams, key, sourceUrl.searchParams.getAll(key));
  appendValues(api.searchParams, "localities", sourceUrl.searchParams.getAll("locality"));
  appendValues(api.searchParams, "foodPreference", sourceUrl.searchParams.getAll("foodChoice"));
  const budget = sourceUrl.searchParams.get("budget")?.replace(/\D/g, "");
  if (budget && !api.searchParams.has("maxRent")) api.searchParams.set("maxRent", budget);
  if (!api.searchParams.has("type")) api.searchParams.set("type", "offering");
  return api;
}

async function fetchJson(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json", "User-Agent": "VouchinsContentImporter/1.0" },
  });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 2_000_000) throw new Error("Source response was too large");
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("Source response was too large");
  return JSON.parse(text);
}

function safePayload(row: any) {
  const {
    posted_by: _postedBy, whatsapp_number: _whatsapp, contact_email: _email,
    contact_phone: _phone, owner_email: _ownerEmail, owner_name: _ownerName,
    admin_note: _adminNote, ai_moderation_reason: _aiReason,
    photo_moderation_reason: _photoReason, lat: _lat, lng: _lng, ...safe
  } = row;
  return safe;
}

export const flatnestAdapter: SourceAdapter = {
  key: "flatnest",
  supports(url) {
    return url.protocol === "https:" && url.hostname === FLATNEST_HOST && (url.pathname === "/listings" || url.pathname === "/listings/");
  },
  async fetch(sourceUrl: URL, mode: ImportMode, cursor: ContentSource["cursor"]) {
    const page = mode === "more" ? (cursor?.page ?? 0) + 1 : 0;
    const payload = await fetchJson(flatnestApiUrl(sourceUrl, page));
    if (!Array.isArray(payload.listings)) throw new Error("FlatNest listing data was not found");
    const items: ImportedContent[] = payload.listings
      .filter((row: any) => row?.id && row.status === "active" && row.type === "offering")
      .map((row: any) => ({
        externalId: String(row.id),
        sourceListingUrl: `https://${FLATNEST_HOST}/matches/${encodeURIComponent(row.id)}`,
        originalUrl: `https://${FLATNEST_HOST}/matches/${encodeURIComponent(row.id)}`,
        title: String(row.title || "FlatNest rental listing"),
        summary: String(row.description || row.title || "FlatNest rental listing"),
        location: row.locality || row.area || row.society_name || null,
        city: row.city || null,
        priceMin: typeof row.rent === "number" ? row.rent : null,
        priceMax: typeof row.rent === "number" ? row.rent : null,
        currency: "INR",
        mediaUrls: Array.isArray(row.listing_photos) ? row.listing_photos.map((photo: any) => photo?.url).filter(Boolean) : [],
        accommodationType: row.room_type || null,
        furnishing: row.furnishing || null,
        bhk: String(row.room_type || "").match(/(\d+)_bhk/)?.[1] ?? null,
        publishedAt: row.created_at || null,
        raw: safePayload(row),
      }));
    return { items, cursor: { page } };
  },
};
