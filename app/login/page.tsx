"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

      if (authError) throw authError;

      if (data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("is_verified, onboarded")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!userData?.is_verified) {
          router.push("/verify-email");
        } else if (!userData?.onboarded) {
          router.push("/onboarding");
        } else {
          router.push("/feed");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
      <div className="flex items-center justify-center bg-neutral-50 px-4 py-16 min-h-[calc(100vh-16vh)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
              Welcome back
            </h1>
            <p className="text-neutral-600">Log in to your Vouchins account</p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="mt-1.5"
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="mt-1.5"
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
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
    </>
  );
}
