"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Building2, Globe, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import Image from "next/image";
import { toast } from "sonner";

export default function RecruiterOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push("/recruiter/login");
      return;
    }

    // Check if they already have a recruiter profile
    const { data: recData } = await supabase
      .from("recruiters")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (recData) {
      router.push("/recruiter/dashboard");
      return;
    }

    setUser(authUser);
    setBillingEmail(authUser.email || "");
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const { error: dbError } = await supabase
        .from("recruiters")
        .insert({
          id: user.id,
          company_name: companyName.trim(),
          website: website.trim(),
          billing_email: billingEmail.trim().toLowerCase(),
          status: "pending",
        });

      if (dbError) throw dbError;

      toast.success("Recruiter profile created successfully!");
      router.push("/recruiter/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create recruiter profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Image
            src="/images/logo.png"
            alt="Vouchins"
            width={120}
            height={35}
            className="object-contain"
          />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full border-neutral-200 shadow-sm rounded-2xl">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Complete Recruiter Profile</CardTitle>
            <p className="text-sm text-neutral-500 font-normal mt-1">
              Create a recruiter workspace for your company.
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company / Brand Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    className="pl-9 h-11 bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL (Optional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://acme.com"
                    className="pl-9 h-11 bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    id="billingEmail"
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@acme.com"
                    required
                    className="pl-9 h-11 bg-neutral-50 border-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 font-bold mt-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating...
                  </>
                ) : (
                  "Create Recruiter Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="py-6 bg-white border-t text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} Vouchins. All rights reserved.
      </footer>
    </div>
  );
}
