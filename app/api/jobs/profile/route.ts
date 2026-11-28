import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ResumeDocument } from '@/lib/jobs/types';
import {
  isValidGeographicLocation,
  getCanonicalSkillKey,
  hasExplicitResumeSkills,
} from '@/lib/jobs/ats-client';
import { getActiveResumeRow, ActiveResumeRow } from '@/lib/jobs/active-resume';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCheck.userId;

    // Fetch user profile from Supabase
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, city, phone_number, linkedin_url, avatar_url, is_verified, vouch_points, company:companies(name)')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;

    // Fetch primary or latest resume document
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from('job_resumes')
      .select('id, title, document_schema, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resumeError) {
      console.warn('Could not fetch resume document:', resumeError);
    }

    const userResult = userData ? { ...userData } : null;
    if (userResult && userResult.city && !isValidGeographicLocation(userResult.city)) {
      userResult.city = null;
    }

    let docResult = resumeData?.document_schema || null;
    if (docResult && docResult.contact?.location && !isValidGeographicLocation(docResult.contact.location)) {
      docResult = {
        ...docResult,
        contact: {
          ...docResult.contact,
          location: userResult?.city && isValidGeographicLocation(userResult.city) ? userResult.city : '',
        },
      };
    }

    return NextResponse.json({
      success: true,
      user: userResult,
      resumeId: resumeData?.id || null,
      document: docResult,
    });
  } catch (err: any) {
    console.error('Jobs Profile GET error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch candidate profile' },
      { status: 500 }
    );
  }
}

const MAX_ADD_SKILLS_BATCH = 20;
const MAX_SKILL_LENGTH = 60;

function mergeConfirmedSkillsIntoDocument(
  docSchema: any,
  confirmedSkills: string[]
): { nextDoc: ResumeDocument; addedSkills: string[] } {
  const nextDoc: ResumeDocument = JSON.parse(JSON.stringify(docSchema || {}));
  if (!Array.isArray(nextDoc.skills)) {
    nextDoc.skills = [];
  }

  const hadExplicit = hasExplicitResumeSkills(nextDoc);

  // Seed Technical category from extractedProfile.skills if docSchema.skills has no items
  if (!hadExplicit && Array.isArray((nextDoc as any).extractedProfile?.skills)) {
    const seededItems: string[] = [];
    const seenSeedKeys = new Set<string>();
    for (const raw of (nextDoc as any).extractedProfile.skills) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = getCanonicalSkillKey(trimmed);
      if (!key || seenSeedKeys.has(key)) continue;
      seenSeedKeys.add(key);
      seededItems.push(trimmed);
    }
    if (seededItems.length > 0) {
      const existingTechIdx = nextDoc.skills.findIndex(
        (c) => typeof c?.category === 'string' && /technical/i.test(c.category)
      );
      if (existingTechIdx >= 0) {
        nextDoc.skills[existingTechIdx].items = seededItems;
      } else {
        nextDoc.skills.unshift({ category: 'Technical', items: seededItems });
      }
    }
  }

  // Collect all canonical keys currently across all skill categories
  const existingKeys = new Set<string>();
  for (const cat of nextDoc.skills) {
    if (Array.isArray(cat?.items)) {
      for (const item of cat.items) {
        if (typeof item === 'string') {
          const key = getCanonicalSkillKey(item);
          if (key) existingKeys.add(key);
        }
      }
    }
  }

  // Find or create target category ("Technical" or first category)
  let targetCategory =
    nextDoc.skills.find((c) => typeof c?.category === 'string' && /technical/i.test(c.category)) ||
    nextDoc.skills[0];

  if (!targetCategory) {
    targetCategory = { category: 'Technical', items: [] };
    nextDoc.skills.push(targetCategory);
  } else if (!Array.isArray(targetCategory.items)) {
    targetCategory.items = [];
  }

  const addedSkills: string[] = [];
  for (const rawSkill of confirmedSkills) {
    const trimmed = rawSkill.trim();
    const key = getCanonicalSkillKey(trimmed);
    if (!key || existingKeys.has(key)) continue;
    existingKeys.add(key);
    targetCategory.items.push(trimmed);
    addedSkills.push(trimmed);
  }

  return { nextDoc, addedSkills };
}

async function handleAddSkillsAction(userId: string, body: any) {
  if (!Array.isArray(body.skills)) {
    return NextResponse.json({ error: 'skills must be an array' }, { status: 400 });
  }

  const cleanedSkills: string[] = [];
  for (const entry of body.skills) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed || trimmed.length > MAX_SKILL_LENGTH) continue;
    cleanedSkills.push(trimmed);
  }

  if (cleanedSkills.length === 0) {
    return NextResponse.json({ error: 'At least one valid skill is required' }, { status: 400 });
  }
  if (cleanedSkills.length > MAX_ADD_SKILLS_BATCH) {
    return NextResponse.json(
      { error: `Cannot add more than ${MAX_ADD_SKILLS_BATCH} skills at once` },
      { status: 400 }
    );
  }

  // Reject explicit foreign resumeId with 403; stale same-user resumeId falls through to active row
  if (typeof body.resumeId === 'string' && body.resumeId.trim()) {
    const { data: passedRow, error: passedErr } = await supabaseAdmin
      .from('job_resumes')
      .select('id, user_id')
      .eq('id', body.resumeId.trim())
      .maybeSingle();

    if (passedErr) {
      console.error('Resume ownership check error:', passedErr);
      return NextResponse.json({ error: 'Failed to verify resume ownership' }, { status: 500 });
    }
    if (passedRow && passedRow.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { row: activeRow, error: activeErr } = await getActiveResumeRow(supabaseAdmin, userId);
  if (activeErr) {
    console.error('Active resume lookup error in add-skills:', activeErr);
    return NextResponse.json({ error: 'Failed to load active resume' }, { status: 500 });
  }
  if (!activeRow) {
    return NextResponse.json(
      { error: 'No active resume found. Please upload or create a resume first.' },
      { status: 404 }
    );
  }

  const attemptConditionalUpdate = async (row: ActiveResumeRow) => {
    const { nextDoc, addedSkills } = mergeConfirmedSkillsIntoDocument(
      row.document_schema,
      cleanedSkills
    );
    const nextIso = new Date().toISOString();

    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('job_resumes')
      .update({
        document_schema: nextDoc,
        updated_at: nextIso,
      })
      .eq('id', row.id)
      .eq('updated_at', row.updated_at)
      .select('id, updated_at');

    return { updatedRows, updateErr, nextDoc, addedSkills };
  };

  const firstAttempt = await attemptConditionalUpdate(activeRow);
  if (firstAttempt.updateErr) {
    console.error('add-skills update error:', firstAttempt.updateErr);
    return NextResponse.json({ error: 'Failed to update resume skills' }, { status: 500 });
  }

  if (Array.isArray(firstAttempt.updatedRows) && firstAttempt.updatedRows.length > 0) {
    return NextResponse.json({
      success: true,
      resumeId: activeRow.id,
      document: firstAttempt.nextDoc,
      addedSkills: firstAttempt.addedSkills,
    });
  }

  // 0 rows matched conditional updated_at: distinguish missing/foreign vs concurrent edit and retry once
  const { data: refetched, error: refetchErr } = await supabaseAdmin
    .from('job_resumes')
    .select('id, user_id, document_schema, updated_at')
    .eq('id', activeRow.id)
    .maybeSingle();

  if (refetchErr) {
    console.error('add-skills refetch error:', refetchErr);
    return NextResponse.json({ error: 'Failed to reload resume after conflict' }, { status: 500 });
  }
  if (!refetched) {
    return NextResponse.json({ error: 'Resume no longer exists' }, { status: 404 });
  }
  if (refetched.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const retryAttempt = await attemptConditionalUpdate(refetched as ActiveResumeRow);
  if (retryAttempt.updateErr) {
    console.error('add-skills retry update error:', retryAttempt.updateErr);
    return NextResponse.json({ error: 'Failed to update resume skills' }, { status: 500 });
  }
  if (Array.isArray(retryAttempt.updatedRows) && retryAttempt.updatedRows.length > 0) {
    return NextResponse.json({
      success: true,
      resumeId: refetched.id,
      document: retryAttempt.nextDoc,
      addedSkills: retryAttempt.addedSkills,
    });
  }

  return NextResponse.json(
    { error: 'Resume was modified concurrently. Please try again.' },
    { status: 409 }
  );
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authCheck.userId;
    const body = await request.json();

    if (body?.action === 'add-skills') {
      return handleAddSkillsAction(userId, body);
    }

    const { userUpdates, document }: { userUpdates?: Record<string, any>; document?: ResumeDocument } = body;

    const nowIso = new Date().toISOString();

    // 1. Update user table if userUpdates provided
    if (userUpdates && Object.keys(userUpdates).length > 0) {
      const allowedFields = ['full_name', 'city', 'phone_number', 'linkedin_url'];
      const filteredUpdates: Record<string, any> = { updated_at: nowIso };

      for (const field of allowedFields) {
        if (userUpdates[field] !== undefined) {
          if (field === 'city') {
            const cityVal = typeof userUpdates.city === 'string' ? userUpdates.city.trim() : '';
            if (cityVal && !isValidGeographicLocation(cityVal)) {
              continue; // Reject storing job titles or company names as city
            }
          }
          filteredUpdates[field] = userUpdates[field];
        }
      }

      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update(filteredUpdates)
        .eq('id', userId);

      if (userUpdateError) {
        console.warn('Error updating users table:', userUpdateError);
      }
    }

    // 2. Update or insert document into job_resumes
    if (document) {
      // Sanitize document contact location if invalid
      if (document.contact?.location && !isValidGeographicLocation(document.contact.location)) {
        document.contact.location =
          userUpdates?.city && isValidGeographicLocation(userUpdates.city)
            ? userUpdates.city.trim()
            : '';
      }
      const { row: existingResume, error: existingErr } = await getActiveResumeRow(
        supabaseAdmin,
        userId
      );
      if (existingErr) {
        console.error('Active resume lookup error in profile POST:', existingErr);
        return NextResponse.json({ error: 'Failed to lookup active resume' }, { status: 500 });
      }

      let savedResumeId: string | null = existingResume?.id ?? null;

      if (existingResume?.id) {
        const { error: updateErr } = await supabaseAdmin
          .from('job_resumes')
          .update({
            document_schema: document,
            updated_at: nowIso,
          })
          .eq('id', existingResume.id);

        if (updateErr) {
          console.error('Failed to update job_resumes in profile POST:', updateErr);
          return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 });
        }
      } else {
        const { data: insertedResume, error: insertErr } = await supabaseAdmin
          .from('job_resumes')
          .insert({
            user_id: userId,
            title: 'Master Profile Resume',
            document_schema: document,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select('id')
          .single();

        if (insertErr || !insertedResume?.id) {
          console.error('Failed to insert job_resumes in profile POST:', insertErr);
          return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
        }
        savedResumeId = insertedResume.id;
      }

      return NextResponse.json({
        success: true,
        resumeId: savedResumeId,
        message: 'Profile updated successfully',
      });
    }

    return NextResponse.json({
      success: true,
      resumeId: null,
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    console.error('Jobs Profile POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update candidate profile' },
      { status: 500 }
    );
  }
}

