import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobSearchStatus, resumePath } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (jobSearchStatus) {
      updates.job_search_status = jobSearchStatus;
    }

    if (resumePath) {
      updates.resume_path = resumePath;
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', authCheck.userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Profile synced successfully' });
  } catch (err: any) {
    console.error('Sync profile error:', err);
    return NextResponse.json({ error: err.message || 'Failed to sync to profile' }, { status: 500 });
  }
}
