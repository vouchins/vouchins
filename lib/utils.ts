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