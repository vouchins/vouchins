import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Vouchins team. We'd love to hear from you regarding partnerships, support, or feedback on our platform.",
  openGraph: {
    title: "Contact Us | Vouchins",
    description: "Get in touch with the Vouchins team.",
    url: "https://www.vouchins.com/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
