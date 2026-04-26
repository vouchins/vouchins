"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Upload,
  Loader2,
  X,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";

interface BlogTabProps {
  posts: any[];
  onCreate: (post: any) => Promise<void>;
  onUpdate: (id: string, updates: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function BlogTab({ posts, onCreate, onUpdate, onDelete }: BlogTabProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image_url: "",
    status: "draft",
  });

  const handleOpenForm = (post: any = null) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content || "",
        cover_image_url: post.cover_image_url || "",
        status: post.status || "draft",
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        cover_image_url: "",
        status: "draft",
      });
    }
    setView("form");
  };

  const handleCloseForm = () => {
    setView("list");
    setEditingPost(null);
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = document.getElementById(
      "markdown-editor",
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const selection = text.substring(start, end) || "text";
    const after = text.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;
    setFormData((prev) => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length,
      );
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `blog-covers/${fileName}`;

      const { error } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("blog-images").getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, cover_image_url: publicUrl }));
    } catch (err: any) {
      alert("Error uploading image: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const url = formData.cover_image_url;
    if (!url) return;

    setIsRemovingImage(true);
    // Only attempt to delete from Supabase if it's a Supabase hosted URL for this bucket
    if (url.includes("supabase.co") && url.includes("/blog-images/")) {
      try {
        const pathSegments = url.split("/blog-images/");
        if (pathSegments.length > 1) {
          const filePath = pathSegments[1];
          await supabase.storage.from("blog-images").remove([filePath]);
        }
      } catch (err) {
        console.error("Error removing image from storage:", err);
      }
    }
    setFormData({ ...formData, cover_image_url: "" });
    setIsRemovingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editingPost) {
      await onUpdate(editingPost.id, formData);
    } else {
      await onCreate(formData);
    }

    setIsSubmitting(false);
    handleCloseForm();
  };

  if (view === "form") {
    return (
      <Card className="animate-in fade-in duration-300">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseForm}
            className="w-fit mb-4 -ml-2 text-neutral-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Posts
          </Button>
          <CardTitle className="text-2xl">
            {editingPost ? "Edit Blog Post" : "Create New Blog Post"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Post Title</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., The Future of Corporate Networking"
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[\s_]+/g, "-"),
                    })
                  }
                  placeholder="e.g., future-of-corporate-networking"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt (Short summary for the blog index)</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                placeholder="A brief 1-2 sentence summary..."
                className="h-20"
              />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown supported)</Label>
              <div className="border border-neutral-200 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex items-center gap-1 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("**", "**")}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("*", "*")}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-neutral-300 mx-1"></div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("# ", "")}
                    title="Heading 1"
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("## ", "")}
                    title="Heading 2"
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-neutral-300 mx-1"></div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("- ", "")}
                    title="Bullet List"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("1. ", "")}
                    title="Numbered List"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                  <div className="w-px h-4 bg-neutral-300 mx-1"></div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("", "")}
                    title="Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => insertMarkdown("`", "`")}
                    title="Code"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  id="markdown-editor"
                  required
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  className="min-h-[300px] font-mono text-sm border-0 focus-visible:ring-0 rounded-none resize-y"
                  placeholder="# Main Heading&#10;&#10;Write your full blog post here using Markdown...&#10;&#10;**Bold text** and *italics* are supported!"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Cover Image (Upload or URL)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={formData.cover_image_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cover_image_url: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <div className="relative flex-shrink-0">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploading ? "Uploading..." : "Upload Image"}
                    </Button>
                  </div>
                </div>
                {formData.cover_image_url && (
                  <div className="mt-3 h-32 w-full relative rounded-md overflow-hidden border border-neutral-200">
                    <img
                      src={formData.cover_image_url}
                      alt="Cover Preview"
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={isRemovingImage}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-red-600 hover:text-white text-neutral-700 p-1.5 rounded-full backdrop-blur-sm transition-colors shadow-sm"
                      title="Remove image"
                    >
                      {isRemovingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData({ ...formData, status: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Hidden)</SelectItem>
                    <SelectItem value="published">Published (Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingPost
                    ? "Save Changes"
                    : "Publish Post"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900">
          Manage Blog Posts
        </h3>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" /> Write New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="border-dashed border-2 bg-neutral-50/50">
          <CardContent className="py-20 text-center text-neutral-500 font-medium">
            No blog posts have been written yet. Start your first draft!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <Card
              key={post.id}
              className="bg-white hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg font-bold flex items-center gap-3 text-neutral-900">
                      {post.title}
                      <Badge
                        variant={
                          post.status === "published" ? "default" : "secondary"
                        }
                        className={
                          post.status === "published"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }
                      >
                        {post.status.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 mr-2">
                        /{post.slug}
                      </span>
                      Updated{" "}
                      {formatDistanceToNow(
                        new Date(post.updated_at || post.created_at),
                        { addSuffix: true },
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === "published" && (
                      <Link href={`/blog/${post.slug}`} target="_blank">
                        <Button
                          variant="outline"
                          size="sm"
                          title="View Live Post"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenForm(post)}
                      title="Edit Post"
                    >
                      <Edit className="h-4 w-4 text-indigo-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(post.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
