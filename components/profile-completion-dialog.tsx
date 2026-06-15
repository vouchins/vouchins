"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/user-provider";
import { supabase } from "@/lib/supabase/browser";
import { isCorporateEmail } from "@/lib/auth/validation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  User,
  Linkedin,
  Phone,
  Camera,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  AlertCircle,
  Upload,
  Link2,
  Zap,
  Check,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ProfileCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export function ProfileCompletionDialog({
  isOpen,
  onClose,
  initialTab = "avatar",
}: ProfileCompletionDialogProps) {
  const { user, refetch } = useUser();

  const checklist = user
    ? [
        {
          id: "avatar",
          label: "Profile Picture",
          isComplete: !!user.avatar_url,
          icon: User,
        },
        {
          id: "linkedin",
          label: "LinkedIn URL",
          isComplete: !!user.linkedin_url,
          icon: Linkedin,
        },
        {
          id: "phone",
          label: "Phone Number",
          isComplete: !!user.phone_number,
          icon: Phone,
        },
        {
          id: "verified",
          label: "Work Verification",
          isComplete: user.is_verified,
          icon: ShieldCheck,
        },
      ]
    : [];

  const pendingItems = checklist.filter((item) => !item.isComplete);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Email verification states
  const [verifyStep, setVerifyStep] = useState(1); // 1: Choice, 2: OTP Email, 3: Manual, 4: Enter OTP, 5: Success Info
  const [corporateEmail, setCorporateEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [manualLinkedinUrl, setManualLinkedinUrl] = useState("");
  const [manualWorkEmail, setManualWorkEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Parse phone helper
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

  // Sync initial state
  useEffect(() => {
    if (isOpen && user) {
      setError("");
      setSuccessMsg("");
      setLinkedinUrl(user.linkedin_url || "");
      const parsedPhone = parsePhone(user.phone_number || null);
      setPhoneCountryCode(parsedPhone.code);
      setPhoneNumber(parsedPhone.num);
      
      // Reset verify states
      setVerifyStep(1);
      setCorporateEmail("");
      setOtp("");
      setManualLinkedinUrl(user.linkedin_url || "");
      setManualWorkEmail("");
      setSelectedFile(null);

      // Determine initial tab based on pending items
      const pending = checklist.filter((item) => !item.isComplete);
      if (pending.length > 0) {
        const isInitialPending = pending.some((item) => item.id === initialTab);
        setActiveTab(isInitialPending ? initialTab : pending[0].id);
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab, user]);

  if (!user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccessMsg("");
    try {
      setUploadingAvatar(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccessMsg("Profile picture uploaded successfully!");
      await refetch();
    } catch (err: any) {
      setError(err.message || "Error uploading profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveLinkedin = async () => {
    setError("");
    setSuccessMsg("");

    if (linkedinUrl && !linkedinUrl.includes("linkedin.com/")) {
      setError("Please enter a valid LinkedIn URL (e.g., https://linkedin.com/in/username)");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ linkedin_url: linkedinUrl.trim() })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccessMsg("LinkedIn URL updated successfully!");
      await refetch();
    } catch (err: any) {
      setError(err.message || "Failed to save LinkedIn URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    setError("");
    setSuccessMsg("");

    const fullPhone = phoneNumber ? `${phoneCountryCode}${phoneNumber.trim()}` : "";
    if (fullPhone && !/^\+?[0-9]{10,15}$/.test(fullPhone)) {
      setError("Please enter a valid phone number with 10-15 digits only");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({ phone_number: fullPhone })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccessMsg("Phone number updated successfully!");
      await refetch();
    } catch (err: any) {
      setError(err.message || "Failed to save phone number");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    if (!isCorporateEmail(corporateEmail)) {
      setError("Please enter a valid corporate email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
          email: corporateEmail,
          firstName: user.full_name,
        }),
      });
      if (res.ok) setVerifyStep(4);
      else throw new Error("Failed to send code. Please try again.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: corporateEmail, otp, userId: user.id }),
      });
      if (res.ok) {
        setSuccessMsg("Company email verified successfully!");
        setVerifyStep(5);
        await refetch();
      } else {
        throw new Error("Invalid verification code.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let fileUrl = null;
      if (selectedFile) {
        const fileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        fileUrl = fileName;
      }

      const { error: insertError } = await supabase
        .from("manual_verification_requests")
        .insert({
          user_id: user.id,
          company_name: user?.company?.name || "Unknown Company",
          linkedin_url: manualLinkedinUrl.trim(),
          corporate_email: manualWorkEmail.trim() || null,
          id_card_url: fileUrl,
          status: "pending",
          email: user.email,
        });

      if (insertError) throw insertError;
      setVerifyStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] sm:w-full sm:max-w-[660px] p-0 overflow-hidden bg-[#FBFBFC] text-neutral-900 border border-neutral-200/80 rounded-[1.75rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] h-auto gap-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-50">
        
        {/* COMPACT HEADER PANEL */}
        <div className="bg-white border-b border-neutral-100 p-4 sm:p-5 flex flex-col gap-4 shrink-0">
          <div className="flex flex-row justify-between items-center">
            <div className="text-left flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm sm:text-base font-black text-neutral-900 tracking-tight leading-none">
                  Profile Setup
                </DialogTitle>
                <span className="text-[9px] font-black uppercase bg-primary/10 text-primary tracking-wider px-2 py-0.5 rounded-full inline-flex items-center">
                  {user.profile_completion_percentage}%
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-neutral-450 mt-1.5">
                Unlock professional features & earn +100 points
              </p>
            </div>
          </div>

          {/* Stepper / Tab Switcher (Unified Desktop + Mobile) */}
          <div className="relative flex justify-between items-center w-full px-2 z-0">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-[18px] h-0.5 bg-neutral-100 -z-10" />

            {checklist.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="flex flex-col items-center shrink-0 focus:outline-none group"
                >
                  {/* Double-Bezel nested indicator */}
                  <div className="bg-neutral-50/50 p-0.5 rounded-full border border-neutral-100 group-hover:scale-105 transition-all duration-300">
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] border shadow-inner",
                        item.isComplete
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-400/20"
                          : isSelected
                          ? "bg-primary text-white border-primary shadow-primary/20"
                          : "bg-white text-neutral-450 border-neutral-200"
                      )}
                    >
                      {item.isComplete ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold mt-1.5 uppercase tracking-wider text-center transition-colors",
                      isSelected ? "text-primary font-black" : "text-neutral-400"
                    )}
                  >
                    {item.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE PANEL CONTENT */}
        <div className="flex-1 bg-white px-4 py-6 sm:p-8 overflow-y-auto no-scrollbar flex flex-col">
          
          {/* Status Messages */}
          {error && (
            <Alert
              variant="destructive"
              className="mb-5 rounded-xl border-none bg-red-50 text-red-800 flex items-center gap-2.5 p-3 sm:p-4 shrink-0 animate-in fade-in slide-in-from-top-1"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-[11px] font-bold">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="mb-5 rounded-xl border-none bg-emerald-50 text-emerald-800 flex items-center gap-2.5 p-3 sm:p-4 shrink-0 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <AlertDescription className="text-[11px] font-bold">
                {successMsg}
              </AlertDescription>
            </Alert>
          )}

          {/* Active section container */}
          <div className="flex-1 flex flex-col justify-center items-center">
            
            {/* 1. PROFILE PICTURE */}
            {activeTab === "avatar" && (
              <div className="space-y-5 text-center max-w-[340px] w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                {/* Concentric Double-Bezel Frame */}
                <div className="bg-neutral-50/50 p-2.5 rounded-[2.25rem] border border-neutral-100 w-28 h-28 mx-auto relative group shadow-sm">
                  <div className="h-full w-full rounded-[calc(2.25rem-0.625rem)] bg-neutral-100 border border-neutral-200/80 flex items-center justify-center overflow-hidden shadow-inner relative z-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-neutral-400">
                        {user.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <label className="absolute inset-2.5 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer rounded-[calc(2.25rem-0.625rem)] z-10">
                    {uploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-xs text-neutral-800">
                    {user.avatar_url ? "Profile photo uploaded (+25 Vouch points)" : "Add profile photo and get 25 Vouch points"}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-neutral-450 leading-relaxed">
                    Builds trust in professional groups. Click the frame above or upload below.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="relative inline-flex items-center justify-center gap-2 cursor-pointer bg-primary hover:opacity-95 text-white text-[11px] font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98]">
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Upload File
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 2. LINKEDIN URL */}
            {activeTab === "linkedin" && (
              <div className="space-y-4 max-w-[350px] w-full text-left animate-in fade-in slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-extrabold text-xs text-neutral-800">
                    {user.linkedin_url ? "LinkedIn URL connected (+25 Vouch points)" : "Add linkedin url and get 25 Vouch points"}
                  </h3>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                    LinkedIn Profile URL
                  </Label>
                  {/* Nested address bar double-bezel input */}
                  <div className="relative flex items-center bg-neutral-50/50 p-1.5 rounded-xl border border-neutral-100 w-full">
                    <Linkedin className="h-4 w-4 text-neutral-400 ml-2 shrink-0" />
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full bg-transparent pl-3 pr-2 py-1 text-xs font-semibold text-neutral-800 outline-none placeholder-neutral-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveLinkedin}
                  disabled={loading}
                  className="w-full h-11 bg-primary hover:opacity-95 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.linkedin_url ? (
                    "Update Link"
                  ) : (
                    "Save & Connect"
                  )}
                </Button>
              </div>
            )}

            {/* 3. PHONE NUMBER */}
            {activeTab === "phone" && (
              <div className="space-y-4 max-w-[350px] w-full text-left animate-in fade-in slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="font-extrabold text-xs text-neutral-800">
                    {user.phone_number ? "Phone number saved (+25 Vouch points)" : "Add phone number and get 25 Vouch points"}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-neutral-450 leading-relaxed">
                    Used strictly for verified referrals. Other members never see your number.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                    Phone Number
                  </Label>
                  {/* Nested double-bezel selector & input */}
                  <div className="flex border border-neutral-150 p-1 rounded-xl bg-neutral-50/50 items-center">
                    <div className="relative flex items-center bg-white border border-neutral-200/60 rounded-lg shrink-0 overflow-hidden hover:bg-neutral-50 transition-all">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        className="appearance-none bg-transparent pl-2.5 pr-6 py-1.5 text-[11px] font-black text-neutral-700 outline-none cursor-pointer w-[85px] z-10"
                      >
                        {COUNTRY_CODES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.label.split(" ")[0]} ({country.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 h-3 w-3 text-neutral-400 pointer-events-none" />
                    </div>
                    <input
                      type="number"
                      value={phoneNumber}
                      onChange={(e) => {
                        if (e.target.value.length <= 15) setPhoneNumber(e.target.value);
                      }}
                      placeholder="9876543210"
                      className="w-full bg-transparent px-3 py-1.5 text-xs font-semibold text-neutral-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-neutral-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSavePhone}
                  disabled={loading}
                  className="w-full h-11 bg-primary hover:opacity-95 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-[0.98] shadow-md"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.phone_number ? (
                    "Update Phone Contact"
                  ) : (
                    "Save & Verify"
                  )}
                </Button>
              </div>
            )}

            {/* 4. WORK VERIFICATION */}
            {activeTab === "verified" && (
              <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-2 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-left">
                
                {/* Step 1: Verification Options */}
                {verifyStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center mx-auto text-primary mb-1">
                        <ShieldCheck className="h-5 w-5 animate-pulse" />
                      </div>
                      <h3 className="font-extrabold text-xs text-neutral-800">
                        {user.is_verified ? "Work verified (+25 Vouch points)" : "Verify company email and get 25 Vouch points"}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-neutral-450 leading-relaxed max-w-[280px] mx-auto">
                        Unlock restricted channels. Join verified builders from top companies.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Work Email option */}
                      <button
                        onClick={() => setVerifyStep(2)}
                        className="p-4 text-left rounded-xl border border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.03] transition-all relative shadow-sm flex flex-col gap-2 group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-[11px] text-neutral-900">Work Email</span>
                            <span className="bg-primary text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                              Fast
                            </span>
                          </div>
                          <p className="text-[9.5px] text-neutral-450 leading-normal mt-1">
                            10-sec verification via 6-digit OTP code.
                          </p>
                        </div>
                      </button>

                      {/* Manual Review option */}
                      <button
                        onClick={() => setVerifyStep(3)}
                        className="p-4 text-left rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50/50 transition-all flex flex-col gap-2 group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 group-hover:scale-105 transition-transform">
                          <Link2 className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-black text-[11px] text-neutral-900">Manual Review</span>
                          <p className="text-[9.5px] text-neutral-450 leading-normal mt-1">
                            Provide employee ID card or LinkedIn link.
                          </p>
                        </div>
                      </button>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex gap-2.5 items-start">
                      <ShieldCheck className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] font-black text-neutral-800 uppercase tracking-widest leading-none">
                          Confidentiality Guarantee
                        </p>
                        <p className="text-[9.5px] text-neutral-450 leading-relaxed mt-1">
                          We never contact your company or store emails in plain text.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Work Email Input */}
                {verifyStep === 2 && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setVerifyStep(1)}
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-xs text-neutral-800">
                        Enter Corporate Email
                      </h3>
                      <p className="text-[10px] text-neutral-450 leading-normal">
                        Receive a confirmation code directly to your professional address.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                          Work Email Address
                        </Label>
                        {/* Nested input with trailing action button */}
                        <div className="relative flex items-center bg-neutral-50/50 p-1 rounded-xl border border-neutral-150 w-full">
                          <input
                            type="email"
                            value={corporateEmail}
                            onChange={(e) => setCorporateEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full bg-transparent pl-3 pr-10 py-1.5 text-xs font-semibold text-neutral-800 outline-none placeholder-neutral-400"
                          />
                          <button
                            disabled={!corporateEmail || loading}
                            onClick={handleSendOtp}
                            className="absolute right-1 top-1 h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 transition-all"
                          >
                            {loading ? (
                              <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            ) : (
                              <ChevronRight className="h-4.5 w-4.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-[9px] text-neutral-400 space-y-1">
                        <div className="flex gap-2 items-center">
                          <Check className="h-3 w-3 text-primary shrink-0" />
                          <p>Secure encryption applied instantly.</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Check className="h-3 w-3 text-primary shrink-0" />
                          <p>Operates outside corporate directory registers.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Manual Verification Form */}
                {verifyStep === 3 && (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setVerifyStep(1)}
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-xs text-neutral-800">
                        Manual Verification
                      </h3>
                      <p className="text-[10px] text-neutral-450 leading-normal">
                        Submit details for moderator verification. Done within 24h.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                          LinkedIn Link *
                        </Label>
                        <Input
                          value={manualLinkedinUrl}
                          onChange={(e) => setManualLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/username"
                          className="h-10 rounded-lg bg-neutral-50 border-neutral-200/80 text-xs font-semibold"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                          Work Email (Optional)
                        </Label>
                        <Input
                          value={manualWorkEmail}
                          onChange={(e) => setManualWorkEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="h-10 rounded-lg bg-neutral-50 border-neutral-200/80 text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                          Work ID card (Optional)
                        </Label>
                        <div
                          className={cn(
                            "relative h-16 rounded-lg border border-dashed flex flex-col items-center justify-center transition-all",
                            selectedFile
                              ? "border-primary/20 bg-primary/[0.01]"
                              : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/50"
                          )}
                        >
                          {!selectedFile ? (
                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-1">
                              <span className="text-[9px] font-bold text-neutral-500">
                                Upload Photo of Employee ID
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              />
                            </label>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <p className="text-[9.5px] font-bold text-primary truncate max-w-[200px]">
                                {selectedFile.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className="text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
                      disabled={!manualLinkedinUrl.trim() || loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Submit Request"
                      )}
                    </Button>
                  </form>
                )}

                {/* Step 4: OTP Entry */}
                {verifyStep === 4 && (
                  <div className="space-y-4 text-center">
                    <button
                      onClick={() => setVerifyStep(2)}
                      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400 hover:text-neutral-600 transition-colors mr-auto"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <div className="h-9 w-9 bg-primary/5 rounded-xl flex items-center justify-center mx-auto text-primary mb-1">
                      <Zap className="h-4.5 w-4.5 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-xs text-neutral-800">
                        Check your inbox
                      </h3>
                      <p className="text-[10px] text-neutral-450 leading-normal">
                        Enter the code sent to:{" "}
                        <span className="text-neutral-900 font-extrabold block">
                          {corporateEmail}
                        </span>
                      </p>
                    </div>

                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter code"
                      className="h-11 text-center text-base font-mono rounded-xl bg-neutral-50 border-neutral-200/80 tracking-[0.2em]"
                      maxLength={6}
                    />

                    <Button
                      className="w-full h-11 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
                      onClick={handleVerifyOtp}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify & Confirm"
                      )}
                    </Button>
                  </div>
                )}

                {/* Step 5: Success Info */}
                {verifyStep === 5 && (
                  <div className="text-center py-2 space-y-4">
                    <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-xs text-neutral-800">
                        {user.is_verified ? "Email Verified!" : "Under Review"}
                      </h3>
                      <p className="text-[10px] text-neutral-450 leading-relaxed max-w-[270px] mx-auto">
                        {user.is_verified
                          ? "Your work status is confirmed. You now have full access to private groups."
                          : "We are reviewing your manual verification. Confirmation will be sent in 24 hours."}
                      </p>
                    </div>
                    <Button
                      onClick={onClose}
                      className="w-full h-11 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                      Awesome
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
