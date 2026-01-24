import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-neutral-100 bg-white py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-neutral-500">
          © {currentYear} Vouchins. Built for the Circle of Trust.
        </div>
        
        <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
          <Link href="/about" className="hover:text-indigo-600 transition-colors">
            About Us
          </Link>
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors">
            Privacy Policy
          </Link>
          <a href="mailto:connect@vouchins.com" className="hover:text-indigo-600 transition-colors">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}