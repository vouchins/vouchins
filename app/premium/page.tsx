import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { HomepageNavbar } from "@/components/homepage-navbar";

const plannedBenefits = [
  {
    title: "Advanced trust insights",
    description:
      "Understand how profile activity and community contributions strengthen your standing.",
    icon: BarChart3,
  },
  {
    title: "Priority visibility",
    description:
      "Help relevant requests and professional contributions reach more verified members.",
    icon: TrendingUp,
  },
  {
    title: "Enhanced profile tools",
    description:
      "Showcase verified experience and trust signals with richer profile controls.",
    icon: ShieldCheck,
  },
];

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-neutral-950">
      <HomepageNavbar />

      <main className="pb-20 pt-28">
        <section className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-amber-200/80 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.2),transparent_34%),linear-gradient(145deg,#fff,#fff9e9)] px-6 py-12 shadow-[0_24px_70px_-50px_rgba(146,93,13,0.7)] sm:px-10 sm:py-16">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to feed
            </Link>

            <div className="mt-10 max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-800">
                <Sparkles className="h-4 w-4" />
                Premium early access
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                Get more from your verified network.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
                Vouchins Premium is being prepared for members who want deeper
                trust insights, stronger visibility, and enhanced professional
                profile tools.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-[0_12px_25px_-16px_rgba(31,37,87,0.9)] transition hover:bg-primary/95"
                >
                  Request early access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="text-xs text-neutral-500">
                  Pricing and checkout are not yet available.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Planned membership
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Premium features under consideration
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {plannedBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">
                    {benefit.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-neutral-500">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            These benefits are planned, not active entitlements. Final features
            and pricing may change before launch.
          </p>
        </section>
      </main>
    </div>
  );
}
