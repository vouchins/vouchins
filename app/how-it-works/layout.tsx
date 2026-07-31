import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Vouchins verifies professional identities and helps members connect, collaborate, and transact with greater trust.",
  alternates: {
    canonical: "https://www.vouchins.com/how-it-works",
  },
  openGraph: {
    title: "How It Works | Vouchins",
    description:
      "Learn how Vouchins verifies professional identities and helps members connect, collaborate, and transact with greater trust.",
    url: "https://www.vouchins.com/how-it-works",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
