import { JobExtractedMetadata, JobExtractedMetadataSchema } from './types';
import {
  COMMON_TECH_TAXONOMY,
  containsSkill,
  detectExperienceLevel,
  detectWorkMode,
} from './ats-client';
import { supabaseAdmin } from '@/lib/supabase/admin';

const JOB_EXTRACTION_MODEL = 'gemini-3.5-flash-lite';

export interface JobExtractionInput {
  id?: string;
  title: string;
  company_name?: string | null;
  location?: string | null;
  job_type?: string | null;
  experience_level?: string | null;
  description?: string | null;
  requirements?: string[] | string | null;
}

const TOOL_TAXONOMY = [
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Terraform',
  'PostgreSQL',
  'Redis',
  'Kafka',
  'GitHub Actions',
  'Jenkins',
  'Datadog',
  'Figma',
  'Snowflake',
  'Spark',
  'Airflow',
  'Jira',
  'Postman',
];

function normalizeRequirementsText(requirements?: string[] | string | null): string {
  if (!requirements) return '';
  if (Array.isArray(requirements)) return requirements.join('\n');
  return String(requirements);
}

function mapSeniority(rawLevel?: string | null): JobExtractedMetadata['seniority'] {
  const lower = (rawLevel || '').toLowerCase();
  if (lower.includes('principal') || lower.includes('distinguished')) return 'Principal';
  if (lower.includes('staff')) return 'Staff';
  if (lower.includes('lead') || lower.includes('manager') || lower.includes('director')) return 'Lead';
  if (lower.includes('senior') || lower.includes('sr')) return 'Senior';
  if (lower.includes('entry') || lower.includes('intern') || lower.includes('junior') || lower.includes('jr')) {
    return 'Entry';
  }
  return 'Mid';
}

function extractMinYears(corpus: string): number | null {
  const match = corpus.match(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 30) return null;
  return parsed;
}

/**
 * Fast deterministic fallback when Gemini is unavailable or rate-limited.
 */
export function extractJobMetadataDeterministic(job: JobExtractionInput): JobExtractedMetadata {
  const reqText = normalizeRequirementsText(job.requirements);
  const corpus = `${job.title}\n${job.description || ''}\n${reqText}`;
  const corpusLower = corpus.toLowerCase();

  const requiredSkills = COMMON_TECH_TAXONOMY.filter((skill) =>
    containsSkill(corpusLower, skill)
  ).slice(0, 15);

  const toolsAndPlatforms = TOOL_TAXONOMY.filter((tool) =>
    containsSkill(corpusLower, tool)
  ).slice(0, 10);

  const detectedLevel = job.experience_level || detectExperienceLevel(job.title);
  const workMode = detectWorkMode(job.location || '', job.job_type || undefined);
  const locations = (job.location || '')
    .split(/[;|/]/)
    .map((loc) => loc.trim())
    .filter(Boolean);

  const certs: string[] = [];
  if (/\baws\s+certified/i.test(corpus)) certs.push('AWS Certified');
  if (/\bcka\b|\bkubernetes\s+administrator/i.test(corpus)) certs.push('CKA');
  if (/\bpmp\b/i.test(corpus)) certs.push('PMP');
  if (/\bcissp\b/i.test(corpus)) certs.push('CISSP');

  let educationRequirement = '';
  if (/\bph\.?d\b|\bdoctorate\b/i.test(corpus)) educationRequirement = 'PhD or equivalent';
  else if (/\bmaster'?s\b|\bm\.?s\.?\b|\bm\.?tech\b|\bmba\b/i.test(corpus)) educationRequirement = "Master's degree";
  else if (/\bbachelor'?s\b|\bb\.?s\.?\b|\bb\.?tech\b|\bb\.?e\.?\b/i.test(corpus)) {
    educationRequirement = "Bachelor's degree";
  }

  return JobExtractedMetadataSchema.parse({
    normalizedTitle: job.title.trim(),
    locations: locations.length > 0 ? locations : ['Remote'],
    companyName: (job.company_name || '').trim(),
    minYearsExperience: extractMinYears(corpus),
    requiredSkills,
    toolsAndPlatforms,
    preferredCertifications: certs,
    workType: workMode || 'Unspecified',
    seniority: mapSeniority(detectedLevel),
    educationRequirement,
  });
}

/**
 * Extracts structured job intelligence using Gemini Flash-Lite with deterministic fallback.
 */
export async function extractJobMetadataWithAI(
  job: JobExtractionInput
): Promise<{ metadata: JobExtractedMetadata; provider: 'gemini' | 'heuristic' }> {
  const fallback = extractJobMetadataDeterministic(job);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { metadata: fallback, provider: 'heuristic' };
  }

  const reqText = normalizeRequirementsText(job.requirements);
  const descriptionExcerpt = (job.description || '').slice(0, 4500);

  try {
    const prompt = `Extract structured metadata from this job posting as strict JSON.
Return ONLY valid JSON matching:
{
  "normalizedTitle": "string",
  "locations": ["string"],
  "companyName": "string",
  "minYearsExperience": number | null,
  "requiredSkills": ["string"],
  "toolsAndPlatforms": ["string"],
  "preferredCertifications": ["string"],
  "workType": "Remote" | "Hybrid" | "Onsite" | "Unspecified",
  "seniority": "Entry" | "Mid" | "Senior" | "Staff" | "Lead" | "Principal",
  "educationRequirement": "string"
}

Job Title: ${job.title}
Company: ${job.company_name || ''}
Location: ${job.location || ''}
Job Type: ${job.job_type || ''}
Experience Level: ${job.experience_level || ''}
Requirements: ${reqText.slice(0, 1500)}
Description:
${descriptionExcerpt}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${JOB_EXTRACTION_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      return { metadata: fallback, provider: 'heuristic' };
    }

    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!text) {
      return { metadata: fallback, provider: 'heuristic' };
    }
    const parsed = JSON.parse(text);
    const validated = JobExtractedMetadataSchema.safeParse({
      ...fallback,
      ...parsed,
      normalizedTitle: parsed?.normalizedTitle || fallback.normalizedTitle,
      companyName: parsed?.companyName || fallback.companyName,
    });

    if (validated.success) {
      return { metadata: validated.data, provider: 'gemini' };
    }
    return { metadata: fallback, provider: 'heuristic' };
  } catch (err) {
    console.warn('extractJobMetadataWithAI falling back to deterministic extractor:', err);
    return { metadata: fallback, provider: 'heuristic' };
  }
}

export interface BackfillResult {
  success: boolean;
  scanned: number;
  updated: number;
  geminiCount: number;
  heuristicCount: number;
  migrationMissing?: boolean;
}

/**
 * One-time & incremental backfill for active jobs missing ai_extracted_at
 * within the lookback window (default 30 days).
 */
export async function backfillJobsMetadataBatch(options: {
  batchSize?: number;
  lookbackDays?: number;
  concurrency?: number;
} = {}): Promise<BackfillResult> {
  const batchSize = Math.min(200, Math.max(1, options.batchSize ?? 50));
  const lookbackDays = Math.max(1, options.lookbackDays ?? 30);
  const concurrency = Math.min(10, Math.max(1, options.concurrency ?? 5));
  const cutoffIso = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company_name, location, job_type, experience_level, description, requirements')
    .eq('is_active', true)
    .is('ai_extracted_at', null)
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (error) {
    if (error.code === '42703') {
      return {
        success: false,
        scanned: 0,
        updated: 0,
        geminiCount: 0,
        heuristicCount: 0,
        migrationMissing: true,
      };
    }
    throw new Error(`Failed to fetch jobs for AI extraction backfill: ${error.message}`);
  }

  const jobs = (rows || []) as Array<JobExtractionInput & { id: string }>;
  let updated = 0;
  let geminiCount = 0;
  let heuristicCount = 0;

  for (let i = 0; i < jobs.length; i += concurrency) {
    const chunk = jobs.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (job) => {
        const { metadata, provider } = await extractJobMetadataWithAI(job);
        const { error: updErr } = await supabaseAdmin
          .from('jobs')
          .update({
            ai_extracted_metadata: metadata,
            ai_extracted_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        return { ok: !updErr, provider };
      })
    );

    for (const res of results) {
      if (res.ok) updated++;
      if (res.provider === 'gemini') geminiCount++;
      else heuristicCount++;
    }
  }

  return {
    success: true,
    scanned: jobs.length,
    updated,
    geminiCount,
    heuristicCount,
  };
}
