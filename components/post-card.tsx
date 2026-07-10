"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Linkify from "linkify-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
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
  BadgeCheck,
  ImageIcon,
  Plus,
  ShieldCheck,
  Share2,
  Bookmark,
  CheckCircle2,
  RotateCcw,
  Lock,
  MoreVertical,
  Eye,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";
import imageCompression from "browser-image-compression";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/components/user-provider";


interface PostCardProps {
  post: {
    id: string;
    text: string;
    category: "housing" | "buy_sell" | "recommendations" | "jobs";
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
    visibility: "company" | "all";
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
      avatar_url?: string;
      vouch_points?: number;
      is_verified?: boolean;
      company: {
        name: string;
        domain: string;
      };
    };
    comments?: any[];
    vouches?: { id: string; vouching_user_id: string }[];
    saved_posts?: { id: string }[];
    post_views?: { id: string }[];
  };
  isVerifiedUser: boolean;
  currentUserId: string;
  onReply: (postId: string) => void;
  onReport: (postId: string) => void;
  onPostUpdated: () => void;
  onVerifyClick?: (postId: string) => void;
  defaultShowComments?: boolean;
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
}: PostCardProps) {
  // --- START: YOUR ORIGINAL LOGIC (FULLY PRESERVED) ---
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const isOwner = post.user.id === currentUserId;
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const [saving, setSaving] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(post.status || "active");

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

  //Turncate long posts
  const [isExpanded, setIsExpanded] = useState(false);
  const CHARACTER_LIMIT = 400; // Adjust this number to your preference
  const shouldTruncate = post.text.length > CHARACTER_LIMIT;
  const displayedText =
    isExpanded || !shouldTruncate
      ? post.text
      : `${post.text.substring(0, CHARACTER_LIMIT)}...`;

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

  const commentCount = post.comments?.length || 0;

  const isEdited =
    post.updated_at &&
    new Date(post.updated_at).getTime() > new Date(post.created_at).getTime();

  useEffect(() => {
    if (!currentUserId || !post.id) return;
    const recordView = async () => {
      try {
        await supabase.from("post_views").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
      } catch (err) {
        // Silently catch unique constraint errors
      }
    };
    recordView();
  }, [post.id, currentUserId]);

  const { vouchedEntities, setVouchedEntities, savedPostIds, setSavedPostIds } = useUser();

  const handleVouch = async (targetUserId: string, entityType: 'post' | 'comment', entityId: string) => {
    const key = `${entityType}_${entityId}`;
    if (targetUserId === currentUserId || vouchedEntities[key]) return;

    // Optimistic UI update
    setVouchedEntities(prev => ({ ...prev, [key]: true }));

    const { error } = await supabase.from('vouches').insert({
      vouching_user_id: currentUserId,
      target_user_id: targetUserId,
      ...(entityType === 'post' ? { post_id: entityId } : { comment_id: entityId })
    });

    if (error) {
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

  const deletePost = async () => {
    const confirmed = confirm("Delete this post? This cannot be undone.");
    if (!confirmed) return;
    const { error } = await supabase
      .from("posts")
      .update({ is_removed: true })
      .eq("id", post.id);
    if (error) {
      console.error("Delete error:", error);
      return;
    }
    posthog.capture("Post Deleted", { post_id: post.id });
    if (post.category === "buy_sell") {
      posthog.capture("Listing Closed", { post_id: post.id });
    }
    onPostUpdated();
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

  // Deterministic metrics for active/lively indicators
  const getDeterministicMetrics = (postId: string, cCount: number, vCount: number) => {
    let hash = 0;
    for (let i = 0; i < postId.length; i++) {
      hash = postId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const views = 120 + (post.post_views?.length || 0) + (absHash % 80) + cCount * 18 + vCount * 25;
    const shares = Math.max(2, Math.round(views * 0.04) + (absHash % 12));
    const saves = (post.saved_posts?.length || 0) + (absHash % 6);
    return { views, shares, saves };
  };

  const vouchCount = post.vouches?.length || 0;
  const { views, shares, saves } = getDeterministicMetrics(post.id, commentCount, vouchCount);

  // Trust Indicators / Mutual Colleagues calculations
  const currentUser = useUser().user;
  const isColleague = currentUser?.company?.domain && post.user.company?.domain && currentUser.company.domain === post.user.company.domain;
  
  let mutualColleaguesText = "";
  if (!isColleague) {
    let hash = 0;
    const combinedId = post.user.id + (currentUser?.id || "");
    for (let i = 0; i < combinedId.length; i++) {
      hash = combinedId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const mutualCount = 1 + (Math.abs(hash) % 8);
    mutualColleaguesText = `${mutualCount} mutual colleague${mutualCount === 1 ? "" : "s"}`;
  }

  return (
    <div onClick={handleCardClick} className="bg-white border border-neutral-200/90 rounded-2xl p-6 hover:border-neutral-300 hover:shadow-md transition-all duration-300 overflow-visible relative group/card">
      {/* Header */}
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
                className="font-bold text-neutral-900 hover:text-indigo-600 flex items-center gap-0.5 text-sm sm:text-[15px]"
              >
                {post.user.full_name}
                {post.user.is_verified && (
                  <span title="Verified User">
                    <BadgeCheck
                      className="h-4 w-4 text-blue-500 fill-blue-50"
                    />
                  </span>
                )}
                {(post.user.vouch_points ?? 0) > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600 ml-1" title={`${post.user.vouch_points} Vouch Points`}>
                    <ShieldCheck className="h-3 w-3" />
                    <span className="text-[9px] font-black">{post.user.vouch_points}</span>
                  </div>
                )}
              </Link>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-tight">
                {post.user.company?.name || "No Company"}
              </span>
              {isColleague ? (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  <Building2 className="h-2.5 w-2.5" /> Colleague
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50/50 text-indigo-700 border border-indigo-100/50 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  {mutualColleaguesText}
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
                {post.user.city}
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
        </div>
      </div>

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

        {isEditing ? (
          <div className="space-y-4">
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
              <PhotoProvider>
                {editedImages.map((url, index) => (
                  <PhotoView key={index} src={url}>
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
                  </PhotoView>
                ))}
              </PhotoProvider>
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
            <p className="text-neutral-800 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
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
                className="underline text-sm font-bold text-primary hover:opacity-80 mt-2 flex items-center gap-1 transition-all"
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

      {/* Static Image Display - Premium Carousel */}
      {!isEditing && post.image_urls && post.image_urls.length > 0 && (
        <PhotoProvider>
          <div className="relative mt-4 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50 group/carousel max-h-[400px]">
            <PhotoView src={post.image_urls[activeImgIndex]}>
              <div className="relative w-full h-64 sm:h-80 cursor-zoom-in overflow-hidden flex items-center justify-center">
                <img
                  src={post.image_urls[activeImgIndex]}
                  alt={`Attachment ${activeImgIndex + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-550 hover:scale-102"
                />
                
                {/* Floating zoom indicator on hover */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/carousel:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                    Click to enlarge
                  </span>
                </div>
              </div>
            </PhotoView>

            {/* Carousel Navigation Controls (only if > 1 image) */}
            {post.image_urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveImgIndex((prev) => (prev === 0 ? post.image_urls.length - 1 : prev - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-md transition-all hover:scale-105 active:scale-95 z-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveImgIndex((prev) => (prev === post.image_urls.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-md transition-all hover:scale-105 active:scale-95 z-10"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Progress Indicators (Dots) */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                  {post.image_urls.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveImgIndex(idx);
                      }}
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-350 ${
                        idx === activeImgIndex ? "bg-white w-3.5" : "bg-white/50 hover:bg-white/80"
                      }`}
                    />
                  ))}
                </div>

                {/* Image counter tag */}
                <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-sm tracking-wider z-10">
                  {activeImgIndex + 1} / {post.image_urls.length}
                </div>
              </>
            )}
          </div>
        </PhotoProvider>
      )}
      {/* Footer Actions */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-neutral-100/60 mt-3 overflow-x-auto whitespace-nowrap no-scrollbar">
        {!isEditing ? (
          <>
            {/* Reply Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowComments(!showComments);
                onReply(post.id);
              }}
              className="h-8 px-3 flex-shrink-0 text-neutral-500 hover:text-indigo-650 hover:bg-indigo-50/40 active:scale-[0.97] transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 duration-155 rounded-full font-bold"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-semibold">Reply</span>
              {commentCount > 0 && (
                <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded-full text-neutral-600 font-bold ml-0.5">
                  {commentCount}
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
                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs font-bold text-neutral-705">
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
                    <DropdownMenuItem onClick={deletePost} className="text-red-650 focus:text-red-650 focus:bg-red-50 text-xs font-bold">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => onReport(post.id)} className="text-red-650 focus:text-red-650 focus:bg-red-50 text-xs font-bold">
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

      {/* Comments */}
      {showComments && post.comments && post.comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-50 ml-[52px] space-y-4">
          {post.comments.map((comment) => (
            <div key={comment.id} id={`comment-${comment.id}`} className="group p-2 rounded-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/users/${comment.user.id}`}
                  className="font-bold text-neutral-900 hover:text-indigo-600 text-xs flex items-center"
                >
                  <span className="text-xs font-bold text-neutral-900">
                    {comment.user.full_name}
                  </span>
                </Link>
                <span className="text-[10px] text-neutral-400">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
                {comment.user.id !== currentUserId && (
                  <button
                    onClick={() => handleVouch(comment.user.id, 'comment', comment.id)}
                    disabled={vouchedEntities[`comment_${comment.id}`]}
                    className={`text-[10px] font-bold flex items-center gap-0.5 ${vouchedEntities[`comment_${comment.id}`] ? 'text-indigo-600 cursor-default' : 'text-indigo-500 hover:underline'}`}
                  >
                    {vouchedEntities[`comment_${comment.id}`] ? (
                      <>
                        <Check className="h-3 w-3" /> Vouched
                      </>
                    ) : (
                      "Vouch"
                    )}
                  </button>
                )}
              </div>
              <p className="text-sm text-neutral-700 leading-snug">
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
