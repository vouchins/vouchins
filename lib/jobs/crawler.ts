import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanJobApplyUrl } from './url-cleaner';

export interface CrawledJobItem {
  recruiter_id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  description: string;
  requirements?: string;
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead/director';
  category: string;
  salary_range?: string;
  external_apply_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrawlBatchOptions {
  batchIndex?: number;
  batchSize?: number;
  perCompanyLimit?: number;
  companyIds?: string[];
  companyName?: string;
  country?: string; // ISO 2-letter country code (e.g. 'in', 'us', 'gb') or 'all'
  city?: string;    // City filter (e.g. 'Hyderabad', 'Bengaluru', 'San Francisco')
}

export interface CrawlJobResult {
  success: boolean;
  batchIndex: number;
  batchSize: number;
  totalBatches: number;
  totalCompanies: number;
  nextBatchIndex: number | null;
  companiesProcessed: string[];
  crawled: number;
  inserted: number;
  skippedDuplicates: number;
  sources: { company: string; platform: string; count: number }[];
  importedJobs: { title: string; company: string; location: string }[];
}

const SYSTEM_RECRUITER_ID = '57d1bab1-1c10-45f8-8835-d1421cab8ca5';

function detectCategory(title: string, rawCategory?: string): string {
  const cat = (rawCategory || '').toLowerCase();
  const t = title.toLowerCase();
  if (cat.includes('data') || t.includes('data') || t.includes('ai') || t.includes('machine learning') || t.includes('ml') || t.includes('scientist')) {
    return 'Data / AI';
  }
  if (cat.includes('product') || t.includes('product manager') || t.includes('product lead') || t.includes('group product')) {
    return 'Product Management';
  }
  if (cat.includes('design') || t.includes('designer') || t.includes('ux') || t.includes('ui') || t.includes('product design')) {
    return 'Design';
  }
  if (cat.includes('sales') || t.includes('sales') || t.includes('account executive') || t.includes('business development') || t.includes('bdr')) {
    return 'Sales';
  }
  if (cat.includes('finance') || t.includes('finance') || t.includes('accounting') || t.includes('tax') || t.includes('audit')) {
    return 'Finance / Risk';
  }
  if (cat.includes('hr') || cat.includes('people') || t.includes('recruiter') || t.includes('talent') || t.includes('people') || t.includes('hr')) {
    return 'HR';
  }
  if (cat.includes('operations') || t.includes('operations') || t.includes('program manager') || t.includes('coordinator')) {
    return 'Operations';
  }
  return 'Engineering';
}

function detectJobType(rawType?: string): 'full-time' | 'part-time' | 'contract' | 'internship' {
  const t = (rawType || '').toLowerCase();
  if (t.includes('intern')) return 'internship';
  if (t.includes('contract') || t.includes('freelance') || t.includes('temp')) return 'contract';
  if (t.includes('part')) return 'part-time';
  return 'full-time';
}

function detectExperienceLevel(
  title: string,
  rawSeniority?: string
): 'entry' | 'mid' | 'senior' | 'lead/director' {
  const s = (rawSeniority || '').toLowerCase();
  const t = title.toLowerCase();

  // Lead / Director / Staff / Principal / Architect / VP / Head of
  if (
    s.includes('principal') ||
    t.includes('principal') ||
    s.includes('director') ||
    t.includes('director') ||
    s.includes('staff') ||
    t.includes('staff') ||
    s.includes('lead') ||
    t.includes('lead') ||
    s.includes('architect') ||
    t.includes('architect') ||
    t.includes('head of') ||
    t.includes('vp') ||
    t.includes('chief')
  ) {
    return 'lead/director';
  }

  // Senior
  if (s.includes('senior') || t.includes('senior') || t.includes('sr.') || t.includes('sr ')) {
    return 'senior';
  }

  // Entry
  if (
    s.includes('entry') ||
    s.includes('junior') ||
    t.includes('junior') ||
    t.includes('jr.') ||
    t.includes('jr ') ||
    t.includes('associate') ||
    s.includes('intern') ||
    t.includes('intern') ||
    t.includes('trainee') ||
    t.includes('fresher') ||
    t.includes('graduate')
  ) {
    return 'entry';
  }

  return 'mid';
}

function cleanHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Crawls live tech jobs across companies using Freehire search API in batches,
 * deduplicates against Supabase, and batch-inserts new active jobs.
 */
export async function crawlAndSyncTechJobs(
  optionsOrLimit: number | CrawlBatchOptions = 25
): Promise<CrawlJobResult> {
  const options: CrawlBatchOptions =
    typeof optionsOrLimit === 'number'
      ? { batchSize: optionsOrLimit, perCompanyLimit: 25 }
      : optionsOrLimit || {};

  const batchIndex = Math.max(0, options.batchIndex || 0);
  const batchSize = Math.max(1, Math.min(50, options.batchSize || 25));
  const perCompanyLimit = Math.max(1, Math.min(100, options.perCompanyLimit || 25));

  const crawledItems: CrawledJobItem[] = [];
  const sourceStats: { company: string; platform: string; count: number }[] = [];
  const nowIso = new Date().toISOString();

  // 1. Resolve active recruiter ID for foreign key constraint
  let activeRecruiterId = SYSTEM_RECRUITER_ID;
  try {
    const { data: rec } = await supabaseAdmin
      .from('recruiters')
      .select('id')
      .eq('id', SYSTEM_RECRUITER_ID)
      .maybeSingle();

    if (!rec) {
      const { data: fallbackRec } = await supabaseAdmin
        .from('recruiters')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (fallbackRec?.id) {
        activeRecruiterId = fallbackRec.id;
      }
    }
  } catch {
    // Keep default
  }

  // 2. Fetch companies from the database
  let companiesQuery = supabaseAdmin
    .from('companies')
    .select('id, name, domain', { count: 'exact' })
    .order('name', { ascending: true });

  if (options.companyName) {
    companiesQuery = companiesQuery.ilike('name', `%${options.companyName}%`);
  } else if (options.companyIds && options.companyIds.length > 0) {
    companiesQuery = companiesQuery.in('id', options.companyIds);
  }

  const { data: companiesData, count: dbCount } = await companiesQuery;
  const allCompanies: { id: string; name: string; domain?: string }[] =
    companiesData && companiesData.length > 0
      ? companiesData
      : [
          { id: '1', name: 'Google', domain: 'google.com' },
          { id: '2', name: 'Meta', domain: 'meta.com' },
          { id: '3', name: 'Microsoft', domain: 'microsoft.com' },
          { id: '4', name: 'Amazon', domain: 'amazon.com' },
          { id: '5', name: 'ServiceNow', domain: 'servicenow.com' },
          { id: '6', name: 'Oracle', domain: 'oracle.com' },
          { id: '7', name: 'Salesforce', domain: 'salesforce.com' },
          { id: '8', name: 'Uber', domain: 'uber.com' },
        ];

  const totalCompanies = dbCount || allCompanies.length;
  const totalBatches = Math.max(1, Math.ceil(allCompanies.length / batchSize));
  const startIndex = batchIndex * batchSize;
  const targetCompanies = allCompanies.slice(startIndex, startIndex + batchSize);
  const nextBatchIndex = startIndex + batchSize < allCompanies.length ? batchIndex + 1 : null;

  // 3. Query Freehire API concurrently in batches of 5 companies
  const companyChunks = chunkArray(targetCompanies, 5);
  const seenBatchUrls = new Set<string>();

  for (const chunk of companyChunks) {
    await Promise.all(
      chunk.map(async (company) => {
        try {
          const encodedComp = encodeURIComponent(company.name.trim());
          let url = `https://freehire.me/api/v1/jobs/search?q=${encodedComp}&q_fields=company&limit=${perCompanyLimit}`;
          if (options.country && options.country.toLowerCase() !== 'all') {
            url += `&countries=${encodeURIComponent(options.country.trim().toLowerCase())}`;
          }
          if (options.city && options.city.trim() && options.city.toLowerCase() !== 'all') {
            url += `&cities=${encodeURIComponent(options.city.trim())}`;
          }
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(6000),
          });

          if (!res.ok) return;

          const data = await res.json();
          const rawJobs: any[] = Array.isArray(data?.data) ? data.data : [];
          let addedFromComp = 0;

          for (const job of rawJobs) {
            if (!job.title || (!job.url && !job.apply_url && !job.external_apply_url)) continue;

            // Strict geographic verification
            if (options.country && options.country.toLowerCase() !== 'all') {
              const targetCountry = options.country.trim().toLowerCase();
              const jobCountries = Array.isArray(job.countries)
                ? job.countries.map((c: any) => String(c).toLowerCase())
                : [];
              const locText = String(job.location || '').toLowerCase();
              const matchesCountry =
                jobCountries.includes(targetCountry) ||
                (targetCountry === 'in' && /india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|noida|chennai|telangana|karnataka/i.test(locText)) ||
                (targetCountry === 'us' && /usa|united states|california|texas|new york|washington|seattle|austin|san francisco/i.test(locText));
              if (!matchesCountry && jobCountries.length > 0) continue;
            }

            if (options.city && options.city.trim() && options.city.toLowerCase() !== 'all') {
              const targetCity = options.city.trim().toLowerCase();
              const jobCities = Array.isArray(job.cities)
                ? job.cities.map((c: any) => String(c).toLowerCase())
                : [];
              const locText = String(job.location || '').toLowerCase();
              const matchesCity =
                jobCities.some((c: string) => c.includes(targetCity) || targetCity.includes(c)) ||
                locText.includes(targetCity);
              if (!matchesCity) continue;
            }

            const applyUrl = job.url || job.apply_url || job.external_apply_url;
            const cleanedUrl = cleanJobApplyUrl(String(applyUrl).trim());
            if (!cleanedUrl || seenBatchUrls.has(cleanedUrl)) continue;
            seenBatchUrls.add(cleanedUrl);

            const descText = cleanHtmlToText(job.description || job.title).slice(0, 3000);
            const locationStr =
              job.location ||
              (Array.isArray(job.cities) && job.cities.length > 0 ? job.cities.join(', ') : '') ||
              'Remote';

            const cleanDomain = company.domain || `${company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
            const companyLogo = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;

            const requirements = Array.isArray(job.enrichment?.requirements)
              ? job.enrichment.requirements.map((r: any) => r.text || r).join('\n')
              : 'Distributed systems, Cloud infrastructure, APIs, Strong technical acumen.';

            crawledItems.push({
              recruiter_id: activeRecruiterId,
              title: String(job.title).trim(),
              company_name: company.name,
              company_logo: companyLogo,
              location: locationStr,
              description: descText || `${company.name} is hiring for ${job.title}. Apply directly on their career portal.`,
              requirements,
              job_type: detectJobType(job.enrichment?.employment_type),
              experience_level: detectExperienceLevel(job.title, job.enrichment?.seniority),
              category: detectCategory(job.title, job.enrichment?.category),
              external_apply_url: cleanedUrl,
              is_active: true,
              created_at: nowIso,
              updated_at: nowIso,
            });

            addedFromComp++;
          }

          if (addedFromComp > 0) {
            sourceStats.push({ company: company.name, platform: 'Freehire (ATS)', count: addedFromComp });
          }
        } catch (err) {
          console.warn(`Freehire crawl note for ${company.name}:`, err);
        }
      })
    );
  }

  // 4. Prune stale jobs older than 90 days from database
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabaseAdmin.from('jobs').delete().lt('created_at', ninetyDaysAgo);
  } catch (pruneErr) {
    console.warn('Crawler stale jobs pruning note:', pruneErr);
  }

  // 5. Deduplicate against existing jobs by external_apply_url
  if (crawledItems.length === 0) {
    return {
      success: true,
      batchIndex,
      batchSize,
      totalBatches,
      totalCompanies,
      nextBatchIndex,
      companiesProcessed: targetCompanies.map((c) => c.name),
      crawled: 0,
      inserted: 0,
      skippedDuplicates: 0,
      sources: sourceStats,
      importedJobs: [],
    };
  }

  const allUrls = crawledItems.map((j) => j.external_apply_url);
  const existingUrlSet = new Set<string>();

  // Chunk URL queries in groups of 30 to prevent PostgREST URI length overflow (HTTP 400 Bad Request)
  const urlChunks = chunkArray(allUrls, 30);
  for (const chunk of urlChunks) {
    const { data: existingJobs, error: existingError } = await supabaseAdmin
      .from('jobs')
      .select('external_apply_url')
      .in('external_apply_url', chunk);

    if (existingError) {
      console.warn('Error checking existing job URLs chunk:', existingError);
    } else if (existingJobs) {
      for (const j of existingJobs) {
        if (j.external_apply_url) existingUrlSet.add(j.external_apply_url);
      }
    }
  }

  const newJobsToInsert = crawledItems.filter((j) => !existingUrlSet.has(j.external_apply_url));

  // 6. Batch Insert newly discovered jobs in chunks of 50
  if (newJobsToInsert.length > 0) {
    const insertChunks = chunkArray(newJobsToInsert, 50);
    for (const chunk of insertChunks) {
      const { error: insertError } = await supabaseAdmin
        .from('jobs')
        .insert(chunk);

      if (insertError) {
        console.error('Error inserting crawled jobs chunk into database:', insertError);
        throw insertError;
      }
    }
  }

  return {
    success: true,
    batchIndex,
    batchSize,
    totalBatches,
    totalCompanies,
    nextBatchIndex,
    companiesProcessed: targetCompanies.map((c) => c.name),
    crawled: crawledItems.length,
    inserted: newJobsToInsert.length,
    skippedDuplicates: crawledItems.length - newJobsToInsert.length,
    sources: sourceStats,
    importedJobs: newJobsToInsert.map((j) => ({
      title: j.title,
      company: j.company_name,
      location: j.location,
    })),
  };
}
