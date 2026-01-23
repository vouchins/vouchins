export const PUBLIC_EMAIL_DOMAINS = [
  // Global mainstream
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "aol.com",
  "rocketmail.com",

  // Privacy / anonymous-focused
  "protonmail.com",
  "tutanota.com",
  "posteo.net",
  "lavabit.com",
  "safe-mail.net",
  "runbox.com",

  // Generic free mailboxes
  "mail.com",
  "email.com",
  "inbox.com",
  "gmx.com",

  // India-specific
  "rediffmail.com",
  "indiatimes.com",
  "sify.com",

  // Russia / Eastern Europe
  "mail.ru",
  "yandex.com",

  // Korea
  "nate.com",
  "daum.net",

  // UK consumer ISPs
  "btinternet.com",
  "talktalk.net",

  // Legacy / less common but still active
  "lycos.com",

  // Personal Zoho (keep blocked for MVP)
  "zoho.com",
];


export function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();

  if (!domain) {
    return false;
  }

  return !PUBLIC_EMAIL_DOMAINS.includes(domain);
}

export function extractDomainFromEmail(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

export function deriveCompanyNameFromDomain(domain: string): string {
  const withoutTLD = domain.split('.')[0];

  const formatted = withoutTLD
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return formatted;
}

export function validateFirstName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

export function validateCity(city: string): boolean {
  return city.trim().length >= 2 && city.trim().length <= 100;
}
