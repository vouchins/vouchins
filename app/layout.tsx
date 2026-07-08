import { ConditionalFooter } from "@/components/conditional-footer";
import { PHProvider } from "@/components/PostHogProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/pwa-register";
import { UserProvider } from "@/components/user-provider";

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
    "The verified professional network for experienced corporate employees. Find verified jobs, trusted recommendations, and safe transactions - all backed by real corporate email verification.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vouchins",
  },
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
    description: "The verified professional network for experienced corporate employees. Find verified jobs, trusted recommendations, and safe transactions - all backed by real corporate email verification.",
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
    description: "The verified professional network for experienced corporate employees. Find verified jobs, trusted recommendations, and safe transactions - all backed by real corporate email verification.",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vouchins",
    url: "https://www.vouchins.com",
    logo: "https://www.vouchins.com/images/logo.png",
    description: "The verified professional network for experienced corporate employees. Find verified jobs, trusted recommendations, and safe transactions - all backed by real corporate email verification.",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <PHProvider>
        <body className={inter.className}>
          <UserProvider>
            <PWARegister />
            <RecoveryRedirect />
            {children}
            <Toaster />
            <SpeedInsights />
            <ConditionalFooter />
          </UserProvider>
        </body>
      </PHProvider>
    </html>
  );
}

