import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety",
  description:
    "Review practical safety guidance for meeting, exchanging items, discussing housing, and making payments through Vouchins.",
  alternates: {
    canonical: "https://www.vouchins.com/safety",
  },
  openGraph: {
    title: "Safety | Vouchins",
    description:
      "Review practical safety guidance for meeting, exchanging items, discussing housing, and making payments through Vouchins.",
    url: "https://www.vouchins.com/safety",
  },
};

export default function SafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
