"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck, MessageCircle, Lock, Building2, MapPin } from "lucide-react";
import Image from "next/image";
import { HomepageNavbar } from "@/components/homepage-navbar";
import posthog from "posthog-js";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    const res = await fetch("/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google" }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else {
      posthog.capture("Login", { method: "google" });
      window.location.href = data.url;
    }
  };

  const handleLinkedInLogin = async () => {
    setError("");
    const res = await fetch("/api/auth/oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "linkedin_oidc" }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
    } else {
      posthog.capture("Login", { method: "linkedin" });
      window.location.href = data.url;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      posthog.capture("Login", { method: "email" });
      window.location.href = "/feed";
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HomepageNavbar />
      <div className="min-h-screen flex bg-primary animate-in fade-in duration-500 pt-[88px] relative overflow-hidden">
        {/* Full-screen Background Decorative Blurs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#4FD1C5]/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#4FD1C5]/5 blur-[120px]" />
        </div>

        {/* Left Panel: Showcase (Desktop Only) */}
        <div className="hidden md:flex md:w-[45%] lg:w-[50%] text-white flex-col justify-between px-12 pb-12 pt-12 relative z-10 shrink-0">

          <div className="relative z-10 flex flex-col justify-between h-full">
            {/* Middle: Brand Info & Mock Post */}
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4FD1C5]" />
                  World's first 100% verified platform
                </span>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight pb-2 bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                  Welcome back, <br />Login to your account.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed font-light">
                  Jump back into your trusted circle. Catch up on the latest industry opportunities, exclusive referrals, and peer discussions.
                </p>
              </div>

              {/* Floating Glassmorphic Widgets */}
              <div className="space-y-4 pt-4">
                {/* Realistic Dummy Post Card (Login) */}
                <div className="bg-white rounded-[2rem] shadow-2xl border border-neutral-100 overflow-hidden relative rotate-[-1deg] hover:rotate-0 transition-transform duration-500 scale-95 origin-left">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-[#0A1B5C] to-[#4FD1C5] flex items-center justify-center text-white font-bold text-lg shadow-inner ring-2 ring-white">
                          R
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-[15px] font-bold text-neutral-900">Rahul Verma</h4>
                            <ShieldCheck className="h-4 w-4 text-[#4FD1C5]" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 font-medium">
                            <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                            Google
                            <span className="text-neutral-300">•</span>
                            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                            Hyderabad
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        <div className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold uppercase tracking-wider">
                          Housing
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-[#4FD1C5]/10 text-[#2C9A90] text-[10px] font-bold uppercase tracking-wider border border-[#4FD1C5]/20">
                          Flatmates
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="mt-5 text-[14px] text-neutral-700 leading-relaxed font-medium">
                      Looking for a chilled out flatmate (preferably in tech) for a fully furnished 3BHK in Gachibowli. 5 mins from the Google campus. Rent is 25k/month. DM if interested!
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-500">
                        <MessageCircle className="h-4 w-4" />
                        8 Replies
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-[#4FD1C5]">
                        <ShieldCheck className="h-4 w-4" />
                        3 Vouches
                      </div>
                    </div>
                  </div>
                </div>

                {/* Widget 2: Security highlights tailored for returners */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-[#4FD1C5]/10 flex items-center justify-center text-[#4FD1C5] shrink-0">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-neutral-200">Secure Session</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">Your connection is end-to-end encrypted.</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-neutral-200">Identity Active</h4>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-normal">Your verified status is currently active.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col space-y-2 text-xs text-neutral-400">
              <div className="grid grid-cols-3 gap-2 text-xs text-neutral-400 font-medium">
                <div className="flex items-center gap-1">
                  <span>© 2026 Vouchins Inc.</span>
                </div>
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
        </div>

        {/* Right Panel: Form */}
        <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col justify-between px-6 sm:px-12 pb-6 sm:pb-12 pt-12 relative z-10">
          {/* Top spacer */}
          <div />

          {/* Center Container */}
          <div className="w-full max-w-[420px] mx-auto py-10 px-8 sm:px-10 bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-200/60 relative">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-transparent via-[#4FD1C5] to-transparent opacity-50"></div>

            {error && (
              <Alert variant="destructive" className="mb-6 rounded-2xl border-none bg-red-50 text-red-800 flex items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Social Logins Container */}
              <div className="grid grid-cols-2 gap-4">
                {/* Google Login Button */}
                <Button
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="h-12 rounded-2xl border-neutral-200 bg-white hover:bg-neutral-50 transition-all flex items-center justify-center gap-2.5 px-0 shadow-sm"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">
                    Google
                  </span>
                </Button>

                {/* LinkedIn Login Button */}
                <Button
                  variant="outline"
                  onClick={handleLinkedInLogin}
                  className="h-12 rounded-2xl border-neutral-200 bg-white hover:bg-neutral-50 transition-all flex items-center justify-center gap-2.5 px-0 shadow-sm"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="#0A66C2"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">
                    LinkedIn
                  </span>
                </Button>
              </div>

              {/* Center Aligned Divider */}
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-neutral-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                  Or
                </span>
                <div className="flex-grow border-t border-neutral-100"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1 mb-1.5 block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@company.com"
                    required
                    className="h-12 rounded-2xl bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="password" className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1 block">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Enter password"
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
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-white font-extrabold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] text-sm shadow-lg shadow-primary/10 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Bottom spacer / Footer */}
          <div className="text-center text-[10px] text-white/60 mt-8 leading-relaxed max-w-xs mx-auto">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-white">Terms of Service</Link>
            {" and "}
            <Link href="/privacy" className="underline hover:text-white">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </>
  );
}
