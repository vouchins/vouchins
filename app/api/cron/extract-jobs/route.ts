import { NextRequest, NextResponse } from 'next/server';
import { backfillJobsMetadataBatch } from '@/lib/jobs/job-ai-extractor';

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '50', 10) || 50;
    const lookbackDays = parseInt(searchParams.get('lookbackDays') || '30', 10) || 30;
    const result = await backfillJobsMetadataBatch({ batchSize, lookbackDays });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Job AI extraction cron error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const batchSize = Number(body?.batchSize) || 50;
    const lookbackDays = Number(body?.lookbackDays) || 30;
    const result = await backfillJobsMetadataBatch({ batchSize, lookbackDays });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Job AI extraction POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
