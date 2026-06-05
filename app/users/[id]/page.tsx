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
  MessageCircle,
  Edit2,
  Check,
  X,
  Mail,
  Linkedin,
  Lock,
  Camera,
  Loader2,
  Phone,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { Navigation } from "@/components/navigation";
import { ChangeCompanyModal } from "@/components/change-company-modal";

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
    phone_country_code: "+91",
    phone_number: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangeCompanyOpen, setIsChangeCompanyOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasVouchedProfile, setHasVouchedProfile] = useState(false);

  const parsePhone = (phone: string | null) => {
    if (!phone) return { code: "+91", num: "" };
    const clean = phone.replace(/[^\d+]/g, "");
    const match = clean.match(/^(\+\d{1,4})(\d+)$/);
    if (match) return { code: match[1], num: match[2] };
    if (clean.length > 10 && !clean.startsWith("+")) {
      return { code: "+" + clean.slice(0, clean.length - 10), num: clean.slice(-10) };
    }
    return { code: "+91", num: clean.replace("+", "") };
  };

  const COUNTRY_CODES = [
    { code: "+91", label: "IN (+91)" },
    { code: "+1", label: "US/CA (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+61", label: "AU (+61)" },
    { code: "+971", label: "AE (+971)" },
    { code: "+65", label: "SG (+65)" },
    { code: "+49", label: "DE (+49)" },
    { code: "+33", label: "FR (+33)" },
    { code: "+81", label: "JP (+81)" },
    { code: "+86", label: "CN (+86)" },
    { code: "+55", label: "BR (+55)" },
    { code: "+7", label: "RU (+7)" },
    { code: "+39", label: "IT (+39)" },
    { code: "+34", label: "ES (+34)" },
    { code: "+82", label: "KR (+82)" },
    { code: "+31", label: "NL (+31)" },
    { code: "+46", label: "SE (+46)" },
    { code: "+41", label: "CH (+41)" },
    { code: "+64", label: "NZ (+64)" },
    { code: "+27", label: "ZA (+27)" },
    { code: "+353", label: "IE (+353)" },
    { code: "+972", label: "IL (+972)" },
    { code: "+60", label: "MY (+60)" },
    { code: "+62", label: "ID (+62)" },
    { code: "+66", label: "TH (+66)" },
    { code: "+63", label: "PH (+63)" },
    { code: "+886", label: "TW (+886)" },
    { code: "+852", label: "HK (+852)" },
    { code: "+966", label: "SA (+966)" },
    { code: "+20", label: "EG (+20)" },
    { code: "+234", label: "NG (+234)" },
    { code: "+254", label: "KE (+254)" },
    { code: "+52", label: "MX (+52)" },
    { code: "+54", label: "AR (+54)" },
    { code: "+56", label: "CL (+56)" },
  ];

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: meData } = await supabase
        .from("users")
        .select("id, is_verified")
        .eq("id", user.id)
        .single();
        
      setMe({ ...user, ...meData });

      const { data: profileData } = await supabase
        .from("users")
        .select(
          `
          id,
          full_name,
          city,
          created_at,
          linkedin_url,
          bio,
          personal_email,
          avatar_url,
          phone_number,
          vouch_points,
          is_verified,
          company:companies(name, domain)
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (!profileData) {
        router.push("/feed");
        return;
      }

      setProfile(profileData);
      const parsedPhone = parsePhone(profileData.phone_number);
      setFormDraft({
        bio: profileData.bio || "",
        linkedin_url: profileData.linkedin_url || "",
        personal_email: profileData.personal_email || "",
        phone_country_code: parsedPhone.code,
        phone_number: parsedPhone.num,
      });

      const { data: vouchData } = await supabase
        .from('vouches')
        .select('id')
        .eq('target_user_id', profileData.id)
        .eq('vouching_user_id', user.id)
        .eq('is_profile_vouch', true)
        .maybeSingle();
      if (vouchData) setHasVouchedProfile(true);

      const { data: postsData } = await supabase
        .from("posts")
        .select(
          `
          *,
          user:users!posts_user_id_fkey(
            id,
            full_name,
            city,
            avatar_url,
            vouch_points,
            company:companies(name, domain)
          ),
          comments(
            id,
            text,
            created_at,
            user:users!comments_user_id_fkey(full_name)
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

    const fullPhone = formDraft.phone_number ? `${formDraft.phone_country_code}${formDraft.phone_number.trim()}` : "";
    if (
      fullPhone &&
      !/^\+?[0-9]{10,15}$/.test(fullPhone)
    ) {
      alert(
        "Please enter a valid phone number with 10-15 digits only (e.g., 9876543210)",
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
        phone_number: fullPhone,
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

  const handleProfileVouch = async () => {
    if (isOwner || hasVouchedProfile) return;
    const { error } = await supabase.from('vouches').insert({
      vouching_user_id: me.id,
      target_user_id: profile.id,
      is_profile_vouch: true,
    });
    if (error) {
      if (error.code === '23505') {
        setHasVouchedProfile(true);
      } else {
        console.error("Vouch error:", error);
      }
    } else {
      setHasVouchedProfile(true);
      setProfile({...profile, vouch_points: (profile.vouch_points || 0) + 1});
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert("File must be less than 5MB");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${me.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', me.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
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

  if (!isOwner && !me?.is_verified) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm max-w-md w-full">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2">Profile Locked</h2>
            <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
              You must be verified to view other professionals' profiles.
            </p>
            <Button
              onClick={() => router.push("/feed")}
              className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-[11px] w-full"
            >
              Return to Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* ---------------- Profile Card ---------------- */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group">
              <div className="h-20 w-20 rounded-2xl bg-white border border-neutral-100 text-2xl font-bold text-neutral-400 flex items-center justify-center shadow-sm overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : profile.company?.[0]?.domain || profile.company?.domain ? (
                  <img src={`https://www.google.com/s2/favicons?domain=${profile.company?.[0]?.domain || profile.company?.domain}&sz=128`} alt={profile.full_name} className="h-full w-full object-contain p-3" />
                ) : (
                  profile.full_name.charAt(0)
                )}
              </div>
              {isOwner && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-6 w-6" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-primary tracking-tight">
                  {profile.full_name}
                </h1>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-black text-indigo-700 uppercase tracking-wide">
                    {profile.vouch_points || 0} Vouch Points
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500 tracking-wide">
                <Building2 className="h-4 w-4 text-accent" />
                {profile.company?.name || "My Company"}
                {isOwner && !isEditing && (
                  <button
                    onClick={() => setIsChangeCompanyOpen(true)}
                    className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-full transition-colors uppercase tracking-wider"
                  >
                    Change
                  </button>
                )}
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

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1.5 block">
                      Phone Number <span className="lowercase font-medium text-neutral-400">(Private, visible only to you)</span>
                    </label>
                    <div className="flex border border-neutral-200 rounded-md focus-within:ring-1 focus-within:ring-primary overflow-hidden relative shadow-sm">
                      <div className="relative flex items-center bg-neutral-50 border-r border-neutral-200 hover:bg-neutral-100 transition-colors">
                        <select
                          value={formDraft.phone_country_code}
                          onChange={(e) =>
                            setFormDraft({
                              ...formDraft,
                              phone_country_code: e.target.value,
                            })
                          }
                          className="appearance-none bg-transparent pl-3 pr-8 py-2 text-sm font-bold text-neutral-700 outline-none cursor-pointer w-[90px] md:w-[105px] z-10"
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                      </div>
                      <input
                        type="number"
                        value={formDraft.phone_number}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 15) {
                            setFormDraft({
                              ...formDraft,
                              phone_number: val,
                            });
                          }
                        }}
                        placeholder="9876543210"
                        className="w-full px-4 py-2 text-sm font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const parsedPhone = parsePhone(profile.phone_number);
                      setFormDraft({
                        bio: profile.bio || "",
                        linkedin_url: profile.linkedin_url || "",
                        personal_email: profile.personal_email || "",
                        phone_country_code: parsedPhone.code,
                        phone_number: parsedPhone.num,
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
                      className="flex items-center gap-2 text-sm font-bold text-primary hover:text-accent transition-colors truncate max-w-sm"
                    >
                      <Linkedin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{profile.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </a>
                  )}
                  {isOwner && profile.personal_email && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                      <Mail className="h-4 w-4 text-neutral-300" />
                      {profile.personal_email}
                    </div>
                  )}
                  {isOwner && profile.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                      <Phone className="h-4 w-4 text-neutral-300" />
                      {profile.phone_number}
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded-sm">
                        Private
                      </span>
                    </div>
                  )}
                </div>

                {!isOwner && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 shadow-md py-6 rounded-xl text-md font-bold"
                      onClick={() => router.push(`/messages/${profile.id}`)}
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Message {profile.full_name}
                    </Button>
                    <Button
                      variant={hasVouchedProfile ? "secondary" : "outline"}
                      className={`flex-1 shadow-sm py-6 rounded-xl text-md font-bold ${hasVouchedProfile ? 'bg-indigo-50 text-indigo-700 border-transparent' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                      onClick={handleProfileVouch}
                      disabled={hasVouchedProfile}
                    >
                      {hasVouchedProfile ? (
                        <>
                          <Check className="h-5 w-5 mr-2 text-indigo-500" />
                          Vouched
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5 mr-2" />
                          Vouch for {profile.full_name.split(' ')[0]}
                        </>
                      )}
                    </Button>
                  </div>
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

      {isOwner && (
        <ChangeCompanyModal
          isOpen={isChangeCompanyOpen}
          onClose={() => setIsChangeCompanyOpen(false)}
          user={profile}
          onVerified={() => window.location.reload()}
        />
      )}
    </div>
  );
}
