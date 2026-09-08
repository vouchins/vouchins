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

export const LINKEDIN_URL_PREFIX = "https://www.linkedin.com/";

/**
 * Validates if the string is a valid LinkedIn URL (with actual path after domain)
 */
export function isValidLinkedInUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === LINKEDIN_URL_PREFIX ||
    trimmed === "https://linkedin.com/" ||
    trimmed === "http://www.linkedin.com/" ||
    trimmed === "http://linkedin.com/"
  ) {
    return false;
  }
  // Matches URLs like https://www.linkedin.com/in/username, linkedin.com/in/username, etc.
  const regex = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in\/|pub\/|company\/|school\/|[a-zA-Z0-9_-]+).+/i;
  return regex.test(trimmed);
}

/**
 * Normalizes LinkedIn URL to ensure https:// prefix and strips prefix if left empty
 */
export function normalizeLinkedInUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();
  if (!trimmed || trimmed === LINKEDIN_URL_PREFIX || trimmed === "https://linkedin.com/") {
    return "";
  }
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}
