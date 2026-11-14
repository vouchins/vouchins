import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await supabaseAdmin
      .from('crawl_restricted_companies')
      .select('id, name, company_id, created_at')
      .order('name');

    if (error) {
      // If table doesn't exist yet, return empty list gracefully without crashing
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          restrictedCompanies: [],
          tableMissing: true,
          message: 'Table crawl_restricted_companies pending migration.',
        });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const restrictedCompanies = (data || []).map((row: { name: string }) => row.name);

    return NextResponse.json({
      success: true,
      restrictedCompanies,
      restrictions: data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const rawNames: string[] = Array.isArray(body.companyNames)
      ? body.companyNames
      : body.companyName
      ? [body.companyName]
      : [];

    const namesToRestrict = rawNames
      .map((n) => (typeof n === 'string' ? n.trim() : ''))
      .filter((n) => n.length > 0);

    if (namesToRestrict.length === 0) {
      return NextResponse.json(
        { error: 'At least one company name is required.' },
        { status: 400 }
      );
    }

    for (const name of namesToRestrict) {
      // Check if company exists in companies table to link company_id
      const { data: matchedCompany } = await supabaseAdmin
        .from('companies')
        .select('id, name')
        .ilike('name', name)
        .limit(1)
        .maybeSingle();

      const { error: insertError } = await supabaseAdmin
        .from('crawl_restricted_companies')
        .upsert(
          {
            name,
            company_id: matchedCompany?.id || null,
          },
          { onConflict: 'name' }
        );

      if (insertError) {
        // If table doesn't exist yet, notify admin to run migration
        if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
          return NextResponse.json(
            {
              error:
                'Table crawl_restricted_companies does not exist in Supabase yet. Please execute the migration file in supabase/migrations/20261114_create_crawl_restricted_companies.sql.',
              tableMissing: true,
            },
            { status: 400 }
          );
        }
        throw insertError;
      }

      // Try updating is_crawl_restricted on companies table if column exists
      if (matchedCompany?.id) {
        try {
          await supabaseAdmin
            .from('companies')
            .update({ is_crawl_restricted: true } as any)
            .eq('id', matchedCompany.id);
        } catch {
          // Non-fatal if column not yet added
        }
      }
    }

    // Return current fresh list of restricted companies from database
    const { data: allRestricted } = await supabaseAdmin
      .from('crawl_restricted_companies')
      .select('name')
      .order('name');

    const restrictedCompanies = (allRestricted || []).map((r: { name: string }) => r.name);

    return NextResponse.json({
      success: true,
      restrictedCompanies,
    });
  } catch (err: any) {
    console.error('Error saving crawl restriction to database:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : null;
    const clearAll = Boolean(body.clearAll);

    if (!clearAll && !companyName) {
      return NextResponse.json(
        { error: 'Specify either companyName or clearAll: true' },
        { status: 400 }
      );
    }

    if (clearAll) {
      const { error } = await supabaseAdmin
        .from('crawl_restricted_companies')
        .delete()
        .neq('name', '__placeholder_never_matches__');

      if (error && error.code !== '42P01') {
        throw error;
      }

      // Reset is_crawl_restricted flag on companies table if column exists
      try {
        await supabaseAdmin
          .from('companies')
          .update({ is_crawl_restricted: false } as any)
          .eq('is_crawl_restricted', true);
      } catch {
        // Non-fatal
      }

      return NextResponse.json({ success: true, restrictedCompanies: [] });
    }

    if (companyName) {
      const { error } = await supabaseAdmin
        .from('crawl_restricted_companies')
        .delete()
        .ilike('name', companyName);

      if (error && error.code !== '42P01') {
        throw error;
      }

      // Reset is_crawl_restricted flag on companies table if column exists
      try {
        await supabaseAdmin
          .from('companies')
          .update({ is_crawl_restricted: false } as any)
          .ilike('name', companyName);
      } catch {
        // Non-fatal
      }

      const { data: allRestricted } = await supabaseAdmin
        .from('crawl_restricted_companies')
        .select('name')
        .order('name');

      const restrictedCompanies = (allRestricted || []).map((r: { name: string }) => r.name);

      return NextResponse.json({
        success: true,
        restrictedCompanies,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error removing crawl restriction from database:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

