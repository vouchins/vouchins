"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { INDIAN_CITIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Assuming you use sonner or similar for toasts

export default function OnboardingPage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState("");

  // New states for company search
  const [companySuggestions, setCompanySuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );

  // Search logic
  useEffect(() => {
    const searchCompanies = async () => {
      if (company.trim().length < 2 || selectedCompanyId) {
        setCompanySuggestions([]);
        return;
      }

      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${company}%`)
        .limit(5);

      setCompanySuggestions(data || []);
      setShowSuggestions(true);
    };

    const timer = setTimeout(searchCompanies, 300); // Debounce
    return () => clearTimeout(timer);
  }, [company, selectedCompanyId]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // We use .single() because the SQL Trigger guarantees this row exists
      const { data: userData } = await supabase
        .from("users")
        .select("onboarded, first_name")
        .eq("id", user.id)
        .single();

      if (userData?.onboarded) {
        router.push("/feed");
        return;
      }

      // Show welcome toast for first-time Google signups
      if (user.app_metadata.provider === "google") {
        toast.success(`Welcome to Vouchins, ${userData?.first_name}!`);
      }

      setLoading(false);
    };

    checkUserStatus();
  }, [router]);

  const generateTempDomain = (name: string) => {
    // Cleans the name and appends .com (e.g., "Google India" -> "googleindia.com")
    const cleanName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "");
    return `${cleanName}.com`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the community guidelines.");
      return;
    }
    if (!city) {
      setError("Please select your city.");
      return;
    }
    if (!company.trim()) {
      setError("Please enter your company name.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      let finalCompanyId = selectedCompanyId;

      // If no ID selected, try to find by name or create
      if (!finalCompanyId) {
        const { data: existing } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", company.trim())
          .maybeSingle();

        if (existing) {
          finalCompanyId = existing.id;
        } else {
          const { data: newComp, error: createError } = await supabase
            .from("companies")
            .insert({
              name: company.trim(),
              domain: generateTempDomain(company.trim()), // This satisfies the NOT NULL constraint
            })
            .select()
            .single();
          if (createError) throw createError;
          finalCompanyId = newComp.id;
        }
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          city: city === "Other" ? customCity.trim() : city,
          linkedin_url: linkedinUrl.trim() || null,
          phone_number: phoneNumber.trim() || null,
          onboarded: true,
          company_id: finalCompanyId,
        })
        .eq("id", authUser?.id);

      if (updateError) throw updateError;
      router.push("/feed");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-500 font-medium">
          Loading Vouchins Profile...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg border border-neutral-200 p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-neutral-600" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 text-center mb-2">
          Complete your profile
        </h1>
        <p className="text-neutral-600 text-center mb-6 text-sm">
          Set your location to see what's happening in your city.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                {/* <SelectItem value="Other">Other</SelectItem> */}
              </SelectContent>
            </Select>
          </div>

          {city === "Other" && (
            <Input
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="Enter city name"
              className="mt-2"
              required
            />
          )}

          <div className="space-y-1.5 relative">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Current Company *
            </Label>
            <Input
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setSelectedCompanyId(null); // Reset selection if they keep typing
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Google, Amazon, TCS"
              className="rounded-xl bg-secondary/50 border-border h-12 text-sm font-medium"
              required
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && companySuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                {companySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-between group"
                    onClick={() => {
                      setCompany(suggestion.name);
                      setSelectedCompanyId(suggestion.id);
                      setShowSuggestions(false);
                    }}
                  >
                    <span>{suggestion.name}</span>
                    <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>LinkedIn Profile (optional)</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Phone Number (optional)</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="mt-1.5"
            />
          </div>

          <div className="flex items-start gap-2 py-2">
            <input
              id="agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-neutral-900"
            />
            <Label
              htmlFor="agree"
              className="text-xs text-neutral-500 leading-normal cursor-pointer"
            >
              I agree to the Vouchins community guidelines and terms of service.
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!agreed || submitting}
          >
            {submitting ? "Finalizing..." : "Enter Vouchins"}
          </Button>
        </form>
      </div>
    </div>
  );
}
