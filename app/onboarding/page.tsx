"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  isCorporateEmail,
  extractDomainFromEmail,
  deriveCompanyNameFromDomain,
  LINKEDIN_URL_PREFIX,
  isValidLinkedInUrl,
  normalizeLinkedInUrl,
  validateCompanyName,
  looksLikePersonName,
} from "@/lib/auth/validation";
import posthog from "posthog-js";
import { sanitizeReturnTo } from "@/lib/auth/return-to";

type OnboardingView = "input" | "choice" | "otp";

const RESEND_COOLDOWN_SECONDS = process.env.NODE_ENV === "test" ? 1 : 30;

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo = sanitizeReturnTo(returnTo);

  const navigateToDestination = (destination: string) => {
    if (destination.startsWith("http://") || destination.startsWith("https://")) {
      window.location.href = destination;
    } else {
      router.push(destination);
    }
  };

  useEffect(() => {
    posthog.startSessionRecording();
  }, []);

  // View state: "input" -> "choice" (if company name) OR "otp" (if work email)
  const [view, setView] = useState<OnboardingView>("input");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Separate loading states to prevent button state bleed
  const [isSubmittingInitial, setIsSubmittingInitial] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // User auth details
  const [userEmail, setUserEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState("");

  // Primary smart input (company name OR work email)
  const [inputValue, setInputValue] = useState("");
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Resolved company & work email
  const [companyName, setCompanyName] = useState("");
  const [workEmail, setWorkEmail] = useState("");

  // Verification & OTP state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [choiceEmailInput, setChoiceEmailInput] = useState("");

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Manual verification inputs (link shown after 2 resends or 2 failed OTP attempts)
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState(LINKEDIN_URL_PREFIX);
  const [manualReason, setManualReason] = useState("");

  // Auto-dismiss main error after 5s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Auto-dismiss OTP error after 5s
  useEffect(() => {
    if (!otpError) return;
    const timer = setTimeout(() => setOtpError(""), 5000);
    return () => clearTimeout(timer);
  }, [otpError]);

  // Company autocomplete search (only when typing company name, without '@')
  useEffect(() => {
    const searchCompanies = async () => {
      const clean = inputValue.trim();
      if (clean.length < 2 || clean.includes("@") || selectedCompanyId) {
        setCompanySuggestions([]);
        return;
      }

      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${clean}%`)
        .limit(5);

      setCompanySuggestions(data || []);
      setShowSuggestions(true);
    };

    const timer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(timer);
  }, [inputValue, selectedCompanyId]);

  // Initial user check
  useEffect(() => {
    const checkUserStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("onboarded, full_name")
        .eq("id", user.id)
        .single();

      if (userData?.onboarded) {
        navigateToDestination(safeReturnTo || "/feed");
        return;
      }

      if (user.app_metadata.provider === "google") {
        toast.success(`Welcome to Vouchins, ${userData?.full_name || "Professional"}!`);
      }

      const rawEmail = user.email || "";
      setUserEmail(rawEmail);
      setUserId(user.id);
      setFirstName(userData?.full_name?.split(" ")[0] || "Professional");

      // If user registered with a corporate email, prefill input
      if (isCorporateEmail(rawEmail)) {
        setInputValue(rawEmail);
        setWorkEmail(rawEmail);
        const domain = extractDomainFromEmail(rawEmail);
        setCompanyName(deriveCompanyNameFromDomain(domain));
      }

      setLoading(false);
    };

    checkUserStatus();
  }, [router]);

  const generateTempDomain = (name: string) => {
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
    return `${cleanName}.com`;
  };

  // Helper: Trigger OTP send to a corporate email
  const sendOtpToEmail = async (targetEmail: string, derivedCompany?: string, isResendAction = false) => {
    if (isResendAction) {
      setIsResendingOtp(true);
    } else {
      setIsSubmittingInitial(true);
    }

    setError("");
    setOtpError("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, firstName: firstName || "Professional" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code");

      setWorkEmail(targetEmail);
      if (derivedCompany) {
        setCompanyName(derivedCompany);
      }
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      if (isResendAction) {
        const nextCount = resendCount + 1;
        setResendCount(nextCount);
      }

      setView("otp");
      toast.success(`Verification code sent to ${targetEmail}`);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code. Please try again.";
      if (isResendAction) {
        setOtpError(msg);
      } else {
        setError(msg);
      }
    } finally {
      if (isResendAction) {
        setIsResendingOtp(false);
      } else {
        setIsSubmittingInitial(false);
      }
    }
  };

  // Step 1 Submit: Dispatches based on whether input is Email or Company Name
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanInput = inputValue.trim();
    if (!cleanInput) {
      setError("Please enter your company name or work email.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the community guidelines and terms.");
      return;
    }

    // Check if input is an email address
    if (cleanInput.includes("@")) {
      const normalizedEmail = cleanInput.toLowerCase();
      if (!isCorporateEmail(normalizedEmail)) {
        setError(
          "Please enter an official work email address (e.g. name@company.com) or enter your company name instead."
        );
        return;
      }

      const domain = extractDomainFromEmail(normalizedEmail);
      const derived = deriveCompanyNameFromDomain(domain);
      await sendOtpToEmail(normalizedEmail, derived, false);
      return;
    }

    // Input is a company name: validate format, punctuation, length, and gibberish
    const compValidation = validateCompanyName(cleanInput);
    if (!compValidation.isValid) {
      setError(compValidation.error || "Please enter a valid company name.");
      return;
    }

    // Check if company exists in companies table
    let recognizedCompanyId = selectedCompanyId;
    if (!recognizedCompanyId) {
      const { data: foundComp } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", cleanInput)
        .maybeSingle();

      if (foundComp) {
        recognizedCompanyId = foundComp.id;
        setSelectedCompanyId(foundComp.id);
        setCompanyName(foundComp.name);
      }
    }

    // If company is not recognized in directory, detect personal / celebrity name patterns
    if (!recognizedCompanyId && looksLikePersonName(cleanInput)) {
      setError(
        `We couldn't recognize "${cleanInput}" as a company in our directory. Please select from the suggestions, enter your work email, or include your company's full legal name (e.g. Inc, Technologies, Solutions).`
      );
      return;
    }

    setCompanyName(cleanInput);
    setView("choice");
  };

  // Step 2 Action: User clicks "Get Verified Now" from Choice screen
  const handleStartVerificationFromChoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    const targetEmail = choiceEmailInput.trim().toLowerCase();
    if (!targetEmail) {
      setError("Please enter your corporate email address.");
      return;
    }
    if (!isCorporateEmail(targetEmail)) {
      setError(
        "Please enter an official corporate email address (e.g. name@company.com). Public domains like Gmail or Yahoo cannot be used for verification."
      );
      return;
    }

    await sendOtpToEmail(targetEmail, companyName, false);
  };

  // Step 2 Action: User clicks "Skip Verification"
  const handleSkipVerification = async () => {
    setIsSkipping(true);
    toast.info("You can verify your work email anytime from your Profile page.");
    await completeOnboarding(false, null, null);
    setIsSkipping(false);
  };

  // OTP Verification Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpError("");

    if (otp.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: workEmail.trim().toLowerCase(),
          otp: otp.trim(),
          userId: userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setOtpError(data.error || "Invalid verification code.");
        setIsVerifyingOtp(false);
        return;
      }

      toast.success("Work email verified! Welcome to Vouchins.");
      await completeOnboarding(true, null, null);
    } catch (err: any) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      setOtpError(err.message || "Failed to verify code.");
      setIsVerifyingOtp(false);
    }
  };

  // Manual Review Submit (LinkedIn URL + Reason)
  const handleManualVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpError("");

    if (
      !linkedinUrl ||
      linkedinUrl.trim() === LINKEDIN_URL_PREFIX ||
      !isValidLinkedInUrl(linkedinUrl)
    ) {
      setOtpError("Please provide a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/username)");
      return;
    }

    if (!manualReason.trim() || manualReason.trim().length < 3) {
      setOtpError("Please provide a brief reason for opting for manual verification.");
      return;
    }

    setIsSubmittingManual(true);
    try {
      // 1. Record in manual_verification_requests table for admin review
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.id) {
        await supabase
          .from("manual_verification_requests")
          .insert({
            user_id: authUser.id,
            corporate_email: workEmail || null,
            company_name: companyName || null,
            linkedin_url: normalizeLinkedInUrl(linkedinUrl),
            admin_notes: `Manual verification requested from onboarding. Reason: ${manualReason.trim()}`,
            status: "pending",
          });
      }

      toast.success("Manual verification request submitted! Our team will review your account.");
      await completeOnboarding(false, normalizeLinkedInUrl(linkedinUrl), manualReason.trim());
    } catch (err: any) {
      setOtpError(err.message || "Failed to submit manual verification request.");
      setIsSubmittingManual(false);
    }
  };

  // Complete onboarding and update user record in database
  const completeOnboarding = async (
    isVerified: boolean,
    manualLinkedinUrl: string | null,
    reason: string | null
  ) => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      let finalCompanyId = selectedCompanyId;
      const targetCompany = companyName.trim() || inputValue.trim();

      if (!finalCompanyId && targetCompany && !targetCompany.includes("@")) {
        const generatedDomain = generateTempDomain(targetCompany);

        let { data: existing } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", targetCompany)
          .maybeSingle();

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
        } else if (isVerified) {
          // Only create a new company in the database if user is verified with corporate email
          const { data: newComp, error: createError } = await supabase
            .from("companies")
            .insert({
              name: targetCompany,
              domain: workEmail ? extractDomainFromEmail(workEmail) : generatedDomain,
            })
            .select()
            .single();
          if (createError) throw createError;
          finalCompanyId = newComp?.id;
        }
      }

      const updates: any = {
        onboarded: true,
      };

      if (finalCompanyId) {
        updates.company_id = finalCompanyId;
      }
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
      navigateToDestination(safeReturnTo || "/feed");
    } catch (err: any) {
      setError(err.message || "Failed to complete setup.");
    } finally {
      setIsVerifyingOtp(false);
      setIsSubmittingManual(false);
      setIsSkipping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-neutral-500 font-medium text-xs">
          Loading Vouchins profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C]">
      {/* Normal Authenticated Navigation Header */}
      <Navigation />

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-neutral-200/90 p-8 sm:p-10 shadow-xs">
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-3 bg-red-50/90 border border-red-200 py-3 px-4 rounded-2xl animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <p className="text-xs font-semibold text-red-600 leading-normal">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-700 p-1 rounded-lg hover:bg-red-100/50 transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: Single Smart Input (Company Name or Work Email)   */}
          {/* ======================================================== */}
          {view === "input" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Step 1 of 2
                </span>
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Where do you work?
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                  Enter your current company or work email to connect with your corporate network.
                </p>
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-5">
                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold text-neutral-800">
                    Company Name or Work Email
                  </Label>
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setSelectedCompanyId(null);
                      if (error) setError("");
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="e.g. Google or name@google.com"
                    className="rounded-xl border-neutral-300 h-12 text-sm font-medium focus:border-[#0A1B5C] focus:ring-2 focus:ring-[#0A1B5C]/10"
                    autoFocus
                    required
                  />

                  {/* Company autocomplete suggestions */}
                  {showSuggestions && companySuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in">
                      {companySuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-xs sm:text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setInputValue(suggestion.name);
                            setSelectedCompanyId(suggestion.id);
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="text-neutral-800 font-medium">{suggestion.name}</span>
                          <span className="text-[10px] text-[#0A1B5C] font-bold uppercase tracking-wider">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="agree"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#0A1B5C] rounded cursor-pointer"
                  />
                  <Label
                    htmlFor="agree"
                    className="text-xs text-neutral-500 leading-relaxed cursor-pointer select-none"
                  >
                    I agree to the Vouchins{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-[#0A1B5C] hover:underline font-bold"
                    >
                      community guidelines and terms
                    </Link>
                    .
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingInitial || !inputValue.trim() || !agreed}
                  className="w-full h-12 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white font-bold text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isSubmittingInitial ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </span>
                  ) : (
                    <span>Continue</span>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: Company Entered -> Enter Work Email or Skip Modal */}
          {/* ======================================================== */}
          {view === "choice" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setView("input");
                  setError("");
                  setChoiceEmailInput("");
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-bold transition-colors cursor-pointer"
              >
                ← Back
              </button>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Step 2 of 2
                </span>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Verify your role at {companyName}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                  Enter your work email address to get verified and unlock private corporate network access.
                </p>
              </div>

              {/* Directly visible Work Email Input */}
              <form onSubmit={handleStartVerificationFromChoice} className="space-y-5 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="work-email" className="text-xs font-bold text-neutral-800">
                    Work Email Address
                  </Label>
                  <Input
                    id="work-email"
                    type="email"
                    value={choiceEmailInput}
                    onChange={(e) => {
                      setChoiceEmailInput(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder={`name@${generateTempDomain(companyName)}`}
                    className="rounded-xl border-neutral-300 h-12 text-sm font-medium focus:border-[#0A1B5C] focus:ring-2 focus:ring-[#0A1B5C]/10"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                    We will send a 6-digit confirmation code. We never contact your employer.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSubmittingInitial || !choiceEmailInput.trim()}
                    className="w-full h-12 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white font-bold text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                  >
                    {isSubmittingInitial ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </span>
                    ) : (
                      <span>Send Verification Code</span>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setShowSkipDialog(true)}
                    className="w-full py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer text-center"
                  >
                    Skip verification
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: OTP Verification Screen                           */}
          {/* ======================================================== */}
          {view === "otp" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setView("input");
                  setError("");
                  setOtpError("");
                  setOtp("");
                }}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-bold transition-colors"
              >
                ← Change email or company
              </button>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Verification Code
                </span>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Check your work email
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium leading-relaxed">
                  We sent a 6-digit confirmation code to <b>{workEmail}</b>.
                </p>
              </div>

              {otpError && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 bg-red-50/90 border border-red-200 py-3 px-4 rounded-2xl animate-in fade-in duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <p className="text-xs font-semibold text-red-600 leading-normal">
                      {otpError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpError("")}
                    className="text-red-400 hover:text-red-700 p-1 rounded-lg hover:bg-red-100/50 transition-colors shrink-0 cursor-pointer"
                    aria-label="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-neutral-800">
                    6-Digit Verification Code
                  </Label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold h-14 rounded-xl border-neutral-300 focus:border-[#0A1B5C] focus:ring-2 focus:ring-[#0A1B5C]/10"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                {/* Primary Verify Button (Loading ONLY when verifying OTP) */}
                <Button
                  type="submit"
                  disabled={isVerifyingOtp || otp.length !== 6}
                  className="w-full h-12 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white font-bold text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  {isVerifyingOtp ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </span>
                  ) : (
                    <span>Verify and Enter</span>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  {/* Resend Code: Shows timer countdown beside button, disabled while timer runs */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendOtpToEmail(workEmail, undefined, true)}
                      disabled={isResendingOtp || resendCooldown > 0}
                      className="text-[#0A1B5C] hover:underline font-bold disabled:text-neutral-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    >
                      {isResendingOtp ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Resending...</span>
                        </>
                      ) : (
                        <span>Resend code</span>
                      )}
                    </button>
                    {resendCooldown > 0 && !isResendingOtp && (
                      <span className="text-neutral-400 font-semibold tabular-nums text-xs">
                        ({resendCooldown}s)
                      </span>
                    )}
                  </div>
                </div>
              </form>

              {/* Manual Verification Option: Link shown after 2 resends or 2 failed OTP attempts */}
              {(resendCount >= 2 || failedAttempts >= 2) && (
                <div className="pt-5 border-t border-neutral-200/80 animate-in fade-in duration-200">
                  {!isManualExpanded ? (
                    <div className="text-center py-1">
                      <p className="text-xs text-neutral-500 font-medium">
                        Having trouble receiving the code?{" "}
                        <button
                          type="button"
                          onClick={() => setIsManualExpanded(true)}
                          className="text-[#0A1B5C] hover:underline font-bold cursor-pointer"
                        >
                          Opt for manual verification
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-neutral-900">
                            Opt for Manual Verification
                          </h3>
                          <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                            If corporate firewall or external policies prevent receiving the confirmation code, our team can verify your role manually.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsManualExpanded(false)}
                          className="text-xs text-neutral-400 hover:text-neutral-700 font-medium ml-2 shrink-0 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handleManualVerificationSubmit} className="space-y-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-neutral-700">
                            LinkedIn Profile URL *
                          </Label>
                          <Input
                            type="url"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://www.linkedin.com/in/username"
                            className="rounded-xl border-neutral-300 h-11 text-xs font-medium focus:border-[#0A1B5C]"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-neutral-700">
                            Reason for Manual Verification *
                          </Label>
                          <Textarea
                            value={manualReason}
                            onChange={(e) => setManualReason(e.target.value)}
                            placeholder="e.g. Corporate firewall blocks external codes, work email not issued yet, or contractor status"
                            className="rounded-xl border-neutral-300 min-h-[75px] text-xs font-medium focus:border-[#0A1B5C] resize-none"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={
                            isSubmittingManual ||
                            !linkedinUrl.trim() ||
                            linkedinUrl.trim() === LINKEDIN_URL_PREFIX ||
                            !manualReason.trim()
                          }
                          className="w-full h-11 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          {isSubmittingManual ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting Request...</span>
                            </span>
                          ) : (
                            <span>Submit for Manual Verification</span>
                          )}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Skip Verification Confirmation Dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 gap-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-black text-neutral-900 tracking-tight">
              Continue without verification?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 font-medium leading-relaxed">
              Verifying your corporate email ensures authentic interactions across colleagues. Here is what changes without verification:
            </DialogDescription>
          </DialogHeader>

          {/* With Verification vs Without Verification Info */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
            <div>
              <h4 className="text-[11px] font-black text-neutral-900 uppercase tracking-wider">
                With Verification
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-neutral-600 leading-relaxed font-medium">
                <li>- Full access to private company channels and colleague discussions</li>
                <li>- Direct corporate referrals with 4x higher interview callback rate</li>
                <li>- 25 Vouch Points added to your profile immediately</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-neutral-200/80">
              <h4 className="text-[11px] font-black text-neutral-500 uppercase tracking-wider">
                Without Verification
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-neutral-500 leading-relaxed font-medium">
                <li>- Company discussions and verified referral requests remain locked</li>
                <li>- Public posts and tech job listings viewable only</li>
                <li>- You can still verify anytime later from your profile</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-1 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSkipDialog(false)}
              className="rounded-xl border-neutral-300 font-bold text-xs h-10 hover:bg-neutral-100 cursor-pointer order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                setShowSkipDialog(false);
                await handleSkipVerification();
              }}
              disabled={isSkipping}
              className="rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white font-bold text-xs h-10 shadow-xs cursor-pointer order-1 sm:order-2"
            >
              {isSkipping ? "Continuing..." : "Continue with unverified profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Minimal Footer */}
      <footer className="w-full py-4 text-center text-xs text-neutral-400 border-t border-neutral-200/60">
        <p>Vouchins - Verified Corporate Professional Network</p>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-neutral-500 font-medium text-xs">
            Loading Vouchins profile...
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
