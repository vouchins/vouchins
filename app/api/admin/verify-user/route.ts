import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { requestId, action, adminNotes } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get the Request Details
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('manual_verification_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 });
    }

    if (action === 'approve') {
      const domain = request.corporate_email.split('@')[1];

      // 2. Ensure Company exists (Robust Check)
      let { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('domain', domain)
        .maybeSingle();

      if (!company) {
        const { data: newCompany, error: createError } = await supabaseAdmin
          .from('companies')
          .insert({
            domain,
            name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)
          })
          .select('id')
          .single();

        if (createError) throw new Error("Failed to create company record");
        company = newCompany;
      }

      // 3. Update User Status
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          secondary_email: request.corporate_email,
          company_id: company.id, // Safe UUID
          is_verified: true,
          verification_method: 'manual'
        })
        .eq('id', request.user_id);

      if (userUpdateError) throw userUpdateError;

      // 4. Update Request Status
      await supabaseAdmin
        .from('manual_verification_requests')
        .update({ status: 'approved', admin_notes: adminNotes })
        .eq('id', requestId);

    } else {
      // Handle Rejection
      await supabaseAdmin
        .from('manual_verification_requests')
        .update({ status: 'rejected', admin_notes: adminNotes })
        .eq('id', requestId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin verification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}