"use client";

import {
  type CSSProperties,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/post-card";
import {
  BriefcaseBusiness,
  Building2,
  CircleAlert,
  Grid2X2,
  Home,
  ListFilter,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Star,
  Tag,
  TrendingUp,
  Users,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BlurredPostCard } from "@/components/blurred-post-card";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "./side-bars/right/right-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Suspense } from "react";
import { ProfileCompletionWidget } from "@/components/profile-completion-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, INDIAN_CITIES } from "@/lib/constants";
import { supabase } from "@/lib/supabase/browser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FeedFilters, FeedPageData, FeedPost, FeedUser } from "@/lib/feed/types";
import { PostViewBatchProvider, PostViewTracker } from "@/components/post-view-tracker";

const CreatePostDialog = dynamic(
  () => import("@/components/create-post-dialog").then((mod) => mod.CreatePostDialog),
  { ssr: false },
);
const ReportDialog = dynamic(() => import("@/components/report-dialog").then((mod) => mod.ReportDialog));
const VerificationModal = dynamic(() => import("@/components/verification-modal").then((mod) => mod.VerificationModal));

interface FeedClientProps {
  initialUser: FeedUser;
  initialFeed: FeedPageData;
  initialFilters: Omit<FeedFilters, "cursor" | "limit">;
}

const COMPOSER_ACTIONS = [
  { label: "Sell something", shortLabel: "Sell", category: "buy_sell", icon: ShoppingBag },
  { label: "Find housing", shortLabel: "Housing", category: "housing", icon: Home },
  { label: "Ask community", shortLabel: "Ask", category: "recommendations", icon: MessageCircle },
  { label: "Request referral", shortLabel: "Referral", category: "referrals", icon: BriefcaseBusiness },
] as const;

const FILTER_ICONS = {
  all: Grid2X2,
  housing: Home,
  buy_sell: Tag,
  recommendations: Star,
  referrals: Users,
} as const;

type FeedSort = "newest" | "most_vouched" | "most_discussed";

export function FeedClient({ initialUser, initialFeed, initialFilters }: FeedClientProps) {
  const skipInitialFilterFetch = useRef(true);

  const [user, setUser] = useState<FeedUser>(initialUser);
  const [posts, setPosts] = useState<FeedPost[]>(initialFeed.posts);
  const [inlineAds, setInlineAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialFeed.hasMore);
  const [nextCursor, setNextCursor] = useState(initialFeed.nextCursor);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"city" | "company">(initialFilters.tab);
  const [activeCategory, setActiveCategory] = useState(initialFilters.category);
  const [activeSubCategory, setActiveSubCategory] = useState(initialFilters.subCategory);
  const [selectedCity, setSelectedCity] = useState(initialFilters.city);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
    label?: string;
  } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCategory, setComposerCategory] = useState("");
  const [sortMode, setSortMode] = useState<FeedSort>("newest");
  const [recommendationsOnly, setRecommendationsOnly] = useState(false);

  const fetchPosts = useCallback(
    async (tab: "city" | "company", category: string, subCategory: string, queryStr: string, city: string, cursor?: string | null) => {
      try {
        setLoadError(null);
        const params = new URLSearchParams({
          tab, category, subCategory, query: queryStr, city,
        });
        if (cursor) params.set("cursor", cursor);
        if (!cursor) setLoading(true);
        const response = await fetch(`/api/posts/get-posts?${params.toString()}`);
        const result = (await response.json()) as FeedPageData & { error?: string };
        if (!response.ok || result.error) throw new Error(result.error || "Failed to load feed");

        if (!cursor) {
          setPosts(result.posts);
          posthog.capture("Feed Refresh", { tab, category, subCategory, city });
          posthog.capture("Feed Impression", { posts_count: result.posts.length });
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setLoadError("We could not refresh the feed. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  //Search related state and effect
  const searchParams = useSearchParams();
  const queryStr = searchParams.get("q") || "";
  const refreshPosts = useCallback(
    () => fetchPosts(activeTab, activeCategory, activeSubCategory, queryStr, selectedCity),
    [activeTab, activeCategory, activeSubCategory, queryStr, selectedCity, fetchPosts],
  );
  useEffect(() => {
    if (queryStr) {
      // Reset the UI state so the sidebar correctly shows "# all" as active
      setActiveCategory("all");
      setActiveSubCategory("all");
    }
  }, [queryStr]);
  useEffect(() => {
    if (skipInitialFilterFetch.current) {
      skipInitialFilterFetch.current = false;
      posthog.capture("Feed Loaded", {
        tab: activeTab,
        category: activeCategory,
        subCategory: activeSubCategory,
        city: selectedCity,
        posts_count: initialFeed.posts.length,
      });
      return;
    }
    const categoryToUse = queryStr ? "all" : activeCategory;
    const subCategoryToUse = queryStr ? "all" : activeSubCategory;
    void fetchPosts(activeTab, categoryToUse, subCategoryToUse, queryStr, selectedCity);
  }, [activeTab, activeCategory, activeSubCategory, queryStr, selectedCity, fetchPosts, initialFeed.posts.length]);

  // Track scroll depth
  useEffect(() => {
    let maxPercentageReached = 0;
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const scrollPosition = window.scrollY;
      const percentage = Math.round((scrollPosition / totalHeight) * 100);

      const thresholds = [25, 50, 75, 100];
      for (const threshold of thresholds) {
        if (percentage >= threshold && maxPercentageReached < threshold) {
          maxPercentageReached = threshold;
          posthog.capture("Feed Scroll Depth", { percentage: threshold });
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchInlineAds = async () => {
    try {
      const res = await fetch("/api/advertisement?placement=inline&limit=5");
      const data = await res.json();
      setInlineAds(data.ads || []);
    } catch (e) {
      console.error("Ad fetch failed", e);
    }
  };

  useEffect(() => {
    const schedule = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 1));
    const handle = schedule(() => void fetchInlineAds());
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  const handleCityChange = async (newCity: string) => {
    setSelectedCity(newCity);
    setUser((prev) => ({ ...prev, city: newCity }));
    window.dispatchEvent(new CustomEvent("user-updated", { detail: { city: newCity } }));
    await supabase.from("users").update({ city: newCity }).eq("id", user?.id);
  };

  const openComposer = (category = "") => {
    if (!user?.is_verified) {
      setIsVerifyModalOpen(true);
      return;
    }
    setComposerCategory(category);
    setComposerOpen(true);
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sortedPosts = useMemo(() => {
    if (sortMode === "newest") return posts;
    return [...posts].sort((a, b) => {
      if (sortMode === "most_vouched") {
        return b.vouch_count - a.vouch_count;
      }
      return b.comment_count - a.comment_count;
    });
  }, [posts, sortMode]);
  const visiblePosts = useMemo(
    () =>
          recommendationsOnly
        ? sortedPosts.filter(
            (post) =>
              post.category === "recommendations" &&
              post.status === "active" &&
              post.comment_count === 0,
          )
        : sortedPosts,
    [recommendationsOnly, sortedPosts],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return;
    setLoadingMore(true);
    await fetchPosts(activeTab, activeCategory, activeSubCategory, queryStr, selectedCity, nextCursor);
    setLoadingMore(false);
  }, [activeTab, activeCategory, activeSubCategory, queryStr, selectedCity, nextCursor, fetchPosts, loadingMore]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, loading, loadingMore, handleLoadMore]);

  const renderContent = () => {
    // Scenario A: Workspace is locked
    if (!user?.is_verified && activeTab === "company") {
      return (
        <div className="rounded-[22px] border border-white/90 bg-white/75 px-6 py-10 text-center shadow-[0_18px_45px_-34px_rgba(31,37,87,0.5)] backdrop-blur-xl sm:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.055] text-primary shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Join the private {user?.company?.name} feed
          </h2>
          <p className="mx-auto mb-7 mt-2 max-w-md text-sm leading-6 text-neutral-600">
            Verify your professional identity to unlock private discussions and
            trusted referrals with verified colleagues at {user?.company?.name}.
          </p>
          <Button
            onClick={() => setIsVerifyModalOpen(true)}
            className="h-11 rounded-xl px-7 text-sm font-semibold shadow-[0_12px_25px_-16px_rgba(31,37,87,0.9)]"
          >
            Verify to join colleagues
          </Button>
        </div>
      );
    }

    // Scenario B: Initial Loading
    if (loading && posts.length === 0) {
      return (
        <div className="animate-pulse space-y-4" aria-label="Loading posts">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="space-y-4 rounded-[22px] border border-white/90 bg-white/75 p-4 shadow-[0_18px_45px_-34px_rgba(31,37,87,0.45)] sm:p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-28 bg-neutral-100" />
                      <Skeleton className="h-4 w-4 rounded-full bg-neutral-100" />
                    </div>
                    <Skeleton className="h-3 w-40 bg-neutral-100" />
                    <Skeleton className="h-3 w-28 bg-neutral-100" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full bg-neutral-100" />
              </div>

              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full bg-neutral-100" />
                <Skeleton className="h-6 w-16 rounded-full bg-neutral-100" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3 bg-neutral-100" />
                <Skeleton className="h-4 w-full bg-neutral-100" />
                <Skeleton className="h-4 w-[92%] bg-neutral-100" />
                <Skeleton className="h-4 w-[68%] bg-neutral-100" />
              </div>

              {i % 2 === 0 && (
                <Skeleton className="h-56 w-full rounded-xl bg-neutral-100" />
              )}

              <div className="flex gap-3">
                <Skeleton className="h-3 w-14 bg-neutral-100" />
                <Skeleton className="h-3 w-16 bg-neutral-100" />
                <Skeleton className="h-3 w-14 bg-neutral-100" />
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3">
                <Skeleton className="h-9 rounded-xl bg-neutral-100" />
                <Skeleton className="h-9 rounded-xl bg-neutral-100" />
                <Skeleton className="h-9 rounded-xl bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Scenario C: No Results Found
    if (loadError && posts.length === 0) {
      return (
        <div
          role="alert"
          className="rounded-[22px] border border-red-100 bg-white/75 px-6 py-12 text-center shadow-[0_18px_45px_-34px_rgba(31,37,87,0.45)] backdrop-blur-xl"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <CircleAlert className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-950">
            Feed unavailable
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-600">
            {loadError}
          </p>
          <Button
            type="button"
            onClick={() => void refreshPosts()}
            className="mt-6 h-10 rounded-xl px-6 text-sm font-semibold"
          >
            Try again
          </Button>
        </div>
      );
    }

    if (!loading && posts.length === 0) {
      return (
        <div className="rounded-[22px] border border-dashed border-neutral-300/80 bg-white/65 px-6 py-12 text-center backdrop-blur-xl sm:p-16">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.045] text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-950">
            {queryStr ? "No matching posts" : "Start the conversation"}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
            {queryStr
              ? `We could not find posts matching "${queryStr}" in this feed.`
              : `Be the first to share something useful with your ${
                  activeTab === "city" ? "local community" : "colleagues"
                }.`}
          </p>
          {!queryStr && (
            <Button
              type="button"
              onClick={() => openComposer()}
              className="mt-6 h-10 rounded-xl px-6 text-sm font-semibold"
            >
              Start a post
            </Button>
          )}
        </div>
      );
    }

    // Scenario D: Display Posts
    return (
      <div className="space-y-4">
        {recommendationsOnly && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Awaiting recommendations
              </p>
              <p className="mt-0.5 text-[11px] text-amber-800/80">
                Showing recommendation requests without replies in {selectedCity}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRecommendationsOnly(false);
                setActiveCategory("all");
                setActiveSubCategory("all");
              }}
              className="feed-focus shrink-0 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
        )}
        {loadError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/85 px-4 py-3 text-sm text-amber-900"
          >
            <span className="flex min-w-0 items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span className="min-w-0">{loadError}</span>
            </span>
            <button
              type="button"
              onClick={() => void refreshPosts()}
              className="feed-focus shrink-0 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-amber-100"
            >
              Retry
            </button>
          </div>
        )}
        {recommendationsOnly && visiblePosts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-neutral-900">
              No recommendation requests are waiting
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              This community is currently caught up.
            </p>
          </div>
        )}
        {visiblePosts.map((post, index) => {
          // BLURRING LOGIC:
          // Blur if: User is NOT verified AND the post belongs to a verified user (not admin)
          const shouldBlur = !user?.is_verified && !post.user?.is_admin;

          const adIndex = Math.floor(index / 5) - 1;
          const adToDisplay =
            inlineAds.length > 0 ? inlineAds[adIndex % inlineAds.length] : null;
          const showAd = index > 0 && index % 5 === 0 && adToDisplay;

          return shouldBlur ? (
            <PostViewTracker
              key={post.id}
              postId={post.id}
              ariaLabel={`Post by ${post.user.full_name}`}
              className="feed-card-render feed-card-reveal"
              style={{
                "--feed-reveal-delay": `${Math.min(index, 6) * 45}ms`,
              } as CSSProperties}
            >
              <BlurredPostCard post={post} onVerify={() => setIsVerifyModalOpen(true)} />
            </PostViewTracker>
          ) : (
            <PostViewTracker
              key={post.id}
              postId={post.id}
              ariaLabel={`Post by ${post.user.full_name}`}
              className="feed-card-render feed-card-reveal"
              style={{
                "--feed-reveal-delay": `${Math.min(index, 6) * 45}ms`,
              } as CSSProperties}
            >
            <div className="space-y-4">
              {/* Ad Injection */}
              {showAd && (
                <a
                  href={adToDisplay.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gradient-to-r from-indigo-50 to-white border border-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      Sponsored
                    </span>
                    <ExternalLink className="h-4 w-4 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h4 className="font-bold text-neutral-900">
                    {adToDisplay.title}
                  </h4>
                  <p className="text-sm text-neutral-600 mt-1">
                    {adToDisplay.description}
                  </p>
                </a>
              )}

              <div className="transition-transform active:scale-[0.99]">
                <PostCard
                  post={post}
                  variant="feed"
                  currentUserId={user?.id}
                  onReply={() => {}}
                  onReport={(type, id, label) => {
                    setReportTarget({ type, id, label });
                    setReportDialogOpen(true);
                  }}
                  onPostUpdated={refreshPosts}
                  isVerifiedUser={user?.is_verified}
                />
              </div>
            </div>
            </PostViewTracker>
          );
        })}
      </div>
    );
  };

  return (
    <PostViewBatchProvider userId={user.id}>
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] pb-16 lg:pb-0">
      <a
        href="#feed-content"
        className="feed-focus fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to feed
      </a>
      <Suspense fallback={<div className="h-16 border-b bg-white" />}>
        <Navigation />
      </Suspense>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-14rem] top-40 h-[34rem] w-[34rem] rounded-full bg-cyan-100/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-12rem] top-20 h-[32rem] w-[32rem] rounded-full bg-blue-100/55 blur-3xl"
      />

      <nav
        aria-label="Feed scope and category filters"
        className="relative z-30 border-b border-white/80 bg-white/65 px-4 py-3 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("city")}
            aria-pressed={activeTab === "city"}
            className={cn(
              "feed-focus flex min-w-0 items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
              activeTab === "city"
                ? "border-primary/10 bg-primary/[0.055] text-primary"
                : "border-neutral-200/70 bg-white/70 text-neutral-500",
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedCity}</span>
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full border",
                activeTab === "city"
                  ? "border-blue-500 bg-blue-500"
                  : "border-neutral-300",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("company")}
            aria-pressed={activeTab === "company"}
            className={cn(
              "feed-focus flex min-w-0 items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
              activeTab === "company"
                ? "border-primary/10 bg-primary/[0.055] text-primary"
                : "border-neutral-200/70 bg-white/70 text-neutral-500",
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {user?.company?.name || "Company"}
            </span>
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full border",
                activeTab === "company"
                  ? "border-blue-500 bg-blue-500"
                  : "border-neutral-300",
              )}
            />
          </button>
        </div>
      </nav>

      <div className="relative mx-auto flex max-w-[1348px] gap-6 px-3 py-2 sm:px-4 lg:px-5 lg:py-3">
        {/* --- LEFT SIDEBAR (The Navigation) --- */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedCity={selectedCity}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          activeSubCategory={activeSubCategory}
          setActiveSubCategory={setActiveSubCategory}
        />
        {/* --- MAIN FEED --- */}
        <main
          id="feed-content"
          aria-busy={loading || loadingMore}
          className="mx-auto w-full min-w-0 max-w-2xl flex-1 space-y-4 sm:space-y-5 lg:space-y-2"
        >
          <section
            aria-label="Create a post"
            className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_14px_38px_-28px_rgba(31,37,87,0.55)] sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-primary/5 text-sm font-semibold text-primary shadow-sm">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.full_name?.charAt(0) || "V"
                )}
              </div>
              <button
                type="button"
                onClick={() => openComposer()}
                className="feed-focus h-11 min-w-0 flex-1 truncate rounded-full border border-neutral-200/80 bg-white/75 px-4 text-left text-sm font-medium text-neutral-500 shadow-sm transition hover:border-primary/15 hover:bg-white hover:text-neutral-700 sm:text-[15px]"
              >
                {activeTab === "city"
                  ? `What do you need in ${selectedCity}?`
                  : `Share with ${user.company?.name || "your colleagues"}`}
              </button>
            </div>

            <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto sm:grid sm:grid-cols-4 sm:gap-0 sm:overflow-visible">
              {COMPOSER_ACTIONS.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.category}
                    type="button"
                    aria-label={action.label}
                    onClick={() => openComposer(action.category)}
                    className={cn(
                      "feed-focus flex h-12 min-w-[126px] items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-primary/[0.045] hover:text-primary sm:h-10 sm:min-w-0 sm:rounded-none sm:border-0 sm:px-2 sm:text-[11px] lg:text-xs",
                      index > 0 && "sm:border-l sm:border-neutral-200/80",
                    )}
                  >
                    <ActionIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="sm:hidden">{action.shortLabel}</span>
                    <span className="hidden whitespace-nowrap sm:inline">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {user.is_verified && (
            <CreatePostDialog
              user={user}
              open={composerOpen}
              onOpenChange={setComposerOpen}
              defaultCategory={composerCategory}
              defaultVisibility={activeTab === "company" ? "company" : "all"}
              onPostCreated={refreshPosts}
            />
          )}

          <div className="space-y-4 lg:space-y-2">
          <section>
            <div className="flex items-center justify-between gap-3 px-1 sm:px-0">
              <div className="min-w-0">
                {activeTab === "city" ? (
                  <Select
                    value={selectedCity}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger
                      aria-label="Change feed city"
                      className="h-10 w-auto max-w-[250px] gap-2 rounded-xl border-neutral-200 bg-white px-3 text-left text-sm font-semibold text-neutral-950 shadow-none hover:border-primary/20 focus:ring-0"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <SelectValue />
                      <span className="hidden text-[10px] font-medium text-neutral-400 sm:inline">
                        Change city
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {["Global", ...INDIAN_CITIES].map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <h1 className="truncate text-base font-semibold tracking-tight text-neutral-950 sm:text-lg">
                    {user?.company?.name || "Your workplace"} feed
                  </h1>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 rounded-xl border-neutral-200 p-0"
                      aria-label="Filter feed"
                    >
                      <ListFilter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    {[{ value: "all", label: "All" }, ...CATEGORIES].map(
                      (category) => (
                        <DropdownMenuItem
                          key={category.value}
                          onClick={() => {
                            setActiveCategory(category.value);
                            setActiveSubCategory("all");
                          }}
                          className={cn(
                            "text-xs font-semibold",
                            activeCategory === category.value && "text-primary",
                          )}
                        >
                          {category.label}
                        </DropdownMenuItem>
                      ),
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Select
                  value={sortMode}
                  onValueChange={(value) => setSortMode(value as FeedSort)}
                >
                  <SelectTrigger className="h-10 w-[116px] rounded-xl border-neutral-200 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="most_vouched">Most vouched</SelectItem>
                    <SelectItem value="most_discussed">Most discussed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-0 lg:hidden">
              {[{ value: "all", label: "All" }, ...CATEGORIES].map((category) => {
                const CategoryIcon =
                  FILTER_ICONS[
                    category.value as keyof typeof FILTER_ICONS
                  ] ?? Grid2X2;
                return (
                  <button
                    key={category.value}
                    type="button"
                    aria-pressed={activeCategory === category.value}
                    onClick={() => {
                      setActiveCategory(category.value);
                      setActiveSubCategory("all");
                    }}
                    className={cn(
                      "feed-focus inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700",
                      activeCategory === category.value &&
                        "border-primary/5 bg-primary/[0.065] text-primary",
                    )}
                  >
                    <CategoryIcon className="h-4 w-4" />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Locked State for Company Tab */}
          <ProfileCompletionWidget className="border-white/90 bg-white/70 shadow-[0_18px_45px_-34px_rgba(31,37,87,0.45)] backdrop-blur-xl xl:hidden" />
          {renderContent()}
          </div>

          {/* Infinite Scroll Sentinel */}
          <div
            ref={sentinelRef}
            role="status"
            aria-live="polite"
            className="flex items-center justify-center py-6"
          >
            {loadingMore && (
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/75 px-4 py-2 text-sm font-semibold text-neutral-500 shadow-sm backdrop-blur-xl">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading more posts...</span>
              </div>
            )}
            {!loadingMore && !hasMore && posts.length > 0 && (
              <span className="rounded-full border border-white/90 bg-white/60 px-4 py-2 text-xs font-medium text-neutral-500 backdrop-blur-xl">
                You&apos;re all caught up
              </span>
            )}
          </div>
        </main>
        {/* NEW RIGHT SIDEBAR */}
        <RightSidebar
          user={user}
          selectedCity={selectedCity}
          onVerify={() => setIsVerifyModalOpen(true)}
          onAwaitingRecommendations={() => {
            setActiveTab("city");
            setActiveCategory("recommendations");
            setActiveSubCategory("all");
            setRecommendationsOnly(true);
            window.requestAnimationFrame(() => {
              document
                .getElementById("feed-content")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
          onTrendingSelect={(category) => {
            setActiveTab("city");
            setActiveCategory(category);
            setActiveSubCategory("all");
            setRecommendationsOnly(false);
            const params = new URLSearchParams(window.location.search);
            params.set("tab", "city");
            params.set("category", category);
            params.delete("subCategory");
            params.set("city", selectedCity);
            window.history.replaceState(null, "", `/feed?${params.toString()}`);
            window.requestAnimationFrame(() => {
              document
                .getElementById("feed-content")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }}
        />
        <MobileNav
          user={user}
          activeTab={activeTab}
          selectedCity={selectedCity}
          onOpenCreatePost={refreshPosts}
          setActiveTab={(tab) => setActiveTab(tab)}
        />
        {/* Mobile Nav at the bottom */}
      </div>

      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        user={user}
        onVerified={() => window.location.reload()}
      />

      {reportTarget && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
        />
      )}
    </div>
    </PostViewBatchProvider>
  );
}
