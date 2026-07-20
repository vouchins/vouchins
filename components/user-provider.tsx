"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

interface UserCompany {
  name: string;
  domain: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  city: string | null;
  avatar_url?: string | null;
  vouch_points: number;
  is_admin: boolean;
  company: UserCompany | null;
  is_verified: boolean;
  is_profile_complete?: boolean;
  profile_completion_percentage?: number;
  linkedin_url?: string | null;
  phone_number?: string | null;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  unreadCount: number;
  refetch: () => Promise<void>;
  vouchedEntities: Record<string, boolean>;
  setVouchedEntities: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  savedPostIds: Set<string>;
  setSavedPostIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  initialUser?: UserProfile | null;
  skipInitialFetchOnFeed?: boolean;
}

export function UserProvider({ children, initialUser = null, skipInitialFetchOnFeed = false }: UserProviderProps) {
  const pathname = usePathname();
  const shouldSkipFetch = skipInitialFetchOnFeed && pathname.startsWith("/feed");
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [vouchedEntities, setVouchedEntities] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(!initialUser && !shouldSkipFetch);

  const fetchAuxiliaryData = useCallback(async (userId: string) => {
    const [messagesResult, vouchesResult, savedResult] = await Promise.all([
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
      supabase.from("vouches").select("post_id, comment_id").eq("vouching_user_id", userId),
      supabase.from("saved_posts").select("post_id").eq("user_id", userId),
    ]);

    setUnreadCount(messagesResult.count ?? 0);
    if (vouchesResult.data) {
      const state: Record<string, boolean> = {};
      vouchesResult.data.forEach((v) => {
        if (v.post_id) state[`post_${v.post_id}`] = true;
        if (v.comment_id) state[`comment_${v.comment_id}`] = true;
      });
      setVouchedEntities(state);
    }
    if (savedResult.data) {
      setSavedPostIds(new Set(savedResult.data.map((post) => post.post_id)));
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setUnreadCount(0);
        setVouchedEntities({});
        setSavedPostIds(new Set());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          `id, full_name, email, city, avatar_url, vouch_points, is_admin, is_verified, linkedin_url, phone_number, company:companies(name, domain)`
        )
        .eq("id", authUser.id)
        .maybeSingle();

      if (data && !error) {
        const formattedUser: UserProfile = {
          id: data.id,
          full_name: data.full_name,
          email: data.email,
          city: data.city,
          avatar_url: data.avatar_url,
          vouch_points: data.vouch_points || 0,
          is_admin: data.is_admin,
          company: Array.isArray(data.company)
            ? data.company[0]
            : (data.company as unknown as UserCompany),
          is_verified: Boolean(data.is_verified),
          is_profile_complete: Boolean(
            data.is_verified && data.avatar_url && data.linkedin_url && data.phone_number
          ),
          profile_completion_percentage:
            ([data.is_verified, data.avatar_url, data.linkedin_url, data.phone_number].filter(
              Boolean
            ).length /
              4) *
            100,
          linkedin_url: data.linkedin_url,
          phone_number: data.phone_number,
        };

        setUser(formattedUser);
        setLoading(false);

        // Throttled last_seen activity tracking (at most once every 5 minutes)
        if (typeof window !== "undefined") {
          const lastUpdatedKey = `last_seen_updated_${data.id}`;
          const lastUpdated = localStorage.getItem(lastUpdatedKey);
          const now = Date.now();
          if (!lastUpdated || now - parseInt(lastUpdated) > 5 * 60 * 1000) {
            localStorage.setItem(lastUpdatedKey, now.toString());
            supabase
              .from("users")
              .update({ last_seen: new Date().toISOString() })
              .eq("id", data.id)
              .then(({ error }) => {
                if (error) console.error("Error updating last_seen:", error);
              });
          }
        }

        void fetchAuxiliaryData(data.id);
      } else {
        setUser(null);
        setUnreadCount(0);
        setVouchedEntities({});
        setSavedPostIds(new Set());
      }
    } catch (err) {
      console.error("Error fetching user context data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("invite") || params.get("ref");
      if (ref) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(ref)) {
          document.cookie = `vouchins_invited_by=${ref}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
        }
      }
    }

    if (initialUser) {
      setLoading(false);
      void fetchAuxiliaryData(initialUser.id);
      const lastUpdatedKey = `last_seen_updated_${initialUser.id}`;
      const lastUpdated = localStorage.getItem(lastUpdatedKey);
      const now = Date.now();
      if (!lastUpdated || now - parseInt(lastUpdated) > 5 * 60 * 1000) {
        localStorage.setItem(lastUpdatedKey, now.toString());
        void supabase.from("users").update({ last_seen: new Date().toISOString() }).eq("id", initialUser.id);
      }
    } else if (!shouldSkipFetch) {
      void fetchUserData();
    } else {
      setLoading(false);
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && !shouldSkipFetch) {
        void fetchUserData();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUnreadCount(0);
        setVouchedEntities({});
        setSavedPostIds(new Set());
        setLoading(false);
      }
    });

    // Listen for custom user update event
    const handleUserUpdate = (e: any) => {
      if (e.detail?.city) {
        setUser((prev) => (prev ? { ...prev, city: e.detail.city } : prev));
      }
    };
    window.addEventListener("user-updated", handleUserUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("user-updated", handleUserUpdate);
    };
  }, [pathname]);

  return (
    <UserContext.Provider value={{ user, loading, unreadCount, refetch: fetchUserData, vouchedEntities, setVouchedEntities, savedPostIds, setSavedPostIds }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
