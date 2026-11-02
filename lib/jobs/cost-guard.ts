import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { checkIsUserPro } from './auth-guard';

export interface CostGuardResult {
  allowed: boolean;
  reason?: string;
  code?: 'RATE_LIMIT_EXCEEDED' | 'PRO_PLAN_REQUIRED' | 'PAYLOAD_TOO_LARGE';
  cachedEvaluation?: any;
}

export function computeContentHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Strict 1-Time Rate Limiter for LLM / AI Model calls.
 * Free tier users receive AI model analysis strictly once.
 * Pro tier users (or platform admins) enjoy unlimited AI evaluations.
 */
export async function checkAILlmRateLimit(
  userId: string,
  action: string = 'evaluate'
): Promise<{ allowed: boolean; code?: string; reason?: string }> {
  if (!userId) {
    return { allowed: false, reason: 'Authentication required for AI model calls.' };
  }

  // Pro users have unlimited AI model invocations
  const isPro = await checkIsUserPro(userId);
  if (isPro) {
    return { allowed: true };
  }

  // 1. Fast in-memory rate check (key per user and action, max 1)
  const memoryKey = `ai-llm:${action}:${userId}`;
  const memoryResult = checkRateLimit(memoryKey, {
    windowMs: 30 * 24 * 60 * 60 * 1000,
    max: 1,
  });

  if (!memoryResult.success) {
    return {
      allowed: false,
      code: 'PRO_PLAN_REQUIRED',
      reason: `You've used your 1 free AI resume analysis. Upgrade to Jobs Pro for unlimited AI suggestions.`,
    };
  }

  // 2. Persistent database audit check
  try {
    const { count, error } = await supabaseAdmin
      .from('job_ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action);

    if (!error && (count ?? 0) >= 1) {
      return {
        allowed: false,
        code: 'PRO_PLAN_REQUIRED',
        reason: `You've used your 1 free AI resume analysis. Upgrade to Jobs Pro for unlimited AI suggestions.`,
      };
    }
  } catch (err) {
    console.warn('[AI Rate Limiter] Error querying persistent usage logs:', err);
  }

  return { allowed: true };
}

/**
 * Reset AI rate limit helper (primarily for tests and admin overrides)
 */
export function resetAIRateLimit(userId: string, action?: string): void {
  if (action) {
    resetRateLimit(`ai-llm:${action}:${userId}`);
  } else {
    resetRateLimit(`ai-llm:evaluate:${userId}`);
    resetRateLimit(`ai-llm:extract:${userId}`);
    resetRateLimit(`ai-suggestions:${userId}`);
  }
}

/**
 * 4-Layer AI Cost & Pro Plan Gate Guard:
 * 1. Payload Size Capping (<= 15,000 characters)
 * 2. Pro Plan Gate for Re-evaluation (Re-analyzing existing resumes is strictly Pro-only)
 * 3. SHA-256 Deduplication Cache ($0.00 Re-runs for initial rawText uploads)
 * 4. Pro Subscription Check:
 *    - Free users: Exactly 1 AI suggestion evaluation.
 *    - To get more suggestions or add more resumes: Prompted to upgrade to Jobs Pro.
 *    - Pro users: Unlimited AI evaluations.
 * 5. Global Platform Daily Circuit Breaker (500 total calls/day)
 */
export async function checkAICostGuard(
  userId: string,
  rawText: string,
  isExistingDoc: boolean = false
): Promise<CostGuardResult> {
  // 1. Sanitize & Bound Payload
  const trimmed = rawText.trim();
  if (trimmed.length > 15000) {
    return {
      allowed: false,
      code: 'PAYLOAD_TOO_LARGE',
      reason: 'Resume payload exceeds maximum allowable length (15,000 characters). Please provide a standard 1-3 page resume.',
    };
  }

  const contentHash = computeContentHash(trimmed);

  try {
    // 2. Pro Plan Check: Re-evaluating existing resumes is strictly exclusive to Jobs Pro members.
    const isPro = await checkIsUserPro(userId);

    if (isExistingDoc && !isPro) {
      return {
        allowed: false,
        code: 'PRO_PLAN_REQUIRED',
        reason: 'Re-analyzing your resume with AI is exclusive to Jobs Pro members. Upgrade to Jobs Pro to get unlimited re-evaluations.',
      };
    }

    // 3. Cache Deduplication Check (Exact SHA-256 match = $0 cost)
    // ONLY check cached evaluations for initial rawText uploads!
    // When re-evaluating existingDoc, skip cache deduplication to evaluate the updated resume freshly.
    if (!isExistingDoc) {
      const { data: cached } = await supabaseAdmin
        .from('job_evaluations')
        .select('*')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const isPoisoned = cached.suggestions?.some(
          (s: any) =>
            s.originalText?.includes('1.5M daily active requests') ||
            s.originalText?.includes('Spearheaded frontend migration to Next.js and TypeScript, reducing page load latency by 45%') ||
            s.suggestedRewrite?.includes('scalable architectural workflows')
        );

        if (!isPoisoned) {
          return {
            allowed: true,
            cachedEvaluation: cached,
          };
        }

        // Automatically purge legacy poisoned evaluation cache
        supabaseAdmin.from('job_evaluations').delete().eq('id', cached.id).then(() => {});
      }
    }

    // 4. Free user 1-time AI suggestion evaluation limit (for initial uploads)
    if (!isPro) {
      const memoryKey = `ai-suggestions:${userId}`;
      const memoryLimit = checkRateLimit(memoryKey, {
        windowMs: 30 * 24 * 60 * 60 * 1000,
        max: 1,
      });

      // Check persistent DB log to see if user has already received AI suggestions
      const { count: aiCallCount } = await supabaseAdmin
        .from('job_ai_usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action', 'evaluate');

      const hasUsedAIOnce = (aiCallCount ?? 0) >= 1 || !memoryLimit.success;

      if (hasUsedAIOnce) {
        return {
          allowed: false,
          code: 'PRO_PLAN_REQUIRED',
          reason: "You've used your 1 free AI resume analysis. Upgrade to Jobs Pro to get unlimited AI suggestions and evaluate additional resumes.",
        };
      }
    }

    // 5. Global Platform Daily Circuit Breaker
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const globalCap = parseInt(process.env.JOBS_DAILY_AI_CAP || process.env.ACCELERATOR_DAILY_AI_CAP || '500', 10);
    const { count: globalDailyCount } = await supabaseAdmin
      .from('job_ai_usage_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo);

    if ((globalDailyCount ?? 0) >= globalCap) {
      console.warn(`[AI Guard] Global daily cap of ${globalCap} reached.`);
      return {
        allowed: false,
        code: 'RATE_LIMIT_EXCEEDED',
        reason: 'Platform daily AI capacity reached. Please try again later.',
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Cost guard evaluation error:', err);
    return { allowed: true };
  }
}

/**
 * Records an invocation to the persistent usage audit log.
 */
export async function recordAIUsage(params: {
  userId: string;
  action: string;
  provider: string;
  model?: string;
  inputChars: number;
  estimatedTokens?: number;
  contentHash?: string;
}): Promise<void> {
  try {
    await supabaseAdmin.from('job_ai_usage_logs').insert({
      user_id: params.userId,
      action: params.action,
      provider: params.provider,
      model: params.model,
      input_chars: params.inputChars,
      estimated_tokens: params.estimatedTokens || Math.round(params.inputChars / 4),
      content_hash: params.contentHash,
    });
  } catch (err) {
    console.error('Failed to log AI usage:', err);
  }
}
