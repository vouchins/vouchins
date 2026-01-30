"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { ReportDialog } from "@/components/report-dialog";
import { FeedSearch } from "@/components/feed-search";
import { supabase } from "@/lib/supabase/client";
import { MapPin, Building2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const [activeTab, setActiveTab] = useState<FeedTab>("city");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(
    null
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
      queryStr: string = ""
    ) => {
      if (!currentUser) return;

      const from = pageNum * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      let query = supabase
        .from("posts")
        .select(
          `
          *,
          user:users!posts_user_id_fkey!inner(
            id, first_name, city, company_id,
            company:companies(name, domain) 
          ),
          comments(
            id, text, created_at,
            user:users!comments_user_id_fkey(id, first_name)
          )
        `
        )
        .eq("is_removed", false)
        .eq("user.city", currentUser.city);

      if (tab === "company") {
        query = query
          .eq("visibility", "company")
          .eq("user.company_id", currentUser.company_id);
      } else {
        query = query.eq("visibility", "all");
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
    []
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

      if (!userData || !userData.is_verified || !userData.onboarded) {
        router.push(
          !userData
            ? "/login"
            : !userData.is_verified
              ? "/verify-email"
              : "/onboarding"
        );
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600 font-medium">Loading your feed...</p>
      </div>
    );
  }

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
            {user.city || "My City"}
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className={`flex-1 py-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${
              activeTab === "company"
                ? "border-primary text-primary"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <div className="h-5 w-5 rounded bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-100">
              {user.company?.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=32`}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
              ) : (
                <Building2 className="h-3 w-3 text-neutral-400" />
              )}
            </div>
            {user.company?.name || "My Company"}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground truncate">
              {activeTab === "city"
                ? `Feed in ${user.city}`
                : `Inside ${user.company?.name}`}
            </h2>
            <CreatePostDialog
              userId={user.id}
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

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-bold text-neutral-900 mb-2">
                No posts here yet
              </h3>
              <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                {searchQuery
                  ? `No matches for "${searchQuery}" in your ${activeTab} feed.`
                  : `Be the first to share something with your ${activeTab} community.`}
              </p>
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
                    currentUserId={user.id}
                    onReply={handleReply}
                    onReport={handleReport}
                    onPostUpdated={() =>
                      fetchPosts(
                        user,
                        activeTab,
                        activeCategory,
                        0,
                        searchQuery
                      )
                    }
                  />
                  {activeReplyPostId === post.id && (
                    <div className="mt-1">
                      <CommentForm
                        postId={post.id}
                        userId={user.id}
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

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={reportTarget.postId}
        commentId={reportTarget.commentId}
        userId={user.id}
      />
    </div>
  );
}
