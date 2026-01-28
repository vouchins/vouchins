"use client";

import { Suspense } from "react";
import WaitlistClient from "./waitlist-client";

export default function WaitlistPage() {
  return (
    // This Suspense boundary fixes the build error
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <p className="text-neutral-600 italic">Loading application...</p>
        </div>
      }
    >
      <WaitlistClient />
    </Suspense>
  );
}
