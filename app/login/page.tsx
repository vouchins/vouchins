"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Chrome,
  Loader2,
  Linkedin,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) setError(authError.message);
  };

  const handleLinkedInLogin = async () => {
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc", // Note: Use linkedin_oidc for the modern OpenID flow
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Optional: Request specific scopes if needed
        scopes: "openid profile email",
      },
    });
    if (authError) setError(authError.message);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim().toLowerCase(),
          password,
        }
      );

      if (authError) {
        if (authError.message.includes("provider")) {
          setError(
            "This account is linked with Google. Please Sign in with Google."
          );
        } else {
          throw authError;
        }
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("onboarded")
          .eq("id", data.user.id)
          .single();

        router.push(userData?.onboarded ? "/feed" : "/onboarding");
      }
    } catch (err: any) {
      if (err.message.includes("Invalid login credentials")) {
        setError(
          "Invalid email or password. If you signed up with Google or Linkedin, please use the button above."
        );
      } else {
        setError(err.message || "Failed to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Restored exact header from your original code */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Image
                  src="/images/logo.png"
                  alt="Vouchins"
                  width={140}
                  height={40}
                  className="object-contain"
                  priority
                />
              </Link>
              <h1 className="sr-only">Vouchins</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center bg-neutral-50 px-4 py-16 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
              Welcome back
            </h1>
            <p className="text-neutral-600">Log in to your Vouchins account</p>
          </div>

          <div className="bg-white rounded-[var(--radius)] border border-neutral-200 p-8 shadow-sm">
            {error && (
              <Alert variant="destructive" className="mb-6 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-6">
              {/* Social Logins Container */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Google Button */}
                <Button
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="h-12 rounded-[calc(var(--radius)-0.5rem)] border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-[0.97] flex items-center justify-center gap-2 px-0"
                >
                  <Chrome className="h-4 w-4 text-[#4285F4]" />
                  <span className="text-sm font-bold text-neutral-700">
                    Google
                  </span>
                </Button>

                {/* LinkedIn Button */}
                <Button
                  onClick={handleLinkedInLogin}
                  variant="outline"
                  className="h-12 rounded-[calc(var(--radius)-0.5rem)] border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-[0.97] flex items-center justify-center gap-2 px-0"
                >
                  {/* Using Lucide Linkedin icon for consistency */}
                  <Linkedin className="h-4 w-4 text-[#0A66C2] fill-[#0A66C2]" />
                  <span className="text-sm font-bold text-neutral-700">
                    LinkedIn
                  </span>
                </Button>
              </div>

              {/* Center Aligned Divider (Same as before) */}
              <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-neutral-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                  Or
                </span>
                <div className="flex-grow border-t border-neutral-100"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
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
                    className="mt-1.5 h-12 rounded-[calc(var(--radius)-0.75rem)] bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
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
                      className="h-12 rounded-[calc(var(--radius)-0.75rem)] bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
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
                  className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-[calc(var(--radius)-0.5rem)] hover:opacity-90 transition-all active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-neutral-600">
                  {"Don't have an account? "}
                </span>
                <Link
                  href="/signup"
                  className="text-neutral-900 font-medium hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
