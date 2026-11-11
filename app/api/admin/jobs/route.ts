import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '25', 10)));
    const q = (url.searchParams.get('q') || '').trim();
    const company = (url.searchParams.get('company') || '').trim();
    const location = (url.searchParams.get('location') || '').trim();
    const experienceLevel = url.searchParams.get('experience_level') || 'all';
    const jobType = url.searchParams.get('job_type') || 'all';
    const category = url.searchParams.get('category') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const sort = url.searchParams.get('sort') || 'newest';

    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from('jobs')
      .select('id, recruiter_id, title, company_name, company_logo, location, job_type, salary_range, experience_level, category, impressions, is_active, created_at, updated_at, external_apply_url, description, requirements', { count: 'exact' });

    if (q) {
      // Escape special characters in query string
      const sanitizedQ = q.replace(/[%_,]/g, ' ');
      query = query.or(`title.ilike.%${sanitizedQ}%,company_name.ilike.%${sanitizedQ}%,location.ilike.%${sanitizedQ}%`);
    }

    if (company && company.toLowerCase() !== 'all') {
      const sanitizedComp = company.replace(/[%_,]/g, ' ');
      query = query.ilike('company_name', `%${sanitizedComp}%`);
    }

    if (location && location.toLowerCase() !== 'all') {
      const sanitizedLoc = location.replace(/[%_,]/g, ' ');
      query = query.ilike('location', `%${sanitizedLoc}%`);
    }

    if (experienceLevel !== 'all') {
      query = query.eq('experience_level', experienceLevel.toLowerCase());
    }

    if (jobType !== 'all') {
      query = query.eq('job_type', jobType.toLowerCase());
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Sort order
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'title') {
      query = query.order('title', { ascending: true });
    } else if (sort === 'company') {
      query = query.order('company_name', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data: jobs, error, count } = await query;
    if (error) throw error;

    // Get aggregated stats for quick admin overview
    const [activeRes, totalRes] = await Promise.all([
      supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }),
    ]);

    const totalCount = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const includeCompanies = url.searchParams.get('include_companies') === 'true';
    let companies: string[] | undefined;
    if (includeCompanies) {
      const [{ data: c1 }, { data: c2 }] = await Promise.all([
        supabaseAdmin.from('jobs').select('company_name'),
        supabaseAdmin.from('companies').select('name').order('name'),
      ]);
      const set = new Set<string>();
      (c1 || []).forEach((j) => j.company_name?.trim() && set.add(j.company_name.trim()));
      (c2 || []).forEach((c) => c.name?.trim() && set.add(c.name.trim()));
      companies = Array.from(set).sort((a, b) => a.localeCompare(b));
    }

    return NextResponse.json({
      jobs: jobs || [],
      total: totalCount,
      page,
      pageSize,
      totalPages,
      stats: {
        activeJobs: activeRes.count || 0,
        totalJobs: totalRes.count || 0,
        inactiveJobs: Math.max(0, (totalRes.count || 0) - (activeRes.count || 0)),
      },
      ...(companies ? { companies } : {}),
    });
  } catch (error: any) {
    console.error('Admin jobs query failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { id, is_active, title, location, category, experience_level, job_type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (typeof location === 'string' && location.trim()) updates.location = location.trim();
    if (typeof category === 'string' && category.trim()) updates.category = category.trim();
    if (typeof experience_level === 'string' && experience_level.trim()) {
      updates.experience_level = experience_level.toLowerCase().trim();
    }
    if (typeof job_type === 'string' && job_type.trim()) {
      updates.job_type = job_type.toLowerCase().trim();
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, job: data });
  } catch (error: any) {
    console.error('Admin job update failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin job deletion failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete job' },
      { status: 500 }
    );
  }
}

