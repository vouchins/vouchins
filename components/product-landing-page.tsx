import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { HomepageNavbar } from "@/components/homepage-navbar";

export type ProductPageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  definition: string;
  audience: string[];
  benefits: string[];
  steps: { title: string; description: string }[];
  limitations: string;
  safety: string[];
  faqs: { question: string; answer: string }[];
  relatedArticles: { title: string; href: string }[];
};

export function ProductLandingPage({ content }: { content: ProductPageContent }) {
  const canonical = `https://www.vouchins.com/${content.slug}`;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.vouchins.com/" },
      { "@type": "ListItem", position: 2, name: content.title, item: canonical },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <HomepageNavbar />
      <main>
        <section className="border-b bg-[#071331] px-6 pb-20 pt-32 text-white md:pt-36">
          <div className="mx-auto max-w-5xl">
            <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">Home</Link> <span aria-hidden="true">/</span> <span aria-current="page">{content.title}</span>
            </nav>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#4FD1C5]">{content.eyebrow}</p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{content.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">{content.definition}</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link href="/signup" className="rounded-xl bg-[#4FD1C5] px-6 py-3 font-semibold text-[#071331] hover:bg-[#68ded3]">Request access</Link>
              <Link href="/how-it-works" className="rounded-xl border border-white/25 px-6 py-3 font-semibold hover:bg-white/10">How verification works</Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Who it is for</h2>
              <ul className="mt-6 space-y-4">
                {content.audience.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span>{item}</span></li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold">What it helps you do</h2>
              <ul className="mt-6 space-y-4">
                {content.benefits.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" /><span>{item}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {content.steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl border bg-white p-6">
                  <span className="text-sm font-bold text-teal-700">Step {index + 1}</span>
                  <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <div className="flex gap-4"><ShieldCheck className="h-7 w-7 shrink-0 text-amber-700" /><div><h2 className="text-2xl font-bold">What verification does—and does not—mean</h2><p className="mt-3 leading-7 text-slate-700">{content.limitations}</p></div></div>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <h2 className="text-3xl font-bold">Use it responsibly</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">{content.safety.map((item) => <li key={item} className="rounded-xl border p-5 text-slate-700">{item}</li>)}</ul>
            <Link href="/safety" className="mt-6 inline-block font-semibold text-blue-700 hover:underline">Read the complete Vouchins safety guidance</Link>
          </div>
        </section>

        <section className="bg-slate-50 px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold">Frequently asked questions</h2>
            <div className="mt-8 space-y-5">{content.faqs.map((faq) => <article key={faq.question} className="rounded-2xl border bg-white p-6"><h3 className="text-lg font-semibold">{faq.question}</h3><p className="mt-3 leading-7 text-slate-600">{faq.answer}</p></article>)}</div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold">Related reading</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">{content.relatedArticles.map((article) => <Link key={article.href} href={article.href} className="rounded-xl border p-5 font-semibold hover:border-blue-300 hover:text-blue-700">{article.title}</Link>)}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
