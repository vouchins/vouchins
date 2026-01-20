"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import MessageInput from "@/components/message-input";

export default function ConversationPage() {
  const { userId } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [receiver, setReceiver] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setMe(user);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
        )
        .order("created_at");

      setMessages(data || []);

      const { data: receiverData } = await supabase
        .from("users")
        .select("id, first_name")
        .eq("id", userId)
        .maybeSingle();

      setReceiver(receiverData);
    };

    load();
  }, [userId]);

  return (
  <div className="min-h-screen bg-neutral-50 flex justify-center">
    <div className="w-full max-w-3xl flex flex-col h-screen bg-white border-x">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-neutral-600 hover:underline"
        >
          ← Back
        </button>

        <h2 className="font-semibold text-neutral-900">
          {receiver?.first_name || 'Conversation'}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-neutral-50">
        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center">
            Start the conversation 👋
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_id === me?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.sender_id === me?.id
                    ? 'bg-neutral-900 text-white rounded-br-sm'
                    : 'bg-white border rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 bg-white">
        <MessageInput
          receiverId={userId as string}
          onSent={() => window.location.reload()}
        />
      </div>
    </div>
  </div>
);

}
