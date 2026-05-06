import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about Vouchins, the trusted private marketplace and network built by developers for verified corporate professionals.",
  openGraph: {
    title: "About Us | Vouchins",
    description: "Learn more about Vouchins, the trusted private marketplace and network built by developers for verified corporate professionals.",
    url: "https://www.vouchins.com/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
