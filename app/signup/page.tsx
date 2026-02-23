"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Chrome, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import {
  extractDomainFromEmail,
  validateFirstName,
} from "@/lib/auth/validation";
import { supabase } from "@/lib/supabase/client";
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

    const supabaseProvider =
      provider === "linkedin" ? "linkedin_oidc" : "google";

    const scopes = provider === "linkedin" ? "openid profile email" : undefined;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: scopes,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "An error occurred during social signup.");
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { first_name: firstName } },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          email: email.toLowerCase().trim(),
          first_name: firstName,
          is_verified: false,
          onboarded: false,
        });
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
            <Button
              variant="outline"
              onClick={() => handleOAuthSignup("google")}
              disabled={loading}
            >
              <Chrome className="h-4 w-4 text-[#4285F4] mr-2" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthSignup("linkedin")}
              disabled={loading}
            >
              <Linkedin className="h-4 w-4 text-[#0A66C2] fill-[#0A66C2] mr-2" />
              LinkedIn
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
