"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Linkify from "linkify-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
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
      company: {
        name: string;
        domain: string;
      };
    };
    comments?: any[];
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

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 transition-all shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3 sm:gap-2">
        <div className="flex gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg border border-neutral-100 bg-white flex items-center justify-center overflow-hidden shrink-0 text-primary font-bold shadow-sm">
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

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/users/${post.user.id}`}
                className="font-bold text-neutral-900 hover:text-indigo-600 flex items-center"
              >
                {post.user.full_name}
                <BadgeCheck
                  className="h-3.5 w-3.5 ml-1 text-blue-500"
                  fill="currentColor"
                  fillOpacity={0.15}
                />
                {(post.user.vouch_points ?? 0) > 0 && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600 ml-1.5" title={`${post.user.vouch_points} Vouch Points`}>
                    <ShieldCheck className="h-3 w-3" />
                    <span className="text-[9px] font-black">{post.user.vouch_points}</span>
                  </div>
                )}
              </Link>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-tight">
                {post.user.company?.name || "No Company"}
              </span>
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

      {/* Static Image Display */}
      {!isEditing && post.image_urls && post.image_urls.length > 0 && (
        <PhotoProvider>
          <div
            className={`mt-3 gap-2 grid ${post.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
          >
            {post.image_urls.map((url, index) => (
              <PhotoView key={index} src={url}>
                <div
                  key={index}
                  className={`rounded-lg overflow-hidden border border-neutral-100 ${post.image_urls.length === 3 && index === 0
                    ? "col-span-2"
                    : ""
                    }`}
                >
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-48 sm:h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </PhotoView>
            ))}
          </div>
        </PhotoProvider>
      )}
      {/* Footer Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-neutral-50 overflow-x-auto whitespace-nowrap no-scrollbar">
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
              className="h-8 px-2 sm:px-3 flex-shrink-0 text-neutral-500 hover:text-indigo-600 hover:bg-neutral-50 flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs font-semibold">
                {commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'reply' : 'replies'}` : "Reply"}
              </span>
            </Button>

            {/* Vouch Button */}
            {!isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVouch(post.user.id, 'post', post.id)}
                disabled={vouchedEntities[`post_${post.id}`]}
                className={`h-8 px-2 sm:px-3 flex-shrink-0 flex items-center justify-center gap-1.5 ${
                  vouchedEntities[`post_${post.id}`]
                    ? 'text-indigo-600 bg-indigo-50/50 cursor-default'
                    : 'text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {vouchedEntities[`post_${post.id}`] ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-bold">Vouched</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold">Vouch</span>
                  </>
                )}
              </Button>
            )}

            {/* Save/Bookmark Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleSave}
              className={`h-8 px-2 sm:px-3 flex-shrink-0 flex items-center justify-center gap-1.5 ${
                isSaved ? 'text-blue-600 hover:text-blue-700 bg-blue-50' : 'text-neutral-500 hover:text-blue-600 hover:bg-neutral-50'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="text-xs font-semibold">
                {isSaved ? "Saved" : "Save"}
              </span>
            </Button>

            {/* Share Dropdown Button */}
            <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-500 hover:text-indigo-600 hover:bg-neutral-50 h-8 px-2 sm:px-3 flex-shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">Share</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyLink}>
                  Copy Link
                </DropdownMenuItem>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <DropdownMenuItem onClick={handleSystemShare}>
                    Share via...
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Options Dropdown Button (Three dots inline) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-neutral-450 hover:text-neutral-700 hover:bg-neutral-50 h-8 w-8 p-0 rounded-full flex-shrink-0 flex items-center justify-center"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {isOwner ? (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-3.5 w-3.5 mr-2 text-neutral-500" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={togglePostStatus}>
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
                    <DropdownMenuItem onClick={deletePost} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={() => onReport(post.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
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
            <div key={comment.id} className="group">
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
