"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function MessageInput({
  receiverId,
  onSent,
}: {
  receiverId: string;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!text.trim()) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1️⃣ Check rate limit (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: hourlyCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user?.id)
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= 5) {
      alert(
        "You have reached the hourly message limit. Please try again later."
      );
      setLoading(false);
      return;
    }

    // 2️⃣ Check daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: dailyCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user?.id)
      .gte("created_at", todayStart.toISOString());

    if ((dailyCount ?? 0) >= 20) {
      alert("You have reached today’s message limit.");
      setLoading(false);
      return;
    }

    // 3️⃣ Send message
    await supabase.from("messages").insert({
      sender_id: user?.id,
      receiver_id: receiverId,
      text: text.trim(),
    });

    setText("");
    setLoading(false);
    onSent();
  };

  return (
    <div className="flex items-center gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />

      <Button onClick={send} disabled={loading || !text.trim()}>
        Send
      </Button>
    </div>
  );
}
