"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

const PostViewContext = createContext<(postId: string) => void>(() => undefined);

export function PostViewBatchProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const pending = useRef(new Set<string>());
  const recorded = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const postIds = Array.from(pending.current);
    pending.current.clear();
    if (postIds.length === 0) return;
    void fetch("/api/posts/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds }),
      keepalive: true,
    });
  }, []);

  const track = useCallback((postId: string) => {
    if (recorded.current.has(postId)) return;
    recorded.current.add(postId);
    pending.current.add(postId);
    if (!timer.current) timer.current = setTimeout(flush, 750);
  }, [flush]);

  useEffect(() => {
    recorded.current.clear();
    return flush;
  }, [userId, flush]);

  const value = useMemo(() => track, [track]);
  return <PostViewContext.Provider value={value}>{children}</PostViewContext.Provider>;
}

export function PostViewTracker({ postId, children }: { postId: string; children: ReactNode }) {
  const track = useContext(PostViewContext);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          track(postId);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [postId, track]);

  return <div ref={elementRef}>{children}</div>;
}
