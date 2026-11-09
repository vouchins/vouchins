import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  SkillResource,
  CreateSkillResourceInput,
  UpdateSkillResourceInput,
} from './types';
import { DEFAULT_SKILL_RESOURCES, extractDomain } from './default-resources';

// In-memory runtime store for quick responsiveness and offline/fallback resilience
let inMemoryResources: SkillResource[] = [...DEFAULT_SKILL_RESOURCES];
let hasSyncedFromDb = false;

function mapDbRowToResource(row: any): SkillResource {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    url: row.url,
    secondaryUrl: row.secondary_url || null,
    secondaryUrlLabel: row.secondary_url_label || null,
    type: row.type || 'guide',
    difficulty: row.difficulty || 'All Levels',
    isFree: row.is_free !== false,
    featured: Boolean(row.featured),
    domain: row.domain || extractDomain(row.url),
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapResourceToDbRow(resource: SkillResource | CreateSkillResourceInput) {
  return {
    title: resource.title,
    description: resource.description,
    category: resource.category,
    url: resource.url,
    secondary_url: resource.secondaryUrl || null,
    secondary_url_label: resource.secondaryUrlLabel || null,
    type: resource.type || 'guide',
    difficulty: resource.difficulty || 'All Levels',
    is_free: resource.isFree !== false,
    featured: Boolean(resource.featured),
    domain: extractDomain(resource.url),
    tags: resource.tags || [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Retrieve all skills development courses and resources.
 * Falls back to curated defaults if database is not yet provisioned or unreachable.
 */
export async function getAllSkillResources(filters?: {
  category?: string;
  query?: string;
}): Promise<SkillResource[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('skills_courses')
      .select('*')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      inMemoryResources = data.map(mapDbRowToResource);
      hasSyncedFromDb = true;
    } else if (!hasSyncedFromDb && (!data || data.length === 0)) {
      // If table exists but is empty, try seeding default resources
      try {
        const rowsToInsert = DEFAULT_SKILL_RESOURCES.map((r) => ({
          id: r.id,
          ...mapResourceToDbRow(r),
          created_at: r.createdAt || new Date().toISOString(),
        }));
        await supabaseAdmin.from('skills_courses').insert(rowsToInsert);
      } catch {
        // Silently preserve in-memory fallback
      }
    }
  } catch (err) {
    // Database table not provisioned or offline; gracefully use in-memory state
  }

  let results = [...inMemoryResources];

  if (filters?.category && filters.category.toLowerCase() !== 'all') {
    const cat = filters.category.toLowerCase();
    results = results.filter((r) => r.category.toLowerCase() === cat);
  }

  if (filters?.query) {
    const q = filters.query.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Retrieve a single resource by ID.
 */
export async function getSkillResourceById(id: string): Promise<SkillResource | null> {
  const localMatch = inMemoryResources.find((r) => r.id === id);
  try {
    const { data, error } = await supabaseAdmin
      .from('skills_courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return mapDbRowToResource(data);
    }
  } catch {
    // Ignore and return localMatch
  }
  return localMatch || null;
}

/**
 * Create a new skill development resource.
 */
export async function createSkillResource(
  input: CreateSkillResourceInput
): Promise<SkillResource> {
  const newId = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const newResource: SkillResource = {
    id: newId,
    title: input.title.trim(),
    description: (input.description || '').trim(),
    category: input.category,
    url: input.url.trim(),
    secondaryUrl: input.secondaryUrl?.trim() || null,
    secondaryUrlLabel: input.secondaryUrlLabel?.trim() || null,
    type: input.type || 'guide',
    difficulty: input.difficulty || 'All Levels',
    isFree: input.isFree !== false,
    featured: Boolean(input.featured),
    domain: extractDomain(input.url),
    tags: input.tags || [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Prepend to in-memory store
  inMemoryResources = [newResource, ...inMemoryResources];

  try {
    const row = {
      id: newId,
      ...mapResourceToDbRow(newResource),
      created_at: nowIso,
    };
    await supabaseAdmin.from('skills_courses').insert(row);
  } catch (err) {
    console.warn('[Skills Service] Failed to persist new skill course to DB, saved in-memory:', err);
  }

  return newResource;
}

/**
 * Update an existing skill development resource.
 */
export async function updateSkillResource(
  input: UpdateSkillResourceInput
): Promise<SkillResource> {
  const nowIso = new Date().toISOString();
  const existing = inMemoryResources.find((r) => r.id === input.id);
  if (!existing) {
    throw new Error(`Skill resource with id ${input.id} not found.`);
  }

  const updated: SkillResource = {
    ...existing,
    title: input.title !== undefined ? input.title.trim() : existing.title,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    category: input.category !== undefined ? input.category : existing.category,
    url: input.url !== undefined ? input.url.trim() : existing.url,
    secondaryUrl: input.secondaryUrl !== undefined ? input.secondaryUrl?.trim() || null : existing.secondaryUrl,
    secondaryUrlLabel: input.secondaryUrlLabel !== undefined ? input.secondaryUrlLabel?.trim() || null : existing.secondaryUrlLabel,
    type: input.type !== undefined ? input.type : existing.type,
    difficulty: input.difficulty !== undefined ? input.difficulty : existing.difficulty,
    isFree: input.isFree !== undefined ? input.isFree : existing.isFree,
    featured: input.featured !== undefined ? input.featured : existing.featured,
    domain: input.url ? extractDomain(input.url) : existing.domain,
    tags: input.tags !== undefined ? input.tags : existing.tags,
    updatedAt: nowIso,
  };

  inMemoryResources = inMemoryResources.map((r) => (r.id === input.id ? updated : r));

  try {
    const row = mapResourceToDbRow(updated);
    await supabaseAdmin.from('skills_courses').update(row).eq('id', input.id);
  } catch (err) {
    console.warn('[Skills Service] Failed to update skill course in DB:', err);
  }

  return updated;
}

/**
 * Delete a skill development resource.
 */
export async function deleteSkillResource(id: string): Promise<boolean> {
  inMemoryResources = inMemoryResources.filter((r) => r.id !== id);

  try {
    await supabaseAdmin.from('skills_courses').delete().eq('id', id);
  } catch (err) {
    console.warn('[Skills Service] Failed to delete skill course from DB:', err);
  }

  return true;
}

/**
 * Reset and re-seed the default resources.
 */
export async function resetToDefaultSkillResources(): Promise<SkillResource[]> {
  inMemoryResources = [...DEFAULT_SKILL_RESOURCES];

  try {
    await supabaseAdmin.from('skills_courses').delete().neq('id', 'placeholder-none');
    const rows = DEFAULT_SKILL_RESOURCES.map((r) => ({
      id: r.id,
      ...mapResourceToDbRow(r),
      created_at: r.createdAt || new Date().toISOString(),
    }));
    await supabaseAdmin.from('skills_courses').insert(rows);
  } catch (err) {
    console.warn('[Skills Service] Re-seed reset in memory:', err);
  }

  return inMemoryResources;
}

