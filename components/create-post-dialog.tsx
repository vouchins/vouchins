'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle, ImageIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIES, VISIBILITY_OPTIONS } from '@/lib/constants';

const CATEGORY_HELP_TEXT: Record<string, string> = {
  housing:
    'Mention location, budget, move-in date and whether it is for rent or flatmates.',
  buy_sell:
    'Mention item condition, expected price and pickup location.',
  recommendations:
    'Clearly describe what you are looking for so others can help.',
};

interface CreatePostDialogProps {
  userId: string;
  onPostCreated: () => void;
}

export function CreatePostDialog({
  userId,
  onPostCreated,
}: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('');
  const [housingType, setHousingType] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create local preview URL
    }
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //   setLoading(true);

  //   if (!text.trim()) {
  //     setError('Please enter some text');
  //     setLoading(false);
  //     return;
  //   }

  //   if (!category) {
  //     setError('Please select a category');
  //     setLoading(false);
  //     return;
  //   }

  //   if (category === 'housing' && !housingType) {
  //     setError('Please select the housing type');
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     const { error: insertError } = await supabase.from('posts').insert({
  //       user_id: userId,
  //       text: text.trim(),
  //       category,
  //       housing_type: category === 'housing' ? housingType : null,
  //       visibility,
  //     });

  //     if (insertError) throw insertError;

  //     setText('');
  //     setCategory('');
  //     setHousingType('');
  //     setVisibility('all');
  //     setOpen(false);
  //     onPostCreated();
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to create post');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const uploadImage = async (file: File) => {
    try {
      // Generate a unique filename using a timestamp to avoid overwrites
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from("post-images")
        .upload(filePath, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!text.trim()) {
      setError("Please enter some text");
      setLoading(false);
      return;
    }

    if (!category) {
      setError("Please select a category");
      setLoading(false);
      return;
    }

    if (category === "housing" && !housingType) {
      setError("Please select the housing type");
      setLoading(false);
      return;
    }

    try {
      // ✅ 1️⃣ Pre-check rate limit (user-friendly)
      const { data: canPost, error: fnError } = await supabase.rpc(
        "can_create_post",
        { uid: userId }
      );

      if (fnError) {
        throw new Error("Unable to verify posting limits. Please try again.");
      }

      if (!canPost) {
        setError(
          "You’re posting too frequently. Please wait a few minutes before posting again."
        );
        setLoading(false);
        return;
      }

      // ✅ 2️⃣ Image Upload Step (New Logic)
      let finalImageUrl = null;
      if (selectedFile) {
        // Use the helper function we defined earlier
        finalImageUrl = await uploadImage(selectedFile);
        if (!finalImageUrl) {
          throw new Error("Image upload failed. Please try again.");
        }
      }

      // ✅ 2️⃣ Attempt insert (DB still enforces)
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: userId,
        text: text.trim(),
        category,
        housing_type: category === "housing" ? housingType : null,
        visibility,
        image_url: finalImageUrl
      });

      if (insertError) {
        // Check if the error came from our Postgres RAISE EXCEPTION
        if (insertError.message.includes("POST_REJECTED_ABUSE")) {
          setError(
            "Post blocked: Please remove offensive language before posting."
          );
        } else if (insertError.code === "42501") {
          setError(
            "You’ve reached the posting limit. Please slow down and try again later."
          );
        } else {
          throw insertError;
        }
        return;
      }

      // ✅ Success
      setText("");
      setCategory("");
      setHousingType("");
      setVisibility("all");
      setSelectedFile(null); // Clear file state
      setPreviewUrl(null);   // Clear preview
      setOpen(false);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:opacity-90 h-9 px-3 sm:px-4 shrink-0">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline text-sm font-semibold">
            New Post
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Housing sub-type */}
          {category === "housing" && (
            <div>
              <Label>Housing type</Label>
              <Select value={housingType} onValueChange={setHousingType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select housing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flatmates">Flatmates</SelectItem>
                  <SelectItem value="rentals">Rentals</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="pg">PG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visibility */}
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-neutral-500 mt-1">
              {visibility === "company"
                ? "Visible only to verified professionals from your company."
                : "Visible to verified professionals across all companies."}
            </p>
          </div>

          {/* Post text */}
          <div>
            <Label>What do you need?</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Looking for a flat in Koramangala, 2BHK, budget 30k..."
              className="mt-1.5 min-h-[120px]"
              maxLength={2000}
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              {text.length}/2000 characters
            </p>

            {category && (
              <p className="text-xs text-neutral-500 mt-2">
                {CATEGORY_HELP_TEXT[category]}
              </p>
            )}
          </div>

          {/* Preview Area */}
          {previewUrl && (
            <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* File Input */}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80">
              <ImageIcon className="h-5 w-5" />
              <span>Add a photo (Room, Item, etc.)</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
