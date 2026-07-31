"use client";

import {
  ArrowRight,
  Building2,
  Grid2X2,
  Home,
  Instagram,
  Linkedin,
  Lock,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
  Twitter,
  Users,
  Facebook,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";
import { FOOTER_LINKS, SOCIAL_LINKS } from "@/lib/footer-links";
import { useUser } from "@/components/user-provider";
import { VerifiedIcon } from "@/components/verified-icon";

interface LeftSidebarProps {
  activeTab?: "city" | "company";
  setActiveTab?: (tab: "city" | "company") => void;
  selectedCity?: string;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
  activeSubCategory?: string;
  setActiveSubCategory?: (sub: string) => void;
}

const categoryIcons = {
  all: Grid2X2,
  housing: Home,
  buy_sell: Tag,
  recommendations: Star,
  referrals: Users,
} as const;

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
} as const;

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
    } else {
      setActiveTab?.(tab);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (pathname !== "/feed") {
      router.push(`/feed?category=${category}`);
    } else {
      setActiveCategory?.(category);
      setActiveSubCategory?.("all");
    }
  };

  const handleSubCategoryClick = (subCategory: string) => {
    if (pathname !== "/feed") {
      router.push(
        `/feed?category=${activeCategory}&subCategory=${subCategory}`,
      );
    } else {
      setActiveSubCategory?.(subCategory);
    }
  };

  const categories = [{ value: "all", label: "All" }, ...CATEGORIES];

  return (
    <aside
      aria-label="Feed navigation"
      className="sticky top-[76px] hidden h-fit w-72 shrink-0 flex-col gap-4 lg:flex"
    >
      {user && (
        <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_14px_38px_-28px_rgba(31,37,87,0.55)]">
          <div className="px-5 pb-5 pt-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/5 text-xl font-semibold text-primary shadow-[0_12px_28px_-18px_rgba(31,37,87,0.65)]">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.full_name?.charAt(0) || "V"
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <h2 className="text-base font-semibold text-neutral-950">
                {user.full_name}
              </h2>
              {user.is_verified && (
                <VerifiedIcon />
              )}
            </div>
            <p className="mx-auto mt-1 line-clamp-2 max-w-[220px] text-xs leading-5 text-neutral-600">
              {user.bio || `Professional at ${user.company?.name || "Vouchins"}`}
            </p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
              <MapPin className="h-3.5 w-3.5" />
              {user.city}
            </p>
            {user.is_verified ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified at {user.company?.name || "Vouchins"}
              </p>
            ) : (
              <p className="mt-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                Verification pending
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 divide-x divide-neutral-100 border-t border-neutral-100 px-3 py-3 text-center">
            <div className="px-2">
              <p className="text-sm font-semibold text-primary">
                {user.vouch_points || 0}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                Vouch score
              </p>
            </div>
            <div className="px-3">
              <p className="text-sm font-semibold text-primary">
                {Math.round(user.profile_completion_percentage || 0)}%
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-500">
                Profile complete
              </p>
            </div>
          </div>

          <Link
            href={`/users/${user.id}`}
            className="feed-focus flex items-center justify-center gap-2 border-t border-neutral-100 px-5 py-3 text-xs font-semibold text-primary transition hover:bg-neutral-50"
          >
            View profile
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_14px_38px_-28px_rgba(31,37,87,0.5)]">
        <div className="space-y-2 border-b border-neutral-100 p-3">
          <button
            type="button"
            onClick={() => handleTabClick("city")}
            aria-pressed={activeTab === "city" && pathname === "/feed"}
            className={cn(
              "feed-focus flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
              activeTab === "city" && pathname === "/feed"
                ? "bg-primary/[0.055] text-primary"
                : "text-neutral-600 hover:bg-white/70 hover:text-primary",
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{effectiveCity}</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full border",
                activeTab === "city"
                  ? "border-green-500 bg-green-500"
                  : "border-neutral-300",
              )}
            />
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("company")}
            aria-pressed={activeTab === "company" && pathname === "/feed"}
            className={cn(
              "feed-focus flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition",
              activeTab === "company" && pathname === "/feed"
                ? "bg-primary/[0.055] text-primary"
                : "text-neutral-600 hover:bg-white/70 hover:text-primary",
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-white">
              {user?.company?.domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=32`}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {user?.company?.name || "Company"}
            </span>
            {!user?.is_verified ? (
              <Lock className="h-3.5 w-3.5 text-neutral-400" />
            ) : (
              <span
                className={cn(
                  "h-2 w-2 rounded-full border",
                  activeTab === "company"
                    ? "border-green-500 bg-green-500"
                    : "border-neutral-300",
                )}
              />
            )}
          </button>
        </div>

        <div className="p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold text-neutral-900">
            Browse
          </p>
          <div className="space-y-1">
            {categories.map((category) => {
              const CategoryIcon =
                categoryIcons[
                category.value as keyof typeof categoryIcons
                ] || Grid2X2;
              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategoryClick(category.value)}
                  aria-pressed={
                    activeCategory === category.value && pathname === "/feed"
                  }
                  className={cn(
                    "feed-focus flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition",
                    activeCategory === category.value && pathname === "/feed"
                      ? "bg-primary/[0.055] font-semibold text-primary"
                      : "text-neutral-600 hover:bg-white/70 hover:text-primary",
                  )}
                >
                  <CategoryIcon className="h-4 w-4 shrink-0" />
                  {category.label}
                </button>
              );
            })}
          </div>

          {SUB_CATEGORIES[activeCategory] && pathname === "/feed" && (
            <div className="ml-7 mt-2 space-y-1 border-l border-neutral-200 pl-3">
              <button
                type="button"
                onClick={() => handleSubCategoryClick("all")}
                aria-pressed={activeSubCategory === "all"}
                className={cn(
                  "feed-focus w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition",
                  activeSubCategory === "all"
                    ? "bg-white text-primary shadow-sm"
                    : "text-neutral-500 hover:text-primary",
                )}
              >
                All
              </button>
              {SUB_CATEGORIES[activeCategory].map((subCategory) => (
                <button
                  key={subCategory.value}
                  type="button"
                  onClick={() => handleSubCategoryClick(subCategory.value)}
                  aria-pressed={activeSubCategory === subCategory.value}
                  className={cn(
                    "feed-focus w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition",
                    activeSubCategory === subCategory.value
                      ? "bg-white text-primary shadow-sm"
                      : "text-neutral-500 hover:text-primary",
                  )}
                >
                  {subCategory.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="px-3 pb-3 pt-1 text-center">
        <nav
          aria-label="Vouchins footer links"
          className="flex flex-wrap justify-center gap-x-3 gap-y-1.5"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="feed-focus rounded text-[11px] font-medium text-neutral-500 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Vouchins social media"
          className="mt-3 flex items-center justify-center gap-4 text-neutral-400"
        >
          {SOCIAL_LINKS.map((link) => {
            const SocialIcon = socialIcons[link.icon];
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="feed-focus rounded-full p-1 transition-colors hover:text-primary"
              >
                <SocialIcon className="h-4 w-4" />
              </a>
            );
          })}
        </nav>
        <p className="mt-2 text-[10px] text-neutral-400">Vouchins © {new Date().getFullYear() || 2026} </p>
      </footer>
    </aside>
  );
}
