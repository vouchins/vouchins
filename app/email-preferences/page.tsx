"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function EmailPreferencesContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const requestedAction = params.get("action");
  const [email, setEmail] = useState("");
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const change = async (action: "unsubscribe" | "subscribe") => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/marketing/email-preferences?token=${encodeURIComponent(token)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEmail(result.email); setUnsubscribed(result.unsubscribed);
    } catch (cause: any) { setError(cause.message || "Unable to update preferences"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (requestedAction === "unsubscribe") { void change("unsubscribe"); return; }
    void (async () => {
      try {
        const response = await fetch(`/api/marketing/email-preferences?token=${encodeURIComponent(token)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setEmail(result.email); setUnsubscribed(result.unsubscribed);
      } catch (cause: any) { setError(cause.message || "Unable to load preferences"); }
      finally { setLoading(false); }
    })();
  }, [token, requestedAction]);

  return <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4"><Card className="w-full max-w-lg"><CardHeader><CardTitle className="flex items-center gap-2"><MailCheck className="h-5 w-5"/>Email preferences</CardTitle></CardHeader><CardContent className="space-y-5">{loading ? <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin"/>Updating your preferences…</div> : error ? <p className="text-sm text-red-600">{error}</p> : <><div><p className="font-medium">{unsubscribed ? "You’re unsubscribed." : "Campaign emails are enabled."}</p><p className="mt-1 text-sm text-neutral-500">{email}</p></div><p className="text-sm text-neutral-600">{unsubscribed ? "You will no longer receive Vouchins campaign announcements. Essential account and security emails may still be sent." : "You currently receive campaign announcements from Vouchins."}</p><Button variant={unsubscribed ? "default" : "destructive"} onClick={() => void change(unsubscribed ? "subscribe" : "unsubscribe")}>{unsubscribed ? "Resubscribe" : "Unsubscribe"}</Button></>}</CardContent></Card></main>;
}

function EmailPreferencesFallback() {
  return <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4"><Card className="w-full max-w-lg"><CardContent className="flex items-center gap-2 p-6 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading email preferences…</CardContent></Card></main>;
}

export default function EmailPreferencesPage() {
  return <Suspense fallback={<EmailPreferencesFallback/>}><EmailPreferencesContent/></Suspense>;
}
