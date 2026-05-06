import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Vouchins Terms of Service. Understand the rules, guidelines, and your rights when using our verified professional network.",
  openGraph: {
    title: "Terms of Service | Vouchins",
    description: "Read the Vouchins Terms of Service.",
    url: "https://www.vouchins.com/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
