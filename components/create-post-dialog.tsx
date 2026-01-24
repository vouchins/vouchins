"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertCircle, ImageIcon, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CATEGORIES, VISIBILITY_OPTIONS } from "@/lib/constants";
import imageCompression from "browser-image-compression";

const CATEGORY_HELP_TEXT: Record<string, string> = {
  housing:
    "Mention location, budget, move-in date and whether it is for rent or flatmates.",
  buy_sell: "Mention item condition, expected price and pickup location.",
  recommendations:
    "Clearly describe what you are looking for so others can help.",
};

interface CreatePostDialogProps {
  userId: string;
  onPostCreated: () => void;
  children?: React.ReactNode;
}

export function CreatePostDialog({
  userId,
  onPostCreated,
  children,
}: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("");
  const [housingType, setHousingType] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 3) {
      alert(
        "Vouchins allows a maximum of 3 images per post to keep the feed clean."
      );
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Clean up old previews before generating new ones to manage memory
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls(newFiles.map((file) => URL.createObjectURL(file)));
  };

  const uploadImage = async (files: File[]) => {
    const options = {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    const uploadPromises = files.map(async (file) => {
      try {
        const compressedFile = await imageCompression(file, options);
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()
          .toString(36)
          .substring(2)}-${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("post-images")
          .upload(fileName, compressedFile);

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("post-images").getPublicUrl(fileName);

        return publicUrl;
      } catch (error) {
        console.error("Compression/Upload error:", error);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((url) => url !== null);
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
      const { data: canPost, error: fnError } = await supabase.rpc(
        "can_create_post",
        { uid: userId }
      );

      if (fnError) throw new Error("Unable to verify posting limits.");

      if (!canPost) {
        setError("You’re posting too frequently. Please wait a few minutes.");
        setLoading(false);
        return;
      }

      let uploadedUrls = null;
      if (selectedFiles.length > 0) {
        uploadedUrls = await uploadImage(selectedFiles);
        if (!uploadedUrls || uploadedUrls.length === 0) {
          throw new Error("Image upload failed. Please try again.");
        }
      }

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: userId,
        text: text.trim(),
        category,
        housing_type: category === "housing" ? housingType : null,
        visibility,
        image_urls: uploadedUrls,
      });

      if (insertError) {
        if (insertError.message.includes("POST_REJECTED_ABUSE")) {
          setError("Post blocked: Please remove offensive language.");
        } else if (insertError.code === "42501") {
          setError("You’ve reached the posting limit. Please slow down.");
        } else {
          throw insertError;
        }
        return;
      }

      // Cleanup and Reset
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setText("");
      setCategory("");
      setHousingType("");
      setVisibility("all");
      setSelectedFiles([]);
      setPreviewUrls([]);
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
        {children ? (
          children
        ) : (
          <Button className="bg-primary text-primary-foreground hover:opacity-90 h-9 px-3 sm:px-4 shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline text-sm font-semibold">
              New Post
            </span>
          </Button>
        )}
      </DialogTrigger>

      {/* FIXED: Added max-height, flex-col, and overflow-hidden to the main container */}
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>

        {/* FIXED: This middle section now scrolls while Header and Footer stay fixed */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
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
            {previewUrls.length > 0 && (
              <div
                className={`grid gap-2 mt-2 ${
                  previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {previewUrls.map((url, index) => (
                  <div
                    key={url}
                    className="relative rounded-lg overflow-hidden border border-border aspect-video"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = [...selectedFiles];
                        const newUrls = [...previewUrls];
                        newFiles.splice(index, 1);
                        newUrls.splice(index, 1);
                        setSelectedFiles(newFiles);
                        setPreviewUrls(newUrls);
                        URL.revokeObjectURL(url);
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Input */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer hover:opacity-80 py-2">
                <ImageIcon className="h-5 w-5" />
                <span>Add a photo (Room, Item, etc.)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>

        {/* FIXED: Footer stays at the bottom */}
        <DialogFooter className="p-6 pt-2 border-t border-neutral-100 shrink-0">
          <div className="flex justify-end space-x-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
