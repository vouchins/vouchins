"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { formatDistanceToNow } from "date-fns";

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

interface ConversationPreview {
  user: User;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      /* ---------------- auth ---------------- */
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: meData } = await supabase
        .from("users")
        .select("*, company:companies(*)")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!meData) {
        router.push("/login");
        return;
      }

      setMe(meData);

      /* ---------------- fetch messages ---------------- */
      const { data: messages } = await supabase
        .from("messages")
        .select(
          `
          id,
          text,
          created_at,
          sender_id,
          receiver_id,
          is_read,
          sender:users!messages_sender_id_fkey(id, first_name),
          receiver:users!messages_receiver_id_fkey(id, first_name)
        `
        )
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false });

      const map = new Map<string, ConversationPreview>();

      messages?.forEach((msg: any) => {
        const isMeSender = msg.sender_id === authUser.id;
        const otherUser = isMeSender ? msg.receiver : msg.sender;

        if (!otherUser?.id) return;

        const existing = map.get(otherUser.id);

        if (!existing) {
          map.set(otherUser.id, {
            user: otherUser,
            lastMessage: msg.text,
            lastMessageAt: msg.created_at,
            unreadCount:
              !isMeSender && !msg.is_read ? 1 : 0,
          });
        } else {
          if (!isMeSender && !msg.is_read) {
            existing.unreadCount += 1;
          }
        }
      });

      setConversations(Array.from(map.values()));
      setLoading(false);
    };

    init();
  }, [router]);

  if (loading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-neutral-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />

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
          <div className="divide-y bg-white border rounded-lg">
            {conversations.map((conv) => (
              <Link
                key={conv.user.id}
                href={`/messages/${conv.user.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-900">
                      {conv.user.first_name}
                    </span>

                    <span className="text-xs text-neutral-500">
                      {formatDistanceToNow(
                        new Date(conv.lastMessageAt),
                        { addSuffix: true }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-neutral-600 truncate">
                      {conv.lastMessage}
                    </p>

                    {conv.unreadCount > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
