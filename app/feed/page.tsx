"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Navigation } from "@/components/navigation";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { ReportDialog } from "@/components/report-dialog";
import {
  MapPin,
  Building2,
  Loader2,
  Lock,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationModal } from "@/components/verification-modal";
import { cn } from "@/lib/utils";
import { BlurredPostCard } from "@/components/blurred-post-card";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "./side-bars/right/right-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Suspense } from "react";
import { ProfileCompletionWidget } from "@/components/profile-completion-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIES, SUB_CATEGORIES, INDIAN_CITIES } from "@/lib/constants";
import { supabase } from "@/lib/supabase/browser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function FeedContent() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [inlineAds, setInlineAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"city" | "company">("city");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubCategory, setActiveSubCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(
    null,
  );
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    postId?: string;
    commentId?: string;
  }>({});

  const fetchPosts = useCallback(
    async (
      currentUser: any,
      tab: "city" | "company",
      category: string,
      subCategory: string,
      pageNum: number = 0,
      queryStr: string = "",
      city: string = "All Cities",
    ) => {
      if (!currentUser) return;

      try {
        // Build the URL with search params
        const params = new URLSearchParams({
          tab,
          category,
          subCategory,
          page: pageNum.toString(),
          query: queryStr,
          city,
        });
        setLoading(true);
        const response = await fetch(
          `/api/posts/get-posts?${params.toString()}`,
        );
        const result = await response.json();

        if (result.error) throw new Error(result.error);

        if (pageNum === 0) {
          setPosts(result.posts);
          if (isInitialMount.current) {
            posthog.capture("Feed Loaded", { tab, category, subCategory, city });
            isInitialMount.current = false;
          } else {
            posthog.capture("Feed Refresh", { tab, category, subCategory, city });
          }
          posthog.capture("Feed Impression", { posts_count: result.posts.length });
        } else {
          setPosts((prev) => [...prev, ...result.posts]);
        }

        setHasMore(result.hasMore);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        setLoading(false);
      }
    },
    [],
  );

  //Search related state and effect
  const searchParams = useSearchParams();
  const queryStr = searchParams.get("q") || "";
  useEffect(() => {
    if (queryStr) {
      // Reset the UI state so the sidebar correctly shows "# all" as active
      setActiveCategory("all");
      setActiveSubCategory("all");
      setPage(0);
    }
  }, [queryStr]);
  useEffect(() => {
    // Now every time the URL changes via the header search,
    // this effect re-runs and calls fetchPosts automatically.
    if (user) {
      const categoryToUse = queryStr ? "all" : activeCategory;
      const subCategoryToUse = queryStr ? "all" : activeSubCategory;
      fetchPosts(user, activeTab, categoryToUse, subCategoryToUse, 0, queryStr, selectedCity);
      setPage(0); // Reset pagination on new search
    }
  }, [user, activeTab, activeCategory, activeSubCategory, queryStr, selectedCity, fetchPosts]);

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
    const initPage = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return router.push("/login");

      const { data: userData } = await supabase
        .from("users")
        .select(`*, company:companies(*)`)
        .eq("id", authUser.id)
        .maybeSingle();

      if (!userData || !userData.onboarded) {
        router.push(!userData ? "/login" : "/onboarding");
        return;
      }

      let finalCity = userData.city;
      if (!finalCity) {
        finalCity = "All Cities"; // Default fallback
        if ("geolocation" in navigator) {
          try {
            const pos: any = await new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                reject(new Error("Manual Geolocation Timeout"));
              }, 5000);
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  clearTimeout(timer);
                  resolve(position);
                },
                (err) => {
                  clearTimeout(timer);
                  reject(err);
                },
                { timeout: 5000 }
              );
            });
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data.city && INDIAN_CITIES.includes(data.city)) {
              finalCity = data.city;
            }
          } catch (e) {
            console.error("Location detection failed", e);
          }
        }
        const { error: updateError } = await supabase
          .from("users")
          .update({ city: finalCity })
          .eq("id", authUser.id);
        if (updateError) {
          console.error("Failed to update user city to fallback:", updateError);
        }
        userData.city = finalCity;
      }

      setUser(userData);
      setSelectedCity(userData.city);
      isInitialMount.current = false;
    };
    initPage();
  }, [router]);

  const handleCityChange = async (newCity: string) => {
    setSelectedCity(newCity);
    setUser((prev: any) => ({ ...prev, city: newCity }));
    window.dispatchEvent(new CustomEvent("user-updated", { detail: { city: newCity } }));
    await supabase.from("users").update({ city: newCity }).eq("id", user?.id);
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(
      user,
      activeTab,
      activeCategory,
      activeSubCategory,
      nextPage,
      searchQuery,
      selectedCity,
    );
    setPage(nextPage);
    setLoadingMore(false);
  }, [page, user, activeTab, activeCategory, activeSubCategory, searchQuery, selectedCity, fetchPosts, loadingMore]);

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
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-2">Join the Private {user?.company?.name} Forum</h2>
          <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
            Verify your professional identity to unlock private discussions, salary comparisons,
            and trusted referrals with verified colleagues at {user?.company?.name}.
          </p>
          <Button
            onClick={() => setIsVerifyModalOpen(true)}
            className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-[11px]"
          >
            Verify to Join Colleagues
          </Button>
        </div>
      );
    }

    // Scenario B: Initial Loading
    if (loading && posts.length === 0) {
      return (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-sm space-y-5"
            >
              {/* Header Skeleton */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-11 w-11 rounded-xl bg-neutral-100" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-28 bg-neutral-100" />
                      <Skeleton className="h-4.5 w-12 rounded-full bg-neutral-100" />
                    </div>
                    <Skeleton className="h-3 w-36 bg-neutral-100" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded bg-neutral-100" />
              </div>
              
              {/* Text Body Skeleton */}
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-full bg-neutral-100" />
                <Skeleton className="h-4 w-[92%] bg-neutral-100" />
                <Skeleton className="h-4 w-[78%] bg-neutral-100" />
              </div>

              {/* Gallery Block Skeleton (Simulated for every second card) */}
              {i % 2 === 0 && (
                <Skeleton className="h-48 w-full rounded-xl bg-neutral-100" />
              )}

              {/* Stats Bar Skeleton */}
              <div className="flex justify-between items-center pt-3 border-t border-neutral-50">
                <div className="flex gap-4">
                  <Skeleton className="h-3.5 w-14 bg-neutral-100" />
                  <Skeleton className="h-3.5 w-16 bg-neutral-100" />
                  <Skeleton className="h-3.5 w-14 bg-neutral-100" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-3.5 w-12 bg-neutral-100" />
                  <Skeleton className="h-3.5 w-12 bg-neutral-100" />
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex gap-2 pt-2 border-t border-neutral-50">
                <Skeleton className="h-8 w-20 rounded-full bg-neutral-100" />
                <Skeleton className="h-8 w-20 rounded-full bg-neutral-100" />
                <Skeleton className="h-8 w-20 rounded-full bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Scenario C: No Results Found
    if (!loading && posts.length === 0) {
      return (
        <div className="space-y-4">
          <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-16 text-center">
            <div className="mb-4 flex justify-center">
              <div className="p-3 bg-neutral-50 rounded-full">
                <TrendingUp className="h-6 w-6 text-neutral-300" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-neutral-900">No posts yet</h3>
            <p className="text-neutral-500 text-sm mt-1">
              Be the first to share something with your{" "}
              {activeTab === "city" ? "city" : "colleagues"}!
            </p>
          </div>
        </div>
      );
    }

    // Scenario D: Display Posts
    return (
      <div className="space-y-4">
        {posts.map((post, index) => {
          // BLURRING LOGIC:
          // Blur if: User is NOT verified AND the post belongs to a verified user (not admin)
          const shouldBlur = !user?.is_verified && !post.user?.is_admin;

          const adIndex = Math.floor(index / 5) - 1;
          const adToDisplay =
            inlineAds.length > 0 ? inlineAds[adIndex % inlineAds.length] : null;
          const showAd = index > 0 && index % 5 === 0 && adToDisplay;

          return shouldBlur ? (
            <BlurredPostCard
              key={post.id}
              post={post}
              onVerify={() => setIsVerifyModalOpen(true)}
            />
          ) : (
            <div key={post.id} className="space-y-4">
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
                  currentUserId={user?.id}
                  onReply={(pid) =>
                    setActiveReplyPostId(activeReplyPostId === pid ? null : pid)
                  }
                  onReport={(pid) => {
                    setReportTarget({ postId: pid });
                    setReportDialogOpen(true);
                  }}
                  onPostUpdated={() =>
                    fetchPosts(
                      user,
                      activeTab,
                      activeCategory,
                      activeSubCategory,
                      0,
                      searchQuery,
                      selectedCity,
                    )
                  }
                  isVerifiedUser={user?.is_verified}
                />
                {activeReplyPostId === post.id && (
                  <div className="mt-1">
                    <CommentForm
                      postId={post.id}
                      userId={user?.id}
                      isVerifiedUser={user?.is_verified}
                      onCommentAdded={() =>
                        fetchPosts(
                          user,
                          activeTab,
                          activeCategory,
                          activeSubCategory,
                          0,
                          searchQuery,
                          selectedCity,
                        )
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Suspense fallback={<div className="h-16 border-b bg-white" />}>
        <Navigation />
      </Suspense>

      {/* Horizontal Scroll for Filters on Mobile */}
      <div className="sticky top-14 z-30 flex gap-2 overflow-x-auto bg-white p-3 no-scrollbar lg:hidden border-b border-neutral-100">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map((cat) => (
          <button
            key={cat.value}
            className={cn(
              "whitespace-nowrap rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-bold text-neutral-700 active:bg-primary active:text-white",
              activeCategory === cat.value && "bg-primary text-white",
            )}
            onClick={() => {
              setActiveCategory(cat.value);
              setActiveSubCategory("all");
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="container mx-auto max-w-7xl flex gap-8 p-4 lg:p-8">
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
        <main className="flex-1 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xl font-bold text-foreground truncate">
              {activeTab === "city" ? (
                <>
                  <span>Feed in</span>
                  <Select value={selectedCity} onValueChange={handleCityChange}>
                    <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 font-bold hover:bg-transparent data-[state=open]:bg-transparent text-xl text-primary underline decoration-primary/30 underline-offset-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All Cities", ...INDIAN_CITIES].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                `Inside ${user?.company?.name || "Your Workplace"}`
              )}
            </div>
            {user?.is_verified ? (
              <CreatePostDialog
                user={user}
                onPostCreated={() =>
                  fetchPosts(
                    user,
                    activeTab,
                    activeCategory,
                    activeSubCategory,
                    0,
                    searchQuery,
                    selectedCity,
                  )
                }
              />
            ) : (
              <Button onClick={() => setIsVerifyModalOpen(true)} className="rounded-full">
                Verify to add your requirement
              </Button>
            )}
          </div>

          {/* Locked State for Company Tab */}
          <ProfileCompletionWidget className="xl:hidden" />
          {renderContent()}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="py-6 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-neutral-500 font-bold bg-white px-4 py-2 border border-neutral-100 rounded-full shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading more posts...</span>
              </div>
            )}
          </div>
        </main>
        {/* NEW RIGHT SIDEBAR */}
        <RightSidebar user={user} onVerify={() => setIsVerifyModalOpen(true)} />
        <MobileNav
          user={user}
          selectedCity={selectedCity}
          onOpenCreatePost={() =>
            fetchPosts(
              user,
              activeTab,
              activeCategory,
              activeSubCategory,
              0,
              searchQuery,
              selectedCity,
            )
          }
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

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={reportTarget.postId}
        userId={user?.id}
      />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* Skeleton Navigation Header */}
      <header className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <div className="hidden md:flex flex-1 max-w-md mx-auto">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar Skeleton */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/60 space-y-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <div className="pt-4 space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            </div>
          </div>

          {/* Main Feed Skeletons */}
          <main className="col-span-1 lg:col-span-6 xl:col-span-6 space-y-5 pb-20">
            {/* Create Post Widget Skeleton */}
            <div className="bg-white rounded-2xl p-4 border border-neutral-200/60 flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1 rounded-xl" />
            </div>

            {/* Post Feed Cards */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-200/60 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3 rounded" />
                      <Skeleton className="h-3 w-1/4 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-11/12 rounded" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </main>

          {/* Right Sidebar Skeleton */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200/60 space-y-4">
              <Skeleton className="h-5 w-1/2 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}
