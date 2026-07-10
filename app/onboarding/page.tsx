"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { INDIAN_CITIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Assuming you use sonner or similar for toasts
import { isCorporateEmail, extractDomainFromEmail, deriveCompanyNameFromDomain } from "@/lib/auth/validation";
import posthog from "posthog-js";

export default function OnboardingPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    posthog.startSessionRecording();
  }, []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState("");
  const [isCorporate, setIsCorporate] = useState(false);

  // OTP related
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [manualVerification, setManualVerification] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // New states for company search
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );

  // Search logic
  useEffect(() => {
    const searchCompanies = async () => {
      if (company.trim().length < 2 || selectedCompanyId) {
        setCompanySuggestions([]);
        return;
      }

      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${company}%`)
        .limit(5);

      setCompanySuggestions(data || []);
      setShowSuggestions(true);
    };

    const timer = setTimeout(searchCompanies, 300); // Debounce
    return () => clearTimeout(timer);
  }, [company, selectedCompanyId]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // We use .single() because the SQL Trigger guarantees this row exists
      const { data: userData } = await supabase
        .from("users")
        .select("onboarded, full_name")
        .eq("id", user.id)
        .single();

      if (userData?.onboarded) {
        router.push("/feed");
        return;
      }

      // Show welcome toast for first-time Google signups
      if (user.app_metadata.provider === "google") {
        toast.success(`Welcome to Vouchins, ${userData?.full_name}!`);
      }

      setUserEmail(user.email || "");
      setUserId(user.id);
      setFirstName(userData?.full_name?.split(" ")[0] || "Professional");

      const emailToCheck = user.email || "";
      const isCorp = isCorporateEmail(emailToCheck);
      setIsCorporate(isCorp);

      let initialCompany = "";
      if (isCorp) {
        const domain = extractDomainFromEmail(emailToCheck);
        initialCompany = deriveCompanyNameFromDomain(domain);
      }

      if (initialCompany) {
        setCompany(initialCompany);
      }

      setLoading(false);
    };

    checkUserStatus();
  }, [router]);

  const generateTempDomain = (name: string) => {
    // Cleans the name and appends .com (e.g., "Google India" -> "googleindia.com")
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
    return `${cleanName}.com`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the community guidelines.");
      return;
    }
    if (!company.trim()) {
      setError("Please enter your company name.");
      return;
    }

    if (isCorporate) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, firstName: firstName })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setShowOtpModal(true);
      } catch (err: any) {
        setError(err.message || "Failed to send OTP. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      await completeOnboarding(false, null);
    }
  };

  const verifyOtp = async () => {
    setSubmitting(true);
    setOtpError("");

    // Attempt verification via API
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          otp: otp.trim(),
          userId: userId
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError("Invalid verification code. You can request manual verification below.");
        setManualVerification(true);
        setSubmitting(false);
        return;
      }

      await completeOnboarding(true, null);
    } catch (err: any) {
      setOtpError("Failed to verify OTP.");
      setManualVerification(true);
      setSubmitting(false);
    }
  };

  const handleManualVerificationSubmit = async () => {
    if (!linkedinUrl.trim()) {
      setOtpError("Please provide your LinkedIn URL for manual verification.");
      return;
    }
    await completeOnboarding(false, linkedinUrl.trim());
  };

  const completeOnboarding = async (isVerified: boolean, manualLinkedinUrl: string | null) => {
    setSubmitting(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      let finalCompanyId = selectedCompanyId;

      // If no ID selected, try to find by name or create
      if (!finalCompanyId) {
        const cleanName = company.trim();
        const generatedDomain = generateTempDomain(cleanName);

        let { data: existing } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", cleanName)
          .maybeSingle();

        // If not found by name, try to find by generated domain to avoid unique constraint violations
        if (!existing) {
          const { data: existingDomain } = await supabase
            .from("companies")
            .select("id")
            .eq("domain", generatedDomain)
            .maybeSingle();
          existing = existingDomain;
        }

        if (existing) {
          finalCompanyId = existing.id;
        } else {
          const { data: newComp, error: createError } = await supabase
            .from("companies")
            .insert({
              name: cleanName,
              domain: generatedDomain,
            })
            .select()
            .single();
          if (createError) throw createError;
          finalCompanyId = newComp.id;
        }
      }

      const updates: any = {
        onboarded: true,
        company_id: finalCompanyId,
      };

      if (isVerified) {
        updates.is_verified = true;
      }
      if (manualLinkedinUrl) {
        updates.linkedin_url = manualLinkedinUrl;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", authUser?.id);

      if (updateError) throw updateError;
      router.push("/feed");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-500 font-medium">
          Loading Vouchins Profile...
        </div>
      </div>
    );

  return (
    <div className="relative min-h-screen bg-[#F8F9FB] overflow-hidden">
      {/* 1. Blurred Mock Feed Background */}
      <div className="absolute inset-0 filter blur-[4px] pointer-events-none select-none opacity-40">
        {/* Navigation Bar Mockup */}
        <div className="h-16 border-b bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="font-black text-xl text-primary tracking-tight">Vouchins</span>
            <div className="w-64 h-10 bg-neutral-100 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-neutral-200" />
          </div>
        </div>

        {/* Feed Layout Mockup */}
        <div className="container mx-auto max-w-7xl flex gap-8 p-8">
          {/* Left Sidebar Mock */}
          <div className="hidden lg:flex w-64 flex-col gap-4">
            <div className="h-12 bg-white rounded-xl border" />
            <div className="h-12 bg-white rounded-xl border" />
            <div className="h-40 bg-white rounded-xl border" />
          </div>

          {/* Main Feed Mock */}
          <div className="flex-1 max-w-2xl space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-neutral-200 rounded" />
                    <div className="h-3 w-20 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-neutral-100 rounded" />
                  <div className="h-4 w-[90%] bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Right Sidebar Mock */}
          <div className="hidden xl:block w-80 h-96 bg-white rounded-xl border" />
        </div>
      </div>

      {/* 2. Backdrop Overlay */}
      <div className="absolute inset-0 bg-neutral-900/10 backdrop-blur-[2px] z-10" />

      {/* 3. Onboarding Modal Card */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-20">
        <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">

          <h1 className="text-2xl font-black text-neutral-900 text-center mb-2 tracking-tight">
            Complete Your Profile
          </h1>

          <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-4 mb-6 text-xs text-indigo-950 leading-relaxed font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
            📢 <span className="font-bold">Important:</span> Vouchins is an exclusive network for verified professionals. To connect you with your colleagues and local industry discussions, entering your <b>current company name</b> is mandatory.
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-50/50 border-red-100 py-2.5 px-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <AlertDescription className="text-xs font-semibold text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 relative">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Current Company *
              </Label>
              <Input
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setSelectedCompanyId(null); // Reset selection if they keep typing
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. Google, Amazon, TCS"
                className="rounded-xl bg-secondary/50 border-border h-12 text-sm font-medium"
                required
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && companySuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                  {companySuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                      onClick={() => {
                        setCompany(suggestion.name);
                        setSelectedCompanyId(suggestion.id);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>{suggestion.name}</span>
                      <span className="text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 py-2">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-neutral-900"
              />
              <Label
                htmlFor="agree"
                className="text-xs text-neutral-500 leading-normal cursor-pointer"
              >
                I agree to the Vouchins <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">community guidelines and terms of service</a>.
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
              disabled={!agreed || submitting}
            >
              {submitting ? "Finalizing..." : "Enter Vouchins"}
            </Button>
          </form>

          {showOtpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200">
                <h2 className="text-xl font-bold tracking-tight mb-2">Verify Corporate Email</h2>
                <p className="text-sm text-neutral-600 mb-4">
                  We sent a 6-digit verification code to <strong>{userEmail}</strong>.
                </p>

                {otpError && (
                  <Alert variant="destructive" className="mb-4 bg-red-50/50 border-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold text-red-600">{otpError}</AlertDescription>
                  </Alert>
                )}

                {!manualVerification ? (
                  <>
                    <Input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-full text-center tracking-[0.5em] text-lg font-bold mb-4 h-12 rounded-xl"
                      maxLength={6}
                    />
                    <Button
                      className="w-full mb-2 h-12 rounded-xl font-bold"
                      onClick={verifyOtp}
                      disabled={submitting || otp.length !== 6}
                    >
                      {submitting ? "Verifying..." : "Verify"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">LinkedIn Profile URL</Label>
                      <Input
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="mt-1.5 h-12 rounded-xl"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1 font-semibold">
                        Required to verify your professional identity.
                      </p>
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl font-bold"
                      onClick={handleManualVerificationSubmit}
                      disabled={submitting || !linkedinUrl.trim()}
                    >
                      {submitting ? "Submitting..." : "Submit for Manual Verification"}
                    </Button>
                  </div>
                )}

                <Button variant="ghost" className="w-full mt-2 h-12 rounded-xl font-semibold text-neutral-500" onClick={() => setShowOtpModal(false)} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
