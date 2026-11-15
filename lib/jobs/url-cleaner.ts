/**
 * Utility to sanitize and clean external job requisition URLs.
 * Many ATS portals (Workday, Oracle, ServiceNow, Microsoft, Lever, Taleo)
 * fail to load or return 404 when URLs contain tracking query parameters like utm_source.
 */

export function cleanJobApplyUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  try {
    const hasScheme = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    const urlObj = new URL(hasScheme ? trimmed : `https://${trimmed}`);

    // Collect all query keys to remove
    const keysToDelete: string[] = [];

    urlObj.searchParams.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      const lowerVal = value.toLowerCase();

      // Remove all standard UTM tracking parameters
      if (lowerKey.startsWith('utm_') || lowerKey === 'utm') {
        keysToDelete.push(key);
      } else if (
        (lowerKey === 'ref' || lowerKey === 'source' || lowerKey === 'ref_id') &&
        (lowerVal.includes('vouchins') || lowerVal.includes('freehire') || lowerVal.includes('free-hire'))
      ) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((k) => urlObj.searchParams.delete(k));

    // Also sanitize any hash fragments that might contain utm parameters (e.g. #apply?utm_source=...)
    if (urlObj.hash) {
      const sanitizedHash = urlObj.hash
        .replace(/[?&]utm_[a-zA-Z0-9_-]+=[^&#]*/gi, '')
        .replace(/\?&/, '?')
        .replace(/[?&]+$/, '');
      urlObj.hash = sanitizedHash === '#' ? '' : sanitizedHash;
    }

    return urlObj.toString();
  } catch {
    // Regex fallback for non-standard URLs
    return trimmed
      .replace(/([?&])utm_[a-zA-Z0-9_-]+=[^&#]*/gi, '')
      .replace(/([?&])(ref|source)=(vouchins|freehire|free-hire)[^&#]*/gi, '')
      .replace(/\?&/, '?')
      .replace(/[?&]+$/, '');
  }
}

/**
 * Checks whether a URL contains utm tracking parameters.
 */
export function hasTrackingParam(url: string | null | undefined): boolean {
  if (!url) return false;
  return /[?&#]utm_[a-zA-Z0-9_-]+=/i.test(url);
}

/**
 * Third-party job boards and scrapers known to host phantom, dead, or paywalled job links
 * rather than official direct ATS or verified career portal requisitions.
 */
export const BLOCKED_AGGREGATOR_DOMAINS = [
  'hirist.com',
  'hirist.tech',
  'naukri.com',
  'naukrigulf.com',
  'shine.com',
  'foundit.in',
  'monsterindia.com',
  'timesjobs.com',
  'freshersworld.com',
  'indeed.com',
  'indeed.co.in',
  'glassdoor.com',
  'glassdoor.co.in',
  'ziprecruiter.com',
  'jooble.org',
  'quikr.com',
  'clickindia.com',
];

/**
 * Validates whether a job application URL is non-empty, well-formed,
 * uses HTTP/HTTPS protocol, has a valid domain name, is not a dead aggregator,
 * and is not a generic root homepage.
 */
export function isValidJobUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 10) return false;
  if (/^(javascript:|mailto:|tel:|#|about:|data:)/i.test(trimmed)) return false;

  try {
    const hasScheme = trimmed.startsWith('http://') || trimmed.startsWith('https://');
    if (!hasScheme) return false;

    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    if (!hostname || hostname === 'localhost' || hostname.endsWith('.invalid') || hostname.endsWith('.example')) {
      return false;
    }
    // Must contain at least one period in hostname (valid TLD)
    if (!hostname.includes('.')) return false;

    // Reject Google search fallback links
    if (hostname.includes('google.com') && parsed.pathname.includes('/search')) {
      return false;
    }

    // Reject known dead third-party aggregators
    const isBlockedAggregator = BLOCKED_AGGREGATOR_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (isBlockedAggregator) {
      return false;
    }

    // Reject generic root domains without job requisition paths (e.g. "https://company.com" or "https://company.com/")
    if ((parsed.pathname === '' || parsed.pathname === '/') && !parsed.search && !parsed.hash) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

