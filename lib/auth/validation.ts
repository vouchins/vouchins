const PUBLIC_EMAIL_DOMAINS = [
  // 'gmail.com', Commentded for testing purposes
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'inbox.com',
  'live.com',
  'msn.com',
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
