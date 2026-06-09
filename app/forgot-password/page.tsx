"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, ShieldCheck, MessageCircle, Lock } from "lucide-react";
import Image from "next/image";
import { requestPasswordReset } from "./actions";
import { PublicNavbar } from "@/components/public-navbar";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState(""); // Can be work or personal
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await requestPasswordReset(
        identifier.trim().toLowerCase(),
      );

      if (result.error) throw new Error(result.error);

      setMessage({
        type: "success",
        text: "If an account exists, a reset link has been sent to your registered personal email address.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong. Please try again.",
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
            {/* Middle: Brand Info & Mock Post */}
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4FD1C5]" />
                  World's first 100% verified platform
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
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-semibold text-neutral-500 hover:text-neutral-900 mb-6 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 mb-2">
                Forgot password?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Enter either your <strong>work</strong> or <strong>personal email</strong>. We'll send a reset link to your registered personal email address.
              </p>
            </div>

            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
                className={`mb-6 rounded-2xl border-none flex items-center gap-3 p-4 ${
                  message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                )}
                <AlertDescription className="text-xs font-semibold">{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1 mb-1.5 block">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="identifier"
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Work or personal email"
                    required
                    className="h-12 rounded-2xl bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold pl-11"
                    disabled={loading || message?.type === "success"}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-white font-extrabold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] text-sm shadow-lg shadow-primary/10 mt-2"
                disabled={loading || message?.type === "success"}
              >
                {loading ? "Checking accounts..." : "Send reset link"}
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
