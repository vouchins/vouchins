import type { Metadata } from "next";
import { HOW_IT_WORKS_FAQS } from "./faqs";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Vouchins verifies professional identities and helps members connect, collaborate, and transact with greater trust.",
  alternates: {
    canonical: "https://www.vouchins.com/how-it-works",
  },
  openGraph: {
    title: "How It Works | Vouchins",
    description:
      "Learn how Vouchins verifies professional identities and helps members connect, collaborate, and transact with greater trust.",
    url: "https://www.vouchins.com/how-it-works",
  },
  twitter: {
    card: "summary_large_image",
    title: "How It Works | Vouchins",
    description:
      "Learn how Vouchins verifies professional emails, what that signal means, and the precautions members should still take.",
    images: ["/images/vouchins-social-card.png"],
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOW_IT_WORKS_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
