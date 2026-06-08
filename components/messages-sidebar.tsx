"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Lock, Search, User, X, MessageSquare } from "lucide-react";
import { decryptMessage, initE2EEKeys } from "@/lib/crypto";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  city: string;
  is_admin: boolean;
  avatar_url?: string;
  company?: {
    name: string;
    domain?: string;
  };
}

function UserAvatar({ user, className = "h-11 w-11" }: { user: UserProfile; className?: string }) {
  const size = className.includes("h-11") ? "h-11 w-11" : className.includes("h-10") ? "h-10 w-10" : "h-8 w-8";
  const iconSize = className.includes("h-11") ? "h-5 w-5" : className.includes("h-10") ? "h-4.5 w-4.5" : "h-4 w-4";
  const faviconPadding = className.includes("h-11") ? "p-1.5" : className.includes("h-10") ? "p-1.5" : "p-1";

  return (
    <div className={`${size} rounded-full bg-white flex items-center justify-center text-neutral-400 overflow-hidden border border-neutral-100 shadow-sm shrink-0`}>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.full_name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : user.company?.domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=64`}
          alt={user.company.name}
          className={`h-full w-full object-contain ${faviconPadding}`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <User className={iconSize} />
      )}
    </div>
  );
}

interface ConversationPreview {
  user: UserProfile;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  _lastMsgObj?: any;
}

export function MessagesSidebar({ activeUserId }: { activeUserId: string | null }) {
  const router = useRouter();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [privateKeyJwk, setPrivateKeyJwk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbSearchResults, setDbSearchResults] = useState<UserProfile[]>([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [allDecryptedMessages, setAllDecryptedMessages] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
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

      // Fetch all messages sent or received by me
      const { data: messages } = await supabase
        .from("messages")
        .select(`
          id,
          text,
          encrypted_content,
          encrypted_key_sender,
          encrypted_key_receiver,
          iv,
          created_at,
          sender_id,
          receiver_id,
          is_read,
          sender:users!messages_sender_id_fkey(id, full_name, avatar_url, company:companies(name, domain)),
          receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url, company:companies(name, domain))
        `)
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order("created_at", { ascending: false });

      setRawMessages(messages || []);
      setLoading(false);

      // Initialize E2EE Keys silently in the background
      try {
        const jwk = await initE2EEKeys(authUser.id, supabase);
        setPrivateKeyJwk(jwk);
      } catch (err) {
        console.error("Failed to initialize secure chat keys silently:", err);
      }
    };

    init();
  }, [router]);

  // Decrypt all rawMessages in the background
  useEffect(() => {
    const decryptAll = async () => {
      if (rawMessages.length === 0 || !me) {
        setAllDecryptedMessages([]);
        return;
      }

      const decryptedList = await Promise.all(
        rawMessages.map(async (msg: any) => {
          if (msg.encrypted_content) {
            if (!privateKeyJwk) {
              return { ...msg, text: "🔒 Encrypted Message" };
            }
            const isMeSender = msg.sender_id === me.id;
            const encryptedKey = isMeSender ? msg.encrypted_key_sender : msg.encrypted_key_receiver;

            if (encryptedKey && msg.iv) {
              try {
                const decryptedText = await decryptMessage(
                  msg.encrypted_content,
                  encryptedKey,
                  privateKeyJwk,
                  msg.iv
                );
                return { ...msg, text: decryptedText };
              } catch (e) {
                return { ...msg, text: "🔒 Decryption failed" };
              }
            }
          }
          return msg;
        })
      );
      setAllDecryptedMessages(decryptedList);
    };

    decryptAll();
  }, [rawMessages, privateKeyJwk, me]);

  // Process conversations list based on allDecryptedMessages
  useEffect(() => {
    if (!me || allDecryptedMessages.length === 0) return;

    const map = new Map<string, ConversationPreview>();

    allDecryptedMessages.forEach((msg: any) => {
      const isMeSender = msg.sender_id === me.id;
      const otherUser = isMeSender ? msg.receiver : msg.sender;

      if (!otherUser?.id) return;

      const existing = map.get(otherUser.id);

      if (!existing) {
        map.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.text || "",
          lastMessageAt: msg.created_at,
          unreadCount: !isMeSender && !msg.is_read ? 1 : 0,
        });
      } else {
        if (!isMeSender && !msg.is_read) {
          existing.unreadCount += 1;
        }
      }
    });

    setConversations(Array.from(map.values()));
  }, [allDecryptedMessages, me]);

  // Subscribe to real-time updates for unread markers and new messages
  useEffect(() => {
    if (!me) return;

    const channel = supabase
      .channel("messages_sidebar_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async () => {
          // Re-fetch messages silently to keep previews updated
          const { data: messages } = await supabase
            .from("messages")
            .select(`
              id,
              text,
              encrypted_content,
              encrypted_key_sender,
              encrypted_key_receiver,
              iv,
              created_at,
              sender_id,
              receiver_id,
              is_read,
              sender:users!messages_sender_id_fkey(id, full_name, avatar_url, company:companies(name, domain)),
              receiver:users!messages_receiver_id_fkey(id, full_name, avatar_url, company:companies(name, domain))
            `)
            .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`)
            .order("created_at", { ascending: false });

          if (messages) {
            setRawMessages(messages);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me]);

  // Search DB for users who match query (debounced)
  useEffect(() => {
    if (!searchQuery.trim() || !me) {
      setDbSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingDb(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, city, avatar_url, company:companies(name, domain)")
          .ilike("full_name", `%${searchQuery.trim()}%`)
          .neq("id", me.id)
          .limit(8);

        if (!error && data) {
          const results: UserProfile[] = data.map((d: any) => ({
            id: d.id,
            full_name: d.full_name,
            email: d.email || "",
            city: d.city || "",
            avatar_url: d.avatar_url || "",
            is_admin: d.is_admin || false,
            company: d.company ? { name: d.company.name, domain: d.company.domain } : undefined,
          }));
          setDbSearchResults(results);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearchingDb(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, me]);

  const filteredConversations = conversations.filter((conv) =>
    conv.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const existingActiveUserIds = new Set(conversations.map((c) => c.user.id));
  const otherUsersResults = dbSearchResults.filter(
    (u) => !existingActiveUserIds.has(u.id)
  );

  // Search inside decrypted message content
  const matchingMessages = searchQuery.trim()
    ? allDecryptedMessages.filter((msg) =>
        msg.text &&
        msg.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        msg.text !== "🔒 Encrypted Message" &&
        msg.text !== "🔒 Decryption failed"
      ).slice(0, 15)
    : [];

  return (
    <div className="flex flex-col h-full w-full bg-white border-r border-neutral-200">
      {/* Sidebar Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100 flex-shrink-0">
        <h1 className="text-xl font-black text-neutral-900 tracking-tight">
          Messages
        </h1>
        <div className="h-8 w-8 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
          <Lock className="h-4 w-4 text-emerald-600" />
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-neutral-50 flex-shrink-0">
        <div className="relative group">
          <Search className="absolute inset-y-0 left-3 my-auto h-4 w-4 text-neutral-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full h-9 pl-9 pr-8 bg-neutral-100 border border-transparent focus:bg-white focus:border-neutral-200 focus:ring-4 focus:ring-primary/5 rounded-full text-xs font-semibold outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-3 my-auto flex items-center text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {loading ? (
          // Skeleton loaders
          <div className="divide-y divide-neutral-50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-neutral-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-24 bg-neutral-100 rounded" />
                  <div className="h-3 w-40 bg-neutral-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          // Search Mode: show filtered active conversations + matching messages + other users from DB
          <div className="space-y-4 py-2">
            {/* Section 1: Recent Chats */}
            {filteredConversations.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400">
                  Recent Chats
                </div>
                <div className="divide-y divide-neutral-50">
                  {filteredConversations.map((conv) => {
                    const isActive = conv.user.id === activeUserId;
                    const hasUnread = conv.unreadCount > 0;
                    return (
                      <Link
                        key={conv.user.id}
                        href={`/messages/${conv.user.id}`}
                        className={`flex items-center gap-3 px-4 py-3 transition-all duration-150 cursor-pointer ${
                          isActive
                            ? "bg-neutral-100/60"
                            : "hover:bg-neutral-50"
                        }`}
                      >
                        <UserAvatar user={conv.user} className="h-10 w-10" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs text-neutral-900 truncate ${
                                hasUnread ? "font-black" : "font-bold"
                              }`}
                            >
                              {conv.user.full_name}
                            </span>
                            <span className="text-[9px] text-neutral-400 shrink-0 font-medium ml-2">
                              {formatDistanceToNow(new Date(conv.lastMessageAt), {
                                addSuffix: false,
                              }).replace("about", "").trim()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-0.5">
                            <p
                              className={`text-[10px] truncate pr-2 ${
                                hasUnread
                                  ? "text-neutral-900 font-extrabold"
                                  : "text-neutral-500 font-medium"
                              }`}
                            >
                              {conv.lastMessage}
                            </p>

                            {hasUnread ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Messages */}
            {matchingMessages.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Messages
                </div>
                <div className="divide-y divide-neutral-50">
                  {matchingMessages.map((msg) => {
                    const otherUser = msg.sender_id === me?.id ? msg.receiver : msg.sender;
                    if (!otherUser) return null;
                    return (
                      <Link
                        key={msg.id}
                        href={`/messages/${otherUser.id}`}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-all duration-150 cursor-pointer"
                      >
                        <UserAvatar user={otherUser} className="h-8 w-8 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-900 font-bold truncate">
                              {otherUser.full_name}
                            </span>
                            <span className="text-[9px] text-neutral-400 shrink-0 font-medium ml-2">
                              {formatDistanceToNow(new Date(msg.created_at), {
                                addSuffix: false,
                              }).replace("about", "").trim()}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-600 font-medium mt-0.5 break-words line-clamp-2 leading-normal">
                            {msg.text}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: More People */}
            {(otherUsersResults.length > 0 || searchingDb) && (
              <div>
                <div className="px-4 py-1.5 text-[9px] font-black uppercase tracking-wider text-neutral-400">
                  More People
                </div>
                {searchingDb && dbSearchResults.length === 0 ? (
                  <div className="divide-y divide-neutral-50">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-neutral-100 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-20 bg-neutral-100 rounded" />
                          <div className="h-2.5 w-32 bg-neutral-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-50">
                    {otherUsersResults.map((userItem) => {
                      const isActive = userItem.id === activeUserId;
                      return (
                        <Link
                          key={userItem.id}
                          href={`/messages/${userItem.id}`}
                          className={`flex items-center gap-3 px-4 py-3 transition-all duration-150 cursor-pointer ${
                            isActive ? "bg-neutral-100/60" : "hover:bg-neutral-50"
                          }`}
                        >
                          <UserAvatar user={userItem} className="h-10 w-10" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-neutral-900 font-bold truncate block">
                              {userItem.full_name}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate block mt-0.5 font-medium">
                              {userItem.company?.name || userItem.city || "Verified User"}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {filteredConversations.length === 0 && matchingMessages.length === 0 && otherUsersResults.length === 0 && !searchingDb && (
              <div className="p-8 text-center text-neutral-500 text-xs font-medium">
                No matches found.
              </div>
            )}
          </div>
        ) : (
          // Default Mode: list of all active conversations
          <div className="divide-y divide-neutral-50">
            {conversations.map((conv) => {
              const isActive = conv.user.id === activeUserId;
              const hasUnread = conv.unreadCount > 0;
              return (
                <Link
                  key={conv.user.id}
                  href={`/messages/${conv.user.id}`}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-neutral-100/60"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  {/* User Profile Avatar */}
                  <UserAvatar user={conv.user} className="h-11 w-11" />

                  {/* Name and Last Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs text-neutral-900 truncate ${
                          hasUnread ? "font-black" : "font-bold"
                        }`}
                      >
                        {conv.user.full_name}
                      </span>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-medium ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), {
                          addSuffix: false,
                        }).replace("about", "").trim()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p
                        className={`text-[11px] truncate pr-2 ${
                          hasUnread
                            ? "text-neutral-900 font-extrabold"
                            : "text-neutral-500 font-medium"
                        }`}
                      >
                        {conv.lastMessage}
                      </p>

                      {hasUnread ? (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
