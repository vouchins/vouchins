"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import MessageInput from "@/components/message-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { MessagesSidebar } from "@/components/messages-sidebar";
import { encryptMessage, decryptMessage, initE2EEKeys } from "@/lib/crypto";
import { Lock, ShieldAlert, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ConversationPage() {
  const { userId } = useParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [receiver, setReceiver] = useState<any>(null);

  const [privateKeyJwk, setPrivateKeyJwk] = useState<string | null>(null);
  const [recipientPublicKeyJwk, setRecipientPublicKeyJwk] = useState<string | null>(null);
  const [myPublicKeyJwk, setMyPublicKeyJwk] = useState<string | null>(null);

  const [isReceiverTyping, setIsReceiverTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (receiver?.full_name) {
      document.title = `Chat with ${receiver.full_name} | Vouchins`;
    } else {
      document.title = "Chat | Vouchins";
    }
  }, [receiver]);

  /* -------------------- load conversation -------------------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setMe(user);

      // Initialize E2EE Keys silently
      try {
        const myPrivJwk = await initE2EEKeys(user.id, supabase);
        setPrivateKeyJwk(myPrivJwk);
      } catch (err) {
        console.error("Failed to initialize secure chat keys silently:", err);
      }

      // fetch messages
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`,
        )
        .order("created_at");

      setMessages(data || []);

      // mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", userId);

      // fetch receiver details
      const { data: receiverData } = await supabase
        .from("users")
        .select("id, full_name, last_seen")
        .eq("id", userId)
        .maybeSingle();

      setReceiver(receiverData);

      // fetch receiver public key
      const { data: recipientKeyData } = await supabase
        .from("user_public_keys")
        .select("public_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (recipientKeyData) {
        setRecipientPublicKeyJwk(recipientKeyData.public_key);
      }

      // fetch my public key
      const { data: myKeyData } = await supabase
        .from("user_public_keys")
        .select("public_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (myKeyData) {
        setMyPublicKeyJwk(myKeyData.public_key);
      }
      setLoading(false);
    };

    load();
  }, [userId]);

  /* -------------------- Periodic Last Seen Update -------------------- */
  useEffect(() => {
    if (!me) return;
    const updateLastSeen = async () => {
      await supabase
        .from("users")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", me.id);
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 20000); // update every 20s
    return () => clearInterval(interval);
  }, [me]);

  /* -------------------- Real-time Receiver Status Update -------------------- */
  useEffect(() => {
    if (!me || !userId) return;

    const userChannel = supabase
      .channel(`user_status_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          setReceiver((prev: any) => {
            if (!prev) return prev;
            return { ...prev, last_seen: payload.new.last_seen };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [me, userId]);

  /* -------------------- Real-time Message Subscription -------------------- */
  useEffect(() => {
    if (!me || !userId) return;

    // Sort IDs to guarantee the same channel name for both users
    const sortedIds = [me.id, userId].sort();
    const channelName = `chat_messages_${sortedIds[0]}_${sortedIds[1]}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "messages",
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new;
            const isRelevant =
              (newMsg.sender_id === me.id && newMsg.receiver_id === userId) ||
              (newMsg.sender_id === userId && newMsg.receiver_id === me.id);

            if (isRelevant) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });

              // Mark as read if I am the receiver
              if (newMsg.receiver_id === me.id) {
                supabase
                  .from("messages")
                  .update({ is_read: true })
                  .eq("id", newMsg.id)
                  .then();
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedMsg = payload.new;
            const isRelevant =
              (updatedMsg.sender_id === me.id && updatedMsg.receiver_id === userId) ||
              (updatedMsg.sender_id === userId && updatedMsg.receiver_id === me.id);

            if (isRelevant) {
              setMessages((prev) =>
                prev.map((msg) => (msg.id === updatedMsg.id ? updatedMsg : msg))
              );
            }
          }
        }
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload.payload.userId === userId) {
          setIsReceiverTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [me, userId]);

  /* -------------------- Real-time Message Decryption -------------------- */
  useEffect(() => {
    const decryptAll = async () => {
      if (messages.length === 0) {
        setDecryptedMessages([]);
        return;
      }

      const decryptedList = await Promise.all(
        messages.map(async (msg) => {
          if (msg.encrypted_content) {
            if (!privateKeyJwk) {
              return { ...msg, text: "🔒 Encrypted Message" };
            }
            const isMeSender = msg.sender_id === me?.id;
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
      setDecryptedMessages(decryptedList);
    };

    decryptAll();
  }, [messages, privateKeyJwk, me]);

  /* -------------------- auto scroll (FIXED) -------------------- */
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      120;

    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [decryptedMessages, isReceiverTyping]);

  /* -------------------- handle send (optimistic) -------------------- */
  const handleSend = async (text: string) => {
    if (!me || !text.trim()) return;

    const messageId = crypto.randomUUID();
    const isE2EE = recipientPublicKeyJwk && myPublicKeyJwk && privateKeyJwk;

    let optimisticMessage: any = {
      id: messageId,
      sender_id: me.id,
      receiver_id: userId,
      text,
      created_at: new Date().toISOString(),
    };

    if (isE2EE) {
      try {
        const { encryptedContent, encryptedKeyReceiver, encryptedKeySender, iv } =
          await encryptMessage(text, recipientPublicKeyJwk!, myPublicKeyJwk!);

        optimisticMessage = {
          ...optimisticMessage,
          encrypted_content: encryptedContent,
          encrypted_key_sender: encryptedKeySender,
          encrypted_key_receiver: encryptedKeyReceiver,
          iv: iv,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        await supabase.from("messages").insert({
          id: messageId,
          sender_id: me.id,
          receiver_id: userId,
          text: "🔒 Encrypted Message", // Fallback for list preview / notifications
          encrypted_content: encryptedContent,
          encrypted_key_receiver: encryptedKeyReceiver,
          encrypted_key_sender: encryptedKeySender,
          iv: iv,
        });
      } catch (err) {
        console.error("Encryption failed, sending plain text", err);
        // Fallback plain insert if encryption fails for some reason
        setMessages((prev) => [...prev, optimisticMessage]);
        await supabase.from("messages").insert({
          id: messageId,
          sender_id: me.id,
          receiver_id: userId,
          text,
        });
      }
    } else {
      // Send plain text (unencrypted fallback)
      toast.info("Sending unsecured plain text message...");
      setMessages((prev) => [...prev, optimisticMessage]);
      await supabase.from("messages").insert({
        id: messageId,
        sender_id: me.id,
        receiver_id: userId,
        text,
      });
    }
  };

  /* -------------------- handle typing broadcast -------------------- */
  const handleTyping = (isTyping: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: me?.id, isTyping },
      });
    }
  };

  /* -------------------- format last seen string -------------------- */
  const formatLastSeen = (lastSeenStr: string | null) => {
    if (!lastSeenStr) return "Offline";
    const date = new Date(lastSeenStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);

    if (diffMins < 2) {
      return "Online";
    }
    
    try {
      return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch (e) {
      return "Offline";
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-neutral-50">
      <Navigation />

      {/* Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden w-full bg-white">
        
        {/* Left Side: Sidebar (Hidden on mobile) */}
        <div className="hidden md:block w-[350px] flex-shrink-0 h-full">
          <MessagesSidebar activeUserId={userId as string} />
        </div>

        {/* Right Side: Chat Area */}
        <div className="flex flex-1 flex-col h-full bg-white relative">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Back button (Only visible on mobile) */}
              <button
                onClick={() => router.push("/messages")}
                className="md:hidden text-sm text-neutral-600 font-bold hover:underline"
              >
                ← Inbox
              </button>

              <div className="text-left">
                <h2 className="font-bold text-neutral-900 leading-tight">
                  <Link href={`/users/${receiver?.id}`} className="hover:underline">
                    {receiver?.full_name || "Conversation"}
                  </Link>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {receiver && (
                    <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1.5">
                      {formatLastSeen(receiver.last_seen) === "Online" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      )}
                      {formatLastSeen(receiver.last_seen)}
                    </span>
                  )}
                  {receiver && <span className="h-1 w-1 rounded-full bg-neutral-300"></span>}
                  {recipientPublicKeyJwk ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-wider">
                      <Lock className="h-2.5 w-2.5" /> End-to-End Encrypted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-wider">
                      <ShieldAlert className="h-2.5 w-2.5" /> Unsecured Chat
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-neutral-50"
          >
            {loading ? (
              // Skeletons for messages
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="h-9 w-48 bg-neutral-200/50 rounded-2xl animate-pulse" />
                </div>
                <div className="flex justify-end">
                  <div className="h-9 w-32 bg-neutral-200/50 rounded-2xl animate-pulse" />
                </div>
                <div className="flex justify-start">
                  <div className="h-9 w-64 bg-neutral-200/50 rounded-2xl animate-pulse" />
                </div>
                <div className="flex justify-end">
                  <div className="h-9 w-40 bg-neutral-200/50 rounded-2xl animate-pulse" />
                </div>
              </div>
            ) : decryptedMessages.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center">
                Start the conversation 👋
              </p>
            ) : (
              decryptedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender_id === me?.id ? "items-end" : "items-start"} group relative`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.sender_id === me?.id
                        ? "bg-[hsl(var(--primary))] text-white rounded-br-sm animate-in slide-in-from-right-2 duration-150"
                        : "bg-white border rounded-bl-sm animate-in slide-in-from-left-2 duration-150"
                    }`}
                  >
                    {msg.text}
                    {/* Timestamp & Status Checkmarks */}
                    <div className={`flex items-center gap-1 mt-1 text-[9px] ${msg.sender_id === me?.id ? "text-neutral-400 justify-end" : "text-neutral-400 justify-start"}`}>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="ml-0.5 flex items-center">
                        {msg.is_read ? (
                          <span className="text-emerald-500 font-bold" title="Seen">✓✓</span>
                        ) : (
                          <span className="text-neutral-400" title="Delivered">✓✓</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Native delete confirmation dialog */}
            <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Delete message</DialogTitle>
                </DialogHeader>
                <p className="p-4 text-sm text-neutral-700">Are you sure you want to delete this message? This action cannot be undone.</p>
                <DialogFooter className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!showDeleteDialog) return;
                      const id = showDeleteDialog;
                      setShowDeleteDialog(null);
                      // Optimistically update UI
                      setMessages((prev) => prev.filter((m) => m.id !== id));
                      setDecryptedMessages((prev) => prev.filter((m) => m.id !== id));
                      try {
                        const { error } = await supabase
                          .from('messages')
                          .delete()
                          .eq('id', id);
                        if (error) {
                          console.error('Delete error:', error);
                        }
                      } catch (e) {
                        console.error('Unexpected delete error:', e);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {isReceiverTyping && (
              <div className="flex justify-start items-center gap-2 text-[11px] text-neutral-500 animate-pulse pl-1 py-1">
                <span className="font-semibold">{receiver?.full_name || "Someone"} is typing</span>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t px-4 py-3 bg-white sticky bottom-0 flex-shrink-0">
            <MessageInput onSend={handleSend} onTyping={handleTyping} />
          </div>
        </div>
      </div>
    </div>
  );
}
