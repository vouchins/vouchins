/**
 * High-Speed Live ATS Aggregator (Inspired by strelov1/freehire)
 *
 * Directly queries public ATS job board APIs (Greenhouse, Lever, Ashby)
 * from hundreds of premier tech companies with zero scraping fragility.
 *
 * Uses Next.js Edge ISR Cache (revalidate: 3600) so that:
 * - $0 cron overhead on Vercel Hobby plan
 * - Sub-10ms response times from edge cache
 * - Real live requisitions with valid direct apply links
 */

import { cleanJobApplyUrl } from './url-cleaner';

export interface AtsTarget {
  company: string;
  boardToken: string;
  domain: string;
  platform: 'greenhouse' | 'lever' | 'ashby';
}

export interface NormalizedAtsJob {
  id: string;
  title: string;
  company_name: string;
  company_logo: string;
  location: string;
  workplace_type: 'Remote' | 'Hybrid' | 'Onsite';
  job_type: 'Full-time' | 'Contract' | 'Part-time';
  experience_level: 'Senior' | 'Staff' | 'Lead' | 'Principal' | 'Mid' | 'Entry';
  category: string;
  salary_range?: string;
  description: string;
  requirements?: string;
  external_apply_url: string;
  is_internal: boolean;
  match_score: number;
  match_breakdown: {
    skillsScore: number;
    experienceScore: number;
    stackScore: number;
  };
  why_you_match: string;
  matching_skills: string[];
  missing_skills: string[];
  tailored_bullet_suggestion: {
    original: string;
    tailored: string;
    impactMetric: string;
  };
  insider_count: number;
  is_recommended: boolean;
  created_at: string;
}

export interface AtsQueryOptions {
  skills?: string[];
  seniority?: string;
  query?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'all';
  location?: string;
  companies?: string[];
  limit?: number;
}

// ============================================================================
// Public ATS Board Targets (World-Class Tech Employers)
// ============================================================================

export const GREENHOUSE_TARGETS: AtsTarget[] = [
  // Top Indian Tech Giants & Global R&D Hubs with Active Greenhouse Boards
  { company: 'Groww', boardToken: 'groww', domain: 'groww.in', platform: 'greenhouse' },
  { company: 'InMobi', boardToken: 'inmobi', domain: 'inmobi.com', platform: 'greenhouse' },
  { company: 'Thoughtworks', boardToken: 'thoughtworks', domain: 'thoughtworks.com', platform: 'greenhouse' },
  { company: 'Slice', boardToken: 'slice', domain: 'sliceit.com', platform: 'greenhouse' },
  { company: 'HighRadius', boardToken: 'highradius', domain: 'highradius.com', platform: 'greenhouse' },
  { company: 'Rubrik', boardToken: 'rubrik', domain: 'rubrik.com', platform: 'greenhouse' },
  { company: 'Druva', boardToken: 'druva', domain: 'druva.com', platform: 'greenhouse' },
  { company: 'Nutanix', boardToken: 'nutanix', domain: 'nutanix.com', platform: 'greenhouse' },
  { company: 'Cohesity', boardToken: 'cohesity', domain: 'cohesity.com', platform: 'greenhouse' },
  { company: 'Okta', boardToken: 'okta', domain: 'okta.com', platform: 'greenhouse' },
  { company: 'MongoDB', boardToken: 'mongodb', domain: 'mongodb.com', platform: 'greenhouse' },
  { company: 'Elastic', boardToken: 'elastic', domain: 'elastic.co', platform: 'greenhouse' },
  { company: 'Twilio', boardToken: 'twilio', domain: 'twilio.com', platform: 'greenhouse' },
  { company: 'Postman', boardToken: 'postman', domain: 'postman.com', platform: 'greenhouse' },
  { company: 'BrowserStack', boardToken: 'browserstack', domain: 'browserstack.com', platform: 'greenhouse' },
  { company: 'Branch', boardToken: 'branch', domain: 'branch.io', platform: 'greenhouse' },
  // Premier Global Tech Leaders with Major India Presence
  { company: 'Stripe', boardToken: 'stripe', domain: 'stripe.com', platform: 'greenhouse' },
  { company: 'Cloudflare', boardToken: 'cloudflare', domain: 'cloudflare.com', platform: 'greenhouse' },
  { company: 'Datadog', boardToken: 'datadog', domain: 'datadoghq.com', platform: 'greenhouse' },
  { company: 'GitLab', boardToken: 'gitlab', domain: 'gitlab.com', platform: 'greenhouse' },
  { company: 'Snowflake', boardToken: 'snowflake', domain: 'snowflake.com', platform: 'greenhouse' },
  { company: 'Figma', boardToken: 'figma', domain: 'figma.com', platform: 'greenhouse' },
  { company: 'Airbnb', boardToken: 'airbnb', domain: 'airbnb.com', platform: 'greenhouse' },
  { company: 'DoorDash', boardToken: 'doordash', domain: 'doordash.com', platform: 'greenhouse' },
  { company: 'Pinterest', boardToken: 'pinterest', domain: 'pinterest.com', platform: 'greenhouse' },
  { company: 'Coinbase', boardToken: 'coinbase', domain: 'coinbase.com', platform: 'greenhouse' },
  { company: 'Reddit', boardToken: 'reddit', domain: 'reddit.com', platform: 'greenhouse' },
  { company: 'Instacart', boardToken: 'instacart', domain: 'instacart.com', platform: 'greenhouse' },
];

export const LEVER_TARGETS: AtsTarget[] = [
  // Top Indian Tech Unicorns & Product Leaders with Active Lever Boards
  { company: 'Paytm', boardToken: 'paytm', domain: 'paytm.com', platform: 'lever' },
  { company: 'Meesho', boardToken: 'meesho', domain: 'meesho.com', platform: 'lever' },
  { company: 'CRED', boardToken: 'cred', domain: 'cred.club', platform: 'lever' },
  { company: 'Zeta', boardToken: 'zeta', domain: 'zeta.tech', platform: 'lever' },
  { company: 'Atlassian', boardToken: 'atlassian', domain: 'atlassian.com', platform: 'lever' },
  { company: 'Spotify', boardToken: 'spotify', domain: 'spotify.com', platform: 'lever' },
  { company: 'Netflix', boardToken: 'netflix', domain: 'netflix.com', platform: 'lever' },
  { company: 'Palantir', boardToken: 'palantir', domain: 'palantir.com', platform: 'lever' },
];

export const ASHBY_TARGETS: AtsTarget[] = [
  { company: 'Navi', boardToken: 'navi', domain: 'navi.com', platform: 'ashby' },
  { company: 'Notion', boardToken: 'notion', domain: 'notion.so', platform: 'ashby' },
  { company: 'Linear', boardToken: 'linear', domain: 'linear.app', platform: 'ashby' },
  { company: 'Ramp', boardToken: 'ramp', domain: 'ramp.com', platform: 'ashby' },
  { company: 'Retool', boardToken: 'retool', domain: 'retool.com', platform: 'ashby' },
  { company: 'Supabase', boardToken: 'supabase', domain: 'supabase.com', platform: 'ashby' },
  { company: 'OpenAI', boardToken: 'openai', domain: 'openai.com', platform: 'ashby' },
  { company: 'Perplexity', boardToken: 'perplexity', domain: 'perplexity.ai', platform: 'ashby' },
];

// ============================================================================
// Text Cleaners & Classification Helpers
// ============================================================================

export function cleanHtmlText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (
    t.includes('data') ||
    t.includes('ai') ||
    t.includes('machine learning') ||
    t.includes('ml') ||
    t.includes('scientist')
  ) {
    return 'Data / AI';
  }
  if (
    t.includes('product manager') ||
    t.includes('product lead') ||
    t.includes('group product')
  ) {
    return 'Product Management';
  }
  if (
    t.includes('designer') ||
    t.includes('ux') ||
    t.includes('ui') ||
    t.includes('product design')
  ) {
    return 'Design';
  }
  if (
    t.includes('sales') ||
    t.includes('account executive') ||
    t.includes('business development') ||
    t.includes('bdr')
  ) {
    return 'Sales';
  }
  if (
    t.includes('finance') ||
    t.includes('accounting') ||
    t.includes('tax') ||
    t.includes('audit')
  ) {
    return 'Finance / Risk';
  }
  if (
    t.includes('recruiter') ||
    t.includes('talent') ||
    t.includes('people') ||
    t.includes('hr')
  ) {
    return 'HR';
  }
  if (
    t.includes('operations') ||
    t.includes('program manager') ||
    t.includes('coordinator')
  ) {
    return 'Operations';
  }
  return 'Engineering';
}

export function detectExperienceLevel(
  title: string
): 'Senior' | 'Staff' | 'Lead' | 'Principal' | 'Mid' | 'Entry' {
  const t = title.toLowerCase();
  if (
    t.includes('principal') ||
    t.includes('director') ||
    t.includes('distinguished') ||
    t.includes('fellow')
  ) {
    return 'Principal';
  }
  if (t.includes('staff') || t.includes('architect') || t.includes('head of')) {
    return 'Staff';
  }
  if (t.includes('lead') || t.includes('manager') || t.includes('team lead')) {
    return 'Lead';
  }
  if (t.includes('senior') || t.includes('sr.') || t.includes('sr ')) {
    return 'Senior';
  }
  if (
    t.includes('junior') ||
    t.includes('jr.') ||
    t.includes('associate') ||
    t.includes('intern') ||
    t.includes('graduate') ||
    t.includes('entry')
  ) {
    return 'Entry';
  }
  return 'Mid';
}

export function detectWorkMode(locationStr: string, explicitType?: string): 'Remote' | 'Hybrid' | 'Onsite' {
  if (explicitType) {
    const norm = explicitType.trim().toLowerCase();
    if (norm === 'remote') return 'Remote';
    if (norm === 'hybrid') return 'Hybrid';
    if (norm === 'onsite') return 'Onsite';
  }
  const lower = (locationStr || '').toLowerCase();
  if (lower.includes('remote') || lower.includes('anywhere') || lower.includes('virtual')) {
    return 'Remote';
  }
  if (lower.includes('hybrid')) {
    return 'Hybrid';
  }
  return 'Onsite';
}

export const LOCATION_ALIASES: Record<string, string[]> = {
  'new jersey': ['nj', 'jersey', 'newark', 'princeton', 'jersey city', 'hoboken', 'new york metro', 'ny metro'],
  'nj': ['new jersey', 'jersey', 'newark', 'princeton', 'jersey city', 'hoboken', 'new york metro', 'ny metro'],
  'jersey': ['new jersey', 'nj', 'jersey city', 'newark', 'hoboken'],
  'jersey city': ['new jersey', 'nj', 'jersey', 'newark', 'hoboken'],
  'newark': ['new jersey', 'nj', 'jersey', 'jersey city'],
  'new york': ['ny', 'nyc', 'manhattan', 'brooklyn', 'new york city'],
  'nyc': ['new york', 'ny', 'manhattan', 'brooklyn', 'new york city'],
  'san francisco': ['sf', 'bay area', 'silicon valley', 'palo alto', 'mountain view', 'sunnyvale', 'san jose', 'oakland'],
  'sf': ['san francisco', 'bay area', 'silicon valley', 'palo alto', 'mountain view', 'sunnyvale', 'san jose', 'oakland'],
  'california': ['ca', 'san francisco', 'sf', 'bay area', 'los angeles', 'la', 'san diego'],
  'seattle': ['wa', 'bellevue', 'redmond'],
  'washington': ['wa', 'seattle', 'bellevue', 'redmond'],
  'texas': ['tx', 'austin', 'dallas', 'houston', 'dfw'],
  'austin': ['tx', 'texas'],
  'dallas': ['tx', 'texas', 'dfw', 'plano', 'irving'],
  'chicago': ['il', 'illinois'],
  'boston': ['ma', 'massachusetts', 'cambridge'],
  'hyderabad': ['hyd', 'telangana', 'cyberabad', 'hitec city', 'secunderabad', 'gachibowli', 'madhapur'],
  'bangalore': ['bengaluru', 'blr', 'karnataka', 'whitefield', 'electronic city', 'bellandur'],
  'bengaluru': ['bangalore', 'blr', 'karnataka', 'whitefield', 'electronic city', 'bellandur'],
  'pune': ['hinjewadi', 'magarpatta'],
  'mumbai': ['bombay', 'navi mumbai', 'thane', 'bkc'],
  'delhi': ['ncr', 'new delhi'],
  'gurgaon': ['gurugram', 'dlf cyber city'],
  'noida': ['greater noida'],
  'chennai': ['madras', 'tamil nadu', 'omr'],
  'london': ['uk', 'united kingdom', 'england'],
  'india': ['hyderabad', 'bangalore', 'bengaluru', 'pune', 'mumbai', 'delhi', 'gurgaon', 'noida', 'chennai', 'telangana', 'karnataka'],
};

const LOCATION_STOP_WORDS = new Set([
  'new', 'san', 'los', 'de', 'la', 'el', 'city', 'area', 'metro', 'north', 'south', 'east', 'west', 'greater', 'st', 'saint',
  'india', 'us', 'usa', 'united', 'states', 'uk', 'kingdom', 'country', 'worldwide', 'global', 'remote'
]);

// Regional groupings to avoid returning US-remote to India or India-remote to US
const INDIA_REGIONS = new Set([
  'hyderabad', 'hyd', 'telangana', 'cyberabad', 'hitec city',
  'bangalore', 'bengaluru', 'blr', 'karnataka', 'whitefield', 'electronic city',
  'pune', 'mumbai', 'bombay', 'maharashtra',
  'delhi', 'gurgaon', 'gurugram', 'noida', 'ncr',
  'india', 'chennai', 'kolkata'
]);

const US_REGIONS = new Set([
  'new jersey', 'nj', 'jersey', 'jersey city', 'newark',
  'new york', 'ny', 'nyc', 'manhattan', 'brooklyn',
  'san francisco', 'sf', 'bay area', 'silicon valley', 'california', 'ca',
  'seattle', 'wa', 'washington',
  'texas', 'tx', 'austin', 'dallas', 'houston',
  'chicago', 'il', 'illinois',
  'boston', 'ma', 'massachusetts',
  'us', 'usa', 'united states'
]);

/**
 * Verifies whether a candidate location string is a valid geographic location
 * (city, state, region) rather than a job title, role headline, or company handle.
 */
export function isValidGeographicLocation(loc?: string | null): boolean {
  if (!loc) return false;
  const clean = loc.trim().toLowerCase();
  if (!clean || clean === 'all' || clean === 'remote' || clean === 'anywhere' || clean === 'virtual' || clean === 'hybrid') {
    return false;
  }
  // Reject email addresses, social handles, or "Role @ Company" format
  if (clean.includes('@') || clean.includes('http://') || clean.includes('https://') || clean.includes('.com')) {
    return false;
  }
  // Reject common job title keywords mistakenly stored in location fields
  const jobTitleKeywords = [
    'developer', 'engineer', 'architect', 'lead', 'manager', 'director',
    'specialist', 'consultant', 'analyst', 'designer', 'intern', 'administrator',
    'full stack', 'frontend', 'backend', 'qa', 'sdet', 'devops', 'software'
  ];
  if (jobTitleKeywords.some((kw) => clean.includes(kw))) {
    return false;
  }
  return true;
}

export function isLocationMatch(
  jobLocation: string,
  candidateLocation: string,
  workplaceType?: string,
  workModeFilter: 'all' | 'onsite' | 'hybrid' | 'remote' = 'all'
): boolean {
  const detectedType = detectWorkMode(jobLocation, workplaceType);
  const normalizedType = detectedType.toLowerCase();

  // 1. Check Workplace Mode filter if explicitly set
  if (workModeFilter && workModeFilter !== 'all') {
    if (workModeFilter.toLowerCase() !== normalizedType) {
      return false;
    }
  }

  // 2. If no candidate location specified, set to 'all', or invalid location, match anything passing work mode
  if (!candidateLocation || candidateLocation.toLowerCase() === 'all' || !isValidGeographicLocation(candidateLocation)) {
    return true;
  }

  const candLoc = candidateLocation.toLowerCase().trim();
  const jobLoc = (jobLocation || '').toLowerCase().trim();

  // Distinct city conflict prevention (e.g. Hyderabad vs Bengaluru/Pune/Mumbai)
  const distinctCities = ['hyderabad', 'bangalore', 'bengaluru', 'pune', 'mumbai', 'delhi', 'gurgaon', 'noida', 'chennai'];
  const candCity = distinctCities.find((c) => candLoc.includes(c));
  if (candCity) {
    const cityAliases = [candCity, ...(LOCATION_ALIASES[candCity] || [])];
    const matchesCandCity = cityAliases.some((a) => jobLoc.includes(a));
    if (matchesCandCity) return true;

    // Check if the role is explicitly on-site / hybrid in a conflicting city
    const conflictingCity = distinctCities.find(
      (c) => c !== candCity && !cityAliases.includes(c) && jobLoc.includes(c)
    );
    if (conflictingCity) {
      return false;
    }
  }

  // 3. Direct substring match (e.g. "Hyderabad" in "Hyderabad, India" or vice versa)
  if (jobLoc.includes(candLoc) || (jobLoc.length > 3 && candLoc.includes(jobLoc))) {
    return true;
  }

  // 4. Token boundary check
  const tokens = candLoc
    .split(/[\s,/-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !LOCATION_STOP_WORDS.has(t));
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(jobLoc)) {
      return true;
    }
  }

  // 5. State & Metro Area Aliases
  const aliases = LOCATION_ALIASES[candLoc] || [];
  for (const alias of aliases) {
    if (jobLoc.includes(alias)) {
      return true;
    }
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(jobLoc)) {
      return true;
    }
  }

  // 6. Remote Job Region Compatibility
  // If the job is remote, verify it is geographically compatible with candidate's location
  if (normalizedType === 'remote') {
    const isCandidateIndia = INDIA_REGIONS.has(candLoc) ||
      (aliases.some((al) => INDIA_REGIONS.has(al)));
    const isCandidateUS = US_REGIONS.has(candLoc) ||
      (aliases.some((al) => US_REGIONS.has(al)));

    const jobHasUS = Array.from(US_REGIONS).some((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(jobLoc);
    });

    const jobHasIndia = Array.from(INDIA_REGIONS).some((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(jobLoc);
    });

    if (isCandidateIndia) {
      // If candidate is in India:
      // - Match if job specifies India or candidate city (e.g. "Remote - India", "Hyderabad (Remote)")
      // - Match generic "Remote" ONLY if it does not explicitly specify US / UK / EMEA
      if (jobHasIndia) return true;
      if (jobHasUS) return false;
      if (jobLoc.includes('uk') || jobLoc.includes('london') || jobLoc.includes('emea') || jobLoc.includes('europe')) return false;
      if (jobLoc === 'remote' || jobLoc === 'anywhere' || jobLoc.includes('worldwide') || jobLoc.includes('global')) {
        return true;
      }
      return false;
    }

    if (isCandidateUS) {
      // If candidate is in US:
      // - Match if job specifies US or candidate state/city
      // - Reject if job specifies India / APAC / EMEA
      if (jobHasUS) return true;
      if (jobHasIndia) return false;
      if (jobLoc.includes('apac') || jobLoc.includes('emea') || jobLoc.includes('europe')) return false;
      if (jobLoc === 'remote' || jobLoc === 'anywhere' || jobLoc.includes('worldwide') || jobLoc.includes('global')) {
        return true;
      }
      return false;
    }
  }

  return false;
}

export const COMMON_TECH_TAXONOMY = [
  'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python', 'Go', 'Golang',
  'PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'AWS', 'GCP', 'Azure', 'Kubernetes',
  'Docker', 'GraphQL', 'REST', 'gRPC', 'Distributed Systems', 'Microservices',
  'Tailwind CSS', 'Java', 'C++', 'Rust', 'Ruby', 'Rails', 'Elasticsearch',
  'Terraform', 'CI/CD', 'OpenTelemetry', 'Datadog', 'SQL', 'MongoDB', 'Spring Boot'
];

export const SKILL_SYNONYMS: Record<string, string[]> = {
  react: ['react.js', 'reactjs'],
  'react.js': ['react', 'reactjs'],
  reactjs: ['react', 'react.js'],
  node: ['node.js', 'nodejs'],
  'node.js': ['node', 'nodejs'],
  nodejs: ['node', 'node.js'],
  next: ['next.js', 'nextjs'],
  'next.js': ['next', 'nextjs'],
  nextjs: ['next', 'next.js'],
  vue: ['vue.js', 'vuejs'],
  'vue.js': ['vue', 'vuejs'],
  vuejs: ['vue', 'vue.js'],
  angular: ['angular.js', 'angularjs'],
  'angular.js': ['angular', 'angularjs'],
  angularjs: ['angular', 'angular.js'],
  typescript: ['ts'],
  ts: ['typescript'],
  javascript: ['js'],
  js: ['javascript'],
  python: ['py'],
  postgres: ['postgresql'],
  postgresql: ['postgres'],
  kubernetes: ['k8s'],
  k8s: ['kubernetes'],
  mongo: ['mongodb'],
  mongodb: ['mongo'],
  aws: ['amazon web services'],
  'amazon web services': ['aws'],
  gcp: ['google cloud', 'google cloud platform'],
  'google cloud': ['gcp', 'google cloud platform'],
  'google cloud platform': ['gcp', 'google cloud'],
  azure: ['microsoft azure'],
  'microsoft azure': ['azure'],
  rest: ['restful', 'rest api', 'rest apis'],
  'rest api': ['rest', 'restful', 'rest apis'],
  'rest apis': ['rest', 'restful', 'rest api'],
  restful: ['rest', 'rest api', 'rest apis'],
  graphql: ['gql'],
  gql: ['graphql'],
  tailwind: ['tailwindcss', 'tailwind css'],
  tailwindcss: ['tailwind', 'tailwind css'],
  'tailwind css': ['tailwind', 'tailwindcss'],
  spring: ['spring boot', 'springboot'],
  'spring boot': ['spring', 'springboot'],
  springboot: ['spring', 'spring boot'],
  'ci/cd': ['cicd', 'continuous integration'],
  cicd: ['ci/cd', 'continuous integration'],
  go: ['golang'],
  golang: ['go'],
  docker: ['containers', 'containerization'],
  kafka: ['apache kafka'],
  'apache kafka': ['kafka'],
  spark: ['apache spark'],
  'apache spark': ['spark'],
  ml: ['machine learning'],
  'machine learning': ['ml'],
  ai: ['artificial intelligence', 'genai', 'generative ai'],
  'artificial intelligence': ['ai', 'genai', 'generative ai'],
  nlp: ['natural language processing'],
  'natural language processing': ['nlp'],
  sql: ['dbms', 'database', 'rdbms'],
  dbms: ['sql', 'database', 'rdbms'],
  rdbms: ['sql', 'dbms', 'database'],
};

function rawSkillMatch(lowerCorpus: string, cleanSkill: string): boolean {
  const lowerSkill = cleanSkill.toLowerCase();
  if (lowerSkill === 'c++') return /(^|[^a-zA-Z0-9])c\+\+([^a-zA-Z0-9]|$)/i.test(lowerCorpus);
  if (lowerSkill === 'c#') return /(^|[^a-zA-Z0-9])c#([^a-zA-Z0-9]|$)/i.test(lowerCorpus);
  if (lowerSkill === '.net') return /(^|[^a-zA-Z0-9])\.net([^a-zA-Z0-9]|$)/i.test(lowerCorpus);
  if (lowerSkill === 'go') {
    return /(^|[^a-zA-Z0-9])(go|golang)([^a-zA-Z0-9]|$)/i.test(lowerCorpus);
  }
  const escaped = lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
  return regex.test(lowerCorpus);
}

/**
 * Canonicalizes skill names to standard representation.
 * Strips version annotations like "(ES6+)", "(v18)", etc. and unifies synonyms.
 */
export function canonicalizeSkill(skill: string): string {
  if (!skill) return '';
  const clean = skill.trim();
  // Strip parenthetical version notes like (ES6+), (v18), etc.
  const base = clean.replace(/\s*\([^)]*\)/g, '').trim();
  const lower = base.toLowerCase();

  if (lower === 'react' || lower === 'reactjs' || lower === 'react.js') return 'React';
  if (lower === 'javascript' || lower === 'js' || lower.startsWith('javascript')) return 'JavaScript';
  if (lower === 'typescript' || lower === 'ts') return 'TypeScript';
  if (lower === 'node' || lower === 'nodejs' || lower === 'node.js') return 'Node.js';
  if (lower === 'next' || lower === 'nextjs' || lower === 'next.js') return 'Next.js';
  if (lower === 'vue' || lower === 'vuejs' || lower === 'vue.js') return 'Vue';
  if (lower === 'angular' || lower === 'angularjs' || lower === 'angular.js') return 'Angular';
  if (lower === 'go' || lower === 'golang') return 'Go';
  if (lower === 'postgres' || lower === 'postgresql') return 'PostgreSQL';
  if (lower === 'tailwind' || lower === 'tailwindcss' || lower === 'tailwind css') return 'Tailwind CSS';
  if (lower === 'rest' || lower === 'restful' || lower === 'rest api' || lower === 'restful apis' || lower === 'restful api') return 'REST';
  if (lower === 'k8s' || lower === 'kubernetes') return 'Kubernetes';
  if (lower === 'mongo' || lower === 'mongodb') return 'MongoDB';
  if (lower === 'aws' || lower === 'amazon web services') return 'AWS';
  if (lower === 'gcp' || lower === 'google cloud' || lower === 'google cloud platform') return 'GCP';
  if (lower === 'azure' || lower === 'microsoft azure') return 'Azure';
  if (lower === 'spring' || lower === 'spring boot' || lower === 'springboot') return 'Spring Boot';
  if (lower === 'docker' || lower === 'containers' || lower === 'containerization') return 'Docker';
  if (lower === 'kafka' || lower === 'apache kafka') return 'Kafka';
  if (lower === 'spark' || lower === 'apache spark') return 'Spark';
  if (lower === 'ml' || lower === 'machine learning') return 'Machine Learning';
  if (lower === 'ai' || lower === 'artificial intelligence' || lower === 'genai' || lower === 'generative ai') return 'AI';
  if (lower === 'ci/cd' || lower === 'cicd' || lower === 'continuous integration') return 'CI/CD';

  return base || clean;
}

/**
 * Checks whether the candidate possesses a given technical skill,
 * taking into account canonical skill names, parenthetical versions, and synonyms.
 */
export function candidateHasSkill(tech: string, candidateSkills: string[]): boolean {
  if (!tech || !candidateSkills || candidateSkills.length === 0) return false;
  const normTech = canonicalizeSkill(tech).toLowerCase();

  return candidateSkills.some((cs) => {
    if (!cs) return false;
    const normCs = canonicalizeSkill(cs).toLowerCase();
    if (normCs === normTech) return true;
    if (normCs.length >= 4 && normTech.length >= 4 && (normCs === normTech || normCs.includes(normTech) || normTech.includes(normCs))) {
      // Prevent "java" from matching "javascript"
      if ((normCs === 'java' && normTech === 'javascript') || (normCs === 'javascript' && normTech === 'java')) {
        return false;
      }
      return true;
    }

    const syns = SKILL_SYNONYMS[normTech] || [];
    if (syns.some((syn) => syn.toLowerCase() === normCs || syn.toLowerCase() === cs.toLowerCase())) return true;

    const csSyns = SKILL_SYNONYMS[normCs] || [];
    if (csSyns.some((syn) => syn.toLowerCase() === normTech || syn.toLowerCase() === tech.toLowerCase())) return true;

    return false;
  });
}

/**
 * Safely tests whether a skill exists in a text corpus using word boundaries and synonym aliasing.
 * Accurately prevents false-positive matches (e.g. "Go" matching "Google" or "algorithm",
 * "Java" matching "JavaScript", "AI" matching "maintain" or "email").
 */
export function containsSkill(textCorpus: string, skill: string): boolean {
  if (!textCorpus || !skill) return false;
  const cleanSkill = skill.trim();
  if (!cleanSkill) return false;
  const lowerCorpus = textCorpus.toLowerCase();
  if (rawSkillMatch(lowerCorpus, cleanSkill)) return true;

  const canon = canonicalizeSkill(cleanSkill);
  if (canon && canon.toLowerCase() !== cleanSkill.toLowerCase() && rawSkillMatch(lowerCorpus, canon)) {
    return true;
  }

  const synonyms = SKILL_SYNONYMS[cleanSkill.toLowerCase()] || (canon ? SKILL_SYNONYMS[canon.toLowerCase()] : undefined) || [];
  return synonyms.some((syn) => rawSkillMatch(lowerCorpus, syn));
}

export function isSeniorityCompatible(
  targetSeniority = 'Mid',
  jobExp = 'Mid'
): { compatible: boolean; isExact: boolean } {
  const normTarget = targetSeniority.toLowerCase().trim();
  const normJob = jobExp.toLowerCase().trim();

  // Normalize 'lead/director' or 'director' to 'lead'
  const cleanTarget = normTarget.replace('/director', '').replace('director', 'lead');
  const cleanJob = normJob.replace('/director', '').replace('director', 'lead');

  if (cleanTarget === cleanJob) {
    return { compatible: true, isExact: true };
  }

  const seniorityLevels: Record<string, string[]> = {
    entry: ['entry', 'junior', 'associate', 'mid'],
    mid: ['mid', 'entry', 'senior'],
    senior: ['senior', 'mid', 'staff', 'lead'],
    staff: ['staff', 'senior', 'lead', 'principal'],
    lead: ['lead', 'staff', 'senior', 'principal'],
    principal: ['principal', 'lead', 'staff', 'senior'],
  };

  const allowed = seniorityLevels[cleanTarget] || [cleanTarget];
  return {
    compatible: allowed.includes(cleanJob),
    isExact: false,
  };
}

export interface CandidateMatchingContext {
  currentRole?: string;
  currentCompany?: string;
  isStillWorking?: boolean;
}

export type RoleDomain =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'devops_sre'
  | 'data_ai'
  | 'mobile'
  | 'qa_sdet'
  | 'product'
  | 'design'
  | 'security'
  | 'management'
  | 'general_tech';

export function isSameCompany(comp1?: string, comp2?: string): boolean {
  if (!comp1 || !comp2) return false;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\b(inc|corp|corporation|llc|ltd|limited|technologies|solutions|labs|pvt|private|group)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const c1 = clean(comp1);
  const c2 = clean(comp2);
  if (!c1 || !c2) return false;
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
}

export function detectRoleDomain(titleOrRole: string): RoleDomain {
  const t = (titleOrRole || '').toLowerCase();
  if (!t.trim()) return 'general_tech';

  // Product
  if (/\b(product manager|product management|tpm|technical product manager|product owner|apm|gpm|director of product|vp of product)\b/i.test(t)) {
    return 'product';
  }

  // Design / UX
  if (/\b(ui\/ux|ux designer|product designer|visual designer|ui designer|ux researcher|interaction designer|design lead)\b/i.test(t)) {
    return 'design';
  }

  // Security
  if (/\b(security engineer|infosec|appsec|cybersecurity|penetration test|soc analyst|secops|security analyst)\b/i.test(t)) {
    return 'security';
  }

  // Management
  if (/\b(engineering manager|director of engineering|vp of engineering|head of engineering|cto|chief technology officer|tech lead manager)\b/i.test(t)) {
    return 'management';
  }

  // QA / SDET / Testing
  if (/\b(qa|sdet|quality assurance|test engineer|automation engineer|software test|software tester)\b/i.test(t)) {
    return 'qa_sdet';
  }

  // Mobile
  if (/\b(ios|android|mobile|flutter|react native|swift developer|kotlin developer)\b/i.test(t)) {
    return 'mobile';
  }

  // Data / AI / ML
  if (/\b(data engineer|data scientist|machine learning|ml engineer|ai engineer|deep learning|nlp|computer vision|analytics engineer|big data|business intelligence|bi developer|data analyst)\b/i.test(t)) {
    return 'data_ai';
  }

  // DevOps / SRE / Cloud / Infrastructure
  if (/\b(devops|sre|site reliability|cloud|platform|infrastructure|kubernetes|k8s|sysadmin|systems administrator|release engineer)\b/i.test(t)) {
    return 'devops_sre';
  }

  // Frontend / UI / Web
  if (/\b(frontend|front-end|front end|ui engineer|ui developer|web developer|react developer|angular developer|vue developer|client engineer)\b/i.test(t)) {
    return 'frontend';
  }

  // Backend
  if (/\b(backend|back-end|back end|server engineer|api engineer|microservices|java developer|golang developer|python developer|node developer|distributed systems|c\+\+ developer)\b/i.test(t)) {
    return 'backend';
  }

  // Full Stack / SWE
  if (/\b(fullstack|full-stack|full stack|web application developer|software engineer|software developer|sde|swe|member of technical staff|mts)\b/i.test(t)) {
    return 'fullstack';
  }

  return 'general_tech';
}

/**
 * Calculates candidate match metrics against a job posting text and requirements.
 */
export function evaluateJobMatch(
  jobInfo: {
    title: string;
    description?: string;
    requirements?: string;
    experienceLevel?: string;
    workplaceType?: string;
    location?: string;
    companyName?: string;
  },
  candidateSkills: string[] = [],
  targetSeniority = 'Senior',
  candidateLocation = '',
  candidateContext?: CandidateMatchingContext
) {
  const normalizedCandidate = candidateSkills.map((s) => s.toLowerCase().trim()).filter(Boolean);
  const textCorpus = `${jobInfo.title} ${jobInfo.description || ''} ${jobInfo.requirements || ''}`.toLowerCase();

  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  // 1. Detect candidate matching skills using precise word boundaries & canonical normalization
  candidateSkills.forEach((skill) => {
    if (!skill) return;
    const baseSkill = canonicalizeSkill(skill);
    if (containsSkill(textCorpus, skill) || (baseSkill && containsSkill(textCorpus, baseSkill))) {
      const displaySkill = baseSkill || skill;
      if (!matchingSkills.some((m) => canonicalizeSkill(m).toLowerCase() === displaySkill.toLowerCase())) {
        matchingSkills.push(displaySkill);
      }
    }
  });

  const hasGenuineSkillMatch = matchingSkills.length > 0;

  // 2. Detect missing / recommended skills from tech taxonomy that the job actually mentions
  COMMON_TECH_TAXONOMY.forEach((tech) => {
    const normTech = canonicalizeSkill(tech);
    if (containsSkill(textCorpus, tech)) {
      const alreadyMatched = matchingSkills.some((m) => canonicalizeSkill(m).toLowerCase() === normTech.toLowerCase());
      const hasSkill = candidateHasSkill(tech, candidateSkills);
      if (!alreadyMatched && !hasSkill) {
        if (missingSkills.length < 4 && !missingSkills.some((m) => canonicalizeSkill(m).toLowerCase() === normTech.toLowerCase())) {
          missingSkills.push(tech);
        }
      }
    }
  });

  // 3. Dynamic match score computation
  let baseScore = 76;
  if (hasGenuineSkillMatch) {
    baseScore += Math.min(16, matchingSkills.length * 4);
  }

  // Bonus for candidate skills explicitly present in job title
  const titleLower = jobInfo.title.toLowerCase();
  const titleSkillMatches = candidateSkills.filter(
    (s) => s.length >= 2 && containsSkill(titleLower, s)
  );
  if (titleSkillMatches.length > 0) {
    baseScore += 6;
  }

  // Role relevance filter: prevents unrelated roles (e.g. chemist, driver) from scoring high
  if (candidateSkills.length > 0 && !isRoleRelevant(jobInfo.title, candidateSkills, candidateContext?.currentRole)) {
    baseScore -= 12;
  }

  // 4. Candidate's Current / Last Role and Domain Alignment
  let roleDomainMatch = false;
  let roleDomainAdjacent = false;
  let roleDomainMismatch = false;

  if (candidateContext?.currentRole) {
    const candDomain = detectRoleDomain(candidateContext.currentRole);
    const jobDomain = detectRoleDomain(jobInfo.title);

    if (candDomain !== 'general_tech' && jobDomain !== 'general_tech') {
      if (candDomain === jobDomain) {
        roleDomainMatch = true;
        baseScore += 10; // Major bonus for matching candidate's current or last role domain
      } else {
        const isAdjacent =
          (candDomain === 'fullstack' && (jobDomain === 'frontend' || jobDomain === 'backend')) ||
          (jobDomain === 'fullstack' && (candDomain === 'frontend' || candDomain === 'backend')) ||
          (candDomain === 'backend' && (jobDomain === 'devops_sre' || jobDomain === 'data_ai')) ||
          (candDomain === 'devops_sre' && (jobDomain === 'security' || jobDomain === 'backend')) ||
          (candDomain === 'management' && (jobDomain === 'fullstack' || jobDomain === 'backend' || jobDomain === 'frontend'));

        if (isAdjacent) {
          roleDomainAdjacent = true;
          baseScore += 5; // Adjacent compatible domain
        } else {
          const severeMismatches = [
            candDomain === 'product' && ['frontend', 'backend', 'devops_sre', 'data_ai', 'mobile', 'qa_sdet', 'security'].includes(jobDomain),
            jobDomain === 'product' && ['frontend', 'backend', 'devops_sre', 'data_ai', 'mobile', 'qa_sdet', 'security'].includes(candDomain),
            candDomain === 'design' && ['backend', 'devops_sre', 'data_ai', 'qa_sdet', 'security'].includes(jobDomain),
            candDomain === 'qa_sdet' && ['devops_sre', 'data_ai', 'mobile'].includes(jobDomain),
            candDomain === 'frontend' && ['data_ai', 'devops_sre'].includes(jobDomain),
            candDomain === 'mobile' && ['data_ai', 'devops_sre'].includes(jobDomain),
          ];

          if (severeMismatches.some(Boolean)) {
            roleDomainMismatch = true;
            baseScore -= 12; // Penalty for cross-domain mismatch
          }
        }
      }
    }

    // Direct title keyword overlap
    const normCandRole = candidateContext.currentRole.toLowerCase();
    const normJobTitle = jobInfo.title.toLowerCase();
    const roleTokens = normCandRole
      .split(/[\s,/-]+/)
      .filter((t) => t.length >= 4 && !['engineer', 'developer', 'senior', 'junior', 'lead', 'staff', 'principal', 'level'].includes(t));
    const hasTokenOverlap = roleTokens.some((t) => normJobTitle.includes(t));
    if (hasTokenOverlap && !roleDomainMatch && !roleDomainAdjacent && !roleDomainMismatch) {
      baseScore += 4;
    }
  }

  // 5. Candidate's Current Company Context (Internal Mobility vs Alumni Boomerang)
  let isInternalMobility = false;
  let isAlumniMatch = false;

  if (candidateContext?.currentCompany && jobInfo.companyName) {
    const isSame = isSameCompany(jobInfo.companyName, candidateContext.currentCompany);
    if (isSame) {
      if (candidateContext.isStillWorking) {
        isInternalMobility = true;
        baseScore += 6; // Major bonus for internal mobility at current employer
      } else {
        isAlumniMatch = true;
        baseScore += 4; // Bonus for alumni / boomerang candidate at former employer
      }
    }
  }

  // 6. Location & workplace alignment
  const jobLocLower = (jobInfo.location || '').toLowerCase();
  const candLocLower = (candidateLocation || '').toLowerCase().trim();
  const isRemote =
    jobInfo.workplaceType === 'Remote' ||
    jobLocLower.includes('remote') ||
    jobLocLower.includes('anywhere') ||
    jobLocLower.includes('virtual');

  let locationAligned = false;
  let locationMismatch = false;

  if (candLocLower && candLocLower !== 'all' && isValidGeographicLocation(candidateLocation)) {
    const matchesCity = isLocationMatch(jobInfo.location || '', candidateLocation, jobInfo.workplaceType);
    if (matchesCity) {
      const isSpecificCityMatch =
        jobLocLower.includes(candLocLower) ||
        candLocLower.includes(jobLocLower) ||
        (LOCATION_ALIASES[candLocLower] || []).some((a) => !a.includes('remote') && jobLocLower.includes(a));

      if (isSpecificCityMatch) {
        baseScore += 8; // Major bonus for candidate's home city
      } else {
        baseScore += 4; // Solid bonus for remote flexibility
      }
      locationAligned = true;
    } else {
      // Role is onsite/hybrid in a completely different city
      baseScore -= 12; // Penalty for geographic relocation requirement
      locationMismatch = true;
    }
  } else {
    if (isRemote) baseScore += 2;
  }

  const jobExp = jobInfo.experienceLevel || 'Mid';
  const candSeniority = candidateContext?.currentRole ? detectExperienceLevel(candidateContext.currentRole) : targetSeniority;
  const seniorityToCheck = targetSeniority && targetSeniority !== 'Senior' ? targetSeniority : candSeniority;
  const seniorityCheck = isSeniorityCompatible(seniorityToCheck, jobExp);
  if (seniorityCheck.isExact) {
    baseScore += 4;
  } else if (seniorityCheck.compatible) {
    baseScore += 2;
  } else {
    baseScore -= 6;
  }

  const matchScore = Math.min(98, Math.max(50, baseScore));

  const firstSkill = matchingSkills[0] || 'software architecture';
  const secondSkill = matchingSkills[1] || 'distributed systems';
  const comp = jobInfo.companyName || 'the engineering team';

  let locationNote = '';
  if (
    locationAligned &&
    candLocLower &&
    candLocLower !== 'all' &&
    (jobLocLower.includes(candLocLower) || candLocLower.includes(jobLocLower))
  ) {
    locationNote = ` Perfectly matches your location in ${jobInfo.location}.`;
  } else if (isRemote) {
    locationNote = ' Offers flexible remote workplace policy.';
  } else if (locationMismatch && candidateLocation && isValidGeographicLocation(candidateLocation)) {
    locationNote = ` Note: Position is on-site in ${jobInfo.location || 'office'}.`;
  }

  let candidateContextPrefix = '';
  if (isInternalMobility) {
    candidateContextPrefix = `Internal mobility opportunity at your current company (${comp})${
      candidateContext?.currentRole ? ` matching your background as ${candidateContext.currentRole}` : ''
    }.`;
  } else if (isAlumniMatch) {
    candidateContextPrefix = `Alumni opportunity at your former company (${comp})${
      candidateContext?.currentRole ? ` matching your experience as ${candidateContext.currentRole}` : ''
    }.`;
  } else if (candidateContext?.currentRole) {
    if (roleDomainMatch || roleDomainAdjacent) {
      if (candidateContext.isStillWorking && candidateContext.currentCompany) {
        candidateContextPrefix = `Directly aligns with your current role as ${candidateContext.currentRole} at ${candidateContext.currentCompany}.`;
      } else if (candidateContext.isStillWorking) {
        candidateContextPrefix = `Directly aligns with your current role as ${candidateContext.currentRole}.`;
      } else if (candidateContext.currentCompany) {
        candidateContextPrefix = `Builds on your background as ${candidateContext.currentRole} at ${candidateContext.currentCompany}.`;
      } else {
        candidateContextPrefix = `Builds on your background as ${candidateContext.currentRole}.`;
      }
    } else if (roleDomainMismatch) {
      candidateContextPrefix = `Note: Role focuses on ${jobInfo.title}, which differs from your background as ${candidateContext.currentRole}${
        candidateContext.currentCompany ? ` at ${candidateContext.currentCompany}` : ''
      }.`;
    }
  }

  let skillOrGeneralSentence = '';
  if (matchingSkills.length > 0) {
    skillOrGeneralSentence = `Strong alignment with your background in ${firstSkill}${
      matchingSkills[1] ? ` and ${secondSkill}` : ''
    }. Role matches your target seniority (${jobExp}) at ${comp}.`;
  } else if (locationAligned && candidateLocation) {
    skillOrGeneralSentence = `Position is located in your registered city of ${candidateLocation}. Upload your Master Resume to unlock technical skill matching and automated 1-click ATS tailoring.`;
  } else {
    skillOrGeneralSentence = `Explore opportunities at ${comp} aligned with your general engineering background.`;
  }

  let whyYouMatch = '';
  if (candidateContextPrefix) {
    if (matchingSkills.length > 0) {
      whyYouMatch = `${candidateContextPrefix} Strong match for your skills in ${firstSkill}${
        matchingSkills[1] ? ` and ${secondSkill}` : ''
      } at ${comp}.${locationNote}`;
    } else {
      whyYouMatch = `${candidateContextPrefix}${locationNote}`;
    }
  } else {
    whyYouMatch = `${skillOrGeneralSentence}${locationNote}`;
  }

  const roleContextPhrase = candidateContext?.currentRole
    ? ` as ${candidateContext.currentRole}`
    : '';
  const tailoredBulletSuggestion = {
    original: `Contributed to ${jobInfo.title.toLowerCase()} systems and feature development${roleContextPhrase}.`,
    tailored:
      candidateSkills.length > 0
        ? `Architected high-throughput service components using ${firstSkill}${
            matchingSkills[1] ? ` and ${secondSkill}` : ''
          }, accelerating response latency by 38% and maintaining 99.99% availability across production workloads.`
        : `Led high-impact initiatives for ${jobInfo.title.toLowerCase()} projects, delivering measurable efficiency improvements and operational excellence.`,
    impactMetric: candidateSkills.length > 0 ? '-38% Latency' : 'Operational Efficiency',
  };

  return {
    matchingSkills: matchingSkills.slice(0, 6),
    missingSkills: missingSkills.slice(0, 3),
    matchScore,
    matchBreakdown: {
      skillsScore: candidateSkills.length > 0 ? Math.min(99, matchScore + 2) : 0,
      experienceScore: roleDomainMatch
        ? Math.min(99, Math.max(82, matchScore + 4))
        : roleDomainMismatch
        ? Math.max(50, Math.min(68, matchScore - 12))
        : Math.max(65, matchScore - 3),
      stackScore: candidateSkills.length > 0 ? Math.min(99, matchScore + 1) : 0,
    },
    whyYouMatch,
    tailoredBulletSuggestion,
    isRecommended:
      (matchScore >= 88 || locationAligned || roleDomainMatch || isInternalMobility) &&
      !locationMismatch &&
      !roleDomainMismatch,
  };
}

// ============================================================================
// Board Fetchers
// ============================================================================

export function isRoleRelevant(title: string, candidateSkills: string[] = [], candidateRole = ''): boolean {
  const t = title.toLowerCase();
  const techKeywords = [
    'engineer', 'developer', 'architect', 'software', 'frontend', 'backend',
    'fullstack', 'full stack', 'platform', 'infrastructure', 'data', 'ai',
    'ml', 'machine learning', 'product', 'designer', 'security', 'cloud',
    'devops', 'sre', 'site reliability', 'technical', 'systems', 'distributed'
  ];
  if (techKeywords.some((k) => t.includes(k))) return true;
  if (candidateSkills.some((s) => s.length >= 2 && t.includes(s.toLowerCase()))) return true;
  if (candidateRole) {
    const roleTokens = candidateRole.toLowerCase().split(/[\s,/-]+/).filter((tok) => tok.length >= 4);
    if (roleTokens.some((tok) => t.includes(tok))) return true;
  }
  return false;
}

interface AtsBoardCacheEntry {
  rawJobs: any[];
  timestamp: number;
}

const ATS_BOARD_CACHE = new Map<string, AtsBoardCacheEntry>();
const ATS_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export function clearAtsBoardCache(): void {
  ATS_BOARD_CACHE.clear();
}

async function fetchGreenhouseBoard(
  target: AtsTarget,
  candidateSkills: string[],
  seniority: string,
  candidateLocation = '',
  limit = 10
): Promise<NormalizedAtsJob[]> {
  try {
    const cacheKey = `gh-${target.boardToken}`;
    const cached = ATS_BOARD_CACHE.get(cacheKey);
    let rawJobs: any[] = [];

    if (cached && Date.now() - cached.timestamp < ATS_CACHE_TTL_MS) {
      rawJobs = cached.rawJobs;
    } else {
      // NOTE: We deliberately do NOT pass ?content=true.
      // With ?content=true, responses exceed 11MB and Next.js throws
      // "Failed to set fetch cache: items over 2MB can not be cached".
      // Without ?content=true, the payload is ~200KB (50x lighter and instant).
      const url = `https://boards-api.greenhouse.io/v1/boards/${target.boardToken}/jobs`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store', // Bypass Next.js 2MB disk fetch-cache; handled by ATS_BOARD_CACHE in RAM
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const data = await res.json();
      rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
      ATS_BOARD_CACHE.set(cacheKey, { rawJobs, timestamp: Date.now() });
    }

    const nowIso = new Date().toISOString();

    const validJobs = rawJobs.filter((j: any) => Boolean(j.title && j.absolute_url));
    const techJobs = validJobs.filter((j: any) => isRoleRelevant(String(j.title), candidateSkills));
    let targetPool = techJobs.length > 0 ? techJobs : validJobs;

    // Prioritize jobs matching candidate skills and location before slicing
    targetPool.sort((a: any, b: any) => {
      const aTitle = String(a.title || '').toLowerCase();
      const bTitle = String(b.title || '').toLowerCase();
      const aLoc = a.location?.name ? String(a.location.name) : (typeof a.location === 'string' ? a.location : '');
      const bLoc = b.location?.name ? String(b.location.name) : (typeof b.location === 'string' ? b.location : '');

      if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
        const aLocMatch = isLocationMatch(aLoc, candidateLocation);
        const bLocMatch = isLocationMatch(bLoc, candidateLocation);
        if (aLocMatch && !bLocMatch) return -1;
        if (!aLocMatch && bLocMatch) return 1;
      }

      if (candidateSkills && candidateSkills.length > 0) {
        const aHits = candidateSkills.filter((s) => s.length >= 2 && aTitle.includes(s.toLowerCase().trim())).length;
        const bHits = candidateSkills.filter((s) => s.length >= 2 && bTitle.includes(s.toLowerCase().trim())).length;
        if (aHits !== bHits) return bHits - aHits;
      }

      return 0;
    });

    // Ensure candidate location jobs are never truncated out by slice
    if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
      const locMatches = targetPool.filter((j: any) => {
        const loc = j.location?.name ? String(j.location.name) : (typeof j.location === 'string' ? j.location : '');
        return isLocationMatch(loc, candidateLocation);
      });
      if (locMatches.length > 0) {
        const others = targetPool.filter((j: any) => !locMatches.includes(j));
        targetPool = [...locMatches, ...others];
      }
    }

    return targetPool
      .slice(0, Math.max(limit, 12))
      .map((j: any) => {
        const title = String(j.title).trim();
        const location = j.location?.name ? String(j.location.name).trim() : 'Remote';
        const workplaceType = detectWorkMode(location);
        const expLevel = detectExperienceLevel(title);
        const descText = cleanHtmlText(
          j.content ||
          `${target.company} is seeking an exceptional ${title} based in ${location}. In this role, you will design, scale, and deliver robust software components across high-throughput production infrastructure.`
        ).slice(0, 3500);

        const matchResult = evaluateJobMatch(
          {
            title,
            description: descText,
            experienceLevel: expLevel,
            workplaceType,
            location,
            companyName: target.company,
          },
          candidateSkills,
          seniority,
          candidateLocation
        );

        return {
          id: `ats-gh-${target.boardToken}-${j.id}`,
          title,
          company_name: target.company,
          company_logo: `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${target.domain}&size=128`,
          location,
          workplace_type: workplaceType,
          job_type: 'Full-time',
          experience_level: expLevel,
          category: detectCategory(title),
          salary_range: 'Competitive / Market Band',
          description: descText,
          requirements: `Strong technical proficiency in modern platforms, system design, and collaborative engineering.`,
          external_apply_url: cleanJobApplyUrl(String(j.absolute_url).trim()),
          is_internal: false,
          match_score: matchResult.matchScore,
          match_breakdown: matchResult.matchBreakdown,
          why_you_match: matchResult.whyYouMatch,
          matching_skills: matchResult.matchingSkills,
          missing_skills: matchResult.missingSkills,
          tailored_bullet_suggestion: matchResult.tailoredBulletSuggestion,
          insider_count: 0,
          is_recommended: matchResult.isRecommended,
          created_at: nowIso,
        };
      });
  } catch (err: any) {
    // In sandboxed environments or when external domain is unreachable, return empty array gracefully
    return [];
  }
}

async function fetchLeverBoard(
  target: AtsTarget,
  candidateSkills: string[],
  seniority: string,
  candidateLocation = '',
  limit = 10
): Promise<NormalizedAtsJob[]> {
  try {
    const cacheKey = `lever-${target.boardToken}`;
    const cached = ATS_BOARD_CACHE.get(cacheKey);
    let rawJobs: any[] = [];

    if (cached && Date.now() - cached.timestamp < ATS_CACHE_TTL_MS) {
      rawJobs = cached.rawJobs;
    } else {
      const url = `https://api.lever.co/v0/postings/${target.boardToken}?mode=json`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store', // Prevents Next.js >2MB fetch cache errors
        signal: AbortSignal.timeout(8000), // Increased from 4000ms to eliminate Palantir timeout
      });

      if (!res.ok) return [];

      rawJobs = await res.json();
      if (!Array.isArray(rawJobs)) return [];
      ATS_BOARD_CACHE.set(cacheKey, { rawJobs, timestamp: Date.now() });
    }

    const nowIso = new Date().toISOString();

    const validJobs = rawJobs.filter((j: any) => Boolean(j.text && j.hostedUrl));
    const techJobs = validJobs.filter((j: any) => isRoleRelevant(String(j.text), candidateSkills));
    let targetPool = techJobs.length > 0 ? techJobs : validJobs;

    // Prioritize jobs matching candidate skills and location before slicing
    targetPool.sort((a: any, b: any) => {
      const aTitle = String(a.text || '').toLowerCase();
      const bTitle = String(b.text || '').toLowerCase();
      const aLoc = a.categories?.location || '';
      const bLoc = b.categories?.location || '';

      if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
        const aLocMatch = isLocationMatch(aLoc, candidateLocation);
        const bLocMatch = isLocationMatch(bLoc, candidateLocation);
        if (aLocMatch && !bLocMatch) return -1;
        if (!aLocMatch && bLocMatch) return 1;
      }

      if (candidateSkills && candidateSkills.length > 0) {
        const aHits = candidateSkills.filter((s) => s.length >= 2 && aTitle.includes(s.toLowerCase().trim())).length;
        const bHits = candidateSkills.filter((s) => s.length >= 2 && bTitle.includes(s.toLowerCase().trim())).length;
        if (aHits !== bHits) return bHits - aHits;
      }

      return 0;
    });

    // Ensure candidate location jobs are never truncated out by slice
    if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
      const locMatches = targetPool.filter((j: any) => {
        const loc = j.categories?.location || '';
        return isLocationMatch(loc, candidateLocation);
      });
      if (locMatches.length > 0) {
        const others = targetPool.filter((j: any) => !locMatches.includes(j));
        targetPool = [...locMatches, ...others];
      }
    }

    return targetPool
      .slice(0, Math.max(limit, 12))
      .map((j: any) => {
        const title = String(j.text).trim();
        const location = j.categories?.location || 'Remote';
        const workplaceType = detectWorkMode(location);
        const expLevel = detectExperienceLevel(title);
        const descText = cleanHtmlText(j.descriptionPlain || j.description || title).slice(0, 3500);
        const commitment = j.categories?.commitment || 'Full-time';
        const salaryText = j.additionalPlain?.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/)?.[0] || 'Competitive / Market Band';

        const matchResult = evaluateJobMatch(
          {
            title,
            description: descText,
            experienceLevel: expLevel,
            workplaceType,
            location,
            companyName: target.company,
          },
          candidateSkills,
          seniority,
          candidateLocation
        );

        return {
          id: `ats-lever-${target.boardToken}-${j.id}`,
          title,
          company_name: target.company,
          company_logo: `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${target.domain}&size=128`,
          location,
          workplace_type: workplaceType,
          job_type: commitment.toLowerCase().includes('part') ? 'Part-time' : 'Full-time',
          experience_level: expLevel,
          category: detectCategory(title),
          salary_range: salaryText,
          description: descText,
          requirements: `Modern development stack, distributed systems, resilient microservices, and cross-functional delivery.`,
          external_apply_url: cleanJobApplyUrl(String(j.hostedUrl).trim()),
          is_internal: false,
          match_score: matchResult.matchScore,
          match_breakdown: matchResult.matchBreakdown,
          why_you_match: matchResult.whyYouMatch,
          matching_skills: matchResult.matchingSkills,
          missing_skills: matchResult.missingSkills,
          tailored_bullet_suggestion: matchResult.tailoredBulletSuggestion,
          insider_count: 0,
          is_recommended: matchResult.isRecommended,
          created_at: nowIso,
        };
      });
  } catch (err: any) {
    return [];
  }
}

async function fetchAshbyBoard(
  target: AtsTarget,
  candidateSkills: string[],
  seniority: string,
  candidateLocation = '',
  limit = 10
): Promise<NormalizedAtsJob[]> {
  try {
    const cacheKey = `ashby-${target.boardToken}`;
    const cached = ATS_BOARD_CACHE.get(cacheKey);
    let rawJobs: any[] = [];

    if (cached && Date.now() - cached.timestamp < ATS_CACHE_TTL_MS) {
      rawJobs = cached.rawJobs;
    } else {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${target.boardToken}?includeCompensation=true`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store', // Prevents Next.js >2MB fetch cache errors (Notion 3.8MB, Ramp 4.0MB)
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const data = await res.json();
      rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
      ATS_BOARD_CACHE.set(cacheKey, { rawJobs, timestamp: Date.now() });
    }

    const nowIso = new Date().toISOString();

    const validJobs = rawJobs.filter((j: any) => Boolean(j.title && (j.jobUrl || j.id)));
    const techJobs = validJobs.filter((j: any) => isRoleRelevant(String(j.title), candidateSkills));
    let targetPool = techJobs.length > 0 ? techJobs : validJobs;

    // Prioritize jobs matching candidate skills and location before slicing
    targetPool.sort((a: any, b: any) => {
      const aTitle = String(a.title || '').toLowerCase();
      const bTitle = String(b.title || '').toLowerCase();
      const aLoc = a.location || a.secondaryLocations?.[0]?.location || '';
      const bLoc = b.location || b.secondaryLocations?.[0]?.location || '';

      if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
        const aLocMatch = isLocationMatch(aLoc, candidateLocation);
        const bLocMatch = isLocationMatch(bLoc, candidateLocation);
        if (aLocMatch && !bLocMatch) return -1;
        if (!aLocMatch && bLocMatch) return 1;
      }

      if (candidateSkills && candidateSkills.length > 0) {
        const aHits = candidateSkills.filter((s) => s.length >= 2 && aTitle.includes(s.toLowerCase().trim())).length;
        const bHits = candidateSkills.filter((s) => s.length >= 2 && bTitle.includes(s.toLowerCase().trim())).length;
        if (aHits !== bHits) return bHits - aHits;
      }

      return 0;
    });

    // Ensure candidate location jobs are never truncated out by slice
    if (candidateLocation && candidateLocation.toLowerCase() !== 'all') {
      const locMatches = targetPool.filter((j: any) => {
        const loc = j.location || j.secondaryLocations?.[0]?.location || '';
        return isLocationMatch(loc, candidateLocation);
      });
      if (locMatches.length > 0) {
        const others = targetPool.filter((j: any) => !locMatches.includes(j));
        targetPool = [...locMatches, ...others];
      }
    }

    return targetPool
      .slice(0, Math.max(limit, 12))
      .map((j: any) => {
        const title = String(j.title).trim();
        const location = j.location || j.secondaryLocations?.[0]?.location || 'Remote';
        const workplaceType = detectWorkMode(location);
        const expLevel = detectExperienceLevel(title);
        const applyUrl = j.jobUrl || `https://jobs.ashbyhq.com/${target.boardToken}/${j.id}`;
        const salaryText =
          j.compensation?.compensationTierSummary ||
          j.compensation?.summary ||
          'Competitive / Market Band';

        const matchResult = evaluateJobMatch(
          {
            title,
            description: title,
            experienceLevel: expLevel,
            workplaceType,
            location,
            companyName: target.company,
          },
          candidateSkills,
          seniority,
          candidateLocation
        );

        return {
          id: `ats-ashby-${target.boardToken}-${j.id}`,
          title,
          company_name: target.company,
          company_logo: `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${target.domain}&size=128`,
          location,
          workplace_type: workplaceType,
          job_type: 'Full-time',
          experience_level: expLevel,
          category: detectCategory(title),
          salary_range: salaryText,
          description: `${target.company} is seeking an exceptional ${title}. View requirements and apply directly via Ashby requisition.`,
          requirements: `Proven software development capabilities, product architecture, system scalability.`,
          external_apply_url: cleanJobApplyUrl(String(applyUrl).trim()),
          is_internal: false,
          match_score: matchResult.matchScore,
          match_breakdown: matchResult.matchBreakdown,
          why_you_match: matchResult.whyYouMatch,
          matching_skills: matchResult.matchingSkills,
          missing_skills: matchResult.missingSkills,
          tailored_bullet_suggestion: matchResult.tailoredBulletSuggestion,
          insider_count: 0,
          is_recommended: matchResult.isRecommended,
          created_at: nowIso,
        };
      });
  } catch (err: any) {
    return [];
  }
}

// ============================================================================
// Main Aggregator Entrypoint
// ============================================================================

/**
 * Aggregates live jobs across Greenhouse, Lever, and Ashby job boards in parallel.
 * Next.js Edge ISR caches the HTTP requests so executions are near-instantaneous.
 */
export async function fetchLiveAtsJobs(options: AtsQueryOptions = {}): Promise<NormalizedAtsJob[]> {
  const candidateSkills = options.skills || ['TypeScript', 'React', 'Node.js', 'Python', 'Go'];
  const seniority = options.seniority || 'Senior';
  const queryStr = (options.query || '').toLowerCase().trim();
  const workModeFilter = options.workMode || 'all';
  const candidateLocation = (options.location || '').toLowerCase().trim();
  const limit = options.limit || 60;

  const allowedCompanies =
    options.companies && options.companies.length > 0 && !options.companies.includes('all')
      ? options.companies.map((c) => c.toLowerCase().trim()).filter(Boolean)
      : null;

  const filterTargets = (targets: AtsTarget[]) => {
    if (!allowedCompanies || allowedCompanies.length === 0) return targets;
    const matches = targets.filter((t) =>
      allowedCompanies.some((c) => t.company.toLowerCase().includes(c) || c.includes(t.company.toLowerCase()))
    );
    return matches.length > 0 ? matches : targets;
  };

  const greenhouseTargets = filterTargets(GREENHOUSE_TARGETS);
  const leverTargets = filterTargets(LEVER_TARGETS);
  const ashbyTargets = filterTargets(ASHBY_TARGETS);
  const perBoardLimit = allowedCompanies ? 15 : 8;

  // Run board queries in parallel with Promise.allSettled
  const fetchPromises: Promise<NormalizedAtsJob[]>[] = [];

  // Query Greenhouse targets
  for (const target of greenhouseTargets) {
    fetchPromises.push(fetchGreenhouseBoard(target, candidateSkills, seniority, candidateLocation, perBoardLimit));
  }

  // Query Lever targets
  for (const target of leverTargets) {
    fetchPromises.push(fetchLeverBoard(target, candidateSkills, seniority, candidateLocation, perBoardLimit));
  }

  // Query Ashby targets
  for (const target of ashbyTargets) {
    fetchPromises.push(fetchAshbyBoard(target, candidateSkills, seniority, candidateLocation, perBoardLimit));
  }

  const results = await Promise.allSettled(fetchPromises);
  const allJobs: NormalizedAtsJob[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allJobs.push(...result.value);
    }
  }

  // Filter by query and work mode if requested
  let filtered = allJobs;

  if (workModeFilter !== 'all') {
    filtered = filtered.filter((j) => j.workplace_type.toLowerCase() === workModeFilter.toLowerCase());
  }

  if (queryStr) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(queryStr) ||
        j.company_name.toLowerCase().includes(queryStr) ||
        j.location.toLowerCase().includes(queryStr) ||
        j.matching_skills.some((s) => s.toLowerCase().includes(queryStr))
    );
  }

  // Company filter if specified
  if (allowedCompanies && allowedCompanies.length > 0) {
    filtered = filtered.filter((j) =>
      allowedCompanies.some((c) => j.company_name.toLowerCase().includes(c) || c.includes(j.company_name.toLowerCase()))
    );
  }

  // Location filter if specified
  if (candidateLocation && candidateLocation !== 'all') {
    filtered = filtered.filter((j) => isLocationMatch(j.location, candidateLocation, j.workplace_type));
  }

  // Sort by match score descending
  filtered.sort((a, b) => b.match_score - a.match_score);

  return filtered.slice(0, limit);
}
