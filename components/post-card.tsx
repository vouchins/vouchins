"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Linkify from "linkify-react";
import posthog from "posthog-js";
import {
  MessageCircle,
  Flag,
  Building2,
  MapPin,
  AlertTriangle,
  Home,
  Edit2,
  Trash2,
  Check,
  X,
  ImageIcon,
  Plus,
  ShieldCheck,
  Share2,
  Bookmark,
  CheckCircle2,
  RotateCcw,
  Lock,
  Globe,
  MoreVertical,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/user-provider";
import { cn } from "@/lib/utils";
import { VerifiedIcon } from "@/components/verified-icon";
import { CommentForm } from "@/components/comment-form";

const PostImageGallery = dynamic(() => import("@/components/post-image-gallery").then((mod) => mod.PostImageGallery), {
  loading: () => <div className="mt-4 h-64 sm:h-80 rounded-xl bg-neutral-100 animate-pulse" />,
});


interface PostCardProps {
  post: {
    id: string;
    city?: string | null;
    text: string;
    category: "housing" | "buy_sell" | "recommendations" | "jobs" | "referrals";
    sub_category?:
    | "flatmates"
    | "rentals"
    | "sale"
    | "pg"
    | "hiring"
    | "seeking_referral"
    | "offering_referral"
    | "seeking_job"
    | null;
    visibility: "company" | "all" | "public";
    image_urls: string[];
    is_flagged: boolean;
    flag_reasons: string[];
    created_at: string;
    updated_at?: string;
    status?: "active" | "closed";
    user: {
      id: string;
      full_name: string;
      city: string;
      bio?: string | null;
      avatar_url?: string | null;
      vouch_points?: number;
      is_verified?: boolean;
      company: {
        name: string;
        domain: string;
      };
    };
    comments?: any[];
    vouchers?: Array<{
      id: string;
      vouching_user_id: string;
      user: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        is_verified: boolean;
      } | null;
    }>;
    vouches?: { id: string; vouching_user_id: string }[];
    saved_posts?: { id: string }[];
    post_views?: { id: string }[];
    comment_count?: number;
    vouch_count?: number;
    save_count?: number;
    view_count?: number;
  };
  isVerifiedUser: boolean;
  currentUserId?: string;
  onReply: (postId: string) => void;
  onReport: (
    targetType: "post" | "comment",
    targetId: string,
    targetLabel?: string,
  ) => void;
  onPostUpdated: () => void;
  onVerifyClick?: (postId: string) => void;
  defaultShowComments?: boolean;
  variant?: "default" | "feed";
}

export function PostCard({
  post,
  currentUserId,
  isVerifiedUser,
  onReply,
  onReport,
  onPostUpdated,
  onVerifyClick,
  defaultShowComments = false,
  variant = "default",
}: PostCardProps) {
  const router = useRouter();
  const isFeedVariant = variant === "feed";
  // --- START: YOUR ORIGINAL LOGIC (FULLY PRESERVED) ---
  const isOwner = post.user.id === currentUserId;
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const [editedCategory, setEditedCategory] = useState<PostCardProps["post"]["category"]>(post.category);
  const [editedSubCategory, setEditedSubCategory] = useState(post.sub_category || "");
  const [saving, setSaving] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(post.status || "active");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const togglePostStatus = async () => {
    const newStatus = localStatus === "active" ? "closed" : "active";
    const originalStatus = localStatus;

    setLocalStatus(newStatus);

    const { error } = await supabase
      .from("posts")
      .update({
        status: newStatus,
        closed_at: newStatus === "closed" ? new Date().toISOString() : null
      })
      .eq("id", post.id);

    if (error) {
      console.error("Status update error:", error);
      toast.error(`Failed to mark post as ${newStatus}`);
      setLocalStatus(originalStatus);
    } else {
      toast.success(newStatus === "closed" ? "Post marked as closed" : "Post reopened");
      onPostUpdated();
    }
  };

  const getClosedBadgeText = () => {
    switch (post.category) {
      case "housing": return "Sold";
      case "recommendations": return "Resolved";
      case "buy_sell": return "Sold";
      case "jobs": return "Position Filled";
      default: return "Closed";
    }
  };

  // Feed cards promote a short first line to a title without changing stored content.
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedPostText = post.text.trim();
  const [firstTextLine = "", ...remainingTextLines] = normalizedPostText.split(/\r?\n/);
  const hasFeedTitle =
    isFeedVariant &&
    firstTextLine.length <= 120 &&
    remainingTextLines.some((line) => line.trim().length > 0);
  const feedTitle = hasFeedTitle ? firstTextLine : "";
  const postBody = hasFeedTitle
    ? remainingTextLines.join("\n").trim()
    : post.text;
  const characterLimit = isFeedVariant ? 280 : 400;
  const shouldTruncate = postBody.length > characterLimit;
  const displayedText =
    isExpanded || !shouldTruncate
      ? postBody
      : `${postBody.substring(0, characterLimit).trim()}...`;

  // --- NEW: IMAGE EDITING STATE ---
  const [editedImages, setEditedImages] = useState<string[]>(
    post.image_urls || [],
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const categoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  const subCategoryLabel = post.sub_category
    ? SUB_CATEGORIES[post.category]?.find((s) => s.value === post.sub_category)
      ?.label
    : null;

  const initialCommentCount = post.comment_count ?? post.comments?.length ?? 0;
  const [localCommentCount, setLocalCommentCount] = useState(initialCommentCount);
  const initialVouchCount = post.vouch_count ?? post.vouches?.length ?? 0;
  const [localVouchCount, setLocalVouchCount] = useState(initialVouchCount);

  useEffect(() => {
    setLocalCommentCount(initialCommentCount);
  }, [initialCommentCount]);

  useEffect(() => {
    setLocalVouchCount(initialVouchCount);
  }, [initialVouchCount]);

  const isEdited =
    post.updated_at &&
    new Date(post.updated_at).getTime() > new Date(post.created_at).getTime();
  const postCity =
    post.city === null ? "Global" : post.city || post.user.city;

  const { vouchedEntities, setVouchedEntities, savedPostIds, setSavedPostIds } = useUser();

  const handleVouch = async (targetUserId: string, entityType: 'post' | 'comment', entityId: string) => {
    if (!currentUserId) {
      router.push(`/signup?returnTo=/posts/${post.id}`);
      return;
    }
    if (!isVerifiedUser) {
      if (onVerifyClick) onVerifyClick(post.id);
      else toast.error("You must be verified to vouch for members");
      return;
    }
    const key = `${entityType}_${entityId}`;
    if (targetUserId === currentUserId || vouchedEntities[key]) return;

    // Optimistic UI update
    setVouchedEntities(prev => ({ ...prev, [key]: true }));
    if (entityType === 'post') setLocalVouchCount((count) => count + 1);

    const { error } = await supabase.from('vouches').insert({
      vouching_user_id: currentUserId,
      target_user_id: targetUserId,
      ...(entityType === 'post' ? { post_id: entityId } : { comment_id: entityId })
    });

    if (error) {
      if (entityType === 'post') {
        setLocalVouchCount((count) => Math.max(initialVouchCount, count - 1));
      }
      if (error.code !== '23505') {
        console.error("Vouch error:", error);
        // Revert optimistic update on real error
        setVouchedEntities(prev => ({ ...prev, [key]: false }));
      }
    } else {
      posthog.capture("Vouch", { entity_type: entityType, entity_id: entityId, target_user_id: targetUserId });
    }
  };

  const isSaved = savedPostIds ? savedPostIds.has(post.id) : false;

  const handleToggleSave = async () => {
    if (!currentUserId) {
      router.push(`/signup?returnTo=/posts/${post.id}`);
      return;
    }
    if (!isVerifiedUser) {
      if (onVerifyClick) onVerifyClick(post.id);
      else toast.error("You must be verified to save posts");
      return;
    }

    if (!savedPostIds) return;

    const wasSaved = isSaved;

    // Optimistic UI update
    setSavedPostIds(prev => {
      const newSet = new Set(prev);
      if (wasSaved) newSet.delete(post.id);
      else newSet.add(post.id);
      return newSet;
    });

    if (wasSaved) {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', currentUserId)
        .eq('post_id', post.id);

      if (error) {
        console.error("Unsave error:", error);
        toast.error("Failed to remove bookmark");
        setSavedPostIds(prev => new Set(prev).add(post.id));
      } else {
        posthog.capture("Unsave", { post_id: post.id });
        toast.success("Removed from Saved Posts");
      }
    } else {
      const { error } = await supabase
        .from('saved_posts')
        .insert({ user_id: currentUserId, post_id: post.id });

      if (error && error.code !== '23505') {
        console.error("Save error:", error);
        toast.error("Failed to save post");
        setSavedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });
      } else {
        posthog.capture("Save", { post_id: post.id });
        toast.success("Post saved successfully");
      }
    }
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      posthog.capture("Share", { post_id: post.id, method: "copy_link" });
      toast.success("Link copied to clipboard!");
      setIsShareOpen(false);
    } catch (err) {
      console.error("Clipboard error:", err);
      toast.error("Failed to copy link.");
    }
  };

  const handleSystemShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          url: shareUrl,
        });
        posthog.capture("Share", { post_id: post.id, method: "system_share" });
        setIsShareOpen(false);
      } catch (err) {
        console.log("Error sharing:", err);
      }
    }
  };

  // Helper for uploading new images during edit
  const uploadNewImages = async (files: File[]) => {
    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    const uploadPromises = files.map(async (file) => {
      try {
        const { default: imageCompression } = await import("browser-image-compression");
        const compressedFile = await imageCompression(file, options);
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("post-images")
          .upload(fileName, compressedFile);

        if (error) throw error;
        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(fileName);
        return publicUrl;
      } catch (error) {
        console.error("Upload error:", error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((url) => url !== null) as string[];
  };

  const saveEdit = async () => {
    if (!editedText.trim()) return;
    const availableEditedSubCategories = SUB_CATEGORIES[editedCategory] || [];
    if (availableEditedSubCategories.length > 0 && !editedSubCategory) {
      toast.error("Please select a sub-category");
      return;
    }
    setSaving(true);

    try {
      let finalUrls = [...editedImages];

      // Upload new files if any
      if (newFiles.length > 0) {
        const uploadedUrls = await uploadNewImages(newFiles);
        finalUrls = [...finalUrls, ...uploadedUrls];
      }

      const { error } = await supabase
        .from("posts")
        .update({
          text: editedText.trim(),
          category: editedCategory,
          sub_category: availableEditedSubCategories.length > 0 ? editedSubCategory : null,
          image_urls: finalUrls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (error) throw error;

      // Success cleanup
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
      setNewFiles([]);
      setNewPreviews([]);
      setIsEditing(false);
      posthog.capture("Post Edited", { post_id: post.id });
      onPostUpdated();
      // Logic assumes parent will refresh feed via subscription or callback
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setEditedText(post.text);
    setEditedCategory(post.category);
    setEditedSubCategory(post.sub_category || "");
    setEditedImages(post.image_urls || []);
    setIsEditing(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete post");
      }
      posthog.capture("Post Deleted", { post_id: post.id });
      if (post.category === "buy_sell") {
        posthog.capture("Listing Closed", { post_id: post.id });
      }
      toast.success("Post deleted");
      setShowDeleteConfirm(false);
      onPostUpdated();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (editedImages.length + newFiles.length + files.length > 3) {
      alert("Maximum 3 images allowed.");
      return;
    }
    const updatedFiles = [...newFiles, ...files];
    setNewFiles(updatedFiles);
    setNewPreviews(updatedFiles.map((f) => URL.createObjectURL(f)));
  };

  const companyLogoUrl = post.user.company?.domain
    ? `https://www.google.com/s2/favicons?domain=${post.user.company?.domain}&sz=64`
    : null;

  const handleCardClick = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const query = searchParams.get("q");
      if (query) {
        posthog.capture("Search Result Click", { post_id: post.id, query });
      }
    }
  };

  // Real analytics (no longer artificially inflated)
  const getDeterministicMetrics = () => {
    const views = post.view_count ?? post.post_views?.length ?? 0;
    const shares = 0;
    const saves = post.save_count ?? post.saved_posts?.length ?? 0;
    return { views, shares, saves };
  };

  const vouchCount = localVouchCount;
  const verifiedVoucherProfiles = (post.vouchers ?? []).filter(
    (voucher) => voucher.user?.is_verified,
  );
  const displayedVoucherProfiles = verifiedVoucherProfiles.slice(0, 3);
  const { views, shares, saves } = getDeterministicMetrics();

  const loadComments = async (force = false) => {
    if ((!force && (comments.length > 0 || localCommentCount === 0)) || loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/comments`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load comments");
      setComments(result.comments || []);
    } catch (error) {
      console.error("Failed to load comments:", error);
      toast.error("Could not load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentAdded = async () => {
    setShowReplyForm(false);
    setShowComments(true);
    setLocalCommentCount((count) => count + 1);
    await loadComments(true);
    onPostUpdated();
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this reply? This cannot be undone.")) return;

    const previousComments = comments;
    setDeletingCommentId(commentId);
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    setLocalCommentCount((count) => Math.max(0, count - 1));

    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to delete reply");

      toast.success("Reply deleted");
      onPostUpdated();
    } catch (error) {
      setComments(previousComments);
      setLocalCommentCount((count) => count + 1);
      toast.error(error instanceof Error ? error.message : "Failed to delete reply");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleReplyClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentUserId) {
      router.push(`/signup?returnTo=/posts/${post.id}`);
      return;
    }
    const shouldShow = !showComments;
    setShowComments(shouldShow);
    if (shouldShow) void loadComments();
    if (isFeedVariant) {
      setShowReplyForm(shouldShow);
    } else {
      onReply(post.id);
    }
  };

  // Trust Indicators: same-company colleague detection
  const currentUser = useUser().user;
  const isColleague = currentUser?.company?.domain && post.user.company?.domain && currentUser.company.domain === post.user.company.domain;
  const feedOptionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 rounded-full p-0 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl border-neutral-200 shadow-lg">
        <DropdownMenuItem onClick={handleCopyLink} className="text-xs font-semibold">
          <Share2 className="mr-2 h-3.5 w-3.5" />
          Copy link
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <DropdownMenuItem onClick={handleSystemShare} className="text-xs font-semibold">
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Share via...
          </DropdownMenuItem>
        )}
        {isOwner ? (
          <>
            <DropdownMenuItem onClick={startEditing} className="text-xs font-semibold">
              <Edit2 className="mr-2 h-3.5 w-3.5" />
              Edit post
            </DropdownMenuItem>
            <DropdownMenuItem onClick={togglePostStatus} className="text-xs font-semibold">
              {localStatus === "active" ? (
                <>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  Mark closed
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reopen
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setShowDeleteConfirm(true)}
              className="text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete post
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={() => onReport("post", post.id, post.text)}
            className="text-xs font-semibold text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <Flag className="mr-2 h-3.5 w-3.5" />
            Report post
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div onClick={handleCardClick} className="group/card relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-neutral-200/90 bg-white p-4 transition-all duration-300 hover:border-neutral-300 hover:shadow-md sm:p-6">
      {/* Header */}
      {isFeedVariant ? (
        <div className="mb-4 flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white font-bold text-primary shadow-sm">
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.full_name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : post.user.company?.domain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${post.user.company.domain}&sz=64`}
                alt={post.user.company?.name || "Company logo"}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              post.user.full_name.charAt(0)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/users/${post.user.id}`}
              className="inline-flex max-w-full items-center gap-1 break-words text-[15px] font-bold leading-5 text-neutral-950 hover:text-primary"
            >
              {post.user.full_name}
              {post.user.is_verified && (
                <VerifiedIcon label="Verified user" />
              )}
            </Link>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs font-medium text-neutral-600">
              <span className="min-w-0 truncate">{post.user.company?.name || "No company"}</span>
              {post.user.bio && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span
                    className="max-w-full min-w-0 truncate text-neutral-500 sm:max-w-[16rem]"
                    title={post.user.bio}
                  >
                    {post.user.bio}
                  </span>
                </>
              )}
              {isColleague && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-600">Colleague</span>
                </>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-neutral-500">
              <Link href={`/posts/${post.id}`} className="hover:text-primary hover:underline">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                {isEdited && <span className="ml-1 italic">(Edited)</span>}
              </Link>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center">
                <MapPin className="mr-0.5 h-3 w-3" />
                {postCity}
              </span>
            </div>
          </div>
          {feedOptionsMenu}
        </div>
      ) : (
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3 sm:gap-2">
        <div className="flex gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl border border-neutral-100 bg-white flex items-center justify-center overflow-hidden shrink-0 text-primary font-bold shadow-sm">
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.full_name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : post.user.company?.domain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${post.user.company?.domain}&sz=64`}
                alt={post.user.company?.name || "Company Logo"}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              post.user.full_name.charAt(0)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/users/${post.user.id}`}
                className="flex min-w-0 max-w-full items-center gap-0.5 break-words text-sm font-bold text-neutral-900 hover:text-indigo-600 sm:text-[15px]"
              >
                {post.user.full_name}
                {post.user.is_verified && (
                  <VerifiedIcon label="Verified user" />
                )}
                {(post.user.vouch_points ?? 0) > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600 ml-1" title={`${post.user.vouch_points} Vouch Points`}>
                    <ShieldCheck className="h-3 w-3" />
                    <span className="text-[9px] font-black">{post.user.vouch_points}</span>
                  </div>
                )}
              </Link>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-tight text-neutral-600">
                {post.user.company?.name || "No Company"}
              </span>
              {post.user.bio && (
                <>
                  <span className="text-neutral-300 text-xs">·</span>
                  <span
                    className="max-w-[16rem] truncate text-xs font-medium normal-case tracking-normal text-neutral-500"
                    title={post.user.bio}
                  >
                    {post.user.bio}
                  </span>
                </>
              )}
              {isColleague && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  <Building2 className="h-2.5 w-2.5" /> Colleague
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <Link
                href={`/posts/${post.id}`}
                className="text-[11px] text-neutral-450 font-medium hover:underline hover:text-indigo-600 transition-colors"
              >
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
                {isEdited && <span className="italic ml-1">(Edited)</span>}
              </Link>
              <span className="text-neutral-300 text-[10px]">·</span>
              <span className="text-[11px] text-neutral-400 flex items-center font-medium">
                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                {postCity}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          {localStatus === "closed" && (
            <Badge
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-6 flex items-center shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-white" />
              {getClosedBadgeText()}
            </Badge>
          )}
          {post.visibility === "company" && (
            <Badge
              variant="secondary"
              className="bg-indigo-50 text-indigo-700 border-none text-[10px] px-2 py-0"
            >
              Company Only
            </Badge>
          )}
          {post.visibility === "public" && (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 border-none text-[10px] px-2 py-0 font-semibold flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              Public
            </Badge>
          )}
        </div>
      </div>
      )}

      {/* Flag Warning */}
      {/* {isOwner && post.is_flagged && post.flag_reasons.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start space-x-2 ml-[52px]">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-900">
              Auto-flagged for review
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {post.flag_reasons.join(", ")}
            </p>
          </div>
        </div>
      )} */}

      {/* Content */}
      <div className="mb-4">
        {isFeedVariant ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="h-5 border-none bg-secondary px-2 text-[10px] font-bold uppercase tracking-wider text-primary"
            >
              {categoryLabel}
            </Badge>
            {localStatus === "closed" && (
              <Badge className="h-5 border-none bg-blue-600 px-2 text-[10px] font-bold uppercase tracking-wider text-white">
                {getClosedBadgeText()}
              </Badge>
            )}
            {post.visibility === "company" && (
              <Badge variant="outline" className="h-5 border-blue-100 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700">
                <Lock className="mr-1 h-3 w-3" />
                Company only
              </Badge>
            )}
            {post.visibility === "public" && (
              <Badge variant="outline" className="h-5 border-emerald-100 bg-emerald-50 px-2 text-[10px] font-semibold text-emerald-700">
                <Globe className="mr-1 h-3 w-3" />
                Public
              </Badge>
            )}
            {post.sub_category && subCategoryLabel && (
              <Badge variant="outline" className="h-5 border-neutral-200 px-2 text-[10px] font-medium text-neutral-600">
                {post.category === "housing" && <Home className="mr-1 h-3 w-3" />}
                {subCategoryLabel}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex gap-2 mb-2">
            <Badge
              variant="secondary"
              className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-5"
            >
              {categoryLabel}
            </Badge>
            {post.sub_category && subCategoryLabel && (
              <Badge
                variant="outline"
                className="text-muted-foreground border-border text-[10px] py-0 px-2 h-5 font-medium"
              >
                {post.category === "housing" && (
                  <Home className="h-2.5 w-2.5 mr-1" />
                )}
                {subCategoryLabel}
              </Badge>
            )}
          </div>
        )}

        {!isEditing && isFeedVariant && (
          <div>
            {feedTitle && (
              <h3 className="mb-3 break-words text-[17px] font-bold leading-6 text-neutral-950 sm:text-lg">
                {feedTitle}
              </h3>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700">Category</label>
                <Select
                  value={editedCategory}
                  onValueChange={(value) => {
                    const category = value as PostCardProps["post"]["category"];
                    const options = SUB_CATEGORIES[category] || [];
                    setEditedCategory(category);
                    setEditedSubCategory((current) =>
                      options.some((option) => option.value === current)
                        ? current
                        : options[0]?.value || "",
                    );
                  }}
                >
                  <SelectTrigger aria-label="Edit category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(SUB_CATEGORIES[editedCategory] || []).length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700">Sub-category</label>
                  <Select value={editedSubCategory} onValueChange={setEditedSubCategory}>
                    <SelectTrigger aria-label="Edit sub-category">
                      <SelectValue placeholder="Select a sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(SUB_CATEGORIES[editedCategory] || []).map((subCategory) => (
                        <SelectItem key={subCategory.value} value={subCategory.value}>
                          {subCategory.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />

            {/* Image Editing Grid */}
            <div
              className={`grid gap-2 ${[...editedImages, ...newPreviews].length > 1
                ? "grid-cols-2"
                : "grid-cols-1"
                }`}
            >
                {editedImages.map((url, index) => (
                    <div
                      key={url}
                      className="relative rounded-lg overflow-hidden border aspect-video"
                    >
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        onClick={() =>
                          setEditedImages(
                            editedImages.filter((_, i) => i !== index),
                          )
                        }
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                ))}
              {newPreviews.map((url, index) => (
                <div
                  key={url}
                  className="relative rounded-lg overflow-hidden border border-indigo-200 aspect-video"
                >
                  <img src={url} className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(newPreviews[index]);
                      const f = [...newFiles];
                      f.splice(index, 1);
                      setNewFiles(f);
                      const p = [...newPreviews];
                      p.splice(index, 1);
                      setNewPreviews(p);
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add more images button */}
            {editedImages.length + newFiles.length < 3 && (
              <label className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80">
                <Plus className="h-4 w-4" />
                <span>Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleNewFileChange}
                />
              </label>
            )}
          </div>
        ) : (
          <div className="relative">
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-neutral-800",
                isFeedVariant ? "text-sm leading-6 sm:text-[15px]" : "text-[15px] leading-relaxed",
              )}
            >
              {/* {displayedText} */}
              <Linkify
                options={{
                  target: "_blank",
                  className: "text-indigo-600 hover:underline",
                }}
              >
                {displayedText}
              </Linkify>
            </p>

            {shouldTruncate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpanded) {
                    posthog.capture("Read More Clicked", { post_id: post.id });
                  }
                  setIsExpanded(!isExpanded);
                }}
                className={cn(
                  "mt-2 flex items-center gap-1 text-sm font-bold text-primary transition-all hover:opacity-80",
                  !isFeedVariant && "underline",
                )}
              >
                {isExpanded ? (
                  <>
                    Show less <X className="h-3 w-3" />
                  </>
                ) : (
                  <>Read more...</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {!isEditing && post.image_urls && post.image_urls.length > 0 && (
        <PostImageGallery imageUrls={post.image_urls} compact={isFeedVariant} />
      )}
      {isFeedVariant && !isEditing && (
        <div className="mt-4">
          {vouchCount > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary/[0.035] px-3 py-2.5 text-xs font-medium text-neutral-700">
              {displayedVoucherProfiles.length > 0 ? (
                <span className="flex shrink-0 -space-x-2">
                  {displayedVoucherProfiles.map((voucher) => (
                    <span
                      key={voucher.id}
                      title={voucher.user?.full_name}
                      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary/10 text-[10px] font-bold text-primary"
                    >
                      {voucher.user?.avatar_url ? (
                        <img
                          src={voucher.user.avatar_url}
                          alt={voucher.user.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        voucher.user?.full_name.charAt(0)
                      )}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              )}
              <span>
                Vouched for by{" "}
                {verifiedVoucherProfiles.length > 0
                  ? `${verifiedVoucherProfiles.length} verified ${
                      verifiedVoucherProfiles.length === 1
                        ? "professional"
                        : "professionals"
                    }`
                  : `${vouchCount} community ${
                      vouchCount === 1 ? "member" : "members"
                    }`}
              </span>
            </div>
          )}
          <div className="sm:flex sm:items-center sm:justify-between sm:border-t sm:border-neutral-100 sm:pt-3">
            <div
              className="mb-2 flex items-center justify-end gap-1 text-[11px] font-medium text-neutral-500 sm:order-2 sm:mb-0"
              title={`${views} ${views === 1 ? "view" : "views"}`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="tabular-nums">{views}</span>
              <span>{views === 1 ? "view" : "views"}</span>
            </div>
            <div
              className={cn(
                "-mx-4 -mb-4 grid border-t border-neutral-200 sm:order-1 sm:mx-0 sm:mb-0 sm:flex sm:border-0",
                isOwner ? "grid-cols-3" : "grid-cols-4",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReplyClick}
                className="h-12 min-w-0 rounded-none px-4 text-primary hover:bg-primary/5 sm:h-9 sm:rounded-lg sm:px-3"
              >
                <MessageCircle className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate text-xs font-bold">Reply</span>
                <span className="ml-1 text-xs font-bold tabular-nums text-neutral-600">
                  {localCommentCount}
                </span>
              </Button>
              {!isOwner && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVouch(post.user.id, "post", post.id)}
                  disabled={vouchedEntities[`post_${post.id}`]}
                  className={cn(
                    "h-12 min-w-0 rounded-none border-l border-neutral-200 px-4 text-primary hover:bg-primary/5 sm:h-9 sm:rounded-lg sm:border-0 sm:px-3",
                    vouchedEntities[`post_${post.id}`] &&
                      "cursor-default bg-emerald-50 text-emerald-700",
                  )}
                >
                  {vouchedEntities[`post_${post.id}`] ? (
                    <Check className="mr-1.5 h-4 w-4 shrink-0" />
                  ) : (
                    <ShieldCheck className="mr-1.5 h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate text-xs font-bold">
                    {vouchedEntities[`post_${post.id}`] ? "Vouched" : "Vouch"}
                  </span>
                  <span
                    className={cn(
                      "ml-1 text-xs font-bold tabular-nums text-neutral-600",
                      vouchedEntities[`post_${post.id}`] && "text-emerald-700",
                    )}
                  >
                    {vouchCount}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleSave}
                className={cn(
                  "h-12 min-w-0 rounded-none border-l border-neutral-200 px-4 text-primary hover:bg-primary/5 sm:h-9 sm:rounded-lg sm:border-0 sm:px-3",
                  isSaved && "bg-blue-50 text-blue-700 hover:bg-blue-100",
                )}
              >
                <Bookmark className={cn("mr-1.5 h-4 w-4 shrink-0", isSaved && "fill-current")} />
                <span className="truncate text-xs font-bold">{isSaved ? "Saved" : "Save"}</span>
              </Button>
              <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-12 min-w-0 rounded-none border-l border-neutral-200 px-2 text-primary hover:bg-primary/5 sm:h-9 sm:rounded-lg sm:border-0 sm:px-3"
                  >
                    <Share2 className="mr-1.5 h-4 w-4 shrink-0" />
                    <span className="truncate text-xs font-bold">Share</span>
                    {shares > 0 && (
                      <span className="ml-1 text-xs font-bold tabular-nums text-neutral-600">
                        {shares}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl border border-neutral-100 shadow-md"
                >
                  <DropdownMenuItem
                    onClick={handleCopyLink}
                    className="text-xs font-bold text-neutral-750"
                  >
                    Copy Link
                  </DropdownMenuItem>
                  {typeof navigator !== "undefined" &&
                    typeof navigator.share === "function" && (
                      <DropdownMenuItem
                        onClick={handleSystemShare}
                        className="text-xs font-bold text-neutral-750"
                      >
                        Share via...
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
      {/* Footer Actions */}
      {(!isFeedVariant || isEditing) && (
      <div className="no-scrollbar mt-3 flex max-w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap border-t border-neutral-100/60 pt-3">
        {!isEditing ? (
          <>
            {/* Reply Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReplyClick}
              className="h-8 px-3 flex-shrink-0 text-neutral-500 hover:text-indigo-650 hover:bg-indigo-50/40 active:scale-[0.97] transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 duration-155 rounded-full font-bold"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-semibold">Reply</span>
              {localCommentCount > 0 && (
                <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-full text-neutral-600 font-bold ml-0.5">
                  {localCommentCount}
                </span>
              )}
            </Button>
 
            {/* Vouch Button */}
            {!isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVouch(post.user.id, 'post', post.id)}
                disabled={vouchedEntities[`post_${post.id}`]}
                className={`h-8 px-3 flex-shrink-0 flex items-center justify-center gap-1.5 rounded-full font-bold active:scale-[0.97] transition-all hover:scale-[1.02] duration-155 ${
                  vouchedEntities[`post_${post.id}`]
                    ? 'text-indigo-600 bg-indigo-50 cursor-default'
                    : 'text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {vouchedEntities[`post_${post.id}`] ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold">Vouched</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold">Vouch</span>
                  </>
                )}
                {vouchCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                    vouchedEntities[`post_${post.id}`] ? 'bg-indigo-100 text-indigo-700' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {vouchCount}
                  </span>
                )}
              </Button>
            )}
 
            {/* Save/Bookmark Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSave}
              className={`h-8 px-3 flex-shrink-0 flex items-center justify-center gap-1.5 rounded-full font-bold active:scale-[0.97] transition-all hover:scale-[1.02] duration-155 ${
                isSaved ? 'text-blue-600 hover:text-blue-700 bg-blue-50' : 'text-neutral-500 hover:text-blue-600 hover:bg-neutral-50'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="text-xs font-semibold">
                {isSaved ? "Saved" : "Save"}
              </span>
              {saves > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${
                  isSaved ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {saves}
                </span>
              )}
            </Button>
 
            {/* Share Dropdown Button */}
            <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-500 hover:text-indigo-655 hover:bg-indigo-50/30 h-8 px-3 flex-shrink-0 flex items-center justify-center gap-1.5 rounded-full font-bold active:scale-[0.97] transition-all hover:scale-[1.02] duration-155"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Share</span>
                  {shares > 0 && (
                    <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-full text-neutral-600 font-bold ml-0.5">
                      {shares}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-md border border-neutral-100">
                <DropdownMenuItem onClick={handleCopyLink} className="text-xs font-bold text-neutral-750">
                  Copy Link
                </DropdownMenuItem>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <DropdownMenuItem onClick={handleSystemShare} className="text-xs font-bold text-neutral-750">
                    Share via...
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Passive Views Indicator */}
            <div className="ml-auto flex items-center gap-1 text-neutral-400 font-bold px-2 text-xs" title="Views">
              <Eye className="h-3.5 w-3.5" />
              <span>{views}</span>
            </div>
 
            {/* Options Dropdown Button (Three dots inline) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-455 hover:text-neutral-700 hover:bg-neutral-50 h-8 w-8 p-0 rounded-full flex-shrink-0 flex items-center justify-center active:scale-[0.97] transition-all hover:scale-[1.02] duration-155"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-md border border-neutral-100">
                {isOwner ? (
                  <>
                    <DropdownMenuItem onClick={startEditing} className="text-xs font-bold text-neutral-705">
                      <Edit2 className="h-3.5 w-3.5 mr-2 text-neutral-500" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={togglePostStatus} className="text-xs font-bold text-neutral-705">
                      {localStatus === "active" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-neutral-500" />
                          Mark Closed
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 mr-2 text-neutral-500" />
                          Reopen
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setShowDeleteConfirm(true)}
                      className="text-red-650 focus:text-red-650 focus:bg-red-50 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onClick={() => onReport("post", post.id, post.text)}
                    className="text-red-650 focus:text-red-650 focus:bg-red-50 text-xs font-bold"
                  >
                    <Flag className="h-3.5 w-3.5 mr-2" />
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          /* Editing controls */
          <div className="flex gap-2 ml-auto shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={saveEdit}
              disabled={saving}
              className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 px-3 flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span className="text-xs font-semibold">
                {saving ? "Saving..." : "Save"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditedText(post.text);
                setEditedCategory(post.category);
                setEditedSubCategory(post.sub_category || "");
                setEditedImages(post.image_urls || []);
                newPreviews.forEach((url) => URL.revokeObjectURL(url));
                setNewFiles([]);
                setNewPreviews([]);
              }}
              className="text-neutral-450 hover:text-neutral-600 hover:bg-neutral-50 h-8 px-3 flex items-center justify-center gap-1.5"
            >
              <X className="h-4 w-4" />
              <span className="text-xs font-semibold">Cancel</span>
            </Button>
          </div>
        )}
      </div>
      )}

      {isFeedVariant && showReplyForm && currentUserId && (
        <CommentForm
          postId={post.id}
          userId={currentUserId}
          isVerifiedUser={isVerifiedUser}
          onCommentAdded={() => {
            void handleCommentAdded();
          }}
          onCancel={() => {
            setShowReplyForm(false);
            setShowComments(false);
          }}
        />
      )}

      {/* Comments */}
      {showComments && loadingComments && (
        <div className={cn("mt-4 text-xs font-semibold text-neutral-400", isFeedVariant ? "sm:ml-[52px]" : "ml-[52px]")}>
          Loading comments...
        </div>
      )}
      {showComments && comments.length > 0 && (
        <div className="mt-4 space-y-4 border-t border-neutral-50 pt-4">
          {comments.map((comment) => (
            <div key={comment.id} id={`comment-${comment.id}`} className="group flex gap-2.5 rounded-lg p-2 transition-all duration-300">
              <Link
                href={`/users/${comment.user.id}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary"
                aria-label={`View ${comment.user.full_name}'s profile`}
              >
                {comment.user.avatar_url ? (
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  comment.user.full_name?.charAt(0).toUpperCase() || "V"
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Link
                    href={`/users/${comment.user.id}`}
                    className="flex items-center text-xs font-bold text-neutral-900 hover:text-indigo-600"
                  >
                    {comment.user.full_name}
                  </Link>
                  <span className="text-[10px] text-neutral-400">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                  {comment.user.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleVouch(comment.user.id, 'comment', comment.id)}
                      disabled={vouchedEntities[`comment_${comment.id}`]}
                      className={`flex items-center gap-0.5 text-[10px] font-bold ${vouchedEntities[`comment_${comment.id}`] ? 'cursor-default text-indigo-600' : 'text-indigo-500 hover:underline'}`}
                    >
                      {vouchedEntities[`comment_${comment.id}`] ? (
                        <><Check className="h-3 w-3" /> Vouched</>
                      ) : "Vouch"}
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={deletingCommentId === comment.id}
                        className="ml-auto rounded-md p-1 text-neutral-400 opacity-70 transition-colors hover:bg-neutral-100 hover:text-neutral-700 group-hover:opacity-100 disabled:opacity-40"
                        aria-label="Comment actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {comment.user.id === currentUserId ? (
                        <DropdownMenuItem
                          onClick={() => void handleDeleteComment(comment.id)}
                          className="text-xs font-bold text-red-650 focus:bg-red-50 focus:text-red-650"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete Reply
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onReport("comment", comment.id, comment.text)}
                          className="text-xs font-bold text-red-650 focus:bg-red-50 focus:text-red-650"
                        >
                          <Flag className="mr-2 h-3.5 w-3.5" />
                          Report Comment
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm leading-snug text-neutral-700">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-neutral-900">
              Delete this post?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-500 leading-relaxed mt-1">
              This action cannot be undone. This post will be permanently removed from the community feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs font-bold h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold h-9 shadow-sm"
            >
              {isDeleting ? "Deleting..." : "Delete Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
