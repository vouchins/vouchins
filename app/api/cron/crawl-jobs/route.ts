import { NextResponse } from 'next/server';
import { crawlAndSyncTechJobs } from '@/lib/jobs/crawler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await crawlAndSyncTechJobs(15);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Job crawler cron error:', error);
    return NextResponse.json({ error: error.message || 'Crawler failed' }, { status: 500 });
  }
}
