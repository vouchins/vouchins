/**
 * Client-side in-memory cache for Jobs Accelerator data.
 * Prevents redundant network calls when users navigate between tabs in the Jobs module.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes TTL

let subscriptionCache: CacheEntry<any> | null = null;
let resumesCache: CacheEntry<{ resumes: any[]; latestScore: number | null }> | null = null;
let jobsCache: Record<string, CacheEntry<any[]>> = {};

export async function fetchCachedSubscription(authHeaders: Record<string, string>): Promise<any> {
  const now = Date.now();
  if (subscriptionCache && now - subscriptionCache.timestamp < CACHE_TTL_MS) {
    return subscriptionCache.data;
  }

  try {
    const res = await fetch('/api/jobs/subscription', { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      subscriptionCache = { data, timestamp: now };
      return data;
    }
  } catch (err) {
    console.warn('Subscription fetch error:', err);
  }

  return subscriptionCache?.data ?? null;
}

export async function fetchCachedResumes(
  authHeaders?: Record<string, string>,
  forceRefresh = false
): Promise<{ resumes: any[]; latestScore: number | null }> {
  const now = Date.now();
  if (!forceRefresh && resumesCache && now - resumesCache.timestamp < CACHE_TTL_MS) {
    return resumesCache.data;
  }

  try {
    const res = await fetch('/api/jobs/resume', { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      const result = {
        resumes: Array.isArray(data.resumes) ? data.resumes : [],
        latestScore: typeof data.latestScore === 'number' ? data.latestScore : null,
      };
      resumesCache = { data: result, timestamp: now };
      return result;
    }
  } catch (err) {
    console.warn('Resumes fetch error:', err);
  }

  return resumesCache?.data ?? { resumes: [], latestScore: null };
}

export async function fetchCachedJobs(limit = 4, forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  const key = `limit-${limit}`;
  if (!forceRefresh && jobsCache[key] && now - jobsCache[key].timestamp < CACHE_TTL_MS) {
    return jobsCache[key].data;
  }

  try {
    const res = await fetch(`/api/jobs?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      jobsCache[key] = { data: jobs, timestamp: now };
      return jobs;
    }
  } catch (err) {
    console.warn('Jobs fetch error:', err);
  }

  return jobsCache[key]?.data ?? [];
}

/**
 * Invalidate cache entries when data is modified (e.g. upload, edit, delete, set primary)
 */
export function invalidateResumesCache() {
  resumesCache = null;
}

export function invalidateJobsCache() {
  jobsCache = {};
}

export function invalidateSubscriptionCache() {
  subscriptionCache = null;
}

