"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import posthog from "posthog-js";
import {
  Copy,
  Check,
  Share2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export async function triggerNativeShare(userId: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const inviteLink = `${window.location.origin}/signup?invite=${userId}`;
    try {
      await navigator.share({
        title: "Join Vouchins",
        text: "Join Vouchins — a verified professional network where every member is corporate verified.",
        url: inviteLink,
      });
      return true;
    } catch (err) {
      console.log("Native share failed or cancelled:", err);
      return true;
    }
  }
  return false;
}

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function InviteDialog({ isOpen, onClose, userId }: InviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/signup?invite=${userId}`
    : `https://www.vouchins.com/signup?invite=${userId}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
        posthog.capture("Invite Sent", { method: "clipboard" });
        setCopied(true);
        toast.success("Invite link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Fallback for non-secure contexts/older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteLink;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        posthog.capture("Invite Sent", { method: "clipboard" });
        setCopied(true);
        toast.success("Invite link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error("Copy command failed");
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy invite link.");
    }
  };


  const handleNativeShare = async () => {
    const shared = await triggerNativeShare(userId);
    if (shared) {
      posthog.capture("Invite Sent", { method: "native_share" });
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[440px] p-0 overflow-hidden border-none bg-white rounded-[2rem] shadow-2xl flex flex-col gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0">
          <div className="w-9" />
          <DialogTitle className="text-base sm:text-[17px] font-bold tracking-tight text-neutral-900">
            Invite Colleagues
          </DialogTitle>
          <div className="w-9" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 sm:px-8 pb-8 overflow-y-auto no-scrollbar space-y-6">
          <div className="text-center space-y-2.5 pt-1">
            <div className="h-14 w-14 bg-primary/5 rounded-[1.25rem] flex items-center justify-center mx-auto mb-1">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
              Grow the Network
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 max-w-[280px] mx-auto leading-relaxed">
              Invite trusted colleagues to exchange referrals, housing opportunities, and recommendations.
            </p>
          </div>

          {/* Invite Link Copy Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">
              Your Unique Invite Link
            </label>
            <div className="flex gap-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100 items-center">
              <Input
                readOnly
                value={inviteLink}
                className="h-10 bg-transparent border-none text-xs font-semibold text-neutral-700 focus-visible:ring-0 shadow-none overflow-x-auto select-all"
              />
              <Button
                onClick={handleCopyLink}
                className="h-10 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 font-bold flex items-center gap-1.5 shadow-sm text-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Native Share Trigger */}
          {canShare && (
            <Button
              onClick={handleNativeShare}
              className="w-full h-12 bg-primary text-primary-foreground hover:opacity-90 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm text-xs transition-all active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" />
              Share Invite Link
            </Button>
          )}

          {/* Privacy Standard Note */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex gap-3 items-start text-[10px] sm:text-[11px] text-neutral-500 leading-relaxed">
            <ShieldAlert className="h-4.5 w-4.5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-neutral-700 uppercase tracking-wider block mb-0.5">Privacy First</span>
              We do not expose who you invite or search their identities. You will only see the aggregated count of successfully verified professionals brought into Vouchins.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
