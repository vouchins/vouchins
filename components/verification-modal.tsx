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
import { supabase } from "@/lib/supabase/client";
import {
  Loader2,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Link2,
  Mail,
  Building2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationModal({ isOpen, onClose, user, onVerified }: any) {
  const [step, setStep] = useState(1); // 1: Method Choice, 2: OTP, 3: Manual, 4: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP States
  const [corporateEmail, setCorporateEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Manual States
  const [companyName, setCompanyName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [manualWorkEmail, setManualWorkEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Helper to change step and clear errors
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
          firstName: user.first_name,
        }),
      });
      if (res.ok) navigateTo(2);
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
        onVerified();
        onClose();
      } else throw new Error("Invalid verification code.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let fileUrl = null;
      if (selectedFile) {
        const fileName = `${user.id}/${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        fileUrl = fileName;
      }

      const { error: insertError } = await supabase
        .from("manual_verification_requests")
        .insert({
          user_id: user.id,
          company_name: companyName.trim(),
          linkedin_url: linkedinUrl.trim(),
          corporate_email: manualWorkEmail.trim() || null,
          id_card_url: fileUrl,
          status: "pending",
          email: user.email,
        });

      if (insertError) throw insertError;
      navigateTo(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-white sm:rounded-[2.5rem] h-[92vh] sm:h-auto flex flex-col shadow-2xl">
        <div className="px-6 pt-8 pb-4 flex items-center justify-between shrink-0">
          {step === 2 || step === 3 ? (
            <button
              onClick={() => navigateTo(1)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <DialogTitle className="text-[17px] font-semibold tracking-tight">
            Professional Identity
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

          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="text-center space-y-3 pt-4">
                <div className="h-20 w-20 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-neutral-900">
                  Get Verified
                </h3>
                <p className="text-sm text-neutral-500 max-w-[240px] mx-auto leading-relaxed">
                  Join the circle of trusted IT professionals in Hyderabad.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                    Instant Access
                  </Label>
                  <div className="relative">
                    <Input
                      value={corporateEmail}
                      onChange={(e) => {
                        setCorporateEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="you@company.com"
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

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-neutral-100" />
                  </div>
                  <span className="relative bg-white px-4 text-[11px] font-bold text-neutral-300 uppercase left-1/2 -translate-x-1/2">
                    Or
                  </span>
                </div>

                <button
                  onClick={() => navigateTo(3)}
                  className="w-full p-6 rounded-[1.5rem] border border-neutral-100 bg-neutral-50/40 hover:bg-neutral-50 flex items-center justify-between group transition-all duration-300"
                >
                  <div className="text-left">
                    <p className="font-bold text-[15px]">Manual Verification</p>
                    <p className="text-xs text-neutral-400">
                      LinkedIn or ID Card Review
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-primary transition-all" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
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
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & Unlock"
                )}
              </Button>
            </div>
          )}

          {step === 3 && (
            <form
              onSubmit={handleManualSubmit}
              className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500 pt-2"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-neutral-900 ml-1 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />{" "}
                    Company Name *
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="e.g., Google, Microsoft"
                    className="h-13 rounded-2xl bg-neutral-50 border-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-neutral-900 ml-1 flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-neutral-400" /> LinkedIn
                    Profile *
                  </Label>
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => {
                      setLinkedinUrl(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="linkedin.com/in/username"
                    className="h-13 rounded-2xl bg-neutral-50 border-none"
                    required
                  />
                </div>
                <div className="space-y-2 text-neutral-500">
                  <Label className="text-[13px] font-bold text-neutral-900 ml-1 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-neutral-400" /> Work Email
                    (Optional)
                  </Label>
                  <Input
                    value={manualWorkEmail}
                    onChange={(e) => {
                      setManualWorkEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@company.com"
                    className="h-13 rounded-2xl bg-neutral-50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-neutral-900 ml-1 flex items-center gap-2 text-neutral-400 tracking-tight uppercase">
                    Optional ID Photo
                  </Label>
                  <div
                    className={cn(
                      "relative h-28 rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all",
                      selectedFile
                        ? "border-primary/20 bg-primary/[0.02]"
                        : "border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50"
                    )}
                  >
                    {!selectedFile ? (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <span className="text-[13px] font-semibold text-neutral-400">
                          Upload ID Card Photo
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            setSelectedFile(e.target.files?.[0] || null);
                            if (error) setError("");
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xs font-bold text-primary truncate max-w-[220px]">
                          {selectedFile.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-[10px] font-black text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/10"
                disabled={!companyName.trim() || !linkedinUrl.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </form>
          )}

          {step === 4 && (
            <div className="text-center py-12 space-y-6 animate-in zoom-in-95 duration-700">
              <div className="h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  Review Pending
                </h3>
                <p className="text-sm text-neutral-500">
                  We'll verify your details and unlock your profile within 24
                  hours.
                </p>
              </div>
              <Button
                onClick={onClose}
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
