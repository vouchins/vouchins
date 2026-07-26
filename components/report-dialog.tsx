"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { REPORT_REASONS } from "@/lib/constants";
import posthog from "posthog-js";

export type ReportTargetType = "post" | "comment" | "user";

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetLabel,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const reason =
      selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!reason) {
      setError("Please select or enter a reason");
      return;
    }

    if (
      reason.length < MIN_REASON_LENGTH ||
      reason.length > MAX_REASON_LENGTH
    ) {
      setError(
        `Reason must be between ${MIN_REASON_LENGTH} and ${MAX_REASON_LENGTH} characters`
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
        }),
      });
      const body = await response.json();

      if (!response.ok) throw new Error(body.error || "Failed to submit report");

      posthog.capture("Report", {
        target_type: targetType,
        target_id: targetId,
        reason,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedReason("");
        setCustomReason("");
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">
            Report {targetType}
          </DialogTitle>
          {targetLabel && (
            <p className="text-sm text-neutral-500 line-clamp-2">
              {targetLabel}
            </p>
          )}
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Report submitted successfully. Our team will review it.
            </AlertDescription>
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={selectedReason}
                onValueChange={(value) => {
                  setSelectedReason(value);
                  setError("");
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedReason === "Other" && (
              <div>
                <Label htmlFor="customReason">Please specify</Label>
                <Textarea
                  id="customReason"
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter reason for reporting"
                  className="mt-1.5"
                  minLength={MIN_REASON_LENGTH}
                  maxLength={MAX_REASON_LENGTH}
                  aria-describedby="customReason-help"
                />
                <p
                  id="customReason-help"
                  className="mt-1 text-xs text-neutral-500"
                >
                  {customReason.trim().length}/{MAX_REASON_LENGTH} characters
                  (minimum {MIN_REASON_LENGTH})
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
