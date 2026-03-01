"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import {
  extractDomainFromEmail,
  validateFirstName,
} from "@/lib/auth/validation";
import posthog from "posthog-js";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tracking interaction for Progressive Disclosure
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const isPasswordLongEnough = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (email.includes("@")) {
      const domain = extractDomainFromEmail(email);
      if (domain) {
        posthog.capture("email_entered_at_signup", { domain });
      }
    }
  }, [email]);

  const canProceed =
    validateFirstName(firstName) &&
    email.includes("@") &&
    isPasswordLongEnough &&
    passwordsMatch &&
    !loading;

  const handleOAuthSignup = async (provider: "google" | "linkedin") => {
    setLoading(true);
    setError("");

    try {
      const supabaseProvider =
        provider === "linkedin" ? "linkedin_oidc" : "google";

      const res = await fetch("/api/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: supabaseProvider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Social signup failed.");
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          first_name: firstName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src="/images/logo.png"
              alt="Vouchins"
              className="h-10 mx-auto mb-4"
            />
          </Link>
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
            Create your account
          </h1>
          <div className="flex -space-x-2 mr-1">
            <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm px-4 py-3 text-center">
              ⚠️ Notice: Some users on certain Indian networks may experience
              login issues due to temporary ISP restrictions affecting our
              authentication provider. We are monitoring the situation.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Social Auth Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Google Button */}
            <Button
              variant="outline"
              onClick={() => handleOAuthSignup("google")}
              className="h-12 rounded-xl border-border bg-background hover:bg-secondary transition-all flex items-center justify-center gap-2.5 px-0 shadow-sm"
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
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                Google
              </span>
            </Button>

            {/* LinkedIn Button */}
            <Button
              variant="outline"
              onClick={() => handleOAuthSignup("linkedin")}
              className="h-12 rounded-xl border-border bg-background hover:bg-secondary transition-all flex items-center justify-center gap-2.5 px-0 shadow-sm"
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="#0A66C2"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                LinkedIn
              </span>
            </Button>
          </div>

          <div className="relative mb-8 text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-white px-4 text-xs text-neutral-500 uppercase">
              Or use email
            </span>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <Label>Full Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="mt-1.5"
                disabled={loading}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5"
                disabled={loading}
              />
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-neutral-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-neutral-500" />
                  )}
                </button>
              </div>
              {passwordTouched && !isPasswordLongEnough && (
                <p className="text-[11px] text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">
                  Password must be at least 8 characters.
                </p>
              )}
            </div>

            <div>
              <Label>Confirm Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  required
                  className="pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-neutral-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-neutral-500" />
                  )}
                </button>
              </div>
              {confirmTouched && !passwordsMatch && (
                <p className="text-[11px] text-red-500 mt-1 animate-in fade-in slide-in-from-top-1">
                  Passwords do not match.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!canProceed}>
              {loading ? "Processing..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-600">Already have an account? </span>
            <Link href="/login" className="font-medium hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
