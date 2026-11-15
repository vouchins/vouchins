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
 * Validates whether a job application URL is non-empty, well-formed,
 * uses HTTP/HTTPS protocol, has a valid domain name, and is not a local or dummy URL.
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
    if (!parsed.hostname || parsed.hostname === 'localhost' || parsed.hostname.endsWith('.invalid') || parsed.hostname.endsWith('.example')) {
      return false;
    }
    // Must contain at least one period in hostname (valid TLD)
    if (!parsed.hostname.includes('.')) return false;

    return true;
  } catch {
    return false;
  }
}

