import { rentdAdapter } from "./rentd";
import type { SourceAdapter } from "./types";
import { createHash } from "node:crypto";
import { flatnestAdapter } from "./flatnest";

const adapters: SourceAdapter[] = [rentdAdapter, flatnestAdapter];

export function normalizeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith("utm_") || key === "fbclid") url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

export function contentFingerprint(item: Pick<import("./types").ImportedContent, "title" | "summary" | "city" | "location" | "priceMin" | "priceMax">) {
  const value = [item.title, item.summary, item.city, item.location, item.priceMin, item.priceMax]
    .map((part) => String(part ?? "").toLowerCase().replace(/\s+/g, " ").trim()).join("|");
  return createHash("sha256").update(value).digest("hex");
}

export function parseSupportedSource(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid source URL");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Only standard HTTPS source URLs are allowed");
  }
  const adapter = adapters.find((candidate) => candidate.supports(url));
  if (!adapter) throw new Error("This source is not supported yet");
  return { url, adapter };
}

export { adapters };

export type { ContentSource, ImportedContent, ImportMode } from "./types";
