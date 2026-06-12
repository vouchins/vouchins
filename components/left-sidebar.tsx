"use client";

import { MapPin, Building2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";
import { useRouter, usePathname } from "next/navigation";

import { useUser } from "@/components/user-provider";

interface LeftSidebarProps {
  activeTab?: "city" | "company";
  setActiveTab?: (tab: "city" | "company") => void;
  selectedCity?: string;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
  activeSubCategory?: string;
  setActiveSubCategory?: (sub: string) => void;
}

export function LeftSidebar({
  activeTab = "city",
  setActiveTab,
  selectedCity,
  activeCategory = "all",
  setActiveCategory,
  activeSubCategory = "all",
  setActiveSubCategory,
}: LeftSidebarProps) {
  const { user } = useUser();
  const effectiveCity = selectedCity || user?.city || "All Cities";
  const router = useRouter();
  const pathname = usePathname();

  const handleTabClick = (tab: "city" | "company") => {
    if (pathname !== "/feed") {
      router.push(`/feed?tab=${tab}`);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (pathname !== "/feed") {
      router.push(`/feed?category=${category}`);
    } else if (setActiveCategory && setActiveSubCategory) {
      setActiveCategory(category);
      setActiveSubCategory("all");
    }
  };

  const handleSubCategoryClick = (subCategory: string) => {
    if (pathname !== "/feed") {
      router.push(`/feed?category=${activeCategory}&subCategory=${subCategory}`);
    } else if (setActiveSubCategory) {
      setActiveSubCategory(subCategory);
    }
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col gap-2 sticky top-24 h-fit">
      <div className={cn(
        "flex items-center justify-between px-4 py-2 rounded-xl text-sm font-bold transition-all group cursor-pointer",
        activeTab === "city" && pathname === "/feed"
          ? "bg-white shadow-sm ring-1 ring-black/5"
          : "hover:bg-neutral-200/50"
      )}>
        <div
          className={cn("flex items-center gap-3 flex-1", activeTab === "city" && pathname === "/feed" ? "text-primary" : "text-neutral-500")}
          onClick={() => handleTabClick("city")}
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[150px]">{effectiveCity}</span>
        </div>
      </div>

      <button
        onClick={() => handleTabClick("company")}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group",
          activeTab === "company" && pathname === "/feed"
            ? "bg-white shadow-sm text-primary ring-1 ring-black/5"
            : "text-neutral-500 hover:bg-neutral-200/50",
        )}
      >
        <div className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center overflow-hidden">
          {user?.company?.domain ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${user?.company?.domain}&sz=32`}
              alt=""
              className="h-3.5 w-3.5 object-contain"
            />
          ) : (
            <Building2 className="h-3 w-3 text-neutral-400" />
          )}
        </div>
        <span className="truncate">{user?.company?.name || "Company"}</span>
        {!user?.is_verified && (
          <Lock className="h-3 w-3 ml-auto text-neutral-400 group-hover:text-primary" />
        )}
      </button>

      <hr className="my-4 border-neutral-200" />

      <div className="px-4 py-2">
        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">
          Marketplace
        </p>
        <div className="space-y-1">
          {[{ value: "all", label: "All" }, ...CATEGORIES].map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryClick(cat.value)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-[13px] font-bold transition-all",
                activeCategory === cat.value && pathname === "/feed"
                  ? "bg-primary/5 text-primary"
                  : "text-neutral-500 hover:text-neutral-800",
              )}
            >
              # {cat.label}
            </button>
          ))}
        </div>
      </div>

      {SUB_CATEGORIES[activeCategory] && pathname === "/feed" && (
        <div className="px-4 py-2 mt-2 space-y-1 animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => handleSubCategoryClick("all")}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all",
              activeSubCategory === "all"
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-400 hover:text-neutral-700",
            )}
          >
            All {activeCategory}
          </button>
          {SUB_CATEGORIES[activeCategory].map((sub) => (
            <button
              key={sub.value}
              onClick={() => handleSubCategoryClick(sub.value)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all",
                activeSubCategory === sub.value
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:text-neutral-700",
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
