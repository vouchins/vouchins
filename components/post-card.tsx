"use client";

import { useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/constants";
import imageCompression from "browser-image-compression";

interface PostCardProps {
  post: {
    id: string;
    text: string;
    category: "housing" | "buy_sell" | "recommendations";
    housing_type?: "flatmates" | "rentals" | "sale" | "pg" | null;
    visibility: "company" | "all";
    image_urls: string[];
    is_flagged: boolean;
    flag_reasons: string[];
    created_at: string;
    updated_at?: string;
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
  };
  currentUserId: string;
  onReply: (postId: string) => void;
  onReport: (postId: string) => void;
  onPostUpdated: () => void;
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  flatmates: "Flatmates",
  rentals: "Rental",
  sale: "For Sale",
  pg: "PG",
};

export function PostCard({
  post,
  currentUserId,
  onReply,
  onReport,
  onPostUpdated,
}: PostCardProps) {
  // --- START: YOUR ORIGINAL LOGIC (FULLY PRESERVED) ---
  const isOwner = post.user.id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const [saving, setSaving] = useState(false);

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
    post.image_urls || []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const categoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  const commentCount = post.comments?.length || 0;

  const isEdited =
    post.updated_at &&
    new Date(post.updated_at).getTime() > new Date(post.created_at).getTime();

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

  const companyLogoUrl = `https://www.google.com/s2/favicons?domain=${post.user.company.domain}&sz=64`;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 transition-all shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-lg border border-neutral-100 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
            {post.user.company.domain ? (
              <img
                src={companyLogoUrl}
                alt={post.user.company.name}
                className="h-7 w-7 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Building2 className="h-5 w-5 text-neutral-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/users/${post.user.id}`}
                className="font-bold text-neutral-900 hover:text-indigo-600 flex items-center"
              >
                {post.user.first_name}
                <BadgeCheck
                  className="h-3.5 w-3.5 ml-1 text-blue-500"
                  fill="currentColor"
                  fillOpacity={0.15}
                />
              </Link>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-tight">
                {post.user.company.name}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-neutral-400 font-medium">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
                {isEdited && <span className="italic ml-1">(Edited)</span>}
              </p>
              <span className="text-neutral-300 text-[10px]">·</span>
              <span className="text-[11px] text-neutral-400 flex items-center font-medium">
                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                {post.user.city}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
      <div className="mb-4 pl-[52px]">
        <div className="flex gap-2 mb-2">
          <Badge
            variant="secondary"
            className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-5"
          >
            {categoryLabel}
          </Badge>
          {post.category === "housing" && post.housing_type && (
            <Badge
              variant="outline"
              className="text-muted-foreground border-border text-[10px] py-0 px-2 h-5 font-medium"
            >
              <Home className="h-2.5 w-2.5 mr-1" />
              {HOUSING_TYPE_LABELS[post.housing_type]}
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
              className={`grid gap-2 ${
                [...editedImages, ...newPreviews].length > 1
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
                            editedImages.filter((_, i) => i !== index)
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
            className={`mt-3 gap-2 ml-[52px] grid ${
              post.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {post.image_urls.map((url, index) => (
              <PhotoView key={index} src={url}>
                <div
                  key={index}
                  className={`rounded-lg overflow-hidden border border-neutral-100 ${
                    post.image_urls.length === 3 && index === 0
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
      <div className="flex items-center gap-1 pt-2 border-t border-neutral-50 ml-[52px] overflow-x-auto whitespace-nowrap no-scrollbar">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowComments(!showComments);
            onReply(post.id);
          }}
          className="h-8 px-3 flex-shrink-0"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-semibold">
            {commentCount > 0 ? `${commentCount} replies` : "Reply"}
          </span>
        </Button>

        {!isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReport(post.id)}
            className="text-neutral-400 hover:text-red-600 h-8 px-2"
          >
            <Flag className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs font-medium">Report</span>
          </Button>
        )}
        {isOwner && (
          <>
            {!isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-neutral-400 hover:text-indigo-600 h-8 px-2"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs font-medium">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deletePost}
                  className="text-red-500 hover:text-red-600 h-8 px-2"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs font-medium">Delete</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveEdit}
                  disabled={saving}
                  className="text-green-600 hover:text-green-700 h-8 px-2"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs font-medium">
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
                  className="text-neutral-400 hover:text-neutral-600 h-8 px-2"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs font-medium">Cancel</span>
                </Button>
              </>
            )}
          </>
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
                    {comment.user.first_name}
                  </span>
                </Link>
                <span className="text-[10px] text-neutral-400">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
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
