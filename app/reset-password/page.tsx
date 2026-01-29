"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/auth/password";
import Image from "next/image";

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
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center bg-neutral-50 px-4 py-16 min-h-[calc(100vh-16vh)]">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
              Set new password
            </h1>
            <p className="text-neutral-600">
              Please enter your new secure password below.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
            {status && (
              <Alert
                variant={status.type === "error" ? "destructive" : "default"}
                className={`mb-6 ${status.type === "success" ? "border-green-200 bg-green-50 text-green-800" : ""}`}
              >
                {status.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>{status.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <div>
                <Label htmlFor="password">New Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
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

                {/* Visual Requirements Guide driven by your utility */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
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
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
                      8+ chars, Uppercase, Number, Special
                    </p>
                    {password && (
                      <span
                        className={`text-[10px] font-bold uppercase ${validation.strengthScore >= 3 ? "text-green-600" : "text-orange-500"}`}
                      >
                        Strength: {validation.strengthScore}/4
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="mt-1.5"
                />
              </div>

              <Button
                type="submit"
                className="w-full flex items-center justify-center gap-2"
                disabled={loading || status?.type === "success"}
              >
                {!loading && <ShieldCheck className="h-4 w-4" />}
                {loading ? "Updating..." : "Secure Account"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
