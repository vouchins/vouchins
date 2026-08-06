import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getMarketingPrincipal } from '@/lib/marketing/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const principal = await getMarketingPrincipal();
  if (!principal?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) {
    const { data, error } = await supabaseAdmin.from("users").select("company_id").not("company_id", "is", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const counts: Record<string, number> = {};
    for (const user of data || []) counts[user.company_id] = (counts[user.company_id] || 0) + 1;
    return NextResponse.json({ counts });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, city, is_verified, is_active, is_admin, is_marketing_manager, created_at")
    .eq("company_id", companyId)
    .order("full_name");
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ users: data || [] });
}

export async function POST(req: Request) {
  try {
    const { action, companyId, name, domain } = await req.json();

    // 1. Authenticate and Authorize the Admin
    const cookieStore = await cookies();
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify admin privileges of the logged-in user
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Execute Action
    if (action === 'create') {
      if (!name || !domain) {
        return NextResponse.json({ error: "Name and domain are required" }, { status: 400 });
      }

      // Check if company with domain already exists
      const { data: existing } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('domain', domain.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "A company with this domain already exists." }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .insert({
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update') {
      if (!companyId || !name || !domain) {
        return NextResponse.json({ error: "Company ID, name, and domain are required" }, { status: 400 });
      }

      // Check if domain is taken by another company
      const { data: existing } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('domain', domain.trim().toLowerCase())
        .neq('id', companyId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "Another company with this domain already exists." }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .update({
          name: name.trim(),
          domain: domain.trim().toLowerCase(),
        })
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete') {
      if (!companyId) {
        return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin companies endpoint error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
