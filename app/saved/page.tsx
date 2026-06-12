"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { ReportDialog } from "@/components/report-dialog";
import { Loader2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationModal } from "@/components/verification-modal";
import { RightSidebar } from "@/app/feed/side-bars/right/right-sidebar";
import { LeftSidebar } from "@/components/left-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/browser";
import Link from "next/link";
import { useUser } from "@/components/user-provider";

export default function SavedPostsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    postId?: string;
    commentId?: string;
  }>({});

  const fetchSavedPosts = useCallback(
    async (pageToFetch: number, append: boolean = false) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams({
          page: pageToFetch.toString(),
        });

        const response = await fetch(`/api/posts/saved?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch saved posts");

        const data = await response.json();
        
        if (append) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Error fetching saved posts:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (userLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }
    
    if (!user.is_verified) {
      setLoading(false);
      return;
    }
    
    fetchSavedPosts(0, false);
  }, [user, userLoading, fetchSavedPosts, router]);

  const handlePostUpdated = () => {
    setPage(0);
    fetchSavedPosts(0, false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSavedPosts(nextPage, true);
    }
  };

  if (userLoading || (loading && posts.length === 0)) {
    return (
      <div className="min-h-screen bg-neutral-50/50">
        <Navigation />
        <div className="container mx-auto px-4 max-w-7xl pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="hidden lg:block lg:col-span-3 xl:col-span-3" />
            <main className="col-span-1 lg:col-span-6 xl:col-span-6 space-y-4 pb-20">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </main>
            <div className="hidden lg:block lg:col-span-3 xl:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navigation />

      <div className="container mx-auto px-4 max-w-7xl pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          {/* Left Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <LeftSidebar />
          </div>

          {/* Main Feed */}
          <main className="col-span-1 lg:col-span-6 xl:col-span-6 space-y-4 pb-20">
            <div className="flex items-center gap-3 px-1 pb-2">
              <Bookmark className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Saved Posts</h1>
            </div>

            {!user?.is_verified ? (
              <div className="bg-white rounded-2xl p-12 border border-neutral-200 text-center shadow-sm flex flex-col items-center">
                <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <Bookmark className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  Verification Required
                </h3>
                <p className="text-neutral-500 mb-6 max-w-sm">
                  You must be a verified user to access and save posts. Complete your profile verification to unlock this feature.
                </p>
                <Button onClick={() => setIsVerifyModalOpen(true)} className="font-bold">
                  Verify Profile Now
                </Button>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-neutral-200 text-center shadow-sm flex flex-col items-center">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Bookmark className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  Nothing saved yet
                </h3>
                <p className="text-neutral-500 mb-6 max-w-sm">
                  Save posts from the feed to revisit opportunities, listings, and recommendations later.
                </p>
                <Link href="/feed">
                  <Button className="font-bold">Explore Feed</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id}>
                    <PostCard
                      post={post}
                      currentUserId={user?.id || ""}
                      isVerifiedUser={user?.is_verified || false}
                      onReply={(postId) =>
                        setActiveReplyPostId(
                          activeReplyPostId === postId ? null : postId
                        )
                      }
                      onReport={(postId) => {
                        setReportTarget({ postId });
                        setReportDialogOpen(true);
                      }}
                      onPostUpdated={handlePostUpdated}
                      onVerifyClick={(postId) => setIsVerifyModalOpen(true)}
                    />

                    {/* Inline Comment Form */}
                    {activeReplyPostId === post.id && (
                      <div className="mt-2 bg-white rounded-xl shadow-sm border border-neutral-200/60 p-4">
                        <CommentForm
                          postId={post.id}
                          userId={user?.id || ""}
                          isVerifiedUser={user?.is_verified || false}
                          onCommentAdded={() => {
                            setActiveReplyPostId(null);
                            handlePostUpdated();
                          }}
                          onCancel={() => setActiveReplyPostId(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hasMore && posts.length > 0 && (
              <div className="pt-4 pb-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full px-8 bg-white"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </main>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden">
            <RightSidebar
              user={
                user
                  ? {
                      city: user.city || "",
                      is_verified: user.is_verified || false,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {user && (
        <MobileNav
          user={user as any}
          onOpenCreatePost={handlePostUpdated}
          setActiveTab={() => {}}
        />
      )}

      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={reportTarget.postId}
        commentId={reportTarget.commentId}
        userId={user?.id || ""}
      />

      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        user={user}
        onVerified={() => window.location.reload()}
      />
    </div>
  );
}
