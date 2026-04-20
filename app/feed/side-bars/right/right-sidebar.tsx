"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Sparkles,
  Megaphone,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RightSidebarProps {
  user: {
    city: string;
    is_verified: boolean;
  } | null;
}

export function RightSidebar({ user }: RightSidebarProps) {
  const city = user?.city || "Hyderabad";
  const isVerified = user?.is_verified;
  const [sidebarAd, setSidebarAd] = useState<any>(null);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const res = await fetch(
          "/api/advertisement?placement=right_sidebar&limit=1",
        );
        const data = await res.json();
        if (data.ads?.length > 0) setSidebarAd(data.ads[0]);
      } catch (e) {}
    };
    // fetchAd();
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: "Vouchins",
      text: `Vouchins is officially live in ${city}! Join our verified professional marketplace.`,
      url: window.location.origin,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <aside className="hidden xl:flex w-72 flex-col gap-6 sticky top-24 h-fit">
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm">
        {/* Header - Using brand primary color for the icon */}
        {/* Header - Matches the Vouchins Logo/Sidebar Brand Style */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-[13px] font-bold text-neutral-900 tracking-tight">
              Trending in {city}
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          {/* 1. VERIFICATION - Only displayed if the user is NOT verified */}
          {!isVerified && (
            <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-none text-[10px] px-2 h-5 font-bold uppercase tracking-wider"
                >
                  Action Required
                </Badge>
              </div>
              <p className="text-sm font-bold text-neutral-900 leading-snug">
                Verify your work email to unlock company-only discussions.
              </p>
              <button
                onClick={() => (window.location.href = "/onboarding")}
                className="mt-3 text-[11px] font-bold text-primary hover:opacity-80 flex items-center gap-1"
              >
                Verify now <ShieldCheck className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* 2. COMMUNITY ANNOUNCEMENT */}
          <div className="p-4 rounded-lg border border-neutral-100 bg-white hover:border-neutral-300 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider h-5 px-2"
              >
                Community
              </Badge>
            </div>
            <p className="text-[13px] font-bold text-neutral-800 leading-snug">
              Vouchins is live in {city}! Help us build the network.
            </p>
            <button
              onClick={handleShare}
              className="mt-3 text-[11px] font-bold text-primary hover:opacity-80 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share on Social Media
            </button>
          </div>

          {/* 3. UPDATES */}
          <div className="p-4 rounded-lg border border-neutral-100 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className="text-muted-foreground border-neutral-200 text-[10px] h-5 px-2 font-medium"
              >
                Update
              </Badge>
            </div>
            <p className="text-[13px] font-bold text-neutral-600 leading-snug">
              Marketplace ratings verified by professional vouching coming soon.
            </p>
          </div>
        </div>

        {/* SPONSORED CONTENT SLOT */}
        {sidebarAd && (
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                Sponsored
              </span>
            </div>
            <a
              href={sidebarAd.target_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              {sidebarAd.media_url && (
                <img
                  src={sidebarAd.media_url}
                  alt="Ad"
                  className="w-full h-32 object-cover rounded-md mb-3"
                />
              )}
              <h4 className="text-sm font-bold text-neutral-900 group-hover:text-primary transition-colors">
                {sidebarAd.title}
              </h4>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                {sidebarAd.description}
              </p>
            </a>
          </div>
        )}

        {/* Action Button - Exact replica of your "New Post" button styles */}
        <div className="mt-6 pt-5 border-t border-neutral-50">
          <Button
            onClick={handleShare}
            className="w-full bg-primary text-primary-foreground hover:opacity-90 h-9 px-4 shrink-0 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Share2 className="h-4 w-4" />
            Invite Colleagues
          </Button>
        </div>
      </div>
    </aside>
  );
}
