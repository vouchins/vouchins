import { supabaseAdmin } from '@/lib/supabase/admin';

export const RESERVED_SLUGS = new Set([
  'api',
  'login',
  'signup',
  'admin',
  'jobs',
  'dashboard',
  'jobs-dashboard',
  'settings',
  'profile',
  'feed',
  'auth',
  'terms',
  'privacy',
  'blog',
  'resume',
  'resumes',
  'warden',
  'about',
  'contact',
  'safety',
  'business',
  'messages',
  'notifications',
  'search',
  'verify-email',
  'recruiter',
  'pricing',
  'support',
  'new',
  'edit',
  'download',
  'share',
  'view',
  'null',
  'undefined',
  'vouchins',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_FORMAT_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalizes and validates a candidate's custom URL slug.
 */
export function validateCustomSlug(rawSlug: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!rawSlug) {
    return { valid: false, normalized: '', error: 'Custom URL cannot be empty.' };
  }

  // Normalize: lowercase, replace spaces/underscores with hyphens, remove forbidden characters
  const normalized = rawSlug
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

  if (normalized.length < 3) {
    return { valid: false, normalized, error: 'Custom URL must be at least 3 characters long.' };
  }

  if (normalized.length > 40) {
    return { valid: false, normalized, error: 'Custom URL cannot exceed 40 characters.' };
  }

  if (!SLUG_FORMAT_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Custom URL can only contain lowercase letters, numbers, and single hyphens.',
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `"${normalized}" is a reserved system path. Please choose another handle.`,
    };
  }

  return { valid: true, normalized };
}

/**
 * Verifies whether a custom slug is unique and available.
 */
export async function isSlugAvailable(
  slug: string,
  excludeResumeId?: string
): Promise<{ available: boolean; normalized: string; reason?: string }> {
  const validation = validateCustomSlug(slug);
  if (!validation.valid) {
    return { available: false, normalized: validation.normalized, reason: validation.error };
  }

  const normalized = validation.normalized;

  try {
    // 1. Check if column custom_slug matches
    let query1 = supabaseAdmin
      .from('job_resumes')
      .select('id, user_id')
      .ilike('custom_slug', normalized);

    if (excludeResumeId) {
      query1 = query1.neq('id', excludeResumeId);
    }

    const { data: matchedColumn } = await query1.limit(1);
    if (matchedColumn && matchedColumn.length > 0) {
      return {
        available: false,
        normalized,
        reason: 'This custom resume URL is already taken. Please choose another unique handle.',
      };
    }

    // 2. Also check document_schema->>customSlug (jsonb)
    let query2 = supabaseAdmin
      .from('job_resumes')
      .select('id, user_id')
      .eq('document_schema->>customSlug', normalized);

    if (excludeResumeId) {
      query2 = query2.neq('id', excludeResumeId);
    }

    const { data: matchedJsonb } = await query2.limit(1);
    if (matchedJsonb && matchedJsonb.length > 0) {
      return {
        available: false,
        normalized,
        reason: 'This custom resume URL is already taken. Please choose another unique handle.',
      };
    }

    return { available: true, normalized };
  } catch (err: any) {
    console.warn('Error checking slug availability:', err);
    // Safe fallback check
    return { available: true, normalized };
  }
}

/**
 * Resolves a resume by its ID or customized URL slug.
 */
export async function findResumeBySlugOrId(slugOrId: string) {
  if (!slugOrId) return null;
  const clean = slugOrId.trim();

  // 1. Direct UUID lookup
  if (UUID_REGEX.test(clean)) {
    const { data: resumeById } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id, title, file_name, file_size, storage_path, raw_text, content_hash, document_schema, created_at, updated_at')
      .eq('id', clean)
      .maybeSingle();

    if (resumeById) return resumeById;
  }

  const lowerSlug = clean.toLowerCase();

  // 2. Custom slug column lookup
  try {
    const { data: resumeByCol } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id, title, file_name, file_size, storage_path, raw_text, content_hash, document_schema, created_at, updated_at')
      .ilike('custom_slug', lowerSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeByCol) return resumeByCol;
  } catch {
    // custom_slug column might be in process of migrating
  }

  // 3. Document schema customSlug jsonb lookup
  try {
    const { data: resumeByJson } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id, title, file_name, file_size, storage_path, raw_text, content_hash, document_schema, created_at, updated_at')
      .eq('document_schema->>customSlug', lowerSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeByJson) return resumeByJson;
  } catch {
    // ignore json query error
  }

  // 4. Direct ID lookup fallback (for non-UUID string IDs in test or custom schemas)
  try {
    const { data: resumeById, error: idErr } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id, title, file_name, file_size, storage_path, raw_text, content_hash, document_schema, created_at, updated_at')
      .eq('id', clean)
      .maybeSingle();

    if (!idErr && resumeById) return resumeById;
  } catch {
    // ignore if id is uuid and clean is invalid
  }

  // 5. Candidate name slug match fallback (e.g. "shaik-taher" matches candidate whose name is "Shaik Taher")
  try {
    const parts = lowerSlug.split('-').filter(Boolean);
    if (parts.length >= 2) {
      const searchPattern = `%${parts.join('%')}%`;
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, full_name')
        .ilike('full_name', searchPattern)
        .limit(2);

      if (users && users.length === 1) {
        const userId = users[0].id;
        const { data: userResume } = await supabaseAdmin
          .from('job_resumes')
          .select('id, user_id, title, file_name, file_size, storage_path, raw_text, content_hash, document_schema, created_at, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userResume) return userResume;
      }
    }
  } catch {
    // ignore name lookup error
  }

  return null;
}
