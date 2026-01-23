"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function MessageInput({
  onSend,
}: {
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    /* ---------------- rate limiting ---------------- */

    // last 1 hour limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count: hourlyCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", oneHourAgo);

    if ((hourlyCount ?? 0) >= 5) {
      alert(
        "You’ve reached the hourly message limit. Please try again later."
      );
      setLoading(false);
      return;
    }

    // daily limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: dailyCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", todayStart.toISOString());

    if ((dailyCount ?? 0) >= 20) {
      alert("You’ve reached today’s message limit.");
      setLoading(false);
      return;
    }

    /* ---------------- send (optimistic) ---------------- */

    onSend(text.trim());
    setText("");
    setLoading(false);
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <Button
        onClick={handleSend}
        disabled={loading || !text.trim()}
      >
        Send
      </Button>
    </div>
  );
}
