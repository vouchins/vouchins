"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log(
              "[Service Worker] Registration successful with scope:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("[Service Worker] Registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
