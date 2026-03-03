"use client";

import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  MessageCircle,
  Flag,
  MapPin,
  Home,
  BadgeCheck,
} from "lucide-react";
import { CATEGORIES } from "@/lib/constants";

interface BlurredPostCardProps {
  post: any;
  onVerify: () => void;
}

const HOUSING_TYPE_LABELS: Record<string, string> = {
  flatmates: "Flatmates",
  rentals: "Rental",
  sale: "For Sale",
  pg: "PG",
};

export function BlurredPostCard({ post, onVerify }: BlurredPostCardProps) {
  // Clipping logic: exactly 10 words
  const clippedText = post.text
    ? post.text.split(" ").slice(0, 10).join(" ")
    : "";

  // Safe Masking Logic (e.g., Sh*** Tah***)
  const maskName = (name: string) => {
    if (!name) return "Verified Professional";
    return name
      .split(" ")
      .map((p) => {
        if (p.length <= 2) return p;
        return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
      })
      .join(" ");
  };

  const categoryLabel =
    CATEGORIES.find((c) => c.value === post.category)?.label || post.category;
  const companyLogoUrl = `https://www.google.com/s2/favicons?domain=${post.user.company.domain}&sz=64`;

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-5 mb-4 shadow-sm relative overflow-hidden transition-all">
      {/* Header - Mirroring PostCard exactly */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-lg border border-neutral-100 bg-neutral-50 flex items-center justify-center shrink-0 overflow-hidden">
            {post.user.company.domain ? (
              <img
                src={companyLogoUrl}
                alt={post.user.company.name}
                className="h-7 w-7 object-contain opacity-60 grayscale-[50%]"
              />
            ) : (
              <Lock className="h-5 w-5 text-neutral-300" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="font-bold text-neutral-400 flex items-center">
                {maskName(post.user.first_name)}
                {/* Verified Symbol Mirror */}
                <BadgeCheck
                  className="h-3.5 w-3.5 ml-1 text-blue-500/50"
                  fill="currentColor"
                  fillOpacity={0.1}
                />
              </div>
              <span className="text-neutral-300 text-xs">|</span>
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-tight">
                {post.user.company.name}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-neutral-400 font-medium">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </p>
              <span className="text-neutral-300 text-[10px]">·</span>
              <span className="text-[11px] text-neutral-400 flex items-center font-medium">
                <MapPin className="h-2.5 w-2.5 mr-0.5" />
                {post.user.city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mb-4 relative">
        <div className="flex gap-2 mb-2">
          <Badge
            variant="secondary"
            className="bg-secondary text-primary border-none text-[10px] font-bold uppercase tracking-wider py-0 px-2 h-5"
          >
            {categoryLabel}
          </Badge>
          {post.category === "housing" && post.housing_type && (
            <Badge
              variant="outline"
              className="text-muted-foreground border-border text-[10px] py-0 px-2 h-5 font-medium"
            >
              <Home className="h-2.5 w-2.5 mr-1" />
              {HOUSING_TYPE_LABELS[post.housing_type]}
            </Badge>
          )}
        </div>

        <div className="relative">
          <p className="text-neutral-800 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {clippedText}...
          </p>

          {/* Visual Blur Overlay */}
          <div className="filter blur-[5px] select-none pointer-events-none opacity-20 text-[15px] leading-relaxed mt-1">
            Unlock professional referrals and marketplace leads by verifying
            your corporate identity. Vouchins ensures high-trust interactions
            for verified employees only.
          </div>

          {/* Centered Verification CTA */}
          <div className="absolute inset-0 flex items-center justify-center pt-8">
            <Button
              onClick={onVerify}
              className="rounded-full px-8 h-10 bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-xl z-20"
            >
              Verify to Unlock Post
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions - Matches PostCard spacing but disabled */}
      <div className="flex items-center gap-1 pt-2 border-t border-neutral-50 opacity-40">
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="h-8 px-3 flex-shrink-0 cursor-not-allowed"
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          <span className="text-xs font-semibold">Reply</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled
          className="text-neutral-400 h-8 px-2 cursor-not-allowed"
        >
          <Flag className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs font-medium">Report</span>
        </Button>
      </div>
    </div>
  );
}
