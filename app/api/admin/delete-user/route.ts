import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

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
