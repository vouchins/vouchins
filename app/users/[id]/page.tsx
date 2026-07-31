"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PostCard } from "@/components/post-card";
import {
  Building2,
  MapPin,
  MessageCircle,
  Edit2,
  Check,
  Mail,
  Linkedin,
  Lock,
  Camera,
  Loader2,
  Phone,
  ShieldCheck,
  ChevronDown,
  Star,
  CheckCircle2,
  Briefcase,
  Home,
  ShoppingCart,
  Flag,
  Users,
  Info,
  CalendarDays,
  ArrowRight,
  MessageSquareText,
} from "lucide-react";
import posthog from "posthog-js";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Navigation } from "@/components/navigation";
import { ChangeCompanyModal } from "@/components/change-company-modal";
import { ProfileCompletionWidget } from "@/components/profile-completion-widget";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ReportDialog,
  type ReportTargetType,
} from "@/components/report-dialog";
import { VerifiedIcon } from "@/components/verified-icon";
import { INDIAN_CITIES } from "@/lib/constants";

const PROFILE_POST_SELECT =
  "*, user:users!posts_user_id_fkey(id, full_name, city, bio, avatar_url, vouch_points, is_verified, company:companies(name, domain)), comments(id, text, created_at, user:users!comments_user_id_fkey(id, full_name))";

const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  housing: "Housing",
  buy_sell: "Marketplace",
  recommendations: "Recommendations",
  referrals: "Referrals",
  jobs: "Jobs",
};

export const getHighestBadge = (count: number) => {
  if (count >= 50) return { name: "Founding Connector", icon: "🏆" };
  if (count >= 25) return { name: "Network Catalyst", icon: "🚀" };
  if (count >= 5) return { name: "Community Builder", icon: "🌱" };
  return null;
};

function ProfilePageSkeleton() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f5f7fb] pb-20"
      aria-label="Loading profile"
      aria-busy="true"
    >
      <Navigation />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-12rem] top-40 h-[30rem] w-[30rem] rounded-full bg-cyan-100/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-blue-100/60 blur-3xl"
      />

      <main className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-[28px] border border-white/90 bg-white/75 p-5 shadow-[0_20px_60px_-35px_rgba(31,37,87,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-start">
              <Skeleton className="h-28 w-28 shrink-0 rounded-[24px] bg-neutral-200/70" />
              <div className="w-full min-w-0 flex-1 space-y-4 pt-1">
                <div className="flex flex-col items-center gap-3 sm:flex-row">
                  <Skeleton className="h-10 w-52 rounded-xl bg-neutral-200/70" />
                  <Skeleton className="h-8 w-32 rounded-full bg-neutral-200/60" />
                </div>
                <div className="flex justify-center gap-3 sm:justify-start">
                  <Skeleton className="h-5 w-28 bg-neutral-200/60" />
                  <Skeleton className="h-5 w-24 bg-neutral-200/60" />
                </div>
                <Skeleton className="mx-auto h-4 w-full max-w-lg bg-neutral-200/60 sm:mx-0" />
                <Skeleton className="mx-auto h-4 w-3/4 max-w-sm bg-neutral-200/60 sm:mx-0" />
              </div>
            </div>
            <div className="w-full space-y-3 lg:w-60">
              <Skeleton className="h-11 w-full rounded-xl bg-neutral-200/70" />
              <Skeleton className="h-11 w-full rounded-xl bg-neutral-200/60" />
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-xs gap-2 rounded-full border border-white/80 bg-white/60 p-1">
          <Skeleton className="h-9 flex-1 rounded-full bg-neutral-200/70" />
          <Skeleton className="h-9 flex-1 rounded-full bg-neutral-200/50" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="rounded-[26px] border border-white/90 bg-white/70 p-6 lg:col-span-5">
            <Skeleton className="h-6 w-28 bg-neutral-200/70" />
            <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row">
              <Skeleton className="h-44 w-44 shrink-0 rounded-full bg-neutral-200/65" />
              <div className="w-full space-y-4">
                <Skeleton className="h-4 w-full bg-neutral-200/60" />
                <Skeleton className="h-px w-full bg-neutral-200/70" />
                <Skeleton className="h-12 w-40 rounded-xl bg-neutral-200/60" />
              </div>
            </div>
          </section>
          <section className="rounded-[26px] border border-white/90 bg-white/70 p-6 lg:col-span-7">
            <Skeleton className="h-6 w-28 bg-neutral-200/70" />
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {[0, 1, 2, 3, 4].map((item) => (
                <Skeleton
                  key={item}
                  className="h-36 rounded-2xl bg-neutral-200/60"
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [vouchScore, setVouchScore] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);
  const [communityVouchesTotal, setCommunityVouchesTotal] = useState(0);
  const [trustSignals, setTrustSignals] = useState<Record<string, number>>({});
  const [highlights, setHighlights] = useState<string[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState<
    "overview" | "activity"
  >("overview");
  const [activityPosts, setActivityPosts] = useState<any[]>([]);
  const [activityComments, setActivityComments] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityError, setActivityError] = useState("");

  // Private Settings State
  const [isEditing, setIsEditing] = useState(false);
  const [formDraft, setFormDraft] = useState({
    bio: "",
    city: "",
    linkedin_url: "",
    personal_email: "",
    phone_country_code: "+91",
    phone_number: "",
    pref_email_messages: true,
    pref_email_comments: true,
    pref_email_digest: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangeCompanyOpen, setIsChangeCompanyOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [hasVouchedProfile, setHasVouchedProfile] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType;
    id: string;
    label?: string;
  } | null>(null);

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
      setActiveProfileTab("overview");
      setActivityPosts([]);
      setActivityComments([]);
      setActivityLoaded(false);
      setActivityError("");

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

      const [
        { data: profileData },
        { data: vouchScoreData },
        { data: trustSignalsData },
        { data: postsData },
        { data: vouchData },
        { count: invitedCountData }
      ] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name, city, created_at, linkedin_url, bio, personal_email, avatar_url, phone_number, is_verified, vouch_points, pref_email_messages, pref_email_comments, pref_email_digest, company:companies(name, domain)")
          .eq("id", id)
          .maybeSingle(),
        supabase.rpc("get_vouch_score", { profile_id: id }),
        supabase.rpc("get_trust_signals", { profile_id: id }),
        supabase
          .from("posts")
          .select(PROFILE_POST_SELECT)
          .eq("user_id", id)
          .eq("is_removed", false)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("vouches")
          .select("id")
          .eq("target_user_id", id)
          .eq("vouching_user_id", user.id)
          .eq("is_profile_vouch", true)
          .maybeSingle(),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("invited_by", id)
          .eq("is_verified", true)
      ]);

      if (!profileData) {
        router.push("/feed");
        return;
      }

      setProfile(profileData);
      
      const parsedPhone = parsePhone(profileData.phone_number);
      setFormDraft({
        bio: profileData.bio || "",
        city: profileData.city || "",
        linkedin_url: profileData.linkedin_url || "",
        personal_email: profileData.personal_email || "",
        phone_country_code: parsedPhone.code,
        phone_number: parsedPhone.num,
        pref_email_messages: profileData.pref_email_messages ?? true,
        pref_email_comments: profileData.pref_email_comments ?? true,
        pref_email_digest: profileData.pref_email_digest ?? true,
      });

      if (vouchData) setHasVouchedProfile(true);
      setInvitedCount(invitedCountData || 0);
      setPosts(postsData || []);

      // Calculate Completion Points
      let completionPoints = 0;
      if (profileData.is_verified) completionPoints += 25;
      if (profileData.avatar_url) completionPoints += 25;
      if (profileData.linkedin_url) completionPoints += 25;
      if (profileData.phone_number) completionPoints += 25;

      // Calculate Community Vouches (Already includes post vouches + profile vouch points from RPC)
      const communityVouches = Number(vouchScoreData) || 0;
      setCommunityVouchesTotal(communityVouches);

      // Total Vouch Score
      const score = communityVouches + completionPoints;
      setVouchScore(score);

      const categories: Record<string, number> = {
        housing: 0,
        buy_sell: 0,
        recommendations: 0,
        referrals: 0,
      };

      let topCategory = "";
      let topCount = 0;

      (trustSignalsData || []).forEach((row: any) => {
        const count = Number(row.count) || 0;
        let cat = row.category;
        if (cat === 'jobs') cat = 'referrals'; // legacy mapping
        if (categories[cat] !== undefined) {
          categories[cat] += count;
        } else {
          categories[cat] = count;
        }

        if (count > topCount) {
          topCount = count;
          topCategory = cat;
        }
      });
      setTrustSignals(categories);

      // Compute Highlights
      const highlightStrings: string[] = [];
      if (communityVouches > 0) highlightStrings.push(`Received ${communityVouches} community vouches`);
      if (completionPoints > 0) highlightStrings.push(`Earned ${completionPoints} profile completion points`);
      if (categories.referrals > 0) highlightStrings.push(`Shared ${categories.referrals} referrals`);
      if (categories.housing > 0) highlightStrings.push(`Posted ${categories.housing} housing opportunities`);
      
      const categoryLabels: Record<string, string> = {
        housing: 'Housing',
        buy_sell: 'Marketplace',
        recommendations: 'Recommendations',
        referrals: 'Referrals'
      };
      
      if (topCategory && topCount > 0) {
        highlightStrings.push(`Top category: ${categoryLabels[topCategory] || topCategory}`);
      }
      setHighlights(highlightStrings);
      
      setLoading(false);
    };

    load();
  }, [id, router]);

  const handleSaveProfile = async () => {
    if (!formDraft.city) {
      alert("Please select your city.");
      return;
    }

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

    if (
      formDraft.personal_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formDraft.personal_email)
    ) {
      alert("Please enter a valid email address.");
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
        city: formDraft.city,
        linkedin_url: formDraft.linkedin_url.trim(),
        personal_email: formDraft.personal_email.trim(),
        phone_number: fullPhone,
        pref_email_messages: formDraft.pref_email_messages,
        pref_email_comments: formDraft.pref_email_comments,
        pref_email_digest: formDraft.pref_email_digest,
      })
      .eq("id", me.id);

    if (!error) {
      setProfile({ 
        ...profile, 
        bio: formDraft.bio.trim(),
        city: formDraft.city,
        linkedin_url: formDraft.linkedin_url.trim(),
        personal_email: formDraft.personal_email.trim(),
        phone_number: fullPhone,
        pref_email_messages: formDraft.pref_email_messages,
        pref_email_comments: formDraft.pref_email_comments,
        pref_email_digest: formDraft.pref_email_digest,
      });
      window.dispatchEvent(
        new CustomEvent("user-updated", {
          detail: { city: formDraft.city },
        }),
      );
      setIsEditing(false);
    } else {
      alert("Failed to save profile.");
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
      if (error.code === '23505') setHasVouchedProfile(true);
    } else {
      setHasVouchedProfile(true);
      // Optimistically add 1 to vouch score if it's counting profile vouches?
      // Wait, Vouch score is strictly for posts now based on the prompt. So profile vouch button might be redundant or legacy, but we'll leave the button as is for now if they still want it. 
      // Actually, if we just use the calculated vouch score, we can increment it if they vouch.
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${me.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      await supabase.storage.from('avatars').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', me.id);
      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      alert("Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const loadActivity = async () => {
    if (activityLoading || activityLoaded) return;

    setActivityLoading(true);
    setActivityError("");

    const [{ data: allPosts, error: postsError }, { data: comments, error: commentsError }] =
      await Promise.all([
        supabase
          .from("posts")
          .select(PROFILE_POST_SELECT)
          .eq("user_id", id)
          .eq("is_removed", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select(
            "id, text, created_at, post_id, post:posts!comments_post_id_fkey(id, text, category)"
          )
          .eq("user_id", id)
          .eq("is_removed", false)
          .order("created_at", { ascending: false }),
      ]);

    if (postsError || commentsError) {
      console.error("Failed to load profile activity", {
        postsError,
        commentsError,
      });
      setActivityError("Could not load all activity. Please try again.");
    } else {
      setActivityPosts(allPosts || []);
      setActivityComments(comments || []);
      setActivityLoaded(true);
    }

    setActivityLoading(false);
  };

  const showActivity = () => {
    setActiveProfileTab("activity");
    void loadActivity();
    window.requestAnimationFrame(() => {
      document
        .getElementById("profile-tabs")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!profile) return null;
  const isOwner = me?.id === profile.id;
  const showProfileCompletion =
    isOwner &&
    !(
      profile.is_verified &&
      profile.avatar_url &&
      profile.linkedin_url &&
      profile.phone_number
    );
  const profileCompletionPoints = Math.max(
    vouchScore - communityVouchesTotal,
    0
  );
  const trustLabel =
    vouchScore >= 100
      ? "Strong community trust"
      : vouchScore >= 50
        ? "Growing community trust"
        : vouchScore > 0
          ? "Emerging community trust"
          : "New community profile";
  const trustSignalItems = [
    {
      label: "Community vouches",
      value: communityVouchesTotal,
      icon: ShieldCheck,
    },
    {
      label: "Referrals shared",
      value: trustSignals.referrals || 0,
      icon: Briefcase,
    },
    {
      label: "Housing posts",
      value: trustSignals.housing || 0,
      icon: Home,
    },
    {
      label: "Marketplace posts",
      value: trustSignals.buy_sell || 0,
      icon: ShoppingCart,
    },
    {
      label: "Recommendations",
      value: trustSignals.recommendations || 0,
      icon: Star,
    },
  ];

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
            <Button onClick={() => router.push("/feed")} className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-[11px] w-full">
              Return to Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] pb-20">
      <Navigation />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-12rem] top-40 h-[30rem] w-[30rem] rounded-full bg-cyan-100/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-blue-100/60 blur-3xl"
      />

      <main className="relative mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div
          className={
            showProfileCompletion
              ? "grid gap-6 lg:grid-cols-12 lg:items-stretch"
              : ""
          }
        >
          {showProfileCompletion && (
            <ProfileCompletionWidget className="lg:order-2 lg:col-span-4 lg:h-full" />
          )}

        <section
          className={`relative overflow-hidden rounded-[28px] border border-white/90 bg-white/75 p-5 shadow-[0_20px_60px_-35px_rgba(31,37,87,0.45)] backdrop-blur-2xl sm:p-8 ${
            showProfileCompletion ? "lg:order-1 lg:col-span-8" : ""
          }`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
          />
          <div className="flex flex-col gap-7 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="group relative shrink-0">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border border-white bg-white text-3xl font-bold text-neutral-400 shadow-[0_14px_35px_-20px_rgba(31,37,87,0.7)]">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : profile.company?.[0]?.domain ||
                    profile.company?.domain ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${profile.company?.[0]?.domain || profile.company?.domain}&sz=128`}
                      alt={profile.full_name}
                      className="h-full w-full object-contain p-5"
                    />
                  ) : (
                    profile.full_name.charAt(0)
                  )}
                </div>
                {profile.is_verified && (
                  <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg">
                    <VerifiedIcon className="h-5 w-5" />
                  </span>
                )}
                {isOwner && (
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-[24px] bg-primary/65 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6" />
                    )}
                    <span className="sr-only">Upload profile photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
                    {profile.full_name}
                  </h1>
                  {profile.is_verified && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      Verified{" "}
                      {profile.company?.name ? "employee" : "member"}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-neutral-600 sm:justify-start">
                  {profile.company?.name && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-neutral-400" />
                      {profile.company.name}
                      {isOwner && (
                        <button
                          onClick={() => setIsChangeCompanyOpen(true)}
                          className="ml-1 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-neutral-200 transition hover:bg-white"
                        >
                          Change
                        </button>
                      )}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                    {profile.city || "Unknown location"}
                  </span>
                </div>

                <p className="mx-auto max-w-xl text-sm leading-6 text-neutral-700 sm:mx-0 sm:text-[15px]">
                  {profile.bio ||
                    "Verified professional active on Vouchins."}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 sm:justify-start">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Member since{" "}
                    {new Date(profile.created_at).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" }
                    )}
                  </span>
                  {profile.linkedin_url && (
                    <a
                      href={
                        profile.linkedin_url.startsWith("http")
                          ? profile.linkedin_url
                          : `https://${profile.linkedin_url}`
                      }
                      target="_external"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-semibold text-primary transition hover:text-blue-700"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn profile
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 lg:w-60">
              {isOwner ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-primary/20 bg-white/80 font-semibold text-primary shadow-[0_8px_20px_-12px_rgba(31,37,87,0.55)] transition-colors hover:border-primary/30 hover:bg-primary/5 hover:!text-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit profile
                </Button>
              ) : (
                <>
                  <Button
                    className="h-11 rounded-xl bg-primary font-semibold shadow-[0_12px_25px_-15px_rgba(31,37,87,0.9)] hover:bg-primary/95"
                    onClick={() => {
                      posthog.capture("Contact Seller", {
                        recipient_id: profile.id,
                      });
                      router.push(`/messages/${profile.id}`);
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                  <Button
                    variant="outline"
                    className={`h-11 rounded-xl border-white bg-white/80 font-semibold shadow-sm ${
                      hasVouchedProfile
                        ? "text-emerald-700 hover:bg-emerald-50 hover:!text-emerald-700"
                        : "text-primary hover:bg-primary/5 hover:!text-primary"
                    }`}
                    onClick={handleProfileVouch}
                    disabled={hasVouchedProfile}
                  >
                    {hasVouchedProfile ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Vouched
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Vouch for {profile.full_name.split(" ")[0]}
                      </>
                    )}
                  </Button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-medium text-red-700 transition hover:bg-red-600 hover:text-white"
                    onClick={() => {
                      setReportTarget({
                        type: "user",
                        id: profile.id,
                        label: profile.full_name,
                      });
                      setReportDialogOpen(true);
                    }}
                  >
                    <Flag className="h-4 w-4" />
                    Report profile
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
        </div>

        <nav
          id="profile-tabs"
          aria-label="Profile sections"
          className="mx-auto flex w-full max-w-xs scroll-mt-24 rounded-full border border-white/80 bg-white/60 p-1 shadow-sm backdrop-blur-xl"
        >
          <button
            type="button"
            onClick={() => setActiveProfileTab("overview")}
            aria-pressed={activeProfileTab === "overview"}
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm transition ${
              activeProfileTab === "overview"
                ? "bg-white font-semibold text-primary shadow-sm"
                : "font-medium text-neutral-500 hover:text-primary"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={showActivity}
            aria-pressed={activeProfileTab === "activity"}
            className={`flex-1 rounded-full px-4 py-2 text-center text-sm transition ${
              activeProfileTab === "activity"
                ? "bg-white font-semibold text-primary shadow-sm"
                : "font-medium text-neutral-500 hover:text-primary"
            }`}
          >
            Activity
          </button>
        </nav>

        {activeProfileTab === "overview" ? (
          <>
        <div id="overview" className="grid scroll-mt-24 gap-6 lg:grid-cols-12">
          <section className="rounded-[26px] border border-white/90 bg-white/70 p-6 shadow-[0_18px_45px_-32px_rgba(31,37,87,0.5)] backdrop-blur-2xl lg:col-span-5">
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Vouch score
              </h2>
              <Info className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            </div>

            <div className="flex flex-col items-center gap-7 sm:flex-row">
              <div className="flex w-44 shrink-0 flex-col items-center gap-3">
                <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(from_215deg,#1f2557_0deg,#3349a3_275deg,#dce3f1_275deg,#dce3f1_360deg)] p-2 shadow-[0_18px_36px_-25px_rgba(31,37,87,0.85)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-white bg-white/95">
                    <span className="text-6xl font-semibold tracking-[-0.06em] text-primary">
                      {vouchScore}
                    </span>
                  </div>
                </div>
                <span className="text-balance text-center text-xs font-semibold leading-4 text-emerald-600">
                  {trustLabel}
                </span>
              </div>

              <div className="w-full min-w-0 space-y-5">
                <p className="text-sm leading-6 text-neutral-600">
                  <span className="font-semibold text-primary">
                    {communityVouchesTotal} community{" "}
                    {communityVouchesTotal === 1 ? "vouch" : "vouches"}
                  </span>{" "}
                  +{" "}
                  <span className="font-semibold text-primary">
                    {profileCompletionPoints} profile points
                  </span>
                </p>
                <div className="h-px bg-neutral-200/80" />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tracking-tight text-primary">
                      {invitedCount}
                    </div>
                    <div className="text-xs font-medium text-neutral-500">
                      Members invited
                    </div>
                  </div>
                </div>
                {(() => {
                  const badge = getHighestBadge(invitedCount);
                  if (!badge) return null;
                  return (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/90 bg-white/70 p-6 shadow-[0_18px_45px_-32px_rgba(31,37,87,0.5)] backdrop-blur-2xl lg:col-span-7">
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                Trust signals
              </h2>
              <Info className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {trustSignalItems.map((signal, index) => {
                const SignalIcon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className={`flex min-h-36 flex-col items-center justify-center rounded-2xl border p-4 text-center transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      index === 0
                        ? "border-primary/10 bg-primary/[0.045]"
                        : "border-white bg-white/65"
                    }`}
                  >
                    <SignalIcon className="mb-3 h-6 w-6 text-primary" />
                    <span className="text-3xl font-semibold tracking-tight text-neutral-950">
                      {signal.value}
                    </span>
                    <span className="mt-1.5 text-xs font-medium leading-4 text-neutral-600">
                      {signal.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {highlights.length > 0 && (
            <section className="h-fit rounded-[26px] border border-white/90 bg-white/70 p-6 shadow-[0_18px_45px_-32px_rgba(31,37,87,0.5)] backdrop-blur-2xl lg:col-span-5">
              <h2 className="mb-5 text-lg font-semibold tracking-tight text-neutral-900">
                Trust highlights
              </h2>
              <ul className="space-y-4">
                {highlights.map((highlight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm font-medium leading-5 text-neutral-700"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className={`rounded-[26px] border border-white/90 bg-white/70 p-5 shadow-[0_18px_45px_-32px_rgba(31,37,87,0.5)] backdrop-blur-2xl sm:p-6 ${
              highlights.length > 0 ? "lg:col-span-7" : "lg:col-span-12"
            }`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
                  Recent activity
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Latest post from {profile.full_name}
                </p>
              </div>
              {posts.length > 0 && (
                <button
                  type="button"
                  onClick={showActivity}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition hover:text-blue-700"
                >
                  Show more
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/50 px-6 py-12 text-center text-sm font-medium text-neutral-500">
                This professional hasn&apos;t posted yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/5 px-2.5 py-1 font-semibold text-primary">
                    {ACTIVITY_CATEGORY_LABELS[posts[0].category] ||
                      posts[0].category}
                  </span>
                  <span className="text-neutral-400">
                    {new Date(posts[0].created_at).toLocaleDateString(
                      undefined,
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                  {posts[0].text.length > 260
                    ? `${posts[0].text.slice(0, 260).trim()}...`
                    : posts[0].text}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                    <MessageCircle className="h-4 w-4" />
                    {posts[0].comment_count ??
                      posts[0].comments?.length ??
                      0}{" "}
                    comments
                  </span>
                  <button
                    type="button"
                    onClick={showActivity}
                    className="text-xs font-semibold text-primary transition hover:text-blue-700"
                  >
                    View all activity
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
          </>
        ) : (
          <section className="min-w-0 overflow-hidden rounded-[26px] border border-white/90 bg-white/70 p-4 shadow-[0_18px_45px_-32px_rgba(31,37,87,0.5)] backdrop-blur-2xl sm:p-7">
            <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
                  Activity
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Posts and comments shared by {profile.full_name}
                </p>
              </div>
              {activityLoaded && (
                <div className="flex gap-2 text-xs font-semibold text-neutral-500">
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                    {activityPosts.length} posts
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                    {activityComments.length} comments
                  </span>
                </div>
              )}
            </div>

            {activityLoading ? (
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-7">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="h-52 animate-pulse rounded-2xl bg-white/75"
                    />
                  ))}
                </div>
                <div className="h-72 animate-pulse rounded-2xl bg-white/75 lg:col-span-5" />
              </div>
            ) : activityError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/70 px-6 py-10 text-center">
                <p className="text-sm font-medium text-red-700">
                  {activityError}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl bg-white text-primary hover:bg-primary/5 hover:!text-primary"
                  onClick={loadActivity}
                >
                  Try again
                </Button>
              </div>
            ) : (
              <div className="grid min-w-0 items-start gap-6 lg:grid-cols-12">
                <div className="min-w-0 max-w-full space-y-4 lg:col-span-7">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Posts
                  </h3>
                  {activityPosts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/50 px-6 py-10 text-center text-sm text-neutral-500">
                      No posts yet.
                    </div>
                  ) : (
                    activityPosts.map((post) => (
                      <div key={post.id} className="min-w-0 max-w-full">
                        <PostCard
                          post={post}
                          currentUserId={me.id}
                          onReply={() => {}}
                          onReport={(type, targetId, label) => {
                            setReportTarget({ type, id: targetId, label });
                            setReportDialogOpen(true);
                          }}
                          onPostUpdated={() => {}}
                          isVerifiedUser={me.is_verified}
                        />
                      </div>
                    ))
                  )}
                </div>

                <aside className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-white bg-white/55 p-4 sm:p-5 lg:col-span-5">
                  <h3 className="mb-4 text-sm font-semibold text-neutral-900">
                    Comments
                  </h3>
                  {activityComments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 px-5 py-10 text-center text-sm text-neutral-500">
                      No comments yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityComments.map((comment) => {
                        const commentPost = Array.isArray(comment.post)
                          ? comment.post[0]
                          : comment.post;
                        return (
                          <Link
                            key={comment.id}
                            href={`/posts/${comment.post_id}`}
                            className="group block rounded-xl border border-neutral-100 bg-white/80 p-4 transition hover:border-primary/10 hover:shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                                <MessageSquareText className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="line-clamp-3 text-sm font-medium leading-5 text-neutral-800">
                                  {comment.text}
                                </p>
                                {commentPost?.text && (
                                  <p className="mt-2 line-clamp-1 text-xs text-neutral-500">
                                    On: {commentPost.text}
                                  </p>
                                )}
                                <p className="mt-2 text-[11px] text-neutral-400">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleDateString(undefined, {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </aside>
              </div>
            )}
          </section>
        )}

        {/* SECTION 6: PRIVATE SETTINGS DIALOG (OWNER ONLY) */}
        {isOwner && (
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] p-0 overflow-hidden bg-white text-neutral-900 border-neutral-200 rounded-2xl shadow-2xl">
              <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-neutral-100 bg-neutral-50">
                <DialogTitle className="text-xl font-black text-primary tracking-tight flex items-center gap-2">
                  <Lock className="h-5 w-5 text-neutral-400" />
                  Private Settings
                </DialogTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Manage your professional bio and private contact details. Private details are never exposed publicly.
                </p>
              </DialogHeader>

              <div className="p-4 sm:p-6 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1.5 block">Professional Bio</label>
                  <Textarea
                    value={formDraft.bio}
                    onChange={(e) => setFormDraft({ ...formDraft, bio: e.target.value.slice(0, 300) })}
                    placeholder="Briefly describe your professional background..."
                    className="resize-none min-h-[100px] bg-white border-neutral-200 text-neutral-900 focus:ring-primary"
                  />
                  <div className="text-[10px] text-neutral-400 mt-1 text-right">{formDraft.bio.length}/300</div>
                </div>

                <div>
                  <label
                    htmlFor="profile-city"
                    className="text-[10px] font-bold text-neutral-500 uppercase mb-1.5 block"
                  >
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <select
                      id="profile-city"
                      value={formDraft.city}
                      onChange={(e) =>
                        setFormDraft({ ...formDraft, city: e.target.value })
                      }
                      className="w-full appearance-none rounded-md border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-neutral-900 outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>
                        Select your city
                      </option>
                      {formDraft.city &&
                        !INDIAN_CITIES.includes(formDraft.city) && (
                          <option value={formDraft.city}>{formDraft.city}</option>
                        )}
                      {INDIAN_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1.5 block">LinkedIn URL</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="url"
                        value={formDraft.linkedin_url}
                        onChange={(e) => setFormDraft({ ...formDraft, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-md text-neutral-900 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1.5 block">Personal Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="email"
                        value={formDraft.personal_email}
                        onChange={(e) => setFormDraft({ ...formDraft, personal_email: e.target.value })}
                        placeholder="personal@email.com"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-neutral-200 rounded-md text-neutral-900 outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase mb-1.5 block">Phone Number</label>
                    <div className="flex border border-neutral-200 rounded-md overflow-hidden shadow-sm">
                      <div className="relative flex items-center bg-neutral-50 border-r border-neutral-200 hover:bg-neutral-100 transition-colors">
                        <select
                          value={formDraft.phone_country_code}
                          onChange={(e) => setFormDraft({ ...formDraft, phone_country_code: e.target.value })}
                          className="appearance-none bg-transparent pl-3 pr-8 py-2 text-sm font-bold text-neutral-700 outline-none cursor-pointer w-[90px] md:w-[105px] z-10"
                        >
                          {COUNTRY_CODES.map((country) => (
                            <option key={country.code} value={country.code}>{country.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                      </div>
                      <input
                        type="number"
                        value={formDraft.phone_number}
                        onChange={(e) => {
                          if (e.target.value.length <= 15) setFormDraft({ ...formDraft, phone_number: e.target.value });
                        }}
                        placeholder="9876543210"
                        className="w-full px-4 py-2 text-sm font-medium bg-white text-neutral-900 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-neutral-100 my-4" />
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Email Notification Preferences</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pref_email_messages"
                        checked={formDraft.pref_email_messages}
                        onCheckedChange={(checked) => 
                          setFormDraft({ ...formDraft, pref_email_messages: !!checked })
                        }
                      />
                      <label htmlFor="pref_email_messages" className="text-sm font-semibold text-neutral-700 cursor-pointer select-none">
                        Email reminders for unread messages
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pref_email_comments"
                        checked={formDraft.pref_email_comments}
                        onCheckedChange={(checked) => 
                          setFormDraft({ ...formDraft, pref_email_comments: !!checked })
                        }
                      />
                      <label htmlFor="pref_email_comments" className="text-sm font-semibold text-neutral-700 cursor-pointer select-none">
                        Email reminders for comments and replies
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pref_email_digest"
                        checked={formDraft.pref_email_digest}
                        onCheckedChange={(checked) => 
                          setFormDraft({ ...formDraft, pref_email_digest: !!checked })
                        }
                      />
                      <label htmlFor="pref_email_digest" className="text-sm font-semibold text-neutral-700 cursor-pointer select-none">
                        Receive daily activity digest email
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6 justify-end border-t border-neutral-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const parsedPhone = parsePhone(profile.phone_number);
                      setFormDraft({
                        bio: profile.bio || "",
                        city: profile.city || "",
                        linkedin_url: profile.linkedin_url || "",
                        personal_email: profile.personal_email || "",
                        phone_country_code: parsedPhone.code,
                        phone_number: parsedPhone.num,
                        pref_email_messages: profile.pref_email_messages ?? true,
                        pref_email_comments: profile.pref_email_comments ?? true,
                        pref_email_digest: profile.pref_email_digest ?? true,
                      });
                      setIsEditing(false);
                    }}
                    className="text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-white px-6 font-bold"
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {reportTarget && (
          <ReportDialog
            open={reportDialogOpen}
            onOpenChange={setReportDialogOpen}
            targetType={reportTarget.type}
            targetId={reportTarget.id}
            targetLabel={reportTarget.label}
          />
        )}
      </main>

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
