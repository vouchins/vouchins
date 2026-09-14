import Link from "next/link";
import Image from "next/image";
import { MapPin, ChevronRight, Linkedin, Twitter, Instagram, Facebook } from "lucide-react";
import { FOOTER_LINK_GROUPS, SOCIAL_LINKS } from "@/lib/footer-links";

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
} as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/80 bg-[#F5F5F7] text-neutral-900 pt-12 pb-6 transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Main Grid: Brand Column + Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-8 pb-8">
          
          {/* Brand & Location Info (Spans 2 columns on lg) */}
          <div className="col-span-2 flex flex-col items-start gap-3.5 pr-0 lg:pr-6">
            <Link href="/" className="inline-flex items-center hover:opacity-85 transition-opacity">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={116}
                height={32}
                className="object-contain"
                priority
              />
            </Link>

            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-sm">
              The private network for verified corporate professionals to connect, exchange internal job referrals, and transact with trust.
            </p>

            {/* Registered Office Card */}
            <div className="w-full max-w-sm rounded-2xl border border-neutral-200/80 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs space-y-1.5 mt-0.5">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-900">
                <span className="p-1 rounded-md bg-[#0A1B5C]/5 text-[#0A1B5C]">
                  <MapPin className="h-3.5 w-3.5 text-[#2C9A90]" />
                </span>
                <span>Registered Office</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed pl-6.5">
                8th floor, 1107, Alimineti Madhava Reddy Flyover, Fateh Maidan, Basheer Bagh, Hyderabad, Telangana 500001
              </p>
            </div>
          </div>

          {/* Categorized Link Columns */}
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-3">
              {/* Stylish Section Heading */}
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4FD1C5]" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-900">
                  {group.title}
                </h3>
              </div>

              {/* Stylish Interactive Links */}
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between text-[13px] font-medium text-neutral-600 hover:text-[#0A1B5C] transition-colors py-1"
                    >
                      <span className="relative transition-transform duration-200 group-hover:translate-x-1">
                        {link.label}
                      </span>
                      <ChevronRight className="h-3 w-3 text-[#2C9A90] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom Bar: Copyright, Legal & Socials */}
        <div className="pt-5 border-t border-neutral-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-neutral-500">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left">
            <p>© {currentYear} Vouchins Inc. All rights reserved.</p>
            <span className="hidden sm:inline text-neutral-300">·</span>
            <p className="text-neutral-400">Hyderabad, India</p>
          </div>

          {/* Prominent Social Icon Buttons */}
          <div className="flex items-center gap-2.5">
            {SOCIAL_LINKS.map((link) => {
              const SocialIcon = socialIcons[link.icon];
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-xl border border-neutral-200/90 bg-white flex items-center justify-center text-neutral-600 hover:text-white hover:bg-[#0A1B5C] hover:border-[#0A1B5C] transition-all shadow-2xs hover:-translate-y-0.5"
                  aria-label={link.label}
                >
                  <SocialIcon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
        </div>

      </div>
    </footer>
  );
}




