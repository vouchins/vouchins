'use client';

import React, { useState, useEffect } from 'react';
import { getGoogleFaviconUrl } from '@/lib/utils';

export { getGoogleFaviconUrl };

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
  tcs: 'tcs.com',
  'tata consultancy services': 'tcs.com',
  infosys: 'infosys.com',
  wipro: 'wipro.com',
  hcl: 'hcltech.com',
  hcltech: 'hcltech.com',
  'hcl technologies': 'hcltech.com',
  'tech mahindra': 'techmahindra.com',
  ltimindtree: 'ltimindtree.com',
  'l&t infotech': 'ltimindtree.com',
  accenture: 'accenture.com',
  cognizant: 'cognizant.com',
  deloitte: 'deloitte.com',
  pwc: 'pwc.com',
  pricewaterhousecoopers: 'pwc.com',
  ey: 'ey.com',
  'ernst & young': 'ey.com',
  kpmg: 'kpmg.com',
  capgemini: 'capgemini.com',
  synchrony: 'synchrony.com',
  'synchrony financial': 'synchrony.com',
  'state street': 'statestreet.com',
  virtusa: 'virtusa.com',
  zenoti: 'zenoti.com',
  'abc fitness': 'abcfitness.com',
  'wells fargo': 'wellsfargo.com',
  'goldman sachs': 'goldmansachs.com',
  'morgan stanley': 'morganstanley.com',
  jpmorgan: 'jpmorganchase.com',
  'jpmorgan chase': 'jpmorganchase.com',
  'jp morgan': 'jpmorganchase.com',
  qualcomm: 'qualcomm.com',
  'de shaw': 'deshaw.com',
  'd. e. shaw': 'deshaw.com',
  groww: 'groww.in',
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  paytm: 'paytm.com',
  phonepe: 'phonepe.com',
  meesho: 'meesho.com',
  cred: 'cred.club',
  razorpay: 'razorpay.com',
  postman: 'postman.com',
  browserstack: 'browserstack.com',
  inmobi: 'inmobi.com',
  thoughtworks: 'thoughtworks.com',
  highradius: 'highradius.com',
  rubrik: 'rubrik.com',
  druva: 'druva.com',
  nutanix: 'nutanix.com',
  cohesity: 'cohesity.com',
  elastic: 'elastic.co',
  zscaler: 'zscaler.com',
  quantela: 'quantela.com',
  qvantel: 'qvantel.com',
  focussoftnet: 'focussoftnet.com',
  'focus softnet': 'focussoftnet.com',
};

const ATS_AND_JOB_BOARD_HOSTS = [
  'linkedin.com',
  'naukri.com',
  'indeed.com',
  'glassdoor.com',
  'wellfound.com',
  'angel.co',
  'adzuna.com',
  'adzuna.in',
  'adzuna.co.uk',
  'monster.com',
  'ziprecruiter.com',
  'dice.com',
  'internshala.com',
  'instahyre.com',
  'hirist.com',
  'foundit.in',
  'shine.com',
  'simplyhired.com',
  'careerbuilder.com',
  'jobrapido.com',
  'smartrecruiters.com',
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workday.com',
  'myworkdayjobs.com',
  'adp.com',
  'taleo.net',
  'icims.com',
  'bamboohr.com',
  'pinpointhq.com',
  'recruitee.com',
  'workable.com',
  'jazzhr.com',
  'isolvedhire.com',
  'breezy.hr',
  'jobvite.com',
  'ultipro.com',
  'ukg.com',
  'successfactors.com',
  'brassring.com',
  'tinyurl.com',
  'bit.ly',
  't.co',
  'lnkd.in',
  'goo.gl',
  'google.com',
];

function isGenericJobHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  for (let i = 0; i < ATS_AND_JOB_BOARD_HOSTS.length; i++) {
    const b = ATS_AND_JOB_BOARD_HOSTS[i];
    if (h === b || h.endsWith('.' + b)) return true;
  }
  return false;
}

/**
 * Resolves the primary web domain for a company name, logo URL, or external link.
 * Prevents third-party job boards (like LinkedIn, Wellfound, Naukri, or ATS portals)
 * from overriding the actual hiring company's brand domain.
 */
export function getCompanyDomain(
  companyName: string,
  externalUrl?: string | null,
  logoUrl?: string | null
): string {
  const cleanName = (companyName || '').toLowerCase().trim();

  // 1. Check known company domains dictionary
  if (KNOWN_COMPANY_DOMAINS[cleanName]) {
    return KNOWN_COMPANY_DOMAINS[cleanName];
  }

  for (const [key, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return domain;
    }
  }

  // 2. Extract verified domain from logoUrl if available (e.g. from crawler/database)
  if (logoUrl) {
    try {
      const parsed = new URL(logoUrl.startsWith('http') ? logoUrl : `https://${logoUrl}`);
      const domainParam = parsed.searchParams.get('domain') || parsed.searchParams.get('url');
      if (domainParam) {
        const cleanDomain = domainParam
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
        if (cleanDomain && !isGenericJobHost(cleanDomain)) {
          return cleanDomain;
        }
      }
    } catch {}
  }

  // 3. Extract from externalUrl ONLY if not an ATS or job board aggregator
  if (externalUrl) {
    try {
      const parsed = new URL(externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (!isGenericJobHost(host)) {
        return host.replace(/^(careers|jobs|usijobs|portal\.careers|talent)\./, '');
      }
    } catch {}
  }

  // 4. Fallback: clean company name into a standard web domain format
  const sanitized = cleanName.replace(/[^a-z0-9]/g, '');
  return sanitized ? `${sanitized}.com` : '';
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
  const [protocol, setProtocol] = useState<'https' | 'http'>('https');
  const [hasError, setHasError] = useState(false);

  // If logoUrl is a direct image (not a Google Favicon proxy), use it directly
  const isDirectCustomLogo =
    logoUrl &&
    !logoUrl.includes('google.com/s2/favicons') &&
    !logoUrl.includes('gstatic.com/faviconV2');

  const domain = getCompanyDomain(companyName, externalUrl, logoUrl);

  const resolvedUrl = isDirectCustomLogo
    ? logoUrl
    : domain
    ? getGoogleFaviconUrl(domain, size, protocol)
    : '';

  // Reset error state and protocol whenever domain or logoUrl changes
  useEffect(() => {
    setProtocol('https');
    setHasError(false);
  }, [domain, logoUrl]);

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
        onError={() => {
          if (!isDirectCustomLogo && protocol === 'https') {
            setProtocol('http');
          } else {
            setHasError(true);
          }
        }}
        loading="lazy"
      />
    </div>
  );
}
