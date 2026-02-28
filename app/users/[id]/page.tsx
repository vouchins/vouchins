"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostCard } from "@/components/post-card";
import {
  Building2,
  MapPin,
  ExternalLink,
  MessageCircle,
  Edit2,
  Check,
  X,
  Mail,
  Linkedin,
} from "lucide-react";
import { Navigation } from "@/components/navigation";

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Unified Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [formDraft, setFormDraft] = useState({
    bio: "",
    linkedin_url: "",
    personal_email: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setMe(user);

      const { data: profileData } = await supabase
        .from("users")
        .select(
          `
          id,
          first_name,
          city,
          created_at,
          linkedin_url,
          bio,
          personal_email,
          company:companies(name)
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!profileData) {
        router.push("/feed");
        return;
      }

      setProfile(profileData);
      setFormDraft({
        bio: profileData.bio || "",
        linkedin_url: profileData.linkedin_url || "",
        personal_email: profileData.personal_email || "",
      });

      const { data: postsData } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:users!posts_user_id_fkey(
            id,
            first_name,
            city,
            company:companies(name)
          ),
          comments(
            id,
            text,
            created_at,
            user:users!comments_user_id_fkey(first_name)
          )
        `,
        )
        .eq("user_id", id)
        .eq("is_removed", false)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);
      setLoading(false);
    };

    load();
  }, [id, router]);

  const handleSaveProfile = async () => {
    // Simple validation for LinkedIn URL
    if (
      formDraft.linkedin_url &&
      !formDraft.linkedin_url.includes("linkedin.com/")
    ) {
      alert(
        "Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)",
      );
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("users")
      .update({
        bio: formDraft.bio.trim(),
        linkedin_url: formDraft.linkedin_url.trim(),
        personal_email: formDraft.personal_email.trim(),
      })
      .eq("id", me.id);

    if (!error) {
      setProfile({ ...profile, ...formDraft });
      setIsEditing(false);
    } else {
      console.error("Update error:", error);
      alert("Failed to save profile. Please try again.");
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-medium text-neutral-600">
        Loading profile...
      </div>
    );
  }

  if (!profile) return null;
  const isOwner = me?.id === profile.id;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* ---------------- Profile Card ---------------- */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-20 w-20 rounded-2xl bg-primary text-2xl font-bold text-white flex items-center justify-center shadow-inner">
              {profile.first_name.charAt(0)}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                {profile.first_name}
              </h1>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500 tracking-wide">
                <Building2 className="h-4 w-4 text-accent" />
                {profile.company?.name || "My Company"}
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-400">
                <MapPin className="h-4 w-4" />
                {profile.city}
              </div>
            </div>
          </div>

          <hr className="border-neutral-100 mb-6" />

          {/* ---------------- Bio & Links ---------------- */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                About Professional
              </h3>
              {isOwner && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                    Bio
                  </label>
                  <Textarea
                    value={formDraft.bio}
                    onChange={(e) =>
                      setFormDraft({
                        ...formDraft,
                        bio: e.target.value.slice(0, 300),
                      })
                    }
                    placeholder="Briefly describe your professional background..."
                    className="resize-none min-h-[100px] border-neutral-200 focus:ring-primary"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1 text-right">
                    {formDraft.bio.length}/300
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                      LinkedIn URL
                    </label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="url"
                        value={formDraft.linkedin_url}
                        onChange={(e) =>
                          setFormDraft({
                            ...formDraft,
                            linkedin_url: e.target.value,
                          })
                        }
                        placeholder="https://linkedin.com/in/..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                      Personal Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="email"
                        value={formDraft.personal_email}
                        onChange={(e) =>
                          setFormDraft({
                            ...formDraft,
                            personal_email: e.target.value,
                          })
                        }
                        placeholder="personal@email.com"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFormDraft({
                        bio: profile.bio || "",
                        linkedin_url: profile.linkedin_url || "",
                        personal_email: profile.personal_email || "",
                      });
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-primary px-6"
                  >
                    {isSaving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {profile.bio || (
                    <span className="text-neutral-400 italic font-medium">
                      No professional bio added yet.
                    </span>
                  )}
                </p>

                <div className="flex flex-wrap gap-4">
                  {profile.linkedin_url && (
                    <a
                      href={
                        profile.linkedin_url.startsWith("http")
                          ? profile.linkedin_url
                          : `https://${profile.linkedin_url}`
                      }
                      target="_external"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn Profile
                    </a>
                  )}
                  {isOwner && profile.personal_email && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                      <Mail className="h-4 w-4 text-neutral-300" />
                      {profile.personal_email}
                    </div>
                  )}
                </div>

                {!isOwner && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 shadow-md py-6 rounded-xl text-md font-bold"
                    onClick={() => router.push(`/messages/${profile.id}`)}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Message {profile.first_name}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] font-bold text-neutral-300 mt-8 uppercase tracking-widest flex items-center gap-2">
            <span className="h-px w-8 bg-neutral-100" />
            Vouchins Member Since{" "}
            {new Date(profile.created_at).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        {/* ---------------- User Posts ---------------- */}
        <div className="pt-4">
          <h2 className="text-lg font-black text-primary mb-6 tracking-tight flex items-center gap-2">
            Recent Activity
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </h2>

          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-100 rounded-xl p-12 text-center text-sm font-medium text-neutral-400 shadow-sm">
              No public posts contributed yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={me.id}
                  onReply={() => {}}
                  onReport={() => {}}
                  onPostUpdated={() => {}}
                  isVerifiedUser={me.is_verified}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
