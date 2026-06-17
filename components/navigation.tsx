"use client";

import { useEffect, useState, Suspense } from "react";
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
  Bookmark,
  Share2,
  Bell,
  MessageSquare,
  CheckCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

import { useUser } from "@/components/user-provider";
import { InviteDialog, triggerNativeShare } from "@/components/invite-dialog";

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
  return (
    <Suspense fallback={<header className="h-16 border-b border-neutral-200 bg-white/80 backdrop-blur-md" />}>
      <NavigationContent />
    </Suspense>
  );
}

function NavigationContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, loading, unreadCount } = useUser();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const fetchNotificationsList = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        entity_id,
        entity_type,
        is_read,
        created_at,
        metadata,
        actor:users!notifications_actor_id_fkey(id, full_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && !error) {
      setNotifications(data);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    if (count !== null && !error) {
      setUnreadNotificationsCount(count);
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      setUnreadNotificationsCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read) {
      supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id)
        .then(() => {
          fetchUnreadNotificationsCount();
          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
        });
    }
    
    if (n.type === 'MESSAGE_RECEIVED') {
      router.push(`/messages/${n.actor?.id || n.entity_id}`);
    } else if (n.type === 'COMMENT_RECEIVED' || n.type === 'POST_VOUCHED') {
      router.push(`/posts/${n.entity_id}`);
    } else if (n.type === 'COMMENT_REPLY') {
      router.push(`/posts/${n.metadata?.post_id || n.entity_id}#comment-${n.entity_id}`);
    }
  };

  const getNotificationText = (n: any) => {
    const actorName = n.actor?.full_name || "Someone";
    switch (n.type) {
      case "COMMENT_RECEIVED":
        return `${actorName} commented on your post.`;
      case "COMMENT_REPLY":
        return `${actorName} replied to your comment.`;
      case "POST_VOUCHED":
        return `${actorName} vouched your post.`;
      case "MESSAGE_RECEIVED":
        return `${actorName} sent you a message.`;
      default:
        return `${actorName} performed an action.`;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch (e) {
      return "just now";
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchUnreadNotificationsCount();
    fetchNotificationsList();

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadNotificationsCount();
          fetchNotificationsList();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <Link href={loading ? "/feed" : (user ? "/feed" : "/")}>
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
          {!loading && user ? (
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
            {loading ? (
              // Loading skeleton to prevent layout shift
              <div className="flex items-center space-x-2 animate-pulse">
                <div className="h-8 w-16 bg-neutral-100 rounded-lg hidden sm:block" />
                <div className="h-8 w-16 bg-neutral-100 rounded-lg hidden sm:block" />
                <div className="h-8 w-8 rounded-full bg-neutral-100" />
              </div>
            ) : user ? (
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

                {/* Saved Posts */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/saved")}
                  className={cn(
                    "h-9 px-2 sm:px-3 rounded-lg",
                    pathname === "/saved"
                      ? "text-primary bg-primary/5"
                      : "text-neutral-600",
                  )}
                >
                  <Bookmark className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline font-bold text-[13px]">
                    Saved
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

                {/* Mobile Alerts Button (Navigates to notifications page) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/notifications")}
                  className={cn(
                    "relative h-9 px-2 rounded-lg text-neutral-600 md:hidden",
                    pathname === "/notifications" ? "text-primary bg-primary/5" : ""
                  )}
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </span>
                  )}
                </Button>

                {/* Desktop Alerts Dropdown */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "relative h-9 px-3 rounded-lg text-neutral-600",
                          pathname === "/notifications" ? "text-primary bg-primary/5" : ""
                        )}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        <span className="font-bold text-[13px]">
                          Alerts
                        </span>
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                            {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent
                      align="end"
                      className="w-96 mt-2 rounded-xl shadow-xl border-neutral-200 p-0 overflow-hidden bg-white text-neutral-900"
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                        <span className="text-sm font-bold text-neutral-900">Notifications</span>
                        {unreadNotificationsCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-[350px] overflow-y-auto no-scrollbar py-1 divide-y divide-neutral-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-xs font-semibold text-neutral-400">
                            No new notifications yet.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={cn(
                                "px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer flex gap-3 items-start relative",
                                !n.is_read ? "bg-indigo-50/20" : ""
                              )}
                            >
                              <div className="mt-0.5 shrink-0">
                                {(n.type === 'COMMENT_RECEIVED' || n.type === 'COMMENT_REPLY') && (
                                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                                )}
                                {n.type === 'POST_VOUCHED' && (
                                  <Shield className="h-4 w-4 text-indigo-600" />
                                )}
                                {n.type === 'MESSAGE_RECEIVED' && (
                                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                                )}
                              </div>
                              
                              <div className="flex-1 space-y-1 min-w-0">
                                <p className={cn(
                                  "text-xs text-neutral-700 leading-normal break-words",
                                  !n.is_read ? "font-bold text-neutral-900" : "font-medium"
                                )}>
                                  {getNotificationText(n)}
                                </p>
                                <p className="text-[10px] text-neutral-400 font-semibold">
                                  {formatRelativeTime(n.created_at)}
                                </p>
                              </div>
                              
                              {!n.is_read && (
                                <div className="h-2 w-2 rounded-full bg-indigo-600 mt-2 shrink-0" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

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
                            <img src={`https://www.google.com/s2/favicons?domain=${user.company?.domain}&sz=64`} alt={user.company?.name || "Company Logo"} className="h-full w-full object-contain p-1" />
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
                      onClick={async () => {
                        const shared = await triggerNativeShare(user.id);
                        if (!shared) {
                          setIsInviteOpen(true);
                        }
                      }}
                      className="cursor-pointer py-2.5 font-bold text-sm text-neutral-700"
                    >
                      <Share2 className="h-4 w-4 mr-2 text-neutral-500" />
                      Invite Colleagues
                    </DropdownMenuItem>
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
      {user && (
        <InviteDialog
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          userId={user.id}
        />
      )}
    </header>
  );
}
