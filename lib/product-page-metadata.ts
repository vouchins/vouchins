import type { Metadata } from "next";
import type { ProductPageContent } from "@/components/product-landing-page";

export function createProductPageMetadata(content: ProductPageContent): Metadata {
  const canonical = `https://www.vouchins.com/${content.slug}`;

  return {
    title: content.title,
    description: content.definition,
    alternates: { canonical },
    openGraph: {
      title: `${content.title} | Vouchins`,
      description: content.definition,
      url: canonical,
      type: "website",
      images: ["/images/vouchins-social-card.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${content.title} | Vouchins`,
      description: content.definition,
      images: ["/images/vouchins-social-card.png"],
    },
  };
}
