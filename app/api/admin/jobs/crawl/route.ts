import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { crawlAndSyncTechJobs } from '@/lib/jobs/crawler';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    let batchIndex = 0;
    let batchSize = 10;
    let perCompanyLimit = 25;
    let companyName: string | undefined;
    let country: string | undefined;
    let city: string | undefined;
    let excludedCompanies: string[] = [];

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
      if (typeof body.country === 'string' && body.country.trim()) {
        country = body.country.trim();
      }
      if (typeof body.city === 'string' && body.city.trim()) {
        city = body.city.trim();
      }
      if (Array.isArray(body.excludedCompanies)) {
        excludedCompanies = body.excludedCompanies
          .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
          .map((c: string) => c.trim());
      }
    } catch {
      // Use defaults
    }

    const result = await crawlAndSyncTechJobs({
      batchIndex,
      batchSize,
      perCompanyLimit,
      companyName,
      country,
      city,
      excludedCompanies,
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

    const { data: companies, count } = await supabaseAdmin
      .from('companies')
      .select('id, name, domain', { count: 'exact' })
      .order('name');

    let dbRestrictedNames: string[] = [];
    try {
      const { data: dbRestricted } = await supabaseAdmin
        .from('crawl_restricted_companies')
        .select('name')
        .order('name');
      if (Array.isArray(dbRestricted)) {
        dbRestrictedNames = dbRestricted.map((r: { name: string }) => r.name);
      }
    } catch {
      // Non-fatal if table not yet migrated
    }

    const totalCompanies = count || (companies?.length ?? 457);
    const batchSize = 10;
    const totalBatches = Math.max(1, Math.ceil(totalCompanies / batchSize));

    return NextResponse.json({
      status: 'ready',
      message: 'Freehire company-backed job crawler engine is operational.',
      totalCompanies,
      batchSize,
      totalBatches,
      companies: (companies || []).map((c) => c.name),
      companiesList: (companies || []).map((c) => ({ id: c.id, name: c.name, domain: c.domain })),
      restrictedCompanies: dbRestrictedNames,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 500 });
  }
}
