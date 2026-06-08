"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { MessagesSidebar } from "@/components/messages-sidebar";
import { MessageSquare, ShieldCheck } from "lucide-react";

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Messages | Vouchins";

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-10 w-10 bg-neutral-200 rounded-full" />
            <div className="h-4 w-32 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-neutral-50">
      <Navigation />
      
      {/* Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden w-full bg-white">
        
        {/* Left Side: Sidebar */}
        <div className="w-full md:w-[350px] flex-shrink-0 h-full">
          <MessagesSidebar activeUserId={null} />
        </div>

        {/* Right Side: Placeholder (Hidden on mobile) */}
        <div className="hidden md:flex flex-1 flex-col justify-center items-center text-center p-8 bg-neutral-50/30">
          <div className="h-20 w-20 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5 text-neutral-400">
            <MessageSquare className="h-9 w-9 text-neutral-400" />
          </div>
          <h2 className="text-lg font-black text-neutral-900 leading-tight">
            Your Messages
          </h2>
          <p className="text-xs text-neutral-500 max-w-xs mt-1.5 leading-relaxed font-medium">
            Send private, end-to-end encrypted messages and recommendations to verified corporate professionals.
          </p>
          <div className="flex items-center gap-1 mt-6 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <ShieldCheck className="h-3.5 w-3.5" /> End-to-End Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
