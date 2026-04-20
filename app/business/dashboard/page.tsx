"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Building2, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function BusinessDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);

  // Onboarding Form State
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAdvertiserStatus();
  }, []);

  const checkAdvertiserStatus = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      router.push("/login");
      return;
    }
    setUser(authUser);

    // Check if user has an advertiser profile
    const { data: advData } = await supabase
      .from("advertisers")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (advData) {
      setAdvertiser(advData);
      fetchAds(advData.id);
    } else {
      setLoading(false);
    }
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

  const handleBecomeAdvertiser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data, error } = await supabase
      .from("advertisers")
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
      setAdvertiser(data);
      fetchAds(data.id);
    } else {
      alert("Failed to create advertiser profile.");
    }
  };

  const handleRemoveAd = async (adId: string) => {
    if (!confirm("Are you sure you want to remove this ad?")) return;
    const { error } = await supabase.from("ads").delete().eq("id", adId);
    if (!error) {
      setAds(ads.filter((a) => a.id !== adId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show Onboarding if not an advertiser
  if (!advertiser) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm mt-12">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">
          Become an Advertiser
        </h1>
        <p className="text-center text-neutral-500 text-sm mb-8">
          Create a business profile to start running ads across the Vouchins
          professional network.
        </p>
        <form onSubmit={handleBecomeAdvertiser} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company / Brand Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Business Profile"}
          </Button>
        </form>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Ads Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Managing campaigns for{" "}
            <span className="font-semibold text-neutral-700">
              {advertiser.company_name}
            </span>
          </p>
        </div>
        <Link href="/business/create">
          <Button className="flex items-center gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Create New Ad
          </Button>
        </Link>
      </div>

      {ads.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-16 text-center">
          <Megaphone className="h-10 w-10 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-neutral-900">No active ads</h3>
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
                    variant={ad.status === "active" ? "default" : "secondary"}
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
    </div>
  );
}
