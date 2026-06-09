"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  MessageCircle,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { validatePassword } from "@/lib/auth/password";
import Image from "next/image";
import { PublicNavbar } from "@/components/public-navbar";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // 1. Check for hash in URL (Implicit Flow from email link)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // Explicitly set the session using the tokens from the hash
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ error }) => {
            if (error) {
              setStatus({
                type: "error",
                text: "Failed to establish session. Please request a new link.",
              });
            } else {
              // Clean up the URL hash for security
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search,
              );
              setStatus(null);
            }
          });
      }
    } else {
      // 2. Fallback: Verify if a session was already established
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setStatus({ type: "error", text: "Invalid or expired reset link." });
        }
      });
    }

    // Listen for the recovery event just in case Supabase auto-detects it first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery session established");
        setStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use your existing validation utility
  const validation = useMemo(() => validatePassword(password), [password]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Match Check
    if (password !== confirmPassword) {
      setStatus({ type: "error", text: "Passwords do not match." });
      return;
    }

    // 2. Use your shared validation logic
    if (!validation.isValid) {
      setStatus({
        type: "error",
        text: "Password does not meet the security requirements.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setStatus({
        type: "success",
        text: "Password updated successfully! Redirecting to login...",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setStatus({
        type: "error",
        text:
          err.message || "Failed to update password. Link may have expired.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicNavbar />
      <div className="min-h-[calc(100vh-64px)] flex bg-neutral-50 animate-in fade-in duration-500">
        {/* Left Panel: Showcase (Desktop Only) */}
        <div className="hidden md:flex md:w-[45%] lg:w-[50%] bg-neutral-950 text-white flex-col justify-between p-12 relative overflow-hidden shrink-0 border-r border-neutral-900">
          {/* Background Decorative Blurs */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-[#4FD1C5]/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/5 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full">
            {/* Top row spacer */}
            <div />

            {/* Middle: Brand Info & Mock Post */}
            <div className="space-y-8 my-auto">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4FD1C5]" />
                  Now Live in All Cities
                </span>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                  Work Life, <br />Verified.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed font-light">
                  Connect and transact with verified professionals at top employers. Real people, verified identities, trusted connections.
                </p>
              </div>

              {/* Floating Glassmorphic Widgets */}
              <div className="space-y-4 pt-4">
                {/* Widget 1: Mock Post */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md space-y-3 shadow-2xl relative overflow-hidden group hover:border-white/[0.15] transition-all">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#4FD1C5]/10 rounded-full blur-2xl" />
                  <div className="flex justify-between items-center text-xs text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4FD1C5]" />
                      <span className="font-semibold text-neutral-300">Amit Sharma • TCS</span>
                    </div>
                    <span>10m ago</span>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    "Looking for a software engineering referral for a Senior Frontend role at Google. 5+ years of React experience. Appreciate any leads!"
                  </p>
                  <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-[#4FD1C5]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified Member
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-neutral-400" />
                      6 Responses
                    </span>
                  </div>
                </div>

                {/* Widget 2: Security highlights */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-neutral-200">100% Compliant</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">SPF, DKIM & DMARC deliverability standard</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#4FD1C5]/10 flex items-center justify-center text-[#4FD1C5] shrink-0">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-neutral-200">Zero IT Footprint</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">Zero integrations with HR or AD systems</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

{/* Security Footer */}
      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 font-medium">
        <div className="flex items-center gap-1">
          <Lock className="h-4 w-4 text-[#4FD1C5]" />
          <span>Encrypted & Secure</span>
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-[#4FD1C5]" />
          <span>Industry‑standard security</span>
        </div>
      </div>
          </div>
        </div>

        {/* Right Panel: Form */}
        <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col justify-between p-6 sm:p-12 bg-white min-h-[calc(100vh-64px)]">
          {/* Top spacer */}
          <div />

          {/* Center Container */}
          <div className="w-full max-w-sm mx-auto my-auto py-8">
            <div className="text-center md:text-left mb-6">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 mb-2">
                Set new password
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500">
                Please enter your new secure password below.
              </p>
            </div>

            {status && (
              <Alert
                variant={status.type === "error" ? "destructive" : "default"}
                className={`mb-6 rounded-2xl border-none flex items-center gap-3 p-4 ${
                  status.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {status.type === "error" ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                )}
                <AlertDescription className="text-xs font-semibold">{status.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1 mb-1.5 block">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="h-12 rounded-2xl bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Visual Requirements Guide */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${validation.length ? "bg-green-500" : "bg-neutral-200"}`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${validation.uppercase ? "bg-green-500" : "bg-neutral-200"}`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${validation.number ? "bg-green-500" : "bg-neutral-200"}`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full transition-colors ${validation.specialChar ? "bg-green-500" : "bg-neutral-200"}`}
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-bold">
                      8+ chars, Upper, Num, Special
                    </p>
                    {password && (
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${validation.strengthScore >= 3 ? "text-green-600" : "text-orange-500"}`}
                      >
                        Strength: {validation.strengthScore}/4
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1 mb-1.5 block">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="h-12 rounded-2xl bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-white font-extrabold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] text-sm shadow-lg shadow-primary/10 mt-2 flex items-center justify-center gap-2"
                disabled={loading || status?.type === "success"}
              >
                {!loading && <ShieldCheck className="h-4 w-4" />}
                {loading ? "Updating..." : "Secure Account"}
              </Button>
            </form>
          </div>

          {/* Bottom spacer / Footer */}
          <div className="text-center text-[10px] text-neutral-400 mt-8 md:mt-0 leading-relaxed max-w-xs mx-auto">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-neutral-600">Terms of Service</Link>
            {" and "}
            <Link href="/privacy" className="underline hover:text-neutral-600">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </>
  );
}
