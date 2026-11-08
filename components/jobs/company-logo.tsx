'use client';

import React, { useState, useEffect } from 'react';

const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  spacex: 'spacex.com',
  oracle: 'oracle.com',
  servicenow: 'servicenow.com',
  uber: 'uber.com',
  stripe: 'stripe.com',
  google: 'google.com',
  meta: 'meta.com',
  facebook: 'meta.com',
  amazon: 'amazon.com',
  audible: 'audible.com',
  'johnson & johnson': 'jnj.com',
  jnj: 'jnj.com',
  figma: 'figma.com',
  airbnb: 'airbnb.com',
  doordash: 'doordash.com',
  pinterest: 'pinterest.com',
  datadog: 'datadoghq.com',
  cloudflare: 'cloudflare.com',
  gitlab: 'gitlab.com',
  coinbase: 'coinbase.com',
  reddit: 'reddit.com',
  instacart: 'instacart.com',
  snowflake: 'snowflake.com',
  spotify: 'spotify.com',
  netflix: 'netflix.com',
  palantir: 'palantir.com',
  atlassian: 'atlassian.com',
  linear: 'linear.app',
  notion: 'notion.so',
  ramp: 'ramp.com',
  retool: 'retool.com',
  supabase: 'supabase.com',
  microsoft: 'microsoft.com',
  apple: 'apple.com',
  linkedin: 'linkedin.com',
  github: 'github.com',
  salesforce: 'salesforce.com',
  nexus: 'nexus.io',
  'nexus enterprise ai': 'nexus.io',
  adobe: 'adobe.com',
  twitter: 'x.com',
  x: 'x.com',
  bytedance: 'bytedance.com',
  tiktok: 'tiktok.com',
  tesla: 'tesla.com',
  nvidia: 'nvidia.com',
  intel: 'intel.com',
  amd: 'amd.com',
  cisco: 'cisco.com',
  ibm: 'ibm.com',
  vmware: 'vmware.com',
  zoom: 'zoom.us',
  slack: 'slack.com',
  asana: 'asana.com',
  canva: 'canva.com',
  mongodb: 'mongodb.com',
  twilio: 'twilio.com',
  dropbox: 'dropbox.com',
  box: 'box.com',
  plaid: 'plaid.com',
  brex: 'brex.com',
};

/**
 * Resolves the primary web domain for a company name or external link.
 */
export function getCompanyDomain(companyName: string, externalUrl?: string | null): string {
  const cleanName = (companyName || '').toLowerCase().trim();
  if (KNOWN_COMPANY_DOMAINS[cleanName]) {
    return KNOWN_COMPANY_DOMAINS[cleanName];
  }

  // Check known domains by substring
  for (const [key, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return domain;
    }
  }

  // Extract from externalUrl if available
  if (externalUrl) {
    try {
      const parsed = new URL(externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`);
      const host = parsed.hostname.toLowerCase();
      // Ignore generic ATS hosts that don't represent the company's website
      if (
        !host.includes('greenhouse.io') &&
        !host.includes('lever.co') &&
        !host.includes('ashbyhq.com') &&
        !host.includes('workday.com') &&
        !host.includes('google.com')
      ) {
        return host.replace(/^www\./, '');
      }
    } catch {}
  }

  // Fallback: clean company name into a domain format
  const sanitized = cleanName.replace(/[^a-z0-9]/g, '');
  return sanitized ? `${sanitized}.com` : '';
}

/**
 * Constructs Google Favicon service URL (type=FAVICON, client=SOCIAL).
 * Safely clamps size between 16 and 64 to prevent upstream 404 image errors.
 */
export function getGoogleFaviconUrl(domain: string, size = 64): string {
  if (!domain) return '';
  const safeSize = Math.min(Math.max(size, 16), 64);
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=${safeSize}`;
}

interface CompanyLogoProps {
  companyName: string;
  logoUrl?: string | null;
  externalUrl?: string | null;
  className?: string;
  size?: number;
  initialsClassName?: string;
}

/**
 * Company Logo component that utilizes Google's favicon service:
 * https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://[domain]&size=64
 *
 * If the image fails to fetch or is unavailable, gracefully falls back to the company's 2-letter initials.
 */
export function CompanyLogo({
  companyName,
  logoUrl,
  externalUrl,
  className = 'w-10 h-10 rounded-xl',
  size = 64,
  initialsClassName = 'text-sm font-bold text-[#0A1B5C]',
}: CompanyLogoProps) {
  const [hasError, setHasError] = useState(false);

  const domain = getCompanyDomain(companyName, externalUrl);
  // Prefer Google client=SOCIAL favicon URL or direct logoUrl
  const resolvedUrl =
    logoUrl && !logoUrl.includes('google.com/s2/favicons')
      ? logoUrl
      : domain
      ? getGoogleFaviconUrl(domain, size)
      : '';

  // Reset error state whenever resolvedUrl changes so changing selected job re-attempts image render
  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const words = (companyName || 'CO').trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : companyName.slice(0, 2).toUpperCase();

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`${className} bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs select-none`}
        aria-label={companyName}
      >
        <span className={initialsClassName}>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-1 relative`}
      aria-label={companyName}
    >
      <img
        src={resolvedUrl}
        alt={companyName}
        className="w-full h-full object-contain"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}
