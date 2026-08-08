import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  Briefcase,
  BriefcaseBusiness,
  Grid2X2,
  Home,
  MapPin,
  MessageCircle,
  Search,
  ShoppingBag,
  Star,
  Tag,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  { label: "All posts", icon: Grid2X2 },
  { label: "Housing", icon: Home },
  { label: "Buy & sell", icon: Tag },
  { label: "Recommendations", icon: Star },
  { label: "Referrals", icon: Users },
] as const;

const composerActions = [
  { label: "Sell something", icon: ShoppingBag },
  { label: "Find housing", icon: Home },
  { label: "Ask community", icon: MessageCircle },
  { label: "Request referral", icon: BriefcaseBusiness },
] as const;

function StaticHeader() {
  const actions = [
    { label: "Jobs", href: "/jobs", icon: Briefcase },
    { label: "Saved", href: "/saved", icon: Bookmark },
    { label: "Messages", href: "/messages", icon: MessageCircle },
    { label: "Alerts", href: "/notifications", icon: Bell },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-3">
        <Link href="/feed" aria-label="Vouchins feed" className="shrink-0">
          <Image
            src="/images/logo.png"
            alt="Vouchins"
            width={110}
            height={38}
            className="w-[110px] object-contain"
            priority
          />
        </Link>
        <div className="relative hidden min-w-0 max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <div className="flex h-10 min-w-0 items-center rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-3 text-sm text-neutral-400">
            <span className="block min-w-0 truncate">
              Search posts and opportunities
            </span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link
            href="/feed"
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 md:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>
          {actions.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="hidden h-9 items-center gap-2 rounded-lg px-2 text-[13px] font-bold text-neutral-600 hover:bg-neutral-100 md:flex xl:px-3"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">{label}</span>
            </Link>
          ))}
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function FeedCardSkeleton({ image = false }: { image?: boolean }) {
  return (
    <article className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.55)]">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mt-5 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      {image && <Skeleton className="mt-5 aspect-[16/8] w-full rounded-xl" />}
      <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
    </article>
  );
}

export default function FeedLoading() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] pb-16 lg:pb-0">
      <StaticHeader />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-14rem] top-40 h-[34rem] w-[34rem] rounded-full bg-cyan-100/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-12rem] top-20 h-[32rem] w-[32rem] rounded-full bg-blue-100/55 blur-3xl"
      />

      <div className="relative border-b border-white/80 bg-white/65 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-primary/[0.055] px-3 py-2.5 text-sm font-semibold text-primary">
            <MapPin className="h-4 w-4" />
            <span>City feed</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white/70 px-3 py-2.5 text-sm font-semibold text-neutral-500">
            <BriefcaseBusiness className="h-4 w-4" />
            <span>Company</span>
            <span className="h-2 w-2 rounded-full border border-neutral-300" />
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex max-w-[1348px] gap-6 px-3 py-2 sm:px-4 lg:px-5 lg:py-3">
        <aside className="sticky top-[76px] hidden h-fit w-72 shrink-0 flex-col gap-4 lg:flex">
          <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_14px_38px_-28px_rgba(31,37,87,0.55)]">
            <div className="px-5 pb-5 pt-6 text-center">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mx-auto mt-3 h-5 w-36" />
              <Skeleton className="mx-auto mt-2 h-3 w-48" />
              <Skeleton className="mx-auto mt-2 h-3 w-28" />
              <Skeleton className="mx-auto mt-3 h-6 w-32 rounded-full" />
            </div>
            <div className="grid grid-cols-2 divide-x divide-neutral-100 border-t border-neutral-100 px-3 py-3">
              <div className="flex flex-col items-center gap-2 px-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex flex-col items-center gap-2 px-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex justify-center border-t border-neutral-100 px-5 py-3">
              <Skeleton className="h-4 w-24" />
            </div>
          </section>

          <section
            aria-label="Loading feed selections"
            className="space-y-2 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.5)]"
          >
            <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.055] px-3 py-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200/80 px-3 py-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-36" />
              </div>
              <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.5)]">
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
              Explore
            </p>
            {categories.map(({ label, icon: Icon }, index) => (
              <div
                key={label}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  index === 0 ? "bg-primary/[0.065] text-primary" : "text-neutral-500"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
            <div className="border-t border-neutral-100 pt-4">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </section>
        </aside>

        <main className="mx-auto w-full min-w-0 max-w-2xl flex-1 space-y-4 lg:space-y-2">
          <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="h-11 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-4 text-sm leading-[44px] text-neutral-400">
                What do you need in your city?
              </div>
            </div>
            <div className="no-scrollbar mt-4 flex gap-3 overflow-hidden sm:grid sm:grid-cols-4 sm:gap-0">
              {composerActions.map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className={`flex h-10 min-w-[126px] items-center justify-center gap-2 px-2 text-xs font-semibold text-neutral-600 ${
                    index > 0 ? "sm:border-l sm:border-neutral-200" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex gap-2 overflow-hidden py-2 lg:hidden">
            {categories.slice(0, 4).map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-600"
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            ))}
          </div>

          <FeedCardSkeleton />
          <FeedCardSkeleton image />
          <FeedCardSkeleton />
        </main>

        <aside className="sticky top-[76px] hidden h-fit w-[300px] shrink-0 space-y-4 xl:block">
          <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-5 h-9 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
            <p className="text-sm font-bold text-neutral-700">Trending near you</p>
            <div className="mt-4 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-neutral-200 bg-white lg:hidden">
        {categories.slice(0, 4).map(({ label, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-[10px] text-neutral-500">
            <Icon className="h-5 w-5" />
            {label.split(" ")[0]}
          </div>
        ))}
      </nav>
    </div>
  );
}
