import { NextResponse } from 'next/server';
import { requireActiveAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const auth = await requireActiveAdmin();
    if (auth.response) return auth.response;
    const { user } = auth;

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (user.id === userId) {
      return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    }

    // 2. Cleanup foreign key references that do not ON DELETE CASCADE
    // a. Delete all vouches involving this user (both given and received)
    await supabaseAdmin
      .from('vouches')
      .delete()
      .or(`vouching_user_id.eq.${userId},target_user_id.eq.${userId}`);

    // f.Nullify reviewed_by references in verification requests
    await supabaseAdmin
      .from('manual_verification_requests')
      .update({ reviewed_by: null })
      .eq('reviewed_by', userId);

    // 3. Delete from auth.users (which cascades to public.users and other cascading tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin user deletion error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
