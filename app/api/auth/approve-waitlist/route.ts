import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { waitlistId, notes, action } = await req.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Get the Waitlist Entry
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .eq('id', waitlistId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Waitlist record not found' }, { status: 404 });
    }

    // Handle Rejection Action
    if (action === 'reject') {
      await supabaseAdmin.from('waitlist').update({
        status: 'rejected',
        notes,
        rejected_at: new Date().toISOString()
      }).eq('id', waitlistId);

      // Send the rejection email
      try {
        await sendRejectionEmail(entry.personal_email);
      } catch (e) {
        console.error("Rejection email failed:", e);
      }

      return NextResponse.json({ message: 'User rejected and notified.' });
    }

    /* ---------------- Start Approval Flow ---------------- */

    const normalizedEmail = entry.corporate_email.toLowerCase().trim();

    // 2. Fetch the Staged Intent (Source of Truth for password and name)
    const { data: intent } = await supabaseAdmin
      .from('signup_intents')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!intent) {
      return NextResponse.json({
        error: 'No signup intent found. User must fill the signup form before manual approval.'
      }, { status: 404 });
    }

    // 3. Resolve Company (Mirrors verify-otp logic)
    const domain = normalizedEmail.split("@")[1];
    let companyId: string;

    const { data: existingCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("domain", domain)
      .maybeSingle();

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error: compError } = await supabaseAdmin
        .from("companies")
        .insert({
          domain,
          name: domain.split(".")[0],
        })
        .select("id")
        .single();

      if (compError) throw compError;
      companyId = newCompany.id;
    }

    // 4. Create Auth Identity (The Secure Layer)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: intent.password, // Uses plain text from signup_intents as per your setup
      email_confirm: true,
      user_metadata: { first_name: intent.first_name }
    });

    if (authError) throw authError;

    // 5. Create Public User Record (The Application Layer)
    // We inject waitlist data here to skip the onboarding page (onboarded: true)
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authUser.user.id,
        email: normalizedEmail,
        first_name: intent.first_name,
        company_id: companyId,
        personal_email: entry.personal_email, // From Waitlist
        linkedin_url: entry.linkedin_url,     // From Waitlist
        city: entry.city,                     // From Waitlist
        is_verified: true,
        onboarded: true,                      // User bypasses onboarding screen
        created_at: new Date().toISOString()
      }]);

    if (publicUserError) {
      // Rollback Auth user if public record fails to prevent ghost accounts
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw publicUserError;
    }

    // 6. Final Status Updates & Cleanup
    await supabaseAdmin.from('waitlist').update({
      status: 'approved',
      notes,
      approved_at: new Date().toISOString()
    }).eq('id', waitlistId);

    // Delete Intent and leftover OTPs to keep DB clean
    await supabaseAdmin.from('signup_intents').delete().eq('email', normalizedEmail);
    await supabaseAdmin.from('email_otps').delete().eq('email', normalizedEmail);

    // 7. Notify via Personal Email (Gmail)
    try {
      await sendApprovalEmail(entry.personal_email);
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    return NextResponse.json({
      message: 'User approved. Account provisioned and onboarding completed.'
    });

  } catch (error: any) {
    console.error('Manual Approval API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}