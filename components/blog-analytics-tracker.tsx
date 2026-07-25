"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface BlogAnalyticsTrackerProps {
  postId: string;
  slug: string;
  title: string;
}

function recordBlogEvent(postId: string, eventType: string) {
  return fetch("/api/analytics/blog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, eventType }),
    keepalive: true,
  }).catch(() => undefined);
}

export function BlogAnalyticsTracker({
  postId,
  slug,
  title,
}: BlogAnalyticsTrackerProps) {
  useEffect(() => {
    const sessionKey = `vouchins_blog:${postId}`;
    const viewedKey = `${sessionKey}:viewed`;
    const engagedKey = `${sessionKey}:engaged`;
    const completedKey = `${sessionKey}:completed`;

    let initialViewRequest: Promise<unknown> = Promise.resolve();

    if (!sessionStorage.getItem(viewedKey)) {
      sessionStorage.setItem(viewedKey, "1");
      initialViewRequest = recordBlogEvent(postId, "view");
      posthog.capture("Blog Viewed", {
        blog_post_id: postId,
        blog_slug: slug,
        blog_title: title,
      });
    }

    const engagementTimer = window.setTimeout(() => {
      if (sessionStorage.getItem(engagedKey)) return;

      sessionStorage.setItem(engagedKey, "1");
      void initialViewRequest.then(() => recordBlogEvent(postId, "engaged"));
      posthog.capture("Blog Engaged", {
        blog_post_id: postId,
        blog_slug: slug,
        engagement_seconds: 30,
      });
    }, 30_000);

    const handleScroll = () => {
      if (sessionStorage.getItem(completedKey)) return;

      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const scrollDepth = window.scrollY / scrollableHeight;
      if (scrollDepth < 0.8) return;

      sessionStorage.setItem(completedKey, "1");
      void initialViewRequest.then(() => recordBlogEvent(postId, "completed"));
      posthog.capture("Blog Completed", {
        blog_post_id: postId,
        blog_slug: slug,
        scroll_percentage: 80,
      });
      window.removeEventListener("scroll", handleScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(engagementTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [postId, slug, title]);

  return null;
}
