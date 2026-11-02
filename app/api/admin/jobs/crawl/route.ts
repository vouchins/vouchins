import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { crawlAndSyncTechJobs } from '@/lib/jobs/crawler';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    let perBoardLimit = 15;
    try {
      const body = await request.json().catch(() => ({}));
      if (typeof body.limit === 'number' && body.limit > 0 && body.limit <= 50) {
        perBoardLimit = body.limit;
      }
    } catch {
      // Use default
    }

    const result = await crawlAndSyncTechJobs(perBoardLimit);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin manual job crawl error:', error);
    return NextResponse.json(
      { error: error.message || 'Job crawler execution failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    return NextResponse.json({
      status: 'ready',
      message: 'Job crawler engine is operational. Send POST to trigger an import run.',
      sources: ['Figma (Greenhouse)', 'Stripe (Greenhouse)', 'Airbnb (Greenhouse)', 'DoorDash (Greenhouse)', 'Spotify (Lever)'],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 500 });
  }
}
