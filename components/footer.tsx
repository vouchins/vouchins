import Link from "next/link";
import { Linkedin, Twitter, Instagram } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-neutral-100 bg-white py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-sm text-neutral-500">
          © {currentYear} Vouchins. Built for the Circle of Trust.
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <nav className="flex flex-wrap justify-center items-center gap-6 text-sm font-medium text-neutral-600">
            <Link
              href="/about"
              className="hover:text-indigo-600 transition-colors"
            >
              About Us
            </Link>
            <Link
              href="/privacy"
              className="hover:text-indigo-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-indigo-600 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/blog"
              className="hover:text-indigo-600 transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/contact"
              className="hover:text-indigo-600 transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Separator for desktop */}
          <div className="hidden md:block h-4 w-px bg-neutral-300"></div>

          {/* Social Links */}
          <div className="flex items-center gap-5 text-neutral-400">
            <a
              href="https://twitter.com/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1DA1F2] transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E1306C] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://linkedin.com/company/vouchins"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0A66C2] transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
