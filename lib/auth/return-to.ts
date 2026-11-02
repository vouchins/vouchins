/**
 * Validates and sanitizes the returnTo URL to prevent open redirect vulnerabilities
 * while safely allowing internal paths and official Vouchins subdomains (e.g. jobs.vouchins.com).
 */
export function sanitizeReturnTo(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // Internal relative path (e.g. /dashboard, /feed)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Allowed absolute URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'jobs.vouchins.com' ||
        hostname === 'jobs.localhost' ||
        hostname === 'jobpass.vouchins.com' ||
        hostname === 'vouchins.com' ||
        hostname === 'www.vouchins.com' ||
        hostname === 'warden.vouchins.com' ||
        hostname === 'jobpass.localhost' ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return trimmed;
      }
    }
  } catch {
    return null;
  }

  return null;
}
