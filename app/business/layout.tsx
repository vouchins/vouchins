import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business",
  description:
    "Reach verified corporate professionals through Vouchins business advertising and specialist services.",
  alternates: {
    canonical: "https://www.vouchins.com/business",
  },
  openGraph: {
    title: "Business | Vouchins",
    description:
      "Reach verified corporate professionals through Vouchins business advertising and specialist services.",
    url: "https://www.vouchins.com/business",
  },
};

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
