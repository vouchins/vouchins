"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";

interface User {
  id: string;
  first_name: string;
  email: string;
  city: string;
  is_admin: boolean;
  company: {
    name: string;
  };
}

export default function MessagesPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // 1️⃣ Get auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      // 2️⃣ Get app user
      const { data: userData } = await supabase
        .from("users")
        .select("*, company:companies(*)")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!userData) {
        router.push("/login");
        return;
      }

      setUser(userData);

      // 3️⃣ Fetch conversations
      const { data: messages } = await supabase
        .from("messages")
        .select(
          `
          sender_id,
          receiver_id,
          sender:users!messages_sender_id_fkey(id, first_name),
          receiver:users!messages_receiver_id_fkey(id, first_name)
        `
        )
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false });

      const map = new Map<string, User>();

      messages?.forEach((msg: any) => {
        const other =
          msg.sender_id === authUser.id ? msg.receiver : msg.sender;

        if (other?.id && !map.has(other.id)) {
          map.set(other.id, other);
        }
      });

      setConversations(Array.from(map.values()));
      setLoading(false);
    };

    init();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ✅ Global Navigation */}
      <Navigation user={user} />

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-6">
          Messages
        </h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border rounded-lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">
              No conversations yet
            </h2>

            <p className="text-sm text-neutral-600 max-w-sm mb-6">
              Messages are private conversations between verified professionals.
              Start one by visiting a member’s profile and clicking{" "}
              <span className="font-medium">Message</span>.
            </p>

            <Link
              href="/feed"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Feed
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((otherUser) => (
              <Link
                key={otherUser.id}
                href={`/messages/${otherUser.id}`}
                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-neutral-50 transition"
              >
                <span className="font-medium text-neutral-900">
                  {otherUser.first_name}
                </span>
                <span className="text-xs text-neutral-500">
                  View conversation →
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
