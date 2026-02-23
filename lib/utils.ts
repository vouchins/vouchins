import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isValidDomain = (text: string) => {
  // Simple check: "anything.anything" (minimum 2 chars for TLD)
  const domainPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  return domainPattern.test(text.trim());
};