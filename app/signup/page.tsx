"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import {
  isCorporateEmail,
  extractDomainFromEmail,
  validateFirstName,
} from "@/lib/auth/validation";
import { validatePassword } from "@/lib/auth/password";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");

  const passwordState = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const canProceed =
    validateFirstName(firstName) &&
    isCorporateEmail(email) &&
    passwordState.isValid &&
    passwordsMatch &&
    !loading;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!validateFirstName(firstName)) {
      setError("First name must be between 2–50 characters.");
      setLoading(false);
      return;
    }

    if (!isCorporateEmail(email)) {
      setError(
        "Please use your corporate email. Personal email domains are not allowed."
      );
      setLoading(false);
      return;
    }

    //TODO UnComment to add Waitlist functionality
    // // Company domain check (unchanged logic)
    // const domain = extractDomainFromEmail(email)
    //   .trim()
    //   .toLowerCase()
    //   .replace(/^\.+|\.+$/g, "");

    // const { data: allCompanies, error: companiesError } = await supabase
    //   .from("companies")
    //   .select("domain");

    // if (companiesError) {
    //   setError("Error checking company domains.");
    //   setLoading(false);
    //   return;
    // }

    // const match =
    //   allCompanies &&
    //   allCompanies.find(
    //     (row: any) =>
    //       typeof row.domain === "string" &&
    //       row.domain.trim().toLowerCase() === domain
    //   );

    // if (!match) {
    //   setShowWaitlist(true);
    //   setWaitlistEmail(email);
    //   setLoading(false);
    //   return;
    // }

    /* ---------------- send OTP ---------------- */

    try {
      /* ---------------- Check Existence ---------------- */
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (checkError) {
        throw new Error("Error checking user existence.");
      }

      if (existingUser) {
        setError("An account with this email already exists. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
            {/* <Building2 className="h-10 w-10 text-neutral-700" /> */}
            <div className="flex flex-col items-center mb-4">
              <Link href="/" aria-label="Go to homepage">
              <img
                src="/images/logo.png"
                alt="Vouchins"
                className="h-10 mt-4 cursor-pointer"
              />
              </Link>
              <p className="text-sm text-primary text-center mt-4">
                 A verified professional network for trusted recommendations
              </p>
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2">
            Create your Vouchins account
          </h1>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4 mb-6 text-sm text-neutral-700">
          <p className="font-medium mb-2">How verification works</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sign up using your official work email</li>
            <li>Verify via a one-time code sent to your inbox</li>
            <li>Access recommendations from verified professionals</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showWaitlist ? (
            <div className="text-center text-neutral-700">
              <strong>Your company is not yet supported.</strong>
              <p className="mt-2 text-sm">
                <b>{waitlistEmail}</b> has been added to the waitlist.
                <br />
                We’ll notify you when Vouchins is available for your
                organization.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <Label>First Name</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label>Corporate Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1.5"
                  required
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  Personal email domains are not allowed.
                </p>
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="mt-1.5"
                  required
                />
              </div>

              {/* Password rules */}
              <ul className="text-xs text-neutral-600 space-y-1">
                <li>
                  {passwordState.length ? "✅" : "❌"} At least 8 characters
                </li>
                <li>
                  {passwordState.uppercase ? "✅" : "❌"} Uppercase letter
                </li>
                <li>
                  {passwordState.lowercase ? "✅" : "❌"} Lowercase letter
                </li>
                <li>{passwordState.number ? "✅" : "❌"} Number</li>
                <li>
                  {passwordState.specialChar ? "✅" : "❌"} Special character
                </li>
                <li>{passwordsMatch ? "✅" : "❌"} Passwords match</li>
              </ul>

              {/* Strength bar */}
              <div className="h-2 w-full bg-neutral-200 rounded">
                <div
                  className={`h-2 rounded transition-all ${
                    passwordState.strengthScore >= 3
                      ? "bg-green-500"
                      : "bg-yellow-400"
                  }`}
                  style={{
                    width: `${(passwordState.strengthScore + 1) * 20}%`,
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                We never share your email publicly. Your work email is used only
                for verification.
              </p>
              <Button type="submit" className="w-full" disabled={!canProceed}>
                {loading
                  ? "Sending verification code..."
                  : "Send verification code"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-600">Already have an account? </span>
            <Link href="/login" className="font-medium hover:underline">
              Log in
            </Link>
          </div>
          <p className="text-xs text-neutral-500 text-center mt-4">
            Built for professionals. Designed for trust.
          </p>
        </div>
      </div>
    </div>
  );
}
