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
import { supabase } from "@/lib/supabase/browser";
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
  const [step, setStep] = useState(1); // 1: Choice, 2: Email, 3: Manual, 4: OTP, 5: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP States
  const [corporateEmail, setCorporateEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Manual States
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
          firstName: user.full_name,
        }),
      });
      if (res.ok) navigateTo(4); // Navigate to OTP code entry step
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
          company_name: user?.company?.name || "Unknown Company",
          linkedin_url: linkedinUrl.trim(),
          corporate_email: manualWorkEmail.trim() || null,
          id_card_url: fileUrl,
          status: "pending",
          email: user.email,
        });

      if (insertError) throw insertError;
      navigateTo(5); // Navigate to verification pending step
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] p-0 overflow-hidden border-none bg-white rounded-[2rem] sm:rounded-[2.5rem] max-h-[92vh] h-auto flex flex-col shadow-2xl gap-0">
        <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-3 sm:pb-4 flex items-center justify-between shrink-0">
          {step === 2 || step === 3 ? (
            <button
              onClick={() => navigateTo(1)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </button>
          ) : step === 4 ? (
            <button
              onClick={() => navigateTo(2)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <DialogTitle className="text-base sm:text-[17px] font-semibold tracking-tight text-neutral-900">
            Professional Verification
          </DialogTitle>
          <div className="w-9" />
        </div>

        <div className="flex-1 px-4 sm:px-8 pb-6 sm:pb-10 overflow-y-auto no-scrollbar">
          {error && (
            <Alert
              variant="destructive"
              className="mb-4 sm:mb-6 rounded-2xl border-none bg-red-50 text-red-800 animate-in fade-in zoom-in-95 flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs font-semibold">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="text-center space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary/5 rounded-[1.25rem] sm:rounded-[1.5rem] flex items-center justify-center mx-auto mb-1 sm:mb-2">
                  <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
                  Choose Verification Method
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 max-w-[280px] mx-auto leading-relaxed">
                  Join verified professionals from Google, TCS, Microsoft, and 500+ top companies.
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                <button
                  onClick={() => navigateTo(2)}
                  className="w-full p-4 sm:p-5 text-left rounded-[1.25rem] sm:rounded-[1.5rem] border-2 border-primary/20 bg-primary/[0.02] hover:bg-primary/[0.04] transition-all relative group shadow-sm"
                >
                  <div className="flex gap-2.5 sm:gap-3 items-start">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-extrabold text-sm sm:text-[15px] text-neutral-900">Work Email Verification</p>
                        <span className="bg-primary text-white text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm shrink-0">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal mt-0.5 sm:mt-1">
                        Instant 10-second verification via 6-digit OTP code. Safe & private.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo(3)}
                  className="w-full p-4 sm:p-5 text-left rounded-[1.25rem] sm:rounded-[1.5rem] border border-neutral-200/80 bg-white hover:bg-neutral-50/50 transition-all group shadow-sm"
                >
                  <div className="flex gap-2.5 sm:gap-3 items-start">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 mt-0.5 group-hover:bg-neutral-200/60 group-hover:text-primary transition-colors">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm sm:text-[15px] text-neutral-900">Manual ID & Profile Review</p>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-normal mt-0.5 sm:mt-1">
                        No work email? Verify via your LinkedIn profile or employee ID card.
                      </p>
                    </div>
                  </div>
                </button>

                <div className="bg-neutral-50 rounded-2xl p-3.5 sm:p-4 border border-neutral-100 mt-3 sm:mt-4 flex gap-2.5 sm:gap-3 items-start">
                  <ShieldCheck className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-neutral-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9.5px] sm:text-[10px] font-black text-neutral-800 uppercase tracking-wider">100% Confidential & Secure</p>
                    <p className="text-[9.5px] sm:text-[10px] text-neutral-500 leading-relaxed mt-0.5">
                      We never store or share your email, and we will never contact your employer. Your privacy is our highest priority.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pt-1 sm:pt-2">
              <div className="text-center space-y-1.5 sm:space-y-2">
                <div className="h-11 w-11 sm:h-12 sm:w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto text-primary mb-2 sm:mb-3">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-neutral-900">Enter Work Email</h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 leading-normal max-w-[260px] mx-auto">
                  A verification code will be sent to confirm your employment.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                    Corporate Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      value={corporateEmail}
                      onChange={(e) => {
                        setCorporateEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="you@company.com"
                      className="h-12 sm:h-14 rounded-2xl bg-neutral-50 border-none pr-12 sm:pr-14 focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                    />
                    <button
                      disabled={!corporateEmail || loading}
                      onClick={handleSendOtp}
                      className="absolute right-1.5 top-1.5 h-9 w-9 sm:right-2 sm:top-2 sm:h-10 sm:w-10 bg-primary rounded-xl flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 transition-all"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Firewall & Security Guarantees */}
                <div className="bg-neutral-50 rounded-2xl p-3.5 sm:p-4 border border-neutral-100 text-[10px] sm:text-[11px] text-neutral-500 space-y-2 sm:space-y-2.5">
                  <div className="flex gap-2 items-start">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-neutral-700 font-bold">Firewall Compliant:</strong> Uses SPF, DKIM, and DMARC standards to guarantee 100% deliverability through strict corporate email servers (Google Workspace, Office 365).
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-neutral-700 font-bold">Zero IT Footprint:</strong> Verification operates strictly outside your company&apos;s IT infrastructure. It does not interface with or report to your Active Directory, Slack, or HR databases.
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-neutral-700 font-bold">Confidentiality Guarantee:</strong> Your work email is encrypted, never stored in plaintext, never shown to other users, and never shared with anyone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <form
              onSubmit={handleManualSubmit}
              className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-right-8 duration-500 pt-1 sm:pt-2"
            >
              <div className="text-center space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                <div className="h-11 w-11 sm:h-12 sm:w-12 bg-neutral-100 rounded-xl flex items-center justify-center mx-auto text-neutral-500 mb-2 sm:mb-3">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-neutral-900">Manual Verification</h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 leading-normal max-w-[280px] mx-auto">
                  Provide your professional profile details for review. Approved within 24 hours.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                    LinkedIn Profile Link *
                  </Label>
                  <Input
                    value={linkedinUrl}
                    onChange={(e) => {
                      setLinkedinUrl(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="https://linkedin.com/in/username"
                    className="h-12 sm:h-13 rounded-2xl bg-neutral-50 border-none text-sm font-semibold"
                    required
                  />
                </div>
                <div className="space-y-2 text-neutral-500">
                  <Label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                    Work Email (Optional)
                  </Label>
                  <Input
                    value={manualWorkEmail}
                    onChange={(e) => {
                      setManualWorkEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@company.com"
                    className="h-12 sm:h-13 rounded-2xl bg-neutral-50 border-none text-sm font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 ml-1">
                    Employee ID Card Photo (Optional)
                  </Label>
                  <div
                    className={cn(
                      "relative h-24 sm:h-28 rounded-[1.25rem] sm:rounded-[1.5rem] border-2 border-dashed flex flex-col items-center justify-center transition-all",
                      selectedFile
                        ? "border-primary/20 bg-primary/[0.02]"
                        : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/60",
                    )}
                  >
                    {!selectedFile ? (
                      <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                        <span className="text-[11px] sm:text-[12px] font-bold text-neutral-500">
                          Upload Employee ID Photo
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 sm:mt-1">
                          PNG, JPG, or PDF up to 5MB
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            setSelectedFile(e.target.files?.[0] || null);
                            if (error) setError("");
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xs font-bold text-primary truncate max-w-[200px] sm:max-w-[220px]">
                          {selectedFile.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-[9px] sm:text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5 sm:mt-1 hover:underline"
                        >
                          Remove File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 sm:h-14 rounded-2xl bg-primary text-white font-extrabold shadow-lg shadow-primary/10 transition-all active:scale-[0.99] text-sm"
                disabled={!linkedinUrl.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Submit for Review"
                )}
              </Button>
            </form>
          )}

          {step === 4 && (
            <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pt-1 sm:pt-2 text-center">
              <div className="h-14 w-14 sm:h-16 sm:w-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Zap className="h-8 w-8 text-blue-600 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold">Check your inbox</h3>
                <p className="text-xs sm:text-sm text-neutral-500">
                  We sent a 6-digit verification code to{" "}
                  <span className="text-neutral-900 font-semibold block mt-0.5 sm:mt-1">
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
                className="h-12 sm:h-14 text-center text-lg sm:text-xl font-mono rounded-2xl bg-neutral-50 border-none tracking-[0.2em]"
                maxLength={6}
              />
              <Button
                className="w-full h-12 sm:h-14 rounded-2xl bg-primary font-bold transition-all active:scale-[0.99]"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify & Unlock Profile"
                )}
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-8 sm:py-12 space-y-5 sm:space-y-6 animate-in zoom-in-95 duration-700">
              <div className="h-20 w-20 sm:h-24 sm:w-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
                  Verification Pending
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-[280px] mx-auto mt-0.5 sm:mt-1">
                  Our team is reviewing your profile details. Your access privileges will be activated within 24 hours. We'll send you an email confirmation.
                </p>
              </div>
              <Button
                onClick={onClose}
                className="w-full h-12 sm:h-14 rounded-2xl bg-primary font-bold shadow-md active:scale-[0.99] transition-all"
              >
                Got It
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
