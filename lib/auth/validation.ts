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

export const CORPORATE_INDICATORS = [
  "inc", "corp", "corporation", "llc", "ltd", "limited", "pvt", "private", "co", "company",
  "technologies", "technology", "tech", "labs", "lab", "solutions", "systems", "software",
  "services", "consulting", "consultancy", "group", "enterprises", "enterprise", "holdings",
  "ventures", "partners", "capital", "fund", "media", "studio", "studios", "agency", "bank",
  "financial", "finance", "health", "healthcare", "pharma", "networks", "global", "industries",
  "ai", "robotics", "digital", "security", "cloud", "infra", "data", "analytics", "aerospace",
  "energy", "mobility", "logistics", "retail", "interactive", "works", "games"
];

/**
 * Validates company name format, punctuation, length, and gibberish patterns.
 */
export function validateCompanyName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Please enter your company name or work email." };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: "Company name must be at least 2 characters long." };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: "Company name cannot exceed 60 characters." };
  }

  // Check for allowed characters: letters, numbers, spaces, and &, ., -, ', ,
  if (/[^a-zA-Z0-9\s&.\-',]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Company name contains invalid characters. Use letters, numbers, spaces, or standard symbols (&, ., -, ', ,).",
    };
  }

  // Must contain at least two letters
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 2) {
    return { isValid: false, error: "Company name must contain at least 2 letters." };
  }

  // Cannot contain consecutive dots or punctuation (e.g. '..', ',,')
  if (/\.{2,}|-{2,}|_{2,}|'{2,}|,{2,}/.test(trimmed)) {
    return {
      isValid: false,
      error: "Company name cannot contain consecutive dots or punctuation.",
    };
  }

  // Cannot start or end with a symbol
  if (/^[.\-',]|[-',]$/.test(trimmed)) {
    return { isValid: false, error: "Company name cannot start or end with punctuation." };
  }

  // Disallow repeated identical characters (3 or more times like aaaa, xxxx)
  if (/(.)\1{2,}/i.test(trimmed)) {
    return { isValid: false, error: "Please enter a valid company name without repeated characters." };
  }

  // Disallow words with 5 or more consecutive consonants (gibberish like cfergerg, asdfgh)
  const words = trimmed.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(cleanWord)) {
      return { isValid: false, error: "Please enter a valid, recognizable company name." };
    }
  }

  // Check placeholder / troll words
  const normalizedLower = trimmed.toLowerCase();
  const blockedTerms = [
    "test",
    "testing",
    "demo",
    "sample",
    "unknown",
    "none",
    "na",
    "n/a",
    "null",
    "undefined",
    "self",
    "myself",
    "freelancer",
    "freelance",
    "student",
    "unemployed",
    "celebrity",
    "fake",
    "fake company",
    "asdf",
    "qwerty",
    "anonymous",
    "nobody",
    "anything",
  ];
  if (blockedTerms.includes(normalizedLower)) {
    return { isValid: false, error: "Please enter your real employer or company name." };
  }

  return { isValid: true };
}

/**
 * Checks if the string contains a recognizable corporate suffix or indicator.
 */
export function hasCorporateIndicator(name: string): boolean {
  const words = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  return words.some((w) => CORPORATE_INDICATORS.includes(w));
}

/**
 * Detects if an unrecognized 2 or 3 word string looks like a personal name (e.g. "Tamanna Bhatia")
 * rather than a company name.
 */
export function looksLikePersonName(name: string): boolean {
  const clean = name.trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2 && words.length <= 3) {
    const allPureWords = words.every((w) => /^[a-zA-Z]+$/.test(w));
    if (allPureWords && !hasCorporateIndicator(clean)) {
      return true;
    }
  }
  return false;
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
