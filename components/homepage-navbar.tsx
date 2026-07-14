"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Fingerprint, ShieldCheck } from "lucide-react";

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
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex items-center gap-1 text-sm font-semibold text-neutral-600 outline-none transition-colors hover:text-primary data-[state=open]:text-primary">
                  Products
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  sideOffset={24}
                  className="w-[340px] rounded-2xl border border-neutral-200/60 bg-white/95 p-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                >
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-0 focus:bg-neutral-50/80 hover:bg-neutral-50/80 transition-all duration-200 group/item">
                    <Link href="/login" className="flex items-start gap-4 px-4 py-3">
                      <span className="mt-0.5 rounded-xl bg-gradient-to-br from-[#0A1B5C]/10 to-[#0A1B5C]/5 p-2.5 text-[#0A1B5C] shadow-sm ring-1 ring-inset ring-[#0A1B5C]/10 group-hover/item:scale-105 transition-transform">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-neutral-900 group-hover/item:text-[#0A1B5C] transition-colors">
                          Vouchins Verified Community
                        </span>
                        <span className="mt-1 block text-[13px] text-neutral-500 font-medium leading-snug">
                          Trusted community for verified professionals
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-xl p-0 focus:bg-neutral-50/80 hover:bg-neutral-50/80 transition-all duration-200 group/item mt-1">
                    <Link href="/warden" className="flex items-start gap-4 px-4 py-3">
                      <span className="mt-0.5 rounded-xl bg-gradient-to-br from-[#4FD1C5]/15 to-[#4FD1C5]/5 p-2.5 text-[#2C9A90] shadow-sm ring-1 ring-inset ring-[#4FD1C5]/20 group-hover/item:scale-105 transition-transform">
                        <Fingerprint className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-neutral-900 group-hover/item:text-[#2C9A90] transition-colors">
                          Warden - Agentic Identity Management
                        </span>
                        <span className="mt-1 block text-[13px] text-neutral-500 font-medium leading-snug">
                          Identity infrastructure for autonomous agents
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  Request Access
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
