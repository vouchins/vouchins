"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Shield,
  User,
  MessageCircle,
  Search,
  X,
  Menu,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface NavigationUser {
  id: string;
  full_name: string;
  email: string;
  city: string;
  avatar_url?: string;
  vouch_points: number;
  is_admin: boolean;
  company: {
    name: string;
    domain: string;
  };
  is_profile_complete: boolean;
  profile_completion_percentage: number;
}

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<NavigationUser | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  /* ---------------- Fetch User & Unread Count ---------------- */
  useEffect(() => {
    const fetchNavData = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          `id, full_name, email, city, avatar_url, vouch_points, is_admin, is_verified, linkedin_url, phone_number, company:companies(name, domain)`,
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && !error) {
        const formattedUser: NavigationUser = {
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          city: data.city,
          avatar_url: data.avatar_url,
          vouch_points: data.vouch_points || 0,
          is_admin: data.is_admin,
          company: Array.isArray(data.company)
            ? data.company[0]
            : (data.company as unknown as { name: string; domain: string }),
          is_profile_complete: Boolean(data.is_verified && data.avatar_url && data.linkedin_url && data.phone_number),
          profile_completion_percentage: ([data.is_verified, data.avatar_url, data.linkedin_url, data.phone_number].filter(Boolean).length / 4) * 100,
        };

        setUser(formattedUser);

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", data.id)
          .eq("is_read", false);

        setUnreadCount(count ?? 0);
      }
      setLoading(false);
    };

    fetchNavData();
  }, [pathname]);

  // Listen for user updates from other components (e.g. city change in feed)
  useEffect(() => {
    const handleUserUpdate = (e: any) => {
      if (e.detail?.city) {
        setUser((prev) => (prev ? { ...prev, city: e.detail.city } : prev));
      }
    };
    window.addEventListener("user-updated", handleUserUpdate);
    return () => window.removeEventListener("user-updated", handleUserUpdate);
  }, []);

  /* ---------------- Search Handler ---------------- */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/feed?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/feed");
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    router.push("/feed");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading)
    return <header className="h-16 border-b border-neutral-200 bg-white" />;
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link href={user ? "/feed" : "/"}>
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={110} // Slightly smaller to give search more room
                height={30}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Center: Search Bar (Hidden on mobile, visible on sm+ if logged in) */}
          {user ? (
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md relative group"
            >
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${user.city || "your city"}...`}
                className="w-full h-10 pl-10 pr-10 bg-neutral-100 border-transparent focus:bg-white focus:border-neutral-200 focus:ring-4 focus:ring-primary/5 rounded-full text-sm font-medium transition-all outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          ) : (
            <div className="flex-grow" />
          )}

          {/* Right: Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {user ? (
              <>
                {/* Jobs */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/jobs")}
                  className={cn(
                    "h-9 px-2 sm:px-3 rounded-lg",
                    pathname === "/jobs"
                      ? "text-primary bg-primary/5"
                      : "text-neutral-600",
                  )}
                >
                  <Briefcase className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline font-bold text-[13px]">
                    Jobs
                  </span>
                </Button>

                {/* Messages */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/messages")}
                  className={cn(
                    "relative h-9 px-2 sm:px-3 rounded-lg",
                    pathname === "/messages"
                      ? "text-primary bg-primary/5"
                      : "text-neutral-600",
                  )}
                >
                  <MessageCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline font-bold text-[13px]">
                    Messages
                  </span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Admin */}
                {user.is_admin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/admin")}
                    className={cn(
                      "h-9 px-2 sm:px-3 rounded-lg",
                      pathname.startsWith("/admin")
                        ? "text-primary bg-primary/5"
                        : "text-neutral-600",
                    )}
                  >
                    <Shield className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline font-bold text-[13px]">
                      Admin
                    </span>
                  </Button>
                )}

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 px-2 flex items-center space-x-2 hover:bg-neutral-50 rounded-lg"
                    >
                      <div className="flex flex-col items-end text-right hidden xs:flex">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-neutral-900 leading-none">
                            {user.full_name}
                          </span>
                          {user.vouch_points > 0 && (
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-indigo-600" title={`${user.vouch_points} Vouch Points`}>
                              <Shield className="h-3 w-3" />
                              <span className="text-[10px] font-black">{user.vouch_points}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-neutral-400 mt-1 uppercase tracking-tight">
                          {user.company?.name || user.city}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-neutral-400 overflow-hidden shadow-sm border border-neutral-100">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                          ) : user.company?.domain ? (
                            <img src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=64`} alt={user.company.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        {!user.is_profile_complete && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-amber-500 border-2 border-white rounded-full shadow-sm" title="Profile Incomplete" />
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 mt-2 rounded-xl shadow-xl border-neutral-200"
                  >
                    <Link href={`/users/${user.id}`}>
                      <div className="px-3 py-3 hover:bg-neutral-50 rounded-t-xl transition-colors cursor-pointer">
                        <p className="text-sm font-bold text-neutral-900">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-neutral-500 truncate mb-2">
                          {user.email}
                        </p>
                        {!user.is_profile_complete && (
                          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1.5 rounded-md mt-1 border border-amber-100">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{user.profile_completion_percentage}% Complete</span>
                          </div>
                        )}
                      </div>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600 cursor-pointer py-2.5 font-bold text-sm"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-primary font-bold hover:bg-primary/5 rounded-xl px-4 h-9 text-xs sm:text-sm"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-4 h-9 text-xs sm:text-sm shadow-md shadow-primary/10 transition-all active:scale-95">
                    Join Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
