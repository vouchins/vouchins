import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Read the latest updates, tips, and professional networking insights from the Vouchins team.",
  openGraph: {
    title: "Blog | Vouchins",
    description: "Read the latest updates, tips, and professional networking insights from the Vouchins team.",
    url: "https://www.vouchins.com/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
