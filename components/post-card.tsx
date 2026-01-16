'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Flag,
  Building2,
  MapPin,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

interface PostCardProps {
  post: {
    id: string;
    text: string;
    category: 'housing' | 'buy_sell' | 'recommendations';
    visibility: 'company' | 'all';
    image_url: string | null;
    is_flagged: boolean;
    flag_reasons: string[];
    created_at: string;
    user: {
      first_name: string;
      city: string;
      company: {
        name: string;
      };
    };
    comments?: any[];
  };
  currentUserId: string;
  onReply: (postId: string) => void;
  onReport: (postId: string) => void;
}

export function PostCard({
  post,
  currentUserId,
  onReply,
  onReport,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);

  const categoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;

  const commentCount = post.comments?.length || 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 hover:border-neutral-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-neutral-900">
              {post.user?.first_name}
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-sm text-neutral-500 flex items-center">
              <Building2 className="h-3 w-3 mr-1" />
              {post.user?.company?.name}
            </span>
            <span className="text-neutral-400">·</span>
            <span className="text-sm text-neutral-500 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {post.user?.city}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {categoryLabel}
          </Badge>
          {post.visibility === 'company' && (
            <Badge variant="secondary" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Company Only
            </Badge>
          )}
        </div>
      </div>

      {post.is_flagged && post.flag_reasons.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-900">
              Auto-flagged for review
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {post.flag_reasons.join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <p className="text-neutral-800 whitespace-pre-wrap leading-relaxed">
          {post.text}
        </p>
      </div>

      {post.image_url && (
        <div className="mb-4">
          <img
            src={post.image_url}
            alt="Post image"
            className="rounded-lg max-w-full h-auto border border-neutral-200"
          />
        </div>
      )}

      <div className="flex items-center space-x-1 pt-3 border-t border-neutral-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setShowComments(!showComments);
            onReply(post.id);
          }}
          className="text-neutral-600 hover:text-neutral-900"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {commentCount > 0 ? `${commentCount} replies` : 'Reply'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReport(post.id)}
          className="text-neutral-600 hover:text-neutral-900"
        >
          <Flag className="h-4 w-4 mr-2" />
          Report
        </Button>
      </div>

      {showComments && post.comments && post.comments.length > 0 && (
        <div className="mt-4 pl-4 space-y-3 border-l-2 border-neutral-100">
          {post.comments.map((comment) => (
            <div key={comment.id} className="text-sm">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-neutral-900">
                  {comment.user.first_name}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-neutral-700">{comment.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
