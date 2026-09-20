"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  ArrowLeft,
  Loader2,
  RotateCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase/browser";
import { Navigation } from "@/components/navigation";
import { isCorporateEmail } from "@/lib/auth/validation";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryEmail = searchParams.get("email") || "";
  const returnTo = searchParams.get("returnTo") || "/feed";
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/feed";

  // Auth & Profile state
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  // Verification flow state: "email" | "otp" | "success"
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Manual fallback timer (3 minutes countdown)
  const [timeLeft, setTimeLeft] = useState(180);
  const [showManualOption, setShowManualOption] = useState(false);

  // Check auth session and fetch profile
  useEffect(() => {
    async function initUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          // Redirect unauthenticated users to login, preserving returnTo to verify-email
          const loginRedirectUrl = `/login?returnTo=${encodeURIComponent(
            `/verify-email${queryEmail ? `?email=${encodeURIComponent(queryEmail)}` : ""}`
          )}`;
          router.replace(loginRedirectUrl);
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id, full_name, email, secondary_email, is_verified, onboarded")
          .eq("id", authUser.id)
          .maybeSingle();

        setCurrentUser({ ...authUser, ...profile });

        if (profile?.is_verified) {
          setAlreadyVerified(true);
          setCheckingAuth(false);
          return;
        }

        // Determine initial corporate email
        let initialEmail = queryEmail.trim();
        if (!initialEmail) {
          if (profile?.secondary_email) {
            initialEmail = profile.secondary_email;
          } else if (authUser.email && isCorporateEmail(authUser.email)) {
            initialEmail = authUser.email;
          }
        }

        setCorporateEmail(initialEmail);
        setCheckingAuth(false);
      } catch (err) {
        console.error("Error loading user verification state:", err);
        setCheckingAuth(false);
      }
    }

    initUser();
  }, [router, queryEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Manual review fallback timer
  useEffect(() => {
    if (step === "otp" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === "otp" && timeLeft === 0) {
      setShowManualOption(true);
    }
  }, [step, timeLeft]);

  // Step 1: Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = corporateEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your corporate email address.");
      return;
    }

    if (!isCorporateEmail(cleanEmail)) {
      setError("Please enter a valid corporate email (personal domains like Gmail or Yahoo are not eligible).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const firstName = currentUser?.full_name?.split(" ")[0] || "there";
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, firstName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code. Please try again.");
      }

      setStep("otp");
      setResendCooldown(60);
      setTimeLeft(180);
      setShowManualOption(false);
      posthog.capture("Verification OTP Requested", { email: cleanEmail });
    } catch (err: any) {
      setError(err.message || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = corporateEmail.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code. Please try again.");
      }

      setStep("success");
      posthog.capture("Corporate Email Verified", { email: cleanEmail });

      setTimeout(() => {
        window.location.href = safeReturnTo;
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex flex-col">
        <Navigation />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-neutral-600">Loading your verification status...</p>
          </div>
        </div>
      </div>
    );
  }

  // State: Already verified
  if (alreadyVerified) {
    return (
      <div className="min-h-screen bg-[#FBFBFC] flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-2xl p-8 shadow-xl text-center space-y-6">
            <div className="h-16 w-16 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <ShieldCheck className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                You're Already Verified!
              </h1>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Your professional corporate identity is active. You have full access to private company discussions, unblurred salary insights, and coworker referrals.
              </p>
            </div>

            <Button
              onClick={() => router.push(safeReturnTo)}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all"
            >
              Continue to Feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex flex-col">
      <Navigation />
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-md bg-white border border-neutral-200/80 rounded-[1.75rem] p-6 sm:p-8 shadow-2xl space-y-6">

        {/* Step Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            {step === "success" ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            ) : step === "otp" ? (
              <Mail className="h-7 w-7 text-primary" />
            ) : (
              <Building2 className="h-7 w-7 text-primary" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#0A1B5C]">
              {step === "success"
                ? "Verification Complete!"
                : step === "otp"
                ? "Enter Verification Code"
                : "Verify Your Work Email"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-[320px] mx-auto leading-relaxed">
              {step === "success"
                ? "Your corporate email has been verified. Unlocking full platform access..."
                : step === "otp"
                ? (
                  <>
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-neutral-800">{corporateEmail}</span>
                  </>
                )
                : "Confirm your corporate email to unlock unblurred discussions, coworker feeds, and trusted referrals."}
            </p>
          </div>
        </div>

        {/* Status Error Alert */}
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: Enter Corporate Email */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 ml-1">
                Corporate Email Address
              </Label>
              <Input
                type="email"
                value={corporateEmail}
                onChange={(e) => setCorporateEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-12 text-sm font-semibold rounded-xl bg-neutral-50/70 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary"
                required
                autoFocus
              />
              <p className="text-[11px] text-neutral-400 ml-1">
                Must be an active work email (e.g. @google.com, @microsoft.com, @uber.com).
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !corporateEmail.trim()}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Code...
                </span>
              ) : (
                "Send Verification Code"
              )}
            </Button>

            <div className="pt-2 text-center">
              <Link
                href={`/waitlist?email=${encodeURIComponent(corporateEmail)}`}
                className="text-xs font-medium text-neutral-500 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <span>Don't have a work email? Request manual review</span>
                <span>→</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter OTP Code */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  6-Digit OTP Code
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                  }}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Change email
                </button>
              </div>

              <Input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="h-14 text-center tracking-[0.5em] text-2xl font-mono font-bold rounded-xl bg-neutral-50/70 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary"
                maxLength={6}
                inputMode="numeric"
                required
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading || otp.trim().length !== 6}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-md transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </span>
              ) : (
                "Verify & Unlock Access"
              )}
            </Button>

            <div className="flex flex-col items-center gap-3 pt-2 text-center">
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={() => handleSendOtp()}
                className="text-xs font-semibold text-neutral-600 hover:text-primary disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive code? Resend"}
              </button>

              {/* Manual review fallback logic */}
              {showManualOption ? (
                <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <p className="text-xs text-neutral-600 mb-1.5">
                    Corporate security filters delaying your email?
                  </p>
                  <Link
                    href={`/waitlist?email=${encodeURIComponent(corporateEmail)}`}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Request Manual Moderator Verification →
                  </Link>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400">
                  Corporate mail filters may take 1 - 2 minutes. Manual review option in{" "}
                  <span className="font-mono text-neutral-600">
                    {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </p>
              )}
            </div>
          </form>
        )}

        {/* STEP 3: Verification Success */}
        {step === "success" && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-neutral-900">
                Welcome to the Verified Community!
              </p>
              <p className="text-xs text-neutral-500">
                Redirecting you to the feed...
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = safeReturnTo;
              }}
              className="mt-2 bg-primary text-white font-bold rounded-xl px-6"
            >
              Go to Feed Now
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
