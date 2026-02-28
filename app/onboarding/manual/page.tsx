"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";

export default function ManualVerificationPage() {
  const router = useRouter();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [corporateEmail, setCorporateEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let idCardUrl = "";

      // 1. Upload ID Card to Supabase Storage
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("verification-docs")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        idCardUrl = data.path;
      }

      // 2. Create Verification Request in DB
      const { error: dbError } = await supabase
        .from("manual_verification_requests")
        .insert({
          user_id: user.id,
          corporate_email: corporateEmail,
          linkedin_url: linkedinUrl,
          id_card_url: idCardUrl,
          status: "pending",
        });

      if (dbError) throw dbError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <Card className="max-w-md w-full text-center p-6">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle className="mb-2">Request Submitted</CardTitle>
          <p className="text-sm text-neutral-500 mb-6">
            Our team will review your professional identity within 24-48 hours.
            We'll notify you once your account is verified.
          </p>
          <Button onClick={() => router.push("/feed")} className="w-full">
            Back to Feed
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm text-neutral-500 hover:text-neutral-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>

        <Card>
          <CardHeader>
            <CardTitle>Manual Verification</CardTitle>
            <p className="text-sm text-neutral-500 font-normal">
              Provide proof of employment to unlock the verified feed.
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Work Email</Label>
                <Input
                  type="email"
                  value={corporateEmail}
                  onChange={(e) => setCorporateEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn Profile URL</Label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Corporate ID Card (Image)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-neutral-50 cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  <Upload className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">
                    {file ? file.name : "Click to upload your ID card"}
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit for Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
