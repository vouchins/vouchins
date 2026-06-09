"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function ConditionalFooter() {
  const pathname = usePathname();

  const hideFooterPrefixes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/feed",
    "/messages",
    "/admin",
    "/onboarding",
    "/verify-email",
    "/waitlist",
    "/jobs",
    "/posts",
    "/users",
    "/recruiter",
  ];

  const shouldHide = hideFooterPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (shouldHide) return null;

  return <Footer />;
}
