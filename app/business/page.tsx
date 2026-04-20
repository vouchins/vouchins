"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  Plus,
  Building2,
  Trash2,
  Loader2,
  Briefcase,
  Mail,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function BusinessDashboard() {
  const router = useRouter();

  // Core States
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [businessData, setBusinessData] = useState<{
    type: "advertiser" | "specialist";
    profile: any;
  } | null>(null);

  // Auth States
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Onboarding States
  const [selectedType, setSelectedType] = useState<
    "advertiser" | "specialist" | null
  >(null);
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard States
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await checkBusinessStatus(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const checkBusinessStatus = async (userId: string) => {
    // 1. Check Advertiser
    const { data: advData } = await supabase
      .from("advertisers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (advData) {
      setBusinessData({ type: "advertiser", profile: advData });
      fetchAds(advData.id);
      return;
    }

    // 2. Check Specialist
    const { data: specData } = await supabase
      .from("specialists")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (specData) {
      setBusinessData({ type: "specialist", profile: specData });
      setLoading(false);
      return;
    }

    // No profile found
    setBusinessData(null);
    setLoading(false);
  };

  const fetchAds = async (advertiserId: string) => {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("advertiser_id", advertiserId)
      .order("created_at", { ascending: false });

    setAds(data || []);
    setLoading(false);
  };

  // --- Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        if (data.user) {
          // Insert a foundational user record. Business accounts bypass strict domain verification.
          await supabase.from("users").upsert(
            {
              id: data.user.id,
              email: authEmail,
              first_name: authName || "Business User",
              is_verified: true,
              onboarded: true,
            },
            { onConflict: "id" },
          );

          if (data.session) {
            setUser(data.user);
            await checkBusinessStatus(data.user.id);
          } else {
            setAuthSuccess(
              "Registration successful! Please check your email to confirm your account.",
            );
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });

        if (error) throw error;

        if (data.user) {
          setUser(data.user);
          await checkBusinessStatus(data.user.id);
        }
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setIsSubmitting(true);

    try {
      if (selectedType === "advertiser") {
        const res = await fetch("/api/advertisers/create-advertisers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_name: companyName,
            billing_email: billingEmail,
          }),
        });
        const json = await res.json();

        setIsSubmitting(false);
        if (!res.ok) {
          alert(json.error || "Failed to create advertiser profile.");
          return;
        }
        setBusinessData({ type: "advertiser", profile: json.advertiser });
        fetchAds(json.advertiser.id);
      } else {
        const { data, error } = await supabase
          .from("specialists")
          .insert({
            user_id: user.id,
            company_name: companyName,
            billing_email: billingEmail,
            status: "active",
          })
          .select()
          .single();

        setIsSubmitting(false);
        if (!error && data) {
          setBusinessData({ type: "specialist", profile: data });
        } else {
          alert("Failed to create specialist profile.");
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert("An unexpected error occurred.");
    }
  };

  const handleRemoveAd = async (adId: string) => {
    if (!confirm("Are you sure you want to remove this ad?")) return;
    const { error } = await supabase.from("ads").delete().eq("id", adId);
    if (!error) {
      setAds(ads.filter((a) => a.id !== adId));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBusinessData(null);
  };

  // --- Views ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // 1. Auth View
  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm mt-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Vouchins for Business
          </h1>
          <p className="text-neutral-500 text-sm mt-2">
            {authMode === "login"
              ? "Sign in to manage your campaigns and specialist services."
              : "Create an account to reach verified corporate professionals."}
          </p>
        </div>

        {authError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {authSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{authSuccess}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === "signup" && (
            <div className="space-y-2">
              <Label>Full Name / Point of Contact</Label>
              <Input
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="pl-9"
                placeholder="business@company.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-bold mt-2"
            disabled={isAuthenticating}
          >
            {isAuthenticating
              ? "Please wait..."
              : authMode === "login"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          {authMode === "login" ? (
            <>
              Don't have a business account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. Onboarding View
  if (!businessData) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-neutral-900">
            Welcome to Vouchins Business
          </h1>
          <p className="text-neutral-500 mt-2">
            How would you like to use the platform?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => setSelectedType("advertiser")}
            className={`p-6 text-left border-2 rounded-2xl transition-all ${
              selectedType === "advertiser"
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-neutral-200 bg-white hover:border-indigo-300"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <Megaphone className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-lg text-neutral-900">Advertiser</h3>
            <p className="text-sm text-neutral-500 mt-1">
              I want to run corporate specific targeted ad campaigns.
            </p>
          </button>

          <button
            onClick={() => setSelectedType("specialist")}
            className={`p-6 text-left border-2 rounded-2xl transition-all ${
              selectedType === "specialist"
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-neutral-200 bg-white hover:border-indigo-300"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-lg text-neutral-900">
              Specialist / Professional
            </h3>
            <p className="text-sm text-neutral-500 mt-1">
              I want to offer professional services to corporate clients.
            </p>
          </button>
        </div>

        {selectedType && (
          <div className="bg-white border border-neutral-200 p-8 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-bold text-lg mb-6">
              Complete your{" "}
              {selectedType === "advertiser" ? "Advertiser" : "Specialist"}{" "}
              Profile
            </h3>
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Company / Brand Name</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Email</Label>
                <Input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Business Profile"}
              </Button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 3. Dashboards
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {businessData.type === "advertiser"
              ? "Ads Dashboard"
              : "Specialist Portal"}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Managing profile for{" "}
            <span className="font-semibold text-neutral-700">
              {businessData.profile.company_name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          {businessData.type === "advertiser" && (
            <Link href="/business/create">
              <Button className="flex items-center gap-2 shadow-sm">
                <Plus className="h-4 w-4" /> Create New Ad
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Advertiser Dashboard View */}
      {businessData.type === "advertiser" && (
        <>
          {ads.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-16 text-center">
              <Megaphone className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-neutral-900">
                No active ads
              </h3>
              <p className="text-neutral-500 text-sm mt-1 mb-6">
                You haven't created any ad campaigns yet.
              </p>
              <Link href="/business/create">
                <Button variant="outline">Create your first ad</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge
                        variant={
                          ad.status === "active" ? "default" : "secondary"
                        }
                        className="mb-2"
                      >
                        {ad.status.toUpperCase()}
                      </Badge>
                      <h3 className="font-bold text-lg text-neutral-900">
                        {ad.title}
                      </h3>
                      <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                        {ad.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAd(ad.id)}
                      className="p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto pt-4 border-t border-neutral-100 flex flex-wrap gap-4 text-xs text-neutral-500">
                    <div>
                      <span className="font-semibold text-neutral-700 block">
                        Placement
                      </span>
                      {ad.placement.replace("_", " ")}
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-700 block">
                        Duration
                      </span>
                      {format(new Date(ad.start_date), "MMM d")} -{" "}
                      {format(new Date(ad.end_date), "MMM d")}
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-700 block">
                        Priority
                      </span>
                      {ad.priority}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Specialist Dashboard View */}
      {businessData.type === "specialist" && (
        <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-16 text-center">
          <Briefcase className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-900">
            Specialist Tools Coming Soon
          </h3>
          <p className="text-neutral-500 text-sm mt-1 max-w-md mx-auto">
            We are currently building out the dedicated toolkit for specialists
            to verify their services, collect professional reviews, and respond
            to platform inquiries.
          </p>
        </div>
      )}
    </div>
  );
}
