import { Footer } from "@/components/footer";
import { PHProvider } from "@/components/PostHogProvider";

import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vouchins.com"), // Essential for OG images to work
  title: {
    default: "Vouchins - Verified Marketplace for Professionals",
    template: "%s | Vouchins",
  },
  description:
    "The trusted private marketplace and network for verified corporate professionals.",
  keywords: [
    "Vouchins",
    "corporate network",
    "verified marketplace",
    "professional community",
    "private networking",
    "employee marketplace",
    "trusted recommendations",
  ],
  openGraph: {
    title: "Vouchins",
    description: "Verified Professional Network",
    url: "https://www.vouchins.com",
    siteName: "Vouchins",
    images: [
      {
        url: "/images/logo.png", // Relative path works because of metadataBase
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vouchins - Verified Professional Network",
    description: "The private marketplace for verified corporate employees.",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <PHProvider>
        <body className={inter.className}>
          {children}
          <Footer />
        </body>
      </PHProvider>
    </html>
  );
}
