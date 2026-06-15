"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/browser";

interface UserCompany {
  name: string;
  domain: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  city: string;
  avatar_url?: string;
  vouch_points: number;
  is_admin: boolean;
  company: UserCompany;
  is_verified: boolean;
  is_profile_complete: boolean;
  profile_completion_percentage: number;
  linkedin_url?: string;
  phone_number?: string;
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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [vouchedEntities, setVouchedEntities] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

        // Fetch unread messages count
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", data.id)
          .eq("is_read", false);

        setUnreadCount(count ?? 0);

        // Fetch user's vouches to prevent duplicate network calls across post cards
        const { data: vouchesData } = await supabase
          .from("vouches")
          .select("post_id, comment_id")
          .eq("vouching_user_id", data.id);
        if (vouchesData) {
          const state: Record<string, boolean> = {};
          vouchesData.forEach((v) => {
            if (v.post_id) state[`post_${v.post_id}`] = true;
            if (v.comment_id) state[`comment_${v.comment_id}`] = true;
          });
          setVouchedEntities(state);
        }

        // Fetch user's saved posts
        const { data: savedPostsData } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", data.id);
        
        if (savedPostsData) {
          setSavedPostIds(new Set(savedPostsData.map(p => p.post_id)));
        }
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
    fetchUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUserData();
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
  }, []);

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
