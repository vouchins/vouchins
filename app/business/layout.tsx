import { Suspense } from "react";
import { Navigation } from "@/components/navigation";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Suspense fallback={<div className="h-16 border-b bg-white" />}>
        <Navigation />
      </Suspense>
      <div className="container mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
