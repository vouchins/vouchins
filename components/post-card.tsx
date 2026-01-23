'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  MessageCircle,
  Flag,
  Building2,
  MapPin,
  Eye,
  AlertTriangle,
  Home,
  Edit2,
  Trash2,
  Check,
  X,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/constants';

interface PostCardProps {
  post: {
    id: string;
    text: string;
    category: 'housing' | 'buy_sell' | 'recommendations';
    housing_type?: 'flatmates' | 'rentals' | 'sale' | 'pg' | null;
    visibility: 'company' | 'all';
    image_url: string | null;
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
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  flatmates: 'Flatmates',
  rentals: 'Rental',
  sale: 'For Sale',
  pg: 'PG',
};

export function PostCard({
  post,
  currentUserId,
  onReply,
  onReport,
}: PostCardProps) {
  // --- START: YOUR ORIGINAL LOGIC (FULLY PRESERVED) ---
  const isOwner = post.user.id === currentUserId;
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const [saving, setSaving] = useState(false);

  const categoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  const commentCount = post.comments?.length || 0;

  const isEdited =
    post.updated_at &&
    new Date(post.updated_at).getTime() >
      new Date(post.created_at).getTime();

  const saveEdit = async () => {
    if (!editedText.trim()) return;
    setSaving(true);
    await supabase
      .from("posts")
      .update({
        text: editedText.trim(),
        updated_at: new Date().toISOString(), // Add this line
      })
      .eq("id", post.id);
    setSaving(false);
    setIsEditing(false);
  };

  const deletePost = async () => {
    const confirmed = confirm('Delete this post? This cannot be undone.');
    if (!confirmed) return;
    await supabase.from('posts').update({ is_removed: true }).eq('id', post.id);
  };
  // --- END: YOUR ORIGINAL LOGIC ---

  const companyLogoUrl = `https://www.google.com/s2/favicons?domain=${post.user.company.domain}&sz=64`;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 transition-all shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          {/* Company Logo Avatar */}
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

        {/* Action Buttons (Edit/Delete Logic preserved) */}
        <div className="flex items-center gap-2 shrink-0">
          {post.visibility === "company" && (
            <Badge
              variant="secondary"
              className="bg-indigo-50 text-indigo-700 border-none text-[10px] px-2 py-0"
            >
              Company Only
            </Badge>
          )}

          {isOwner && (
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="p-1 rounded hover:bg-neutral-100"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(post.text);
                    }}
                    className="p-1 rounded hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4 text-neutral-500" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded hover:bg-neutral-100"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                  <button
                    onClick={deletePost}
                    className="p-1 rounded hover:bg-neutral-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flag Warning Logic (Preserved) */}
      {isOwner && post.is_flagged && post.flag_reasons.length > 0 && (
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
      )}

      {/* Content Logic (Preserved editing mode) */}
      <div className="mb-4 pl-[52px]">
        {/* Replace the Badge section inside PostCard.tsx */}
        <div className="flex gap-2 mb-2">
          {/* Category Badge */}
          <Badge
            variant="secondary"
            className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-5"
          >
            {categoryLabel}
          </Badge>

          {/* Specific Housing Type Badge */}
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
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        ) : (
          <p className="text-neutral-800 text-[15px] leading-relaxed">
            {post.text}
          </p>
        )}
      </div>
      {/* Between Content and Actions */}
      {!isEditing && post.image_url && (
        <div className="mt-3 rounded-lg overflow-hidden border border-neutral-100 ml-[52px]">
          <img
            src={post.image_url}
            alt="Post attachment"
            className="w-full max-h-96 object-cover"
          />
        </div>
      )}

      {/* Footer Actions (Preserved reply and report triggers) */}
      <div className="flex items-center space-x-1 pt-2 border-t border-neutral-50 ml-[52px]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowComments(!showComments);
            onReply(post.id);
          }}
          className="text-neutral-500 hover:text-indigo-600 h-8 px-2"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-semibold">
            {commentCount > 0 ? `${commentCount} replies` : "Reply"}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReport(post.id)}
          className="text-neutral-400 hover:text-red-600 h-8 px-2"
        >
          <Flag className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs font-medium">Report</span>
        </Button>
      </div>

      {/* --- RESTORED: COMMENTS SECTION --- */}
      {showComments && post.comments && post.comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-50 ml-[52px] space-y-4">
          {post.comments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-neutral-900">
                  {comment.user.first_name}
                </span>
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