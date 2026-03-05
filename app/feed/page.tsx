"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { ReportDialog } from "@/components/report-dialog";
import { supabase } from "@/lib/supabase/browser";
import { MapPin, Building2, Loader2, Lock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationModal } from "@/components/verification-modal";
import { cn } from "@/lib/utils";
import { BlurredPostCard } from "@/components/blurred-post-card";
import { RightSidebar } from "./side-bars/right/right-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Suspense } from "react";

function FeedContent() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"city" | "company">("city");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(
    null,
  );
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    postId?: string;
    commentId?: string;
  }>({});

  //Search related state and effect
  const searchParams = useSearchParams();
  const queryStr = searchParams.get("q") || "";
  useEffect(() => {
    if (queryStr) {
      // Reset the UI state so the sidebar correctly shows "# all" as active
      setActiveCategory("all");
      setPage(0);
    }
  }, [queryStr]);
  useEffect(() => {
    // Now every time the URL changes via the header search,
    // this effect re-runs and calls fetchPosts automatically.
    if (user) {
      const categoryToUse = queryStr ? "all" : activeCategory;
      fetchPosts(user, activeTab, categoryToUse, 0, queryStr);
      setPage(0); // Reset pagination on new search
    }
  }, [user, activeTab, activeCategory, queryStr]);

  const fetchPosts = useCallback(
    async (
      currentUser: any,
      tab: "city" | "company",
      category: string,
      pageNum: number = 0,
      queryStr: string = "",
    ) => {
      if (!currentUser) return;

      try {
        // Build the URL with search params
        const params = new URLSearchParams({
          tab,
          category,
          page: pageNum.toString(),
          query: queryStr,
        });
        setLoading(true);
        const response = await fetch(
          `/api/posts/get-posts?${params.toString()}`,
        );
        const result = await response.json();

        if (result.error) throw new Error(result.error);

        if (pageNum === 0) {
          setPosts(result.posts);
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

      setUser(userData);
      await fetchPosts(userData, activeTab, activeCategory, 0, searchQuery);
      setLoading(false);
      isInitialMount.current = false;
    };
    initPage();
  }, [router, activeTab, activeCategory, fetchPosts]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(user, activeTab, activeCategory, nextPage, searchQuery);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const renderContent = () => {
    // Scenario A: Workspace is locked
    if (!user?.is_verified && activeTab === "company") {
      return (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-2">Workspace Locked</h2>
          <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
            Verify your professional identity to join colleague-only discussions
            at {user?.company?.name}.
          </p>
          <Button
            onClick={() => setIsVerifyModalOpen(true)}
            className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-[11px]"
          >
            Verify Now
          </Button>
        </div>
      );
    }

    // Scenario B: Initial Loading
    if (loading && posts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-4">
            Updating Feed...
          </p>
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
        {posts.map((post) => {
          // BLURRING LOGIC:
          // Blur if: User is NOT verified AND the post belongs to a verified user (not admin)
          const shouldBlur = !user?.is_verified && !post.user?.is_admin;

          return shouldBlur ? (
            <BlurredPostCard
              key={post.id}
              post={post}
              onVerify={() => setIsVerifyModalOpen(true)}
            />
          ) : (
            <div
              key={post.id}
              className="transition-transform active:scale-[0.99]"
            >
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
                  fetchPosts(user, activeTab, activeCategory, 0, searchQuery)
                }
                isVerifiedUser={user?.is_verified}
              />
              {activeReplyPostId === post.id && (
                <div className="mt-1">
                  <CommentForm
                    postId={post.id}
                    userId={user?.id}
                    onCommentAdded={() =>
                      fetchPosts(
                        user,
                        activeTab,
                        activeCategory,
                        0,
                        searchQuery,
                      )
                    }
                  />
                </div>
              )}
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
        {["All", "Recommendations", "Housing", "Buy & Sell"].map((tab) => (
          <button
            key={tab}
            className={cn(
              "whitespace-nowrap rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-bold text-neutral-700 active:bg-primary active:text-white",
              activeCategory === tab.toLowerCase().replace(" & ", "_") &&
                "bg-primary text-white",
            )}
            onClick={() =>
              setActiveCategory(tab.toLowerCase().replace(" & ", "_"))
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="container mx-auto max-w-7xl flex gap-8 p-4 lg:p-8">
        {/* --- LEFT SIDEBAR (The Navigation) --- */}
        <aside className="hidden lg:flex w-64 flex-col gap-2 sticky top-24 h-fit">
          <button
            onClick={() => setActiveTab("city")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === "city"
                ? "bg-white shadow-sm text-primary ring-1 ring-black/5"
                : "text-neutral-500 hover:bg-neutral-200/50",
            )}
          >
            <MapPin className="h-4 w-4" /> {user?.city || "My City"}
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group",
              activeTab === "company"
                ? "bg-white shadow-sm text-primary ring-1 ring-black/5"
                : "text-neutral-500 hover:bg-neutral-200/50",
            )}
          >
            <div className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center overflow-hidden">
              {user?.company?.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${user?.company.domain}&sz=32`}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
              ) : (
                <Building2 className="h-3 w-3 text-neutral-400" />
              )}
            </div>
            <span className="truncate">{user?.company?.name || "Company"}</span>
            {!user?.is_verified && (
              <Lock className="h-3 w-3 ml-auto text-neutral-400 group-hover:text-primary" />
            )}
          </button>

          <hr className="my-4 border-neutral-200" />

          <div className="px-4 py-2">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">
              Marketplace
            </p>
            <div className="space-y-1">
              {["all", "recommendations", "housing", "buy_sell"].map((id) => (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all",
                    activeCategory === id
                      ? "bg-primary/5 text-primary"
                      : "text-neutral-500 hover:text-neutral-800",
                  )}
                >
                  # {id.replace("_", " & ")}
                </button>
              ))}
            </div>
          </div>
        </aside>
        {/* --- MAIN FEED --- */}
        <main className="flex-1 max-w-2xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground truncate">
              {activeTab === "city"
                ? `Feed in ${user?.city || "Your city"}`
                : `Inside ${user?.company?.name || "Your Workplace"}`}
            </h2>
            <CreatePostDialog
              user={user}
              onPostCreated={() => fetchPosts(user, activeTab, activeCategory)}
            />
          </div>

          {/* Locked State for Company Tab */}
          {renderContent()}

          {hasMore && posts.length > 0 && (
            <Button
              onClick={handleLoadMore}
              disabled={loadingMore}
              variant="outline"
              className="w-full"
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load More"
              )}
            </Button>
          )}
        </main>
        {/* NEW RIGHT SIDEBAR */}
        <RightSidebar user={user} />
        <MobileNav
          user={user}
          onOpenCreatePost={() => fetchPosts(user, activeTab, activeCategory)}
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

export default function FeedPage() {
  return (
    <Suspense fallback={<div>Loading Feed...</div>}>
      <FeedContent />
    </Suspense>
  );
}
