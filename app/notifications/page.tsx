"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { LeftSidebar } from "@/components/left-sidebar";
import { RightSidebar } from "@/app/feed/side-bars/right/right-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { useUser } from "@/components/user-provider";
import { supabase } from "@/lib/supabase/browser";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  MessageSquare,
  MessageCircle,
  Shield,
  CheckCheck,
  Loader2,
  ChevronRight,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
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
          actor:users!notifications_actor_id_fkey(id, full_name, avatar_url, company:companies(domain))
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && !error) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    fetchNotifications();

    // Subscribe to real-time notification changes
    const channel = supabase
      .channel("page-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, userLoading]);

  const handleMarkAllAsRead = async () => {
    if (!user || markingAll) return;
    try {
      setMarkingAll(true);
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.is_read) {
      supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", n.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
          );
        });
    }

    if (n.type === "MESSAGE_RECEIVED") {
      router.push(`/messages/${n.actor?.id || n.entity_id}`);
    } else if (n.type === "COMMENT_RECEIVED" || n.type === "POST_VOUCHED") {
      router.push(`/posts/${n.entity_id}`);
    } else if (n.type === "COMMENT_REPLY") {
      router.push(`/posts/${n.metadata?.post_id || n.entity_id}#comment-${n.entity_id}`);
    }
  };

  const getNotificationText = (n: any) => {
    const actorName = n.actor?.full_name || "Someone";
    switch (n.type) {
      case "COMMENT_RECEIVED":
        return (
          <>
            <span className="font-bold text-neutral-900">{actorName}</span> commented on your post.
          </>
        );
      case "COMMENT_REPLY":
        return (
          <>
            <span className="font-bold text-neutral-900">{actorName}</span> replied to your comment.
          </>
        );
      case "POST_VOUCHED":
        return (
          <>
            <span className="font-bold text-neutral-900">{actorName}</span> vouched your post.
          </>
        );
      case "MESSAGE_RECEIVED":
        return (
          <>
            <span className="font-bold text-neutral-900">{actorName}</span> sent you a message.
          </>
        );
      default:
        return (
          <>
            <span className="font-bold text-neutral-900">{actorName}</span> performed an action.
          </>
        );
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const dist = formatDistanceToNow(new Date(dateStr));
      // Simplify like 3d, 2h, etc.
      return dist
        .replace("about ", "")
        .replace("less than a minute ago", "just now")
        .replace("minute ago", "1m")
        .replace("minutes ago", "m")
        .replace("hour ago", "1h")
        .replace("hours ago", "h")
        .replace("day ago", "1d")
        .replace("days ago", "d");
    } catch (e) {
      return "just now";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navigation />

      <div className="container mx-auto px-4 max-w-7xl pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          {/* Left Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <LeftSidebar />
          </div>

          {/* Main Content */}
          <main className="col-span-1 lg:col-span-6 xl:col-span-6 pb-20">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-5 w-5 text-indigo-600" />
                  <h1 className="text-xl font-black text-neutral-950 tracking-tight">
                    Notifications
                  </h1>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={markingAll}
                    className="text-xs text-indigo-600 font-bold hover:bg-indigo-50/50 flex items-center gap-1.5"
                  >
                    {markingAll ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    Mark all as read
                  </Button>
                )}
              </div>

              {loading && notifications.length === 0 ? (
                <div className="py-20 flex justify-center items-center">
                  <Loader2 className="h-8 w-8 text-neutral-300 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center px-6">
                  <div className="h-16 w-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 text-neutral-400">
                    <Bell className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1">
                    No notifications yet
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-xs">
                    We'll let you know when someone comments on your posts, vouches you, or sends you a direct message.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notifications.map((n) => {
                    const companyDomain = Array.isArray(n.actor?.company)
                      ? n.actor?.company[0]?.domain
                      : n.actor?.company?.domain;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "px-6 py-4.5 hover:bg-neutral-50/80 transition-all cursor-pointer flex gap-4 items-start relative select-none",
                          !n.is_read ? "bg-indigo-50/15" : ""
                        )}
                      >
                        {/* Avatar & overlay badge */}
                        <div className="relative shrink-0">
                          <div className="h-11 w-11 rounded-full bg-white flex items-center justify-center overflow-hidden border border-neutral-100 shadow-sm">
                            {n.actor?.avatar_url ? (
                              <img
                                src={n.actor.avatar_url}
                                alt={n.actor.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : companyDomain ? (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${companyDomain}&sz=64`}
                                alt=""
                                className="h-6 w-6 object-contain p-0.5"
                              />
                            ) : (
                              <User className="h-5 w-5 text-neutral-400" />
                            )}
                          </div>

                          {/* Overlay Icon Badge */}
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-neutral-100 flex items-center justify-center shadow-sm">
                            {(n.type === "COMMENT_RECEIVED" || n.type === "COMMENT_REPLY") && (
                              <MessageSquare className="h-3 w-3 text-indigo-500" />
                            )}
                            {n.type === "POST_VOUCHED" && (
                              <Shield className="h-3 w-3 text-indigo-600" />
                            )}
                            {n.type === "MESSAGE_RECEIVED" && (
                              <MessageCircle className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                        </div>

                        {/* Notification message details */}
                        <div className="flex-1 space-y-1 min-w-0 pr-2">
                          <p
                            className={cn(
                              "text-[13px] text-neutral-700 leading-relaxed break-words",
                              !n.is_read ? "text-neutral-900 font-semibold" : "font-medium"
                            )}
                          >
                            {getNotificationText(n)}
                          </p>
                          <p className="text-[11px] text-neutral-400 font-semibold">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>

                        {/* Unread circle indicator or right chevron */}
                        <div className="shrink-0 flex items-center h-11">
                          {!n.is_read ? (
                            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-neutral-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto overflow-x-hidden">
            <RightSidebar
              user={
                user
                  ? {
                      id: user.id,
                      city: user.city || "",
                      is_verified: user.is_verified || false,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>

      {user && (
        <MobileNav
          user={user as any}
          onOpenCreatePost={fetchNotifications}
          setActiveTab={() => {}}
        />
      )}
    </div>
  );
}
