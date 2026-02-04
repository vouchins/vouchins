"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_CITIES } from "@/lib/constants";

export default function WaitlistPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const corpEmail = searchParams.get("email") || "";

  const [gmail, setGmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Clean the LinkedIn URL
    let cleanLinkedin = linkedin.trim().toLowerCase();
    if (!cleanLinkedin.startsWith("http")) {
      cleanLinkedin = `https://${cleanLinkedin}`;
    }

    try {
      // Logic to save to your 'waitlist' table
      const { error } = await supabase.from("waitlist").insert([
        {
          corporate_email: corpEmail,
          personal_email: gmail,
          linkedin_url: cleanLinkedin,
          city: city,
          status: "pending",
        },
      ]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 text-center">
        <div className="max-w-md w-full bg-white p-8 border rounded-lg shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Request Received</h1>
          <p className="text-neutral-600 mb-6">
            We will manually verify your profile and get back to you at{" "}
            <strong>{gmail}</strong>.
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Navigation for Waitlist Page */}
      <div className="flex flex-col items-center py-4 border-b bg-white">
        <Link href="/" aria-label="Go to home">
          <Image
            src="/images/logo.png"
            alt="Vouchins"
            width={160}
            height={40}
            className="object-contain hover:opacity-80 transition-opacity"
            priority
          />
        </Link>
      </div>
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
        <div className="w-full max-w-md bg-white border rounded-lg p-8 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Manual Approval</h1>
          <p className="text-sm text-neutral-600 mb-8">
            Corporate firewalls sometimes block our codes. Provide these details
            so we can verify you manually.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label>Corporate Email (Account)</Label>
              <Input value={corpEmail} disabled className="bg-neutral-50" />
            </div>

            <div>
              <Label htmlFor="gmail">Alternative Email (e.g. Gmail)*</Label>
              <Input
                id="gmail"
                type="email"
                placeholder="For reliable communication"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="linkedin">LinkedIn Profile URL*</Label>
              <Input
                id="linkedin"
                placeholder="https://linkedin.com/in/..."
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                required
              />
              <p className="text-xs text-neutral-500 mt-1.5">
                Ensure to enter a valid LinkedIn profile URL for verification.
              </p>
            </div>

            <div>
              <Label>Your City *</Label>
              <Select value={city} onValueChange={setCity} required>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit for Approval"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
