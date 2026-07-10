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
  ShoppingCart
} from "lucide-react";
import posthog from "posthog-js";
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

export const getHighestBadge = (count: number) => {
  if (count >= 50) return { name: "Founding Connector", icon: "🏆" };
  if (count >= 25) return { name: "Network Catalyst", icon: "🚀" };
  if (count >= 5) return { name: "Community Builder", icon: "🌱" };
  return null;
};

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

  // Private Settings State
  const [isEditing, setIsEditing] = useState(false);
  const [formDraft, setFormDraft] = useState({
    bio: "",
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
          .select("*, user:users!posts_user_id_fkey(id, full_name, city, avatar_url, vouch_points, company:companies(name, domain)), comments(id, text, created_at, user:users!comments_user_id_fkey(full_name))")
          .eq("user_id", id)
          .eq("is_removed", false)
          .order("created_at", { ascending: false })
          .limit(5),
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
        linkedin_url: formDraft.linkedin_url.trim(),
        personal_email: formDraft.personal_email.trim(),
        phone_number: fullPhone,
        pref_email_messages: formDraft.pref_email_messages,
        pref_email_comments: formDraft.pref_email_comments,
        pref_email_digest: formDraft.pref_email_digest,
      });
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
            <Button onClick={() => router.push("/feed")} className="rounded-full px-12 h-12 font-black uppercase tracking-widest text-[11px] w-full">
              Return to Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {isOwner && <ProfileCompletionWidget className="mb-6" />}

        {/* SECTION 1: IDENTITY */}
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative group shrink-0">
              <div className="h-24 w-24 rounded-2xl bg-white border border-neutral-100 text-3xl font-bold text-neutral-400 flex items-center justify-center shadow-sm overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : profile.company?.[0]?.domain || profile.company?.domain ? (
                  <img src={`https://www.google.com/s2/favicons?domain=${profile.company?.[0]?.domain || profile.company?.domain}&sz=128`} alt={profile.full_name} className="h-full w-full object-contain p-4" />
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

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-4">
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight leading-none">
                  {profile.full_name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pb-0.5">
                  {profile.is_verified && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        Verified {profile.company?.name ? "Employee" : "Member"}
                      </span>
                    </div>
                  )}
                  {isOwner && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-[26px] px-3 text-[10px] font-bold shadow-sm rounded-full bg-white text-neutral-600 hover:text-neutral-900 border-neutral-200" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="h-3 w-3 mr-1.5" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-semibold text-neutral-500">
                {profile.company?.name && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {profile.company.name}
                    {isOwner && (
                      <button
                        onClick={() => setIsChangeCompanyOpen(true)}
                        className="ml-1 px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-500 hover:bg-neutral-200 rounded-full transition-colors uppercase tracking-wider"
                      >
                        Change
                      </button>
                    )}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.city || "Unknown Location"}
                </span>
              </div>

              <p className="text-sm text-neutral-700 leading-relaxed max-w-xl mx-auto md:mx-0">
                {profile.bio || "Verified professional active on Vouchins."}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-bold text-neutral-400">
                <span>Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                
                {profile.linkedin_url && (
                  <>
                    <span>•</span>
                    <a href={profile.linkedin_url.startsWith("http") ? profile.linkedin_url : `https://${profile.linkedin_url}`} target="_external" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn Profile
                    </a>
                  </>
                )}
              </div>
            </div>
            
            {!isOwner && (
              <div className="shrink-0 flex flex-col w-full md:w-auto gap-3 mt-4 md:mt-0">
                <Button className="w-full bg-primary font-bold shadow-md rounded-xl" onClick={() => {
                  posthog.capture("Contact Seller", { recipient_id: profile.id });
                  router.push(`/messages/${profile.id}`);
                }}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button
                  variant={hasVouchedProfile ? "secondary" : "outline"}
                  className={`w-full shadow-sm rounded-xl font-bold ${hasVouchedProfile ? 'bg-indigo-50 text-indigo-700 border-transparent' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'}`}
                  onClick={handleProfileVouch}
                  disabled={hasVouchedProfile}
                >
                  {hasVouchedProfile ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-indigo-500" />
                      Vouched
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Vouch for {profile.full_name.split(' ')[0]}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2 & 3: VOUCH SCORE, MEMBERS INVITED & TRUST SIGNALS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Vouch Score */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">⭐ Vouch Score</h3>
            <div className="text-6xl font-black text-primary tracking-tighter">
              {vouchScore}
            </div>
          </section>

          {/* Members Invited */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">🤝 Members Invited</h3>
            <div className="text-6xl font-black text-primary tracking-tighter">
              {invitedCount}
            </div>
            {(() => {
              const badge = getHighestBadge(invitedCount);
              if (!badge) return null;
              return (
                <div className="mt-3 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                  <span>{badge.icon}</span>
                  <span>{badge.name}</span>
                </div>
              );
            })()}
            {isOwner && invitedCount === 0 && (
              <p className="text-[11px] text-neutral-450 mt-3 text-center leading-normal max-w-[150px]">
                Invite trusted professionals to grow the community.
              </p>
            )}
          </section>

          {/* Trust Signals */}
          <section className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-6">Trust Signals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="flex flex-col items-center p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center shadow-sm">
                <ShieldCheck className="h-6 w-6 text-indigo-600 mb-2" />
                <span className="text-2xl font-black text-neutral-900 mb-1">{communityVouchesTotal}</span>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider leading-tight">Community<br/>Vouches</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                <Briefcase className="h-6 w-6 text-indigo-500 mb-2" />
                <span className="text-2xl font-black text-neutral-900 mb-1">{trustSignals.referrals || 0}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider leading-tight">Referrals<br/>Shared</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                <Home className="h-6 w-6 text-emerald-500 mb-2" />
                <span className="text-2xl font-black text-neutral-900 mb-1">{trustSignals.housing || 0}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider leading-tight">Housing<br/>Posts</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                <ShoppingCart className="h-6 w-6 text-amber-500 mb-2" />
                <span className="text-2xl font-black text-neutral-900 mb-1">{trustSignals.buy_sell || 0}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider leading-tight">Marketplace<br/>Posts</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
                <Star className="h-6 w-6 text-blue-500 mb-2" />
                <span className="text-2xl font-black text-neutral-900 mb-1">{trustSignals.recommendations || 0}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider leading-tight">Recommen-<br/>dations</span>
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 4: TRUST HIGHLIGHTS */}
        {highlights.length > 0 && (
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Trust Highlights</h3>
            <ul className="space-y-3">
              {highlights.map((highlight, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-neutral-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  {highlight}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* SECTION 5: RECENT ACTIVITY */}
        <section className="pt-4">
          <h3 className="text-lg font-black text-primary tracking-tight mb-6">Recent Activity</h3>
          {posts.length === 0 ? (
            <div className="bg-white border border-neutral-100 rounded-2xl p-12 text-center text-sm font-medium text-neutral-400 shadow-sm">
              This professional hasn't contributed yet.
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
        </section>

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
