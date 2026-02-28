"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { ReportDialog } from "@/components/report-dialog";
import { FeedSearch } from "@/components/feed-search";
import { supabase } from "@/lib/supabase/browser";
import {
  MapPin,
  Building2,
  Loader2,
  X,
  Lock,
  ShieldCheck,
  Badge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationModal } from "@/components/verification-modal"; // Verified Import
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  text: string;
  category: "housing" | "buy_sell" | "recommendations";
  housing_type?: "flatmates" | "rentals" | "sale" | "pg" | null;
  visibility: "company" | "all";
  image_urls: string[];
  is_flagged: boolean;
  flag_reasons: string[];
  created_at: string;
  user: {
    id: string;
    first_name: string;
    city: string;
    is_admin: boolean;

    company: {
      name: string;
      domain: string;
    };
  };
  comments?: any[];
}

type FeedTab = "city" | "company";

const POSTS_PER_PAGE = 50;

export default function FeedPage() {
  const router = useRouter();
  const isInitialMount = useRef(true);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>("city");
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

  const fetchPosts = useCallback(
    async (
      currentUser: any,
      tab: FeedTab,
      category: string,
      pageNum: number = 0,
      queryStr: string = "",
    ) => {
      if (!currentUser) return;
      // Gating Logic: If unverified and accessing Company tab, stop
      if (!currentUser.is_verified && tab === "company") {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase
        .from("posts")
        .select(
          `*, user:users!posts_user_id_fkey!inner(id, first_name, city, is_admin, company_id, company:companies(name, domain)), comments(id, text, created_at, user:users!comments_user_id_fkey(id, first_name))`,
        )

        .eq("is_removed", false)
        .eq("user.city", currentUser.city);

      if (tab === "company") {
        query = query
          .eq("visibility", "company")
          .eq("user.company_id", currentUser.company_id);
      } else {
        query = query.eq("visibility", "all");
        // Walled Garden: Unverified users only see Admin/Announcements
        if (!currentUser.is_verified) {
          query = query.eq("user.is_admin", true);
        }
      }

      if (category !== "all") {
        query = query.eq("category", category);
      }

      // Integrated Text Search using the GIN index
      if (queryStr.trim()) {
        query = query.textSearch("text", queryStr, {
          config: "english",
          type: "websearch",
        });
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error fetching feed:", error);
        return;
      }

      const newPosts = data || [];
      if (pageNum === 0) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    },
    [],
  );

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(0);
    fetchPosts(user, activeTab, activeCategory, 0, q);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPosts(user, activeTab, activeCategory, nextPage, searchQuery);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const resetAndFetch = async (tab: FeedTab, category: string) => {
    setLoading(true);
    setPage(0);
    await fetchPosts(user, tab, category, 0, searchQuery);
    setLoading(false);
  };

  useEffect(() => {
    const initPage = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

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

  useEffect(() => {
    if (isInitialMount.current || loading) return;
    resetAndFetch(activeTab, activeCategory);
  }, [activeTab, activeCategory]);

  const handleReply = (postId: string) =>
    setActiveReplyPostId(activeReplyPostId === postId ? null : postId);
  const handleReport = (postId: string) => {
    setReportTarget({ postId });
    setReportDialogOpen(true);
  };
  const handleCommentAdded = () =>
    fetchPosts(user, activeTab, activeCategory, 0, searchQuery);

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
        <div className="container mx-auto max-w-3xl flex">
          <button
            onClick={() => setActiveTab("city")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "city"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <MapPin className="h-4 w-4" />
            {user?.city || "My City"}
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "company"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {!user?.is_verified && (
              <Lock className="h-4 w-4 text-neutral-800" />
            )}
            <div className="h-5 w-5 rounded bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-100">
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
            {user?.company?.name || "My Company"}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground truncate">
              {activeTab === "city"
                ? `Feed in ${user?.city}`
                : `Inside ${user?.company?.name || "Your Company"}`}
            </h2>
            <CreatePostDialog
              user={user}
              onPostCreated={() =>
                fetchPosts(user, activeTab, activeCategory, 0, searchQuery)
              }
            />
          </div>

          <FeedSearch onSearch={handleSearch} isSearching={loading} />

          {searchQuery && (
            <div className="flex items-center gap-2 py-1 px-3 bg-secondary rounded-lg w-fit">
              <span className="text-xs font-medium text-primary tracking-tight">
                Searching for: {searchQuery}
              </span>
              <button
                onClick={() => handleSearch("")}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {["all", "recommendations", "housing", "buy_sell"].map((id) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                activeCategory === id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
              }`}
            >
              {id === "all"
                ? "All Posts"
                : id.charAt(0).toUpperCase() + id.slice(1).replace("_", " & ")}
            </button>
          ))}
        </div>

        {/* {!user?.is_verified && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 transition-all shadow-sm overflow-visible">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-primary h-16 w-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 rotate-3 shadow-xl shadow-primary/20">
                <Lock className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-3 uppercase tracking-tighter">
                Walled Garden
              </h3>
              <p className="text-[12px] text-muted-foreground max-w-[320px] mx-auto mb-8 font-bold uppercase tracking-tight leading-relaxed">
                {activeTab === "company"
                  ? "Verify your professional identity to enter your private company feed."
                  : "Only Admin posts are visible. Verify to unlock the full community feed."}
              </p>
              <Button
                onClick={() => setIsVerifyModalOpen(true)} // Wired up to modal
                className="rounded-full px-12 h-12 bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest text-[11px] transition-all active:scale-95"
              >
                Verify Now
              </Button>
            </div>
          </div>
        )} */}
        {!user?.is_verified && (
          <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-4 shadow-sm relative overflow-hidden transition-all hover:border-neutral-300">
            {/* Header-style Alignment */}
            <div className="flex items-start gap-3">
              {/* Lock Icon in the Avatar Slot */}
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 rotate-3">
                <Lock
                  className="h-5 w-5 text-primary-foreground"
                  strokeWidth={2.5}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-black text-foreground uppercase tracking-widest leading-none">
                      Identity Locked
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight mt-1">
                      Walled Garden Security
                    </p>
                  </div>
                  <Badge className="bg-primary text-primary-foreground border-none text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Restricted
                  </Badge>
                </div>
              </div>
            </div>

            {/* Content aligned to the 52px gutter (10px avatar + 12px gap = 52px offset) */}
            <div className="mt-4 pl-[52px]">
              <div className="mb-4">
                <p className="text-neutral-800 text-[14px] leading-relaxed font-medium">
                  {activeTab === "company"
                    ? "Verify your professional identity to enter your private company feed and discuss office insights safely."
                    : "Only Admin posts are visible here. Verify your account to unlock peer discussions, referrals, and housing leads in your city."}
                </p>
              </div>

              <Button
                onClick={() => setIsVerifyModalOpen(true)}
                className="rounded-full px-8 h-10 bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-md"
              >
                Verify Now to Unlock
              </Button>

              <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center gap-2 opacity-40">
                <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Verified Professionals Only
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {user?.is_verified && posts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                No posts here yet
              </h3>
              <div className="text-sm text-neutral-500 max-w-xs mx-auto">
                {searchQuery
                  ? `No matches for "${searchQuery}" in your ${activeTab} feed.`
                  : `Be the first to share something with your ${activeTab} community.`}
                {loading && (
                  <div className="flex items-center justify-center bg-neutral-50">
                    <p className="text-neutral-600 font-medium">
                      Loading your feed...
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="transition-transform active:scale-[0.99]"
                >
                  <PostCard
                    post={post}
                    currentUserId={user?.id}
                    onReply={handleReply}
                    onReport={handleReport}
                    onPostUpdated={() =>
                      fetchPosts(
                        user,
                        activeTab,
                        activeCategory,
                        0,
                        searchQuery,
                      )
                    }
                    isVerifiedUser={user?.is_verified}
                  />
                  {activeReplyPostId === post.id && (
                    <div className="mt-1">
                      <CommentForm
                        postId={post.id}
                        userId={user?.id}
                        onCommentAdded={handleCommentAdded}
                      />
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="w-full max-w-xs"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
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
        commentId={reportTarget.commentId}
        userId={user?.id}
      />
    </div>
  );
}
