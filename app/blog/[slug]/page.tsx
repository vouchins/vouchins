import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { Navigation } from "@/components/navigation";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { BlogAnalyticsTracker } from "@/components/blog-analytics-tracker";
import type { Metadata } from "next";

export const revalidate = 60;

type BlogPostMetadata = {
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  author: BlogAuthor | BlogAuthor[] | null;
};

type BlogAuthor = { full_name: string | null };

function getAuthorName(author: BlogAuthor | BlogAuthor[] | null | undefined) {
  const resolvedAuthor = Array.isArray(author) ? author[0] : author;
  return resolvedAuthor?.full_name || "Vouchins Team";
}

async function getPostMetadata(slug: string): Promise<BlogPostMetadata | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data } = await supabase
    .from("blog_posts")
    .select(
      "title, excerpt, cover_image_url, published_at, updated_at, created_at, author:users!blog_posts_author_id_fkey(full_name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostMetadata(slug);

  if (!post) {
    return {};
  }

  const canonicalUrl = `https://www.vouchins.com/blog/${encodeURIComponent(slug)}`;
  const description =
    post.excerpt || "Read professional networking and trust insights from Vouchins.";
  const publishedTime = post.published_at || post.created_at || undefined;
  const modifiedTime = post.updated_at || publishedTime;
  const authorName = getAuthorName(post.author);

  return {
    title: post.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${post.title} | Vouchins`,
      description,
      url: canonicalUrl,
      type: "article",
      images: post.cover_image_url ? [post.cover_image_url] : undefined,
      publishedTime,
      modifiedTime,
      authors: [authorName],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Vouchins`,
      description,
      images: [post.cover_image_url || "/images/vouchins-social-card.png"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data: post } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      author:users!blog_posts_author_id_fkey(full_name)
    `,
    )
    .eq("slug", resolvedParams.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    notFound();
  }

  const canonicalUrl = `https://www.vouchins.com/blog/${encodeURIComponent(post.slug)}`;
  const authorName = getAuthorName(post.author);
  const publishedDate = post.published_at || post.created_at;
  const modifiedDate = post.updated_at || publishedDate;
  const description =
    post.excerpt || "Read professional networking and trust insights from Vouchins.";
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description,
    image: post.cover_image_url || "https://www.vouchins.com/images/vouchins-social-card.png",
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "Vouchins",
      logo: {
        "@type": "ImageObject",
        url: "https://www.vouchins.com/images/logo.png",
      },
    },
    datePublished: publishedDate,
    dateModified: modifiedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.vouchins.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://www.vouchins.com/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <BlogAnalyticsTracker
        postId={post.id}
        slug={post.slug}
        title={post.title}
      />
      <Navigation />

      <main className="container mx-auto px-4 max-w-3xl py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-neutral-500">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-neutral-900">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/blog" className="hover:text-neutral-900">Blog</Link></li>
            <li aria-hidden="true">/</li>
            <li className="max-w-[18rem] truncate text-neutral-700" aria-current="page">{post.title}</li>
          </ol>
        </nav>

        <article>
          <header className="mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-neutral-500 text-sm border-y border-neutral-100 py-4">
              <span className="font-bold text-neutral-900">
                {authorName}
              </span>
              <span>•</span>
              <time>
                {format(
                  new Date(publishedDate),
                  "MMMM d, yyyy",
                )}
              </time>
              {post.updated_at && post.updated_at !== publishedDate && (
                <>
                  <span>•</span>
                  <span>Updated {format(new Date(post.updated_at), "MMMM d, yyyy")}</span>
                </>
              )}
            </div>
          </header>

          {post.cover_image_url && (
            <div className="mb-10 rounded-2xl overflow-hidden bg-neutral-100">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-auto object-cover max-h-[400px]"
              />
            </div>
          )}

          <div className="prose prose-lg prose-indigo max-w-none text-neutral-700 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
}
