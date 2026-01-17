export const dynamic = "force-dynamic";

("use client");

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  if (!email) {
    router.push("/signup");
    return null;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let password = "";
      let firstName = "";

      if (typeof window !== "undefined") {
        password = localStorage.getItem(`signup-password:${email}`) || "";
        firstName = localStorage.getItem(`signup-firstname:${email}`) || "";
      }

      if (!password) {
        throw new Error("Signup session expired. Please sign up again.");
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.trim(),
          password,
          firstName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code");

      if (typeof window !== "undefined") {
        localStorage.removeItem(`signup-password:${email}`);
        localStorage.removeItem(`signup-firstname:${email}`);
      }

      setVerified(true);

      setTimeout(() => {
        router.push("/onboarding");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white border rounded-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <Mail className="h-8 w-8 text-neutral-600" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-2">
          Verify your email
        </h1>

        <p className="text-sm text-neutral-600 text-center mb-6">
          Enter the 6-digit code sent to
          <br />
          <span className="font-medium text-neutral-900">{email}</span>
        </p>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {verified ? (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Email verified. Redirecting…</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="6-digit code"
              className="w-full border rounded px-3 py-2 text-center tracking-widest"
              maxLength={6}
              inputMode="numeric"
              required
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </form>
        )}

        <div className="mt-6">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Back to login
          </Button>
        </div>
      </div>
    </div>
  );
}
