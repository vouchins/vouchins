"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import posthog from "posthog-js";

interface CommentFormProps {
  postId: string;
  userId: string;
  isVerifiedUser?: boolean;
  onCommentAdded: () => void;
  onCancel?: () => void;
}

export function CommentForm({
  postId,
  userId,
  isVerifiedUser,
  onCommentAdded,
  onCancel,
}: CommentFormProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!text.trim()) {
      setError("Please enter a comment");
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: userId,
        text: text.trim(),
      });

      if (insertError) throw insertError;

      posthog.capture("Reply Created", { post_id: postId });

      setText("");
      onCommentAdded();
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  if (isVerifiedUser === false) {
    return (
      <div className="mt-4 p-6 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
        <p className="text-sm font-medium text-neutral-600">
          Get verified to join the conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply..."
          className="min-h-[80px]"
          maxLength={1000}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">{text.length}/1000</p>
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Posting..." : "Reply"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
