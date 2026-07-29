import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Instagram, Facebook } from "lucide-react";
import { FOOTER_LINKS, SOCIAL_LINKS } from "@/lib/footer-links";

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
} as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200/60 bg-[#FAFAFC] py-6">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">

        {/* Logo and Brand Info */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center">
            <Image
              src="/images/logo.png"
              alt="Vouchins"
              width={110}
              height={30}
              className="object-contain"
              priority
            />
          </Link>
          <span className="text-[11px] text-neutral-400 font-semibold tracking-wide">
            Work life, Verified.
          </span>
        </div>

        {/* Footer Navigation Links */}
        <nav className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm font-semibold text-neutral-500">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#0A1B5C] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Social Links & Copyright */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex items-center gap-5 text-neutral-400">
            {SOCIAL_LINKS.map((link) => {
              const SocialIcon = socialIcons[link.icon];
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-primary"
                  aria-label={link.label}
                >
                  <SocialIcon className="h-4.5 w-4.5" />
                </a>
              );
            })}
          </div>
          <div className="text-[11px] text-neutral-400">
            © {currentYear} Vouchins. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
}
