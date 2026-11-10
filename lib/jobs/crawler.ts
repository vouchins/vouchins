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
  job_type: string;
  experience_level: string;
  category: string;
  salary_range?: string;
  external_apply_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrawlJobResult {
  success: boolean;
  crawled: number;
  inserted: number;
  skippedDuplicates: number;
  sources: { company: string; platform: string; count: number }[];
  importedJobs: { title: string; company: string; location: string }[];
}

const SYSTEM_RECRUITER_ID = '57d1bab1-1c10-45f8-8835-d1421cab8ca5';

interface GreenhouseTarget {
  company: string;
  boardToken: string;
  domain: string;
}

interface LeverTarget {
  company: string;
  siteToken: string;
  domain: string;
}

interface AshbyTarget {
  company: string;
  siteToken: string;
  domain: string;
}

const GREENHOUSE_TARGETS: GreenhouseTarget[] = [
  { company: 'Figma', boardToken: 'figma', domain: 'figma.com' },
  { company: 'Stripe', boardToken: 'stripe', domain: 'stripe.com' },
  { company: 'Airbnb', boardToken: 'airbnb', domain: 'airbnb.com' },
  { company: 'DoorDash', boardToken: 'doordash', domain: 'doordash.com' },
];

const LEVER_TARGETS: LeverTarget[] = [
  { company: 'Spotify', siteToken: 'spotify', domain: 'spotify.com' },
];

const ASHBY_TARGETS: AshbyTarget[] = [
  { company: 'Linear', siteToken: 'linear', domain: 'linear.app' },
  { company: 'Notion', siteToken: 'notion', domain: 'notion.so' },
  { company: 'Ramp', siteToken: 'ramp', domain: 'ramp.com' },
];

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('data') || t.includes('ai') || t.includes('machine learning') || t.includes('ml') || t.includes('scientist')) {
    return 'Data / AI';
  }
  if (t.includes('product manager') || t.includes('product lead') || t.includes('group product')) {
    return 'Product Management';
  }
  if (t.includes('designer') || t.includes('ux') || t.includes('ui') || t.includes('product design')) {
    return 'Design';
  }
  if (t.includes('sales') || t.includes('account executive') || t.includes('business development') || t.includes('bdr')) {
    return 'Sales';
  }
  if (t.includes('finance') || t.includes('accounting') || t.includes('tax') || t.includes('audit')) {
    return 'Finance / Risk';
  }
  if (t.includes('recruiter') || t.includes('talent') || t.includes('people') || t.includes('hr')) {
    return 'HR';
  }
  if (t.includes('operations') || t.includes('program manager') || t.includes('coordinator')) {
    return 'Operations';
  }
  return 'Engineering';
}

function detectExperienceLevel(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('staff') || t.includes('principal') || t.includes('architect') || t.includes('director') || t.includes('head of')) {
    return 'Staff';
  }
  if (t.includes('senior') || t.includes('sr.') || t.includes('sr ') || t.includes('lead')) {
    return 'Senior';
  }
  if (t.includes('junior') || t.includes('jr.') || t.includes('associate') || t.includes('intern') || t.includes('graduate')) {
    return 'Entry';
  }
  return 'Mid';
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

/**
 * Crawls active public ATS job boards, filters duplicates against the Supabase jobs table,
 * and inserts freshly discovered job openings into public.jobs.
 */
export async function crawlAndSyncTechJobs(perBoardLimit = 15): Promise<CrawlJobResult> {
  const crawledItems: CrawledJobItem[] = [];
  const sourceStats: { company: string; platform: string; count: number }[] = [];
  const nowIso = new Date().toISOString();

  // Resolve valid recruiter ID to ensure foreign key constraint satisfaction
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

  // 1. Crawl Greenhouse Boards
  for (const target of GREENHOUSE_TARGETS) {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${target.boardToken}/jobs`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const rawJobs: any[] = Array.isArray(data.jobs) ? data.jobs : [];
      let addedFromBoard = 0;

      for (const job of rawJobs.slice(0, perBoardLimit)) {
        if (!job.title || !job.absolute_url) continue;

        const description = cleanHtmlToText(job.content || job.title).slice(0, 3000);
        const locationStr = job.location?.name ? String(job.location.name).trim() : 'Remote';

        crawledItems.push({
          recruiter_id: activeRecruiterId,
          title: String(job.title).trim(),
          company_name: target.company,
          company_logo: `https://www.google.com/s2/favicons?domain=${target.domain}&sz=128`,
          location: locationStr,
          description: description || `${target.company} is hiring for ${job.title}. Apply directly on their career portal.`,
          requirements: 'Distributed systems, Cloud infrastructure, APIs, Strong technical acumen.',
          job_type: 'Full-time',
          experience_level: detectExperienceLevel(job.title),
          category: detectCategory(job.title),
          external_apply_url: cleanJobApplyUrl(String(job.absolute_url).trim()),
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso,
        });

        addedFromBoard++;
      }

      sourceStats.push({ company: target.company, platform: 'Greenhouse', count: addedFromBoard });
    } catch (err) {
      console.warn(`Greenhouse crawl error for ${target.company}:`, err);
    }
  }

  // 2. Crawl Lever Boards
  for (const target of LEVER_TARGETS) {
    try {
      const url = `https://api.lever.co/v0/postings/${target.siteToken}?mode=json`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const rawJobs: any[] = await res.json();
      if (!Array.isArray(rawJobs)) continue;

      let addedFromBoard = 0;

      for (const job of rawJobs.slice(0, perBoardLimit)) {
        if (!job.text || !job.hostedUrl) continue;

        const description = cleanHtmlToText(job.descriptionPlain || job.description || job.text).slice(0, 3000);
        const locationStr = job.categories?.location || 'Remote';
        const commitment = job.categories?.commitment || 'Full-time';

        crawledItems.push({
          recruiter_id: activeRecruiterId,
          title: String(job.text).trim(),
          company_name: target.company,
          company_logo: `https://www.google.com/s2/favicons?domain=${target.domain}&sz=128`,
          location: locationStr,
          description: description || `${target.company} is hiring for ${job.text}. Apply directly on their career portal.`,
          requirements: 'Technical domain expertise, modern development frameworks, cross-functional collaboration.',
          job_type: commitment.includes('Part') ? 'Part-time' : 'Full-time',
          experience_level: detectExperienceLevel(job.text),
          category: detectCategory(job.text),
          salary_range: job.additionalPlain?.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/)?.[0] || undefined,
          external_apply_url: cleanJobApplyUrl(String(job.hostedUrl).trim()),
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso,
        });

        addedFromBoard++;
      }

      sourceStats.push({ company: target.company, platform: 'Lever', count: addedFromBoard });
    } catch (err) {
      console.warn(`Lever crawl error for ${target.company}:`, err);
    }
  }

  // 3. Crawl Ashby Boards
  for (const target of ASHBY_TARGETS) {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${target.siteToken}?includeCompensation=true`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const rawJobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
      let addedFromBoard = 0;

      for (const job of rawJobs.slice(0, perBoardLimit)) {
        if (!job.title || (!job.jobUrl && !job.id)) continue;

        const applyUrl = job.jobUrl || `https://jobs.ashbyhq.com/${target.siteToken}/${job.id}`;
        const locationStr = job.location || job.secondaryLocations?.[0]?.location || 'Remote';
        const salaryText = job.compensation?.compensationTierSummary || job.compensation?.summary || undefined;

        crawledItems.push({
          recruiter_id: activeRecruiterId,
          title: String(job.title).trim(),
          company_name: target.company,
          company_logo: `https://www.google.com/s2/favicons?domain=${target.domain}&sz=128`,
          location: locationStr,
          description: `${target.company} is hiring for ${job.title}. Apply directly via their careers portal.`,
          requirements: 'High technical craftsmanship, platform design, and production engineering.',
          job_type: job.employmentType || 'Full-time',
          experience_level: detectExperienceLevel(job.title),
          category: detectCategory(job.title),
          salary_range: salaryText,
          external_apply_url: cleanJobApplyUrl(String(applyUrl).trim()),
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso,
        });

        addedFromBoard++;
      }

      sourceStats.push({ company: target.company, platform: 'Ashby', count: addedFromBoard });
    } catch (err) {
      console.warn(`Ashby crawl error for ${target.company}:`, err);
    }
  }

  if (crawledItems.length === 0) {
    return {
      success: true,
      crawled: 0,
      inserted: 0,
      skippedDuplicates: 0,
      sources: sourceStats,
      importedJobs: [],
    };
  }

  // Strictly prune stale jobs older than 3 months (90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabaseAdmin.from('jobs').delete().lt('created_at', ninetyDaysAgo);
  } catch (pruneErr) {
    console.warn('Crawler stale jobs pruning error:', pruneErr);
  }

  // 3. Deduplicate against existing jobs by external_apply_url
  const allUrls = crawledItems.map((j) => j.external_apply_url);
  const { data: existingJobs, error: existingError } = await supabaseAdmin
    .from('jobs')
    .select('external_apply_url')
    .in('external_apply_url', allUrls);

  if (existingError) {
    console.warn('Error checking existing job URLs:', existingError);
  }

  const existingUrlSet = new Set((existingJobs || []).map((j) => j.external_apply_url));
  const newJobsToInsert = crawledItems.filter((j) => !existingUrlSet.has(j.external_apply_url));

  // 4. Batch Insert newly discovered jobs
  if (newJobsToInsert.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('jobs')
      .insert(newJobsToInsert);

    if (insertError) {
      console.error('Error inserting crawled jobs into database:', insertError);
      throw insertError;
    }
  }

  return {
    success: true,
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
