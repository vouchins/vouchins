import { NextResponse } from 'next/server';
import { verifyJobsAccess } from '@/lib/jobs/auth-guard';
import { getAllEntitlementsSummary } from '@/lib/jobs/entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authCheck = await verifyJobsAccess(request);
    if (!authCheck.allowed || !authCheck.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getAllEntitlementsSummary(authCheck.userId);
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    console.error('GET /api/jobs/entitlements error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to load entitlements' },
      { status: 500 }
    );
  }
}
