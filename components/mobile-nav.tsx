"use client";

import { useEffect, useState } from "react";
import { MapPin, Search, Plus, Lock, Building2, X, Briefcase } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();

  // Internal state to track which icon is highlighted
  const [localActiveTab, setLocalActiveTab] = useState<
    "city" | "company" | "search" | "create"
  >("city");

  // --- Search Logic from navigation.tsx ---
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // Sync search query if URL changes externally
  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    setLocalActiveTab(activeTab);
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
      // setIsSearching(false); // Close search overlay after submitting
    } else {
      router.push("/feed");
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push("/feed");
    setIsSearching(false);
  };

  const cityLabel = selectedCity || user?.city || "City";
  const companyLabel = user?.company?.name || "Company";
  const companyLogoUrl = user?.company?.domain
    ? `https://www.google.com/s2/favicons?domain=${user.company?.domain}&sz=64`
    : null;

  return (
    <>
      {/* Search Overlay (Slide up from bottom when Search is clicked) */}
      {isSearching && (
        <div
          role="search"
          className="fixed inset-x-0 bottom-[72px] z-[60] animate-in slide-in-from-bottom-2 border-t border-neutral-200 bg-white p-4 shadow-2xl duration-200"
        >
          <form
            onSubmit={handleSearch}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-primary" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${user?.city || "your city"}...`}
                className="w-full h-11 pl-10 pr-10 bg-neutral-100 border-transparent rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                clearSearch();
                setIsSearching(false);
              }}
              className="text-xs font-black text-neutral-500 uppercase px-2"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
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
            setLocalActiveTab("city");
            setActiveTab("city");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            localActiveTab !== "search" && activeTab === "city"
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
            setLocalActiveTab("company");
            setActiveTab("company");
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            localActiveTab !== "search" && activeTab === "company"
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

        {/* Search */}
        <button
          type="button"
          aria-label={isSearching ? "Close search" : "Open search"}
          aria-expanded={isSearching}
          onClick={() => {
            setLocalActiveTab("search");
            setIsSearching(!isSearching);
          }}
          className={cn(
            "feed-focus flex min-w-0 flex-col items-center gap-1 rounded-xl py-1",
            localActiveTab === "search" ? "text-primary" : "text-neutral-500",
          )}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Search</span>
        </button>
      </nav>
    </>
  );
}
