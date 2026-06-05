"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Lock, Loader2, ShieldAlert, CheckCircle2, MessageCircle, Flag, MapPin, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/post-card";
import { CommentForm } from "@/components/comment-form";
import { BlurredPostCard } from "@/components/blurred-post-card";
import { VerificationModal } from "@/components/verification-modal";
import { ReportDialog } from "@/components/report-dialog";
import { supabase } from "@/lib/supabase/browser";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RightSidebar } from "@/app/feed/side-bars/right/right-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface PostDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function PostDetailsPage({ params }: PostDetailsPageProps) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();

  // Authentication & User States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Post & API States
  const [post, setPost] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals/Dialogs
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ postId?: string }>({});

  // Fetch Current User Details from Supabase client
  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select(`*, company:companies(*)`)
          .eq("id", authUser.id)
          .maybeSingle();
        setCurrentUser(userData);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  // Fetch Post Details from server API
  const loadPost = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();

      if (response.ok) {
        setPost(data.post);
        setIsLoggedIn(data.isLoggedIn);
        setIsVerified(data.isVerified);
        setIsTruncated(data.isTruncated || false);
      } else {
        setError(data.error || "Post not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchCurrentUser();
    loadPost();
  }, [fetchCurrentUser, loadPost]);

  // Handle updates (e.g. comments, edits, deletes)
  const handlePostUpdated = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();
      if (!response.ok || !data.post) {
        // Redirect to feed/home if post was deleted or is no longer accessible
        router.push(currentUser ? "/feed" : "/");
      } else {
        setPost(data.post);
        setIsTruncated(data.isTruncated || false);
      }
    } catch (e) {
      router.push(currentUser ? "/feed" : "/");
    }
  };

  // Mask name function for public posts
  const maskName = (name: string) => {
    if (!name) return "Verified Professional";
    return name
      .split(" ")
      .map((p) => {
        if (p.length <= 2) return p;
        return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
      })
      .join(" ");
  };

  // Highlighted sidebar states based on current post
  const activeTab = post?.visibility === "company" ? "company" : "city";
  const activeCategory = post?.category || "all";
  const activeSubCategory = post?.sub_category || "all";

  // Handle left sidebar navigation
  const handleLeftSidebarClick = (action: string, subCategory?: string) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (action === "city") {
      router.push("/feed?tab=city");
    } else if (action === "company") {
      router.push("/feed?tab=company");
    } else {
      if (subCategory && subCategory !== "all") {
        router.push(`/feed?category=${action}&sub_category=${subCategory}`);
      } else {
        router.push(`/feed?category=${action}`);
      }
    }
  };

  const renderLeftSidebar = () => {
    return (
      <aside className="hidden lg:flex w-64 flex-col gap-2 sticky top-24 h-fit">
        <div
          onClick={() => handleLeftSidebarClick("city")}
          className={cn(
            "flex items-center justify-between px-4 py-2 rounded-xl text-sm font-bold transition-all group cursor-pointer",
            activeTab === "city"
              ? "bg-white shadow-sm ring-1 ring-black/5"
              : "hover:bg-neutral-200/50"
          )}
        >
          <div
            className={cn("flex items-center gap-3 flex-1", activeTab === "city" ? "text-primary" : "text-neutral-500")}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate max-w-[150px]">{currentUser?.city || "Local"}</span>
          </div>
        </div>

        <button
          onClick={() => handleLeftSidebarClick("company")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group w-full text-left",
            activeTab === "company"
              ? "bg-white shadow-sm text-primary ring-1 ring-black/5"
              : "text-neutral-500 hover:bg-neutral-200/50",
          )}
        >
          <div className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center overflow-hidden">
            {currentUser?.company?.domain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${currentUser?.company?.domain}&sz=32`}
                alt=""
                className="h-3.5 w-3.5 object-contain"
              />
            ) : (
              <Building2 className="h-3 w-3 text-neutral-400" />
            )}
          </div>
          <span className="truncate">{currentUser?.company?.name || "Company"}</span>
          {(!currentUser || !currentUser?.is_verified) && (
            <Lock className="h-3 w-3 ml-auto text-neutral-400 group-hover:text-primary" />
          )}
        </button>

        <hr className="my-4 border-neutral-200" />

        <div className="px-4 py-2">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">
            Marketplace
          </p>
          <div className="space-y-1">
            {[{ value: "all", label: "All" }, ...CATEGORIES].map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleLeftSidebarClick(cat.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all",
                  activeCategory === cat.value
                    ? "bg-primary/5 text-primary"
                    : "text-neutral-500 hover:text-neutral-800",
                )}
              >
                # {cat.label}
              </button>
            ))}
          </div>

          {activeCategory !== "all" && SUB_CATEGORIES[activeCategory] && (
            <div className="pl-3 py-2 mt-2 space-y-1 border-l border-neutral-100 animate-in fade-in zoom-in duration-300">
              <button
                onClick={() => handleLeftSidebarClick(activeCategory, "all")}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeSubCategory === "all"
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-700",
                )}
              >
                All {CATEGORIES.find(c => c.value === activeCategory)?.label || activeCategory}
              </button>
              {SUB_CATEGORIES[activeCategory].map((sub) => (
                <button
                  key={sub.value}
                  onClick={() => handleLeftSidebarClick(activeCategory, sub.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeSubCategory === sub.value
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-400 hover:text-neutral-700",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    );
  };

  // Determine which navbar to render
  const renderNavbar = () => {
    return <Navigation />;
  };

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FB]">
        {renderNavbar()}
        <main className="container mx-auto max-w-2xl px-4 flex flex-col items-center justify-center text-center pt-12">
          <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-neutral-900 mb-2">Access Restricted</h1>
          <p className="text-neutral-500 text-sm max-w-md mb-8">
            {error === "Forbidden: This post is restricted to verified employees of the author's company"
              ? "This discussion is private to verified employees of the author's workspace. If you are a member of this company, please verify your email."
              : error}
          </p>
          <Button onClick={() => router.push(currentUser ? "/feed" : "/login")} className="rounded-xl font-bold px-6">
            {currentUser ? "Back to Feed" : "Log In to Continue"}
          </Button>
        </main>
      </div>
    );
  }

  const categoryLabel = post
    ? CATEGORIES.find((c) => c.value === post.category)?.label || post.category
    : "";
  const subCategoryLabel = post && post.category && post.sub_category
    ? SUB_CATEGORIES[post.category]?.find((s) => s.value === post.sub_category)?.label
    : null;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {renderNavbar()}

      <div className="container mx-auto max-w-7xl flex gap-8 p-4 lg:p-8">
        {/* --- LEFT SIDEBAR (The Navigation) --- */}
        {renderLeftSidebar()}

        <main className="flex-1 max-w-2xl mx-auto w-full space-y-6">

          {loading || !authChecked || !post ? (
            <div className="space-y-6 animate-pulse">
              {/* Back button skeleton */}
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded bg-neutral-200" />
                <Skeleton className="h-4 w-28 rounded bg-neutral-200" />
              </div>

              {/* PostCard skeleton */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0 bg-neutral-200" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32 bg-neutral-200" />
                        <Skeleton className="h-3 w-3 bg-neutral-200" />
                        <Skeleton className="h-4 w-20 bg-neutral-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16 bg-neutral-200" />
                        <Skeleton className="h-3 w-2 bg-neutral-200" />
                        <Skeleton className="h-3 w-20 bg-neutral-200" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-md bg-neutral-200" />
                  <Skeleton className="h-5 w-24 rounded-md bg-neutral-200" />
                </div>

                {/* Body Text */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-neutral-200" />
                  <Skeleton className="h-4 w-[90%] bg-neutral-200" />
                  <Skeleton className="h-4 w-[75%] bg-neutral-200" />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-neutral-50">
                  <Skeleton className="h-8 w-16 rounded-md bg-neutral-200" />
                  <Skeleton className="h-8 w-16 rounded-md bg-neutral-200" />
                  <Skeleton className="h-8 w-16 rounded-md bg-neutral-200" />
                </div>
              </div>

              {/* Comments Skeletons */}
              {(!authChecked || currentUser) && (
                <div className="space-y-4 pl-4 border-l-2 border-neutral-100">
                  <div className="text-xs font-semibold text-neutral-400">Replies</div>
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6 rounded-full bg-neutral-200" />
                          <Skeleton className="h-3.5 w-24 bg-neutral-200" />
                          <Skeleton className="h-3 w-12 bg-neutral-200" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full bg-neutral-200" />
                        <Skeleton className="h-3 w-[80%] bg-neutral-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* --- SCENARIO 1: Unauthenticated (Logged Out) + Non-Admin Post (Truncated View) --- */}
              {!currentUser && isTruncated && !post.user?.is_admin && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-lg border border-neutral-100 bg-neutral-50 flex items-center justify-center shrink-0">
                          <Lock className="h-5 w-5 text-neutral-300" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-neutral-400">
                              {maskName(post.user?.full_name)}
                            </span>
                            <span className="text-neutral-300 text-xs">|</span>
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-tight">
                              {post.user?.company?.name || "Verified Company"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-neutral-400 font-medium">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                            <span className="text-neutral-300 text-[10px]">·</span>
                            <span className="text-[11px] text-neutral-400 flex items-center font-medium">
                              <MapPin className="h-2.5 w-2.5 mr-0.5" />
                              {post.user?.city}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2 mb-3">
                      <Badge variant="secondary" className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-5">
                        {categoryLabel}
                      </Badge>
                      {post.sub_category && subCategoryLabel && (
                        <Badge variant="outline" className="text-muted-foreground border-border text-[10px] py-0 px-2 h-5 font-medium">
                          {subCategoryLabel}
                        </Badge>
                      )}
                    </div>

                    {/* Body Text */}
                    <div className="relative">
                      <p className="text-neutral-800 text-[15px] leading-relaxed whitespace-pre-wrap select-none">
                        {post.text}
                      </p>
                      {/* Visual fading blur effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Premium Call to Action card */}
                  <div className="bg-gradient-to-br from-white via-white to-indigo-50/20 border border-indigo-100 rounded-2xl p-8 text-center shadow-md relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-50/40 rounded-full blur-3xl -z-10" />
                    <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm">
                      <Lock className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-black text-neutral-900 mb-2">Join the Conversation</h3>
                    <p className="text-neutral-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                      Log in or sign up to view the full discussion, high-resolution image attachments, and replies from verified corporate professionals.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href="/login" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full rounded-xl font-bold h-11 px-8">
                          Log In
                        </Button>
                      </Link>
                      <Link href="/signup" className="w-full sm:w-auto">
                        <Button className="w-full rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/10">
                          Sign Up Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* --- SCENARIO 2: Logged In but Unverified + Non-Admin Post (Blurred View) --- */}
              {currentUser && !currentUser.is_verified && isTruncated && !post.user?.is_admin && (
                <div className="animate-in fade-in duration-500">
                  <BlurredPostCard
                    post={post}
                    onVerify={() => setIsVerifyModalOpen(true)}
                  />
                </div>
              )}

              {/* --- SCENARIO 3: Full View (Admin Post, or Logged In & Verified user) --- */}
              {(!isTruncated || (currentUser && currentUser.is_verified) || post.user?.is_admin) && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <PostCard
                    post={post}
                    currentUserId={currentUser?.id}
                    isVerifiedUser={currentUser?.is_verified || false}
                    defaultShowComments={true}
                    onReply={() => { }}
                    onReport={(pid) => {
                      setReportTarget({ postId: pid });
                      setReportDialogOpen(true);
                    }}
                    onPostUpdated={handlePostUpdated}
                  />

                  {/* If logged in and verified, show comment box */}
                  {currentUser && currentUser.is_verified && (

                    <CommentForm
                      postId={post.id}
                      userId={currentUser.id}
                      isVerifiedUser={currentUser.is_verified}
                      onCommentAdded={handlePostUpdated}
                    />

                  )}

                  {/* If logged in but unverified, show verify to reply prompt */}
                  {currentUser && !currentUser.is_verified && (
                    <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-6 text-center">
                      <p className="text-sm font-semibold text-amber-800 mb-3">
                        Only verified professionals can reply to discussions.
                      </p>
                      <Button onClick={() => setIsVerifyModalOpen(true)} className="rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-6 h-9 shadow-sm">
                        Verify Identity
                      </Button>
                    </div>
                  )}

                  {/* If logged out, show login to reply CTA */}
                  {!currentUser && (
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-6 text-center shadow-sm">
                      <p className="text-sm font-bold text-indigo-900 mb-3">
                        Join the Vouchins professional network to comment on this post.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Link href="/login">
                          <Button variant="ghost" className="h-9 font-bold text-xs uppercase tracking-wider text-indigo-600 rounded-full px-5">
                            Log In
                          </Button>
                        </Link>
                        <Link href="/signup">
                          <Button className="h-9 font-bold text-xs uppercase tracking-wider rounded-full px-5 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100">
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        {/* --- RIGHT SIDEBAR --- */}
        <RightSidebar user={currentUser} />
      </div>

      {/* Verification modal for unverified logged-in users */}
      {currentUser && (
        <VerificationModal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          user={currentUser}
          onVerified={() => window.location.reload()}
        />
      )}

      {/* Report dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={reportTarget.postId}
        userId={currentUser?.id}
      />
    </div>
  );
}
