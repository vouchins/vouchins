"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isCorporateEmail } from "@/lib/auth/validation";
import {
  Loader2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Building2,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function ChangeCompanyModal({ isOpen, onClose, user, onVerified }: any) {
  const [step, setStep] = useState(1); // 1: Warning, 2: Email, 3: OTP, 4: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [corporateEmail, setCorporateEmail] = useState("");
  const [otp, setOtp] = useState("");

  const navigateTo = (nextStep: number) => {
    setError("");
    setStep(nextStep);
  };

  const handleSendOtp = async () => {
    if (!isCorporateEmail(corporateEmail)) {
      setError("Please enter a valid corporate email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({
          email: corporateEmail,
          firstName: user.full_name,
        }),
      });
      if (res.ok) navigateTo(3);
      else throw new Error("Failed to send code. Please try again.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: corporateEmail, otp, userId: user.id }),
      });
      if (res.ok) {
        navigateTo(4);
      } else throw new Error("Invalid verification code.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    onVerified();
    onClose();
    // Reset state for future opens
    setTimeout(() => {
      setStep(1);
      setCorporateEmail("");
      setOtp("");
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-white sm:rounded-[2.5rem] h-[92vh] sm:h-auto flex flex-col shadow-2xl">
        <div className="px-6 pt-8 pb-4 flex items-center justify-between shrink-0">
          {step === 2 || step === 3 ? (
            <button
              onClick={() => navigateTo(step - 1)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <DialogTitle className="text-[17px] font-semibold tracking-tight">
            Change Company
          </DialogTitle>
          <div className="w-9" />
        </div>

        <div className="flex-1 px-8 pb-10 overflow-y-auto no-scrollbar">
          {error && (
            <Alert
              variant="destructive"
              className="mb-6 rounded-2xl border-none bg-red-50 text-red-800 animate-in fade-in zoom-in-95 flex items-center gap-3"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs font-semibold">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Warning */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="text-center space-y-3 pt-4">
                <div className="h-20 w-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-10 w-10 text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-neutral-900">
                  Important Notice
                </h3>
                <p className="text-sm text-neutral-500 max-w-[280px] mx-auto leading-relaxed">
                  You are about to change your verified company. 
                  <br /><br />
                  <strong className="text-neutral-800">You will lose access to your current company's private feed</strong>. You must verify your new company's corporate email to proceed.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigateTo(2)}
                  className="w-full h-14 rounded-2xl bg-primary text-white hover:opacity-90 font-bold"
                >
                  I Understand, Continue
                </Button>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl font-bold text-neutral-500 hover:text-neutral-900"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Enter Email */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pt-2">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">New Company Email</h3>
                <p className="text-sm text-neutral-500">
                  Enter the corporate email for your new company to receive a verification code.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                  Corporate Email
                </Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => {
                      setCorporateEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@newcompany.com"
                    className="h-14 rounded-2xl bg-neutral-50 border-none pr-12 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <button
                    disabled={!corporateEmail || loading}
                    onClick={handleSendOtp}
                    className="absolute right-2 top-2 h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verify OTP */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pt-2 text-center">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">Check your inbox</h3>
                <p className="text-sm text-neutral-500">
                  We sent a code to{" "}
                  <span className="text-neutral-900 font-medium">
                    {corporateEmail}
                  </span>
                </p>
              </div>
              <Input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter 6-digit code"
                className="h-14 text-center text-xl font-mono rounded-2xl bg-neutral-50 border-none"
                maxLength={6}
              />
              <Button
                className="w-full h-14 rounded-2xl bg-primary font-bold"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & Change Company"
                )}
              </Button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-12 space-y-6 animate-in zoom-in-95 duration-700">
              <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  Company Updated!
                </h3>
                <p className="text-sm text-neutral-500">
                  You have successfully verified and changed your company.
                </p>
              </div>
              <Button
                onClick={handleSuccessClose}
                className="w-full h-14 rounded-2xl bg-primary font-bold"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
