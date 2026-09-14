export interface FooterLink {
  href: string;
  label: string;
  badge?: string;
}

export interface FooterGroup {
  title: string;
  links: FooterLink[];
}

export const FOOTER_LINK_GROUPS: FooterGroup[] = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/employee-referrals", label: "Job Referrals" },
      { href: "/verified-flatmates", label: "Verified Flatmates" },
      { href: "/corporate-marketplace", label: "Marketplace" },
      { href: "/trusted-recommendations", label: "Recommendations" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/verified-professional-community", label: "Verified Network" },
      { href: "/flatmates-in-hyderabad", label: "Hyderabad Hub" },
      { href: "/business", label: "For Companies" },
      { href: "/recruiter/login", label: "For Recruiters" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Us" },
      { href: "/blog", label: "Blog" },
      { href: "/contact", label: "Contact Us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export const FOOTER_LINKS = FOOTER_LINK_GROUPS.flatMap((group) => group.links);

export const SOCIAL_LINKS = [
  {
    href: "https://linkedin.com/company/vouchins",
    label: "LinkedIn",
    icon: "linkedin",
  },
  {
    href: "https://twitter.com/vouchins",
    label: "Twitter",
    icon: "twitter",
  },
  {
    href: "https://instagram.com/vouchins",
    label: "Instagram",
    icon: "instagram",
  },
  {
    href: "https://facebook.com/vouchins",
    label: "Facebook",
    icon: "facebook",
  },
] as const;
