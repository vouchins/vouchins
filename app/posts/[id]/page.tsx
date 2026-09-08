import type { Metadata } from "next";
import { PostDetailsClient } from "@/components/post-details-client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CATEGORIES } from "@/lib/constants";

interface PostDetailsPageProps {
  params: Promise<{ id: string }>;
}

function maskName(name?: string | null) {
  if (!name) return "Verified Professional";
  return name
    .split(" ")
    .map((p) => {
      if (p.length <= 2) return p;
      return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
    })
    .join(" ");
}

function getCleanSnippet(text?: string | null, maxLength = 150) {
  if (!text) return "";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + "...";
}

async function getPublicPost(id: string) {
  try {
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select(`
        id, text, category, sub_category, visibility, image_urls, city,
        created_at, updated_at, is_flagged, is_removed,
        user:users!posts_user_id_fkey(
          id, full_name, city, avatar_url,
          company:companies!users_company_id_fkey(name, domain)
        )
      `)
      .eq("id", id)
      .eq("is_removed", false)
      .eq("is_flagged", false)
      .maybeSingle();

    return post;
  } catch (err) {
    console.error("Error fetching public post for SEO:", err);
    return null;
  }
}

function getCompanyName(company: any): string | undefined {
  if (!company) return undefined;
  if (Array.isArray(company)) return company[0]?.name;
  return company.name;
}

export async function generateMetadata({
  params,
}: PostDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPost(id);

  if (!post || post.visibility !== "public") {
    return {
      title: "Discussion | Vouchins",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const categoryObj = CATEGORIES.find((c) => c.value === post.category);
  const categoryLabel = categoryObj?.label || post.category || "Discussion";
  const userObj: any = Array.isArray(post.user) ? post.user[0] : post.user;
  const companyName = getCompanyName(userObj?.company);
  const cityName = post.city || userObj?.city;

  const rawSnippet = getCleanSnippet(post.text, 60);
  const title = rawSnippet
    ? `${rawSnippet} | Vouchins`
    : `${categoryLabel} by verified ${companyName || "professional"} in ${cityName || "India"} | Vouchins`;

  const descriptionSnippet = getCleanSnippet(post.text, 150);
  const description = descriptionSnippet
    ? `${descriptionSnippet} - Connect with verified corporate professionals on Vouchins.`
    : `Verified discussion in ${categoryLabel} from ${companyName || "corporate professionals"}. Connect securely on Vouchins.`;

  const canonicalUrl = `https://www.vouchins.com/posts/${encodeURIComponent(id)}`;
  const ogImage =
    Array.isArray(post.image_urls) && post.image_urls.length > 0
      ? post.image_urls[0]
      : "/images/vouchins-social-card.png";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Vouchins",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PostDetailsPage({ params }: PostDetailsPageProps) {
  const { id } = await params;
  const post = await getPublicPost(id);

  let jsonLd = null;

  if (post && post.visibility === "public") {
    const userObj: any = Array.isArray(post.user) ? post.user[0] : post.user;
    const authorName = maskName(userObj?.full_name);
    const companyName = getCompanyName(userObj?.company);

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      headline: getCleanSnippet(post.text, 100) || "Verified Professional Discussion",
      articleBody: post.text ? getCleanSnippet(post.text, 300) : "",
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      url: `https://www.vouchins.com/posts/${encodeURIComponent(id)}`,
      author: {
        "@type": "Person",
        name: authorName,
        ...(companyName && {
          affiliation: {
            "@type": "Organization",
            name: companyName,
          },
        }),
      },
      publisher: {
        "@type": "Organization",
        name: "Vouchins",
        url: "https://www.vouchins.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.vouchins.com/images/logo.png",
        },
      },
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          id="post-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
          suppressHydrationWarning
        />
      )}
      <PostDetailsClient postId={id} />
    </>
  );
}
