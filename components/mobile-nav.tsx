"use client";

import { useEffect, useState } from "react";
import { MapPin, Search, Plus, Lock, Building2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreatePostDialog } from "@/components/create-post-dialog";

interface MobileNavProps {
  user: {
    id: string;
    first_name: string;
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
}

export function MobileNav({
  user,
  onOpenCreatePost,
  setActiveTab,
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

  const cityLabel = user?.city || "City";
  const companyLabel = user?.company?.name || "Company";
  const companyLogoUrl = user?.company?.domain
    ? `https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=64`
    : null;

  return (
    <>
      {/* Search Overlay (Slide up from bottom when Search is clicked) */}
      {isSearching && (
        <div className="fixed inset-x-0 bottom-16 z-[60] p-4 bg-white border-t border-neutral-200 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl">
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
                placeholder={`Search in ${user.city}...`}
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
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-t border-neutral-200 bg-white px-6 lg:hidden shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        {/* 1. City Feed */}
        <button
          onClick={() => {
            setLocalActiveTab("city");
            setActiveTab("city");
          }}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[64px]",
            localActiveTab === "city" ? "text-primary" : "text-neutral-500",
          )}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-[10px] font-bold truncate max-w-[80px]">
            {cityLabel}
          </span>
        </button>

        {/* 2. Company Feed */}
        <button
          onClick={() => {
            setLocalActiveTab("company");
            setActiveTab("company");
          }}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[64px]",
            localActiveTab === "company" ? "text-primary" : "text-neutral-500",
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
          <span className="text-[10px] font-bold truncate max-w-[80px]">
            {companyLabel}
          </span>
        </button>

        {/* 3. Search */}
        <button
          onClick={() => {
            setLocalActiveTab("search");
            setIsSearching(!isSearching);
          }}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[64px]",
            localActiveTab === "search" ? "text-primary" : "text-neutral-500",
          )}
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] font-bold">Search</span>
        </button>

        {/* 4. Create Post */}
        <CreatePostDialog
          user={user}
          onPostCreated={() => onOpenCreatePost()}
        />
      </div>
    </>
  );
}
