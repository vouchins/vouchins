"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Shield, User, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface NavigationUser {
  id: string;
  first_name: string;
  email: string;
  city: string;
  is_admin: boolean;
  company: {
    name: string;
  };
}

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<NavigationUser | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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

      // 1. Fetch user profile and company info
      const { data, error } = await supabase
        .from("users")
        .select(
          `
        id, 
        first_name, 
        email, 
        city, 
        is_admin,
        company:companies(name)
      `
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && !error) {
        // Supabase returns related data as an array [ {name: '...'} ]
        // We map it to match your NavigationUser interface
        const formattedUser: NavigationUser = {
          id: data.id,
          first_name: data.first_name,
          email: data.email,
          city: data.city,
          is_admin: data.is_admin,
          company: Array.isArray(data.company)
            ? data.company[0]
            : (data.company as unknown as { name: string }),
        };

        setUser(formattedUser);

        // 2. Fetch unread count
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prevent UI flickering while loading
  if (loading)
    return <header className="h-16 border-b border-neutral-200 bg-white" />;
  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/feed">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={130}
                height={36}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Messages */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/messages")}
              className={`relative h-9 px-2 sm:px-3 transition-colors ${
                pathname === "/messages"
                  ? "text-primary bg-secondary"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              <MessageCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline font-semibold">Messages</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {/* Admin (Your original conditional logic) */}
            {user.is_admin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className={`h-9 px-2 sm:px-3 ${
                  pathname.startsWith("/admin")
                    ? "text-primary bg-secondary"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                <Shield className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline font-semibold">Admin</span>
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
                    <span className="text-sm font-bold text-neutral-900 leading-none">
                      {user.first_name}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-400 mt-1 uppercase tracking-tight">
                      {user.company?.name || user.city}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 mt-2">
                <Link href={`/users/${user.id}`}>
                  <div className="px-2 py-3 hover:bg-neutral-50 rounded-md transition-colors cursor-pointer">
                    <p className="text-sm font-bold text-primary">
                      {user.first_name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </Link>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer py-2 font-semibold"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}