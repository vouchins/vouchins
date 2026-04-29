"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RecoveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Redirect to the actual reset-password page, preserving the hash tokens
      if (!window.location.pathname.includes("/reset-password")) {
        router.push(`/reset-password${hash}`);
      }
    }
  }, [router]);

  return null;
}
