import type { SupabaseClient } from '@supabase/supabase-js';

export interface ActiveResumeRow {
  id: string;
  user_id: string;
  document_schema: any;
  updated_at: string;
}

export interface ActiveResumeResult {
  row: ActiveResumeRow | null;
  error: any;
}

/**
 * Resolves the single active Master Resume row for a user from `job_resumes`,
 * ordered deterministically by `updated_at DESC, id DESC`.
 * Callers must check `error` explicitly so transient DB failures return 500
 * instead of being treated as a missing resume (404).
 */
export async function getActiveResumeRow(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<ActiveResumeResult> {
  const { data, error } = await supabaseAdmin
    .from('job_resumes')
    .select('id, user_id, document_schema, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { row: null, error };
  }

  return { row: (data as ActiveResumeRow | null) ?? null, error: null };
}
