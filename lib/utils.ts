import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidDomain = (text: string) => {
  // 1. Clean the input: remove http://, https://, and any trailing paths/slashes
  const cleanInput = text
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
    .split('/')[0]                          // Ignore everything after the first slash
    .toLowerCase();

  // 2. More robust Regex: 
  // Supports subdomains (multiple dots) and TLDs from 2-63 chars
  const domainPattern = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,63}$/;

  return domainPattern.test(cleanInput);
};

/**
 * Constructs Google Favicon service URL (type=FAVICON, client=SOCIAL).
 * Uses HTTPS protocol to support modern SSL/HSTS-only enterprise domains (e.g. TCS, Quantela)
 * and prevent 404 errors caused by Google's legacy /s2/favicons redirect defaulting to http://.
 * Safely clamps size between 16 and 64 to prevent upstream image errors.
 */
export function getGoogleFaviconUrl(domain?: string | null, size = 64): string {
  if (!domain) return '';
  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!cleanDomain) return '';
  const safeSize = Math.min(Math.max(size, 16), 64);
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=${safeSize}`;
}
