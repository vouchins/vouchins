"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InviteDialog,
  triggerNativeShare,
} from "@/components/invite-dialog";
import type { FeedPulse } from "@/lib/feed/types";

interface RightSidebarProps {
  user: {
    id: string;
    city: string;
    is_verified: boolean;
  } | null;
  selectedCity?: string;
  onVerify?: () => void;
  onAwaitingRecommendations?: () => void;
  onTrendingSelect?: (category: string) => void;
}

const EMPTY_PULSE: FeedPulse = {
  awaitingRecommendationsCount: 0,
  answeredCount: 0,
  responseRate: 0,
  trending: [],
  blogPosts: [],
};

export function RightSidebar({
  user,
  selectedCity,
  onAwaitingRecommendations,
  onTrendingSelect,
}: RightSidebarProps) {
  const router = useRouter();
  const city = selectedCity || user?.city || "Hyderabad";
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [pulse, setPulse] = useState<FeedPulse>(EMPTY_PULSE);

  useEffect(() => {
    const controller = new AbortController();
    const loadPulse = async () => {
      try {
        const response = await fetch(
          `/api/feed/pulse?city=${encodeURIComponent(city)}&version=3`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok) return;
        const result = (await response.json()) as Partial<FeedPulse>;
        setPulse({
          ...EMPTY_PULSE,
          ...result,
          awaitingRecommendationsCount:
            Number(result.awaitingRecommendationsCount) || 0,
          answeredCount: Number(result.answeredCount) || 0,
          responseRate: Number(result.responseRate) || 0,
          trending: Array.isArray(result.trending) ? result.trending : [],
          blogPosts: Array.isArray(result.blogPosts) ? result.blogPosts : [],
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load community pulse:", error);
        }
      }
    };
    void loadPulse();
    return () => controller.abort();
  }, [city]);

  const handleInvite = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    const shared = await triggerNativeShare(user.id);
    if (!shared) setIsInviteOpen(true);
  };

  return (
    <aside
      aria-label="Community information"
      className="hidden w-[300px] shrink-0 flex-col gap-5 self-start pb-6 xl:flex"
    >
      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.55)]">
        <div className="mb-5 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-neutral-950">
            Community pulse
          </h2>
        </div>

        <div className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={onAwaitingRecommendations}
            className="feed-focus group flex w-full items-start gap-3 p-4 text-left transition hover:bg-amber-50/70"
          >
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-800">
                Awaiting recommendations
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                  {pulse.awaitingRecommendationsCount}
                </span>
              </span>
              <span className="mt-1.5 block text-[11px] leading-4 text-neutral-600">
                Help colleagues with recommendations. Reputation rewards are coming soon for
                successful recommendations.
              </span>
            </span>
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 transition group-hover:translate-x-0.5" />
          </button>

          <div className="flex gap-3 p-4">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-emerald-700">
                  Community response
                </span>
                <span className="text-xs font-semibold text-neutral-900">
                  {pulse.responseRate}%
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-neutral-600">
                {pulse.answeredCount === 0
                  ? "No recent conversations have replies yet"
                  : `${pulse.answeredCount} recent ${
                      pulse.answeredCount === 1 ? "post has" : "posts have"
                    } received replies`}
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"
                role="progressbar"
                aria-label="Community response rate over the last 30 days"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pulse.responseRate}
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${pulse.responseRate}%` }}
                />
              </div>
              <span className="mt-1.5 block text-[10px] text-neutral-400">
                Last 30 days in {city}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-semibold text-neutral-950">Trending</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {pulse.trending.length > 0 ? (
              pulse.trending.map((item) => (
                <button
                  key={item.category}
                  type="button"
                  onClick={() => onTrendingSelect?.(item.category)}
                  className="feed-focus rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-blue-100"
                >
                  {item.category === "buy_sell" ? "Marketplace" : item.label}
                </button>
              ))
            ) : (
              <span className="text-[11px] text-neutral-500">
                Trends will appear as the community posts.
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.5)]">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-sm font-semibold text-neutral-950">Stay safe</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Meet in public and verify before paying.
        </p>
        <Link
          href="/safety"
          className="feed-focus mt-4 inline-flex items-center gap-2 rounded text-xs font-semibold text-primary hover:text-blue-700"
        >
          Learn more
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <Button
        onClick={handleInvite}
        className="h-12 rounded-xl bg-primary font-semibold shadow-[0_12px_25px_-16px_rgba(31,37,87,0.9)] hover:bg-primary/95"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Invite trusted colleagues
      </Button>

      {pulse.blogPosts.length > 0 && (
        <section aria-labelledby="feed-blog-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="feed-blog-heading"
              className="flex items-center gap-2 text-xs font-semibold text-neutral-950"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              From the Vouchins blog
            </h2>
            <Link
              href="/blog"
              className="feed-focus rounded text-[10px] font-semibold text-primary"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {pulse.blogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="feed-focus group flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_12px_30px_-26px_rgba(31,37,87,0.6)] transition hover:border-primary/20 hover:shadow-sm"
              >
                <div className="h-20 w-20 shrink-0 bg-neutral-100">
                  <img
                    src={post.coverImageUrl || "/images/logobgwhite.png"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 p-3">
                  <h3 className="line-clamp-2 text-[11px] font-semibold leading-4 text-neutral-900 group-hover:text-primary">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-1 text-[10px] text-neutral-500">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {user && (
        <section className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,#fffdf7,#fff8e7)] p-4 shadow-[0_14px_38px_-28px_rgba(146,93,13,0.45)]">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-950">
                Vouchins Premium
              </p>
              <p className="mt-1 text-[11px] leading-4 text-neutral-600">
                Get more visibility and deeper trust insights.
              </p>
            </div>
          </div>
          <Link
            href="/premium"
            className="feed-focus mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5 text-[11px] font-semibold text-amber-800 transition hover:bg-white"
          >
            Explore Premium
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {user && (
        <InviteDialog
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          userId={user.id}
        />
      )}
    </aside>
  );
}
