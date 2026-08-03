export type ImportMode = "initial" | "latest" | "more";

export type ContentSource = {
  id: string;
  name: string;
  url: string;
  adapter: string;
  enabled: boolean;
  cursor: { page?: number } | null;
  last_fetched_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
};

export type ImportedContent = {
  externalId: string;
  sourceListingUrl: string;
  originalUrl: string | null;
  title: string;
  summary: string;
  location: string | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  mediaUrls: string[];
  accommodationType: string | null;
  furnishing: string | null;
  bhk: string | null;
  publishedAt: string | null;
  raw: Record<string, unknown>;
};

export type SourceAdapter = {
  key: string;
  supports(url: URL): boolean;
  fetch(sourceUrl: URL, mode: ImportMode, cursor: ContentSource["cursor"]): Promise<{
    items: ImportedContent[];
    cursor: { page?: number };
  }>;
};
