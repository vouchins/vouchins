import { NextResponse } from 'next/server';
import { JobMatchVectorsSchema } from '@/lib/jobs/types';
import { matchJobsForProfile } from '@/lib/jobs/job-matcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = JobMatchVectorsSchema.safeParse(body.vectors);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid job match vectors schema' },
        { status: 400 }
      );
    }

    const matchedJobs = await matchJobsForProfile(parsed.data);

    return NextResponse.json({
      success: true,
      jobs: matchedJobs,
    });
  } catch (error: any) {
    console.error('Match jobs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match jobs for profile' },
      { status: 500 }
    );
  }
}
