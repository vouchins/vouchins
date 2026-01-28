"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  // New Timer Logic
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [showWaitlistLink, setShowWaitlistLink] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace("/signup");
      return;
    }

    // Countdown logic
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setShowWaitlistLink(true);
    }
  }, [email, router, timeLeft]);

  if (!email) return null;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }

      setVerified(true);
      setTimeout(() => router.push("/onboarding"), 1000);
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white border rounded-lg p-8 shadow-sm">
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
              className="w-full border rounded-md px-3 py-3 text-center tracking-[0.5em] text-lg font-bold focus:ring-2 focus:ring-primary outline-none"
              maxLength={6}
              inputMode="numeric"
              required
            />
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </form>
        )}

        {/* Manual Approval Section */}
        <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          {timeLeft > 0 ? (
            <div className="space-y-2">
              <p className="text-[12px] text-neutral-500 font-medium">
                Waiting for your code?
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
                Corporate security filters may delay delivery.
                <br />
                Manual approval available in{" "}
                <span className="font-mono text-neutral-600">
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <p className="text-sm text-neutral-600 mb-3">
                Still haven't received the email?
              </p>
              <Link
                href={`/waitlist?email=${encodeURIComponent(email)}`}
                className="inline-flex items-center text-sm font-semibold text-primary hover:underline"
              >
                Request Manual Verification →
              </Link>
              <p className="text-[10px] text-neutral-400 mt-4 italic">
                Our team manually validates requests to maintain network
                integrity.
              </p>
            </div>
          )}
        </div>
        {/* <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
          {!showWaitlistLink ? (
            <div className="text-xs text-neutral-400 flex flex-col items-center justify-center gap-2 text-center leading-relaxed">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Corporate network security may delay delivery by up to 3
                  minutes.
                </span>
              </div>

              <p>
                Still haven't received your code?
                <br />
                Manual verification will be available in{" "}
                <span className="font-mono font-medium text-neutral-600">
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </p>

              <p className="text-[10px] italic opacity-80 max-w-[280px]">
                Our verification team manually reviews requests to ensure
                network integrity.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-600">
                Didn't receive the code?
              </p>
              <Link
                href={`/waitlist?email=${encodeURIComponent(email)}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Get Manual Approval / Signup for Waitlist →
              </Link>
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
}
