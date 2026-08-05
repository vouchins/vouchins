"use client";

import { MapPin, Plus, Lock, Building2, Briefcase, MessageCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const CreatePostDialog = dynamic(
  () => import("@/components/create-post-dialog").then((mod) => mod.CreatePostDialog),
  { ssr: false },
);

interface MobileNavProps {
  user: {
    id: string;
    full_name: string;
    city: string;
    company: {
      name: string;
      domain: string;
    };
    is_admin: boolean;
    is_verified: boolean; // Added for tier gating
  };
  onOpenCreatePost: () => void;
  setActiveTab: (tab: "city" | "company") => void; // Added for tab state management
  activeTab?: "city" | "company";
  selectedCity?: string;
}

export function MobileNav({
  user,
  onOpenCreatePost,
  setActiveTab,
  activeTab = "city",
  selectedCity,
}: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const cityLabel = selectedCity || user?.city || "City";
  const companyLabel = user?.company?.name || "Company";
  const companyLogoUrl = user?.company?.domain
    ? `https://www.google.com/s2/favicons?domain=${user.company?.domain}&sz=64`
    : null;

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 grid h-[72px] grid-cols-5 items-end border-t border-white/90 bg-white/90 px-2 pb-2 pt-1 shadow-[0_-10px_30px_-24px_rgba(31,37,87,0.55)] backdrop-blur-xl lg:hidden"
      >
        {/* 1. City Feed */}
        <button
          aria-label={`Open ${selectedCity || user?.city || "city"} feed`}
          aria-pressed={activeTab === "city"}
          type="button"
          onClick={() => {
            setActiveTab("city");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            activeTab === "city"
              ? "text-primary"
              : "text-neutral-500",
          )}
        >
          <MapPin className="h-5 w-5" />
          <span className="max-w-full truncate text-[10px] font-semibold">
            {cityLabel}
          </span>
        </button>

        {/* 2. Company Feed */}
        <button
          aria-label={`Open ${user?.company?.name || "company"} feed`}
          aria-pressed={activeTab === "company"}
          type="button"
          onClick={() => {
            setActiveTab("company");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            activeTab === "company"
              ? "text-primary"
              : "text-neutral-500",
          )}
        >
          {/* Icon Container */}
          <div className="relative flex items-center justify-center h-5 w-5">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt=""
                className={cn(
                  "h-5 w-5 object-contain transition-opacity",
                  !user?.is_verified && "opacity-80",
                )}
              />
            ) : (
              <Building2 className="h-5 w-5" />
            )}

            {/* Lock Overlay: Positioned at the bottom-right of the icon */}
            {!user?.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-neutral-100">
                <Lock
                  className="h-2.5 w-2.5 text-neutral-400 bg-white rounded-full"
                  fill="currentColor"
                />
              </div>
            )}
          </div>

          {/* Label */}
          <span className="max-w-full truncate text-[10px] font-semibold">
            {companyLabel}
          </span>
        </button>

        {/* Central Create Action */}
        <CreatePostDialog
          user={user}
          onPostCreated={() => onOpenCreatePost()}
          defaultVisibility={activeTab === "company" ? "company" : "all"}
        >
          <button
            type="button"
            disabled={!user?.is_verified}
            className="feed-focus relative -top-3 flex min-w-0 flex-col items-center gap-1 rounded-xl text-primary disabled:opacity-50"
            aria-label="Create a new post"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_12px_28px_-12px_rgba(31,37,87,0.95)] ring-4 ring-white">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-semibold">Create</span>
          </button>
        </CreatePostDialog>

        {/* Jobs */}
        <button
          type="button"
          aria-label="Open jobs"
          onClick={() => {
            router.push("/jobs");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            pathname === "/jobs" ? "text-primary" : "text-neutral-500",
          )}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Jobs</span>
        </button>

        {/* Messages */}
        <button
          type="button"
          aria-label="Open messages"
          onClick={() => {
            router.push("/messages");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            pathname.startsWith("/messages") ? "text-primary" : "text-neutral-500",
          )}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Messages</span>
        </button>
      </nav>
    </>
  );
}
