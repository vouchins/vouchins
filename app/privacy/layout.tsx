import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Vouchins Privacy Policy. Learn how we protect your data and privacy on our verified professional network.",
  openGraph: {
    title: "Privacy Policy | Vouchins",
    description: "Read the Vouchins Privacy Policy.",
    url: "https://www.vouchins.com/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
