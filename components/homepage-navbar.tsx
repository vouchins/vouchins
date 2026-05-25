"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function HomepageNavbar() {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="bg-white border border-neutral-200/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] rounded-2xl px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image
                  src="/images/logo.png"
                  alt="Vouchins"
                  width={130}
                  height={36}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/how-it-works"
                className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/privacy"
                className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/blog"
                className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
              >
                Blog
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-primary font-bold hover:bg-primary/5 rounded-xl px-5"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
                  Join Now
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
