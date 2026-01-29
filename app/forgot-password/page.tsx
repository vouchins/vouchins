"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from "lucide-react";
import Image from "next/image";
import { requestPasswordReset } from "./actions";

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
        identifier.trim().toLowerCase()
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
          <div className="mb-8">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
            <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
              Forgot password?
            </h1>
            <p className="text-neutral-600">
              Enter either your <strong>work</strong> or{" "}
              <strong>personal email</strong>. We'll send a reset link to your
              personal email inbox.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
            {message && (
              <Alert
                variant={message.type === "error" ? "destructive" : "default"}
                className={`mb-6 ${message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : ""}`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleResetRequest} className="space-y-5">
              <div>
                <Label htmlFor="identifier">Email Address</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="identifier"
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Work or personal email"
                    required
                    className="pl-10"
                    disabled={loading || message?.type === "success"}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || message?.type === "success"}
              >
                {loading ? "Checking accounts..." : "Send reset link"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
