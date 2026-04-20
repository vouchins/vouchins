"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Rocket } from "lucide-react";

export default function CreateAdPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advertiserId, setAdvertiserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_url: "",
    media_url: "",
    placement: "inline",
    priority: "MEDIUM",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    const getAdvertiser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data } = await supabase
        .from("advertisers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAdvertiserId(data.id);
      } else {
        router.push("/business"); // Redirect to onboarding if not an advertiser
      }
    };
    getAdvertiser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advertiserId) return;
    setIsSubmitting(true);

    // Default status is 'active' for testing. Later change to 'pending_payment' to integrate Stripe.
    const payload = {
      ...formData,
      advertiser_id: advertiserId,
      status: "active",
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
    };

    const { error } = await supabase.from("ads").insert(payload);

    setIsSubmitting(false);
    if (error) {
      alert("Error creating ad: " + error.message);
    } else {
      router.push("/business");
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/business"
          className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">
          Create Advertisement
        </h1>
        <p className="text-neutral-500 text-sm mt-1">
          Configure your ad content, placement, and duration.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Ad Content
            </h3>
            <div className="space-y-2">
              <Label htmlFor="title">Ad Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Special Offer for Tech Professionals"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Highlight the value of your product or service..."
                className="h-20"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_url">Target URL</Label>
                <Input
                  id="target_url"
                  type="url"
                  value={formData.target_url}
                  onChange={(e) =>
                    setFormData({ ...formData, target_url: e.target.value })
                  }
                  placeholder="https://yoursite.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media_url">Image URL (Optional)</Label>
                <Input
                  id="media_url"
                  type="url"
                  value={formData.media_url}
                  onChange={(e) =>
                    setFormData({ ...formData, media_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              Targeting & Duration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(val) =>
                    setFormData({ ...formData, placement: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inline">Feed (Inline)</SelectItem>
                    <SelectItem value="right_sidebar">Right Sidebar</SelectItem>
                    <SelectItem value="left_sidebar">Left Sidebar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) =>
                    setFormData({ ...formData, priority: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/business")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !advertiserId}>
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" /> Launch Campaign
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
