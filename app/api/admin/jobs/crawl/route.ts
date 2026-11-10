import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { crawlAndSyncTechJobs } from '@/lib/jobs/crawler';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    let batchIndex = 0;
    let batchSize = 25;
    let perCompanyLimit = 25;
    let companyName: string | undefined;

    try {
      const body = await request.json().catch(() => ({}));
      if (typeof body.batchIndex === 'number' && body.batchIndex >= 0) {
        batchIndex = body.batchIndex;
      }
      if (typeof body.batchSize === 'number' && body.batchSize > 0 && body.batchSize <= 50) {
        batchSize = body.batchSize;
      }
      const rawLimit = typeof body.perCompanyLimit === 'number' ? body.perCompanyLimit : body.limit;
      if (typeof rawLimit === 'number' && rawLimit > 0 && rawLimit <= 100) {
        perCompanyLimit = rawLimit;
      }
      if (typeof body.companyName === 'string' && body.companyName.trim()) {
        companyName = body.companyName.trim();
      }
    } catch {
      // Use defaults
    }

    const result = await crawlAndSyncTechJobs({
      batchIndex,
      batchSize,
      perCompanyLimit,
      companyName,
    });

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

    const { count } = await supabaseAdmin
      .from('companies')
      .select('id', { count: 'exact', head: true });

    const totalCompanies = count || 457;
    const batchSize = 25;
    const totalBatches = Math.max(1, Math.ceil(totalCompanies / batchSize));

    return NextResponse.json({
      status: 'ready',
      message: 'Freehire company-backed job crawler engine is operational.',
      totalCompanies,
      batchSize,
      totalBatches,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 500 });
  }
}
