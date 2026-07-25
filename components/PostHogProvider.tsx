"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { supabase } from "@/lib/supabase/browser";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // Manual pageview capture is handled by PostHogPageView below to support SPAs
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".sensitive",
    },
  });
}

// Track pageviews on Next.js client-side route transitions
function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && typeof window !== "undefined") {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          const userId = data.session?.user.id;
          if (!userId) return;

          const utcDate = new Date().toISOString().slice(0, 10);
          const activityKey = `vouchins_activity:${userId}:${utcDate}`;
          if (localStorage.getItem(activityKey)) return;

          // Mark pending first so simultaneous route transitions do not duplicate the write.
          localStorage.setItem(activityKey, "pending");
          void fetch("/api/analytics/activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: pathname }),
            keepalive: true,
          })
            .then((response) => {
              if (!response.ok) {
                localStorage.removeItem(activityKey);
                return;
              }
              localStorage.setItem(activityKey, "recorded");
            })
            .catch(() => localStorage.removeItem(activityKey));
        })
        .catch(() => undefined);
    }
  }, [pathname, searchParams]);

  return null;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  // Automatically identify user on Supabase auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const fullName = metadata?.full_name || metadata?.name || metadata?.first_name || "Unknown User";
        
        posthog.identify(session.user.id, {
          email: session.user.email,
          name: fullName,
        });
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PostHogProvider>
  );
}
