import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Instagram, Facebook } from "lucide-react";

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
          <Link
            href="/how-it-works"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            How it works
          </Link>
          <Link
            href="/business"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Companies
          </Link>
          <Link
            href="/recruiter/login"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Recruiters
          </Link>
          <Link
            href="/about"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            About Us
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/blog"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#0A1B5C] transition-colors"
          >
            Contact Us
          </Link>
        </nav>

        {/* Social Links & Copyright */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex items-center gap-5 text-neutral-400">
            <a
              href="https://linkedin.com/company/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0A66C2] transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://twitter.com/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DA1F2] transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://instagram.com/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E1306C] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4.5 w-4.5" />
            </a>
            <a
              href="https://facebook.com/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1877F2] transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="h-4.5 w-4.5" />
            </a>
          </div>
          <div className="text-[11px] text-neutral-400">
            © {currentYear} Vouchins. All rights reserved.
          </div>
        </div>

      </div>
    </footer>
  );
}
