import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.vouchins.com";

type PublishedBlogPost = {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const PUBLIC_PAGES: MetadataRoute.Sitemap = [
  { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
  { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/safety`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE_URL}/business`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${BASE_URL}/verified-professional-community`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/employee-referrals`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/verified-flatmates`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/flatmates-in-hyderabad`, changeFrequency: "weekly", priority: 0.9 },
  { url: `${BASE_URL}/corporate-marketplace`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/trusted-recommendations`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
];

export function buildSitemap(
  publishedPosts: PublishedBlogPost[] = [],
): MetadataRoute.Sitemap {
  const blogEntries: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${BASE_URL}/blog/${encodeURIComponent(post.slug)}`,
    lastModified:
      post.updated_at ?? post.published_at ?? post.created_at ?? undefined,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...PUBLIC_PAGES, ...blogEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return buildSitemap();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, published_at, updated_at, created_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Unable to include published blog posts in sitemap", error);
    return buildSitemap();
  }

  return buildSitemap(data ?? []);
}
