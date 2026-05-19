// app/api/users/update/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { userId, updates } = await request.json();

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

  // Perform the update and ask Supabase to return the updated row
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select(); // returns an array with the updated record(s)

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 400 }
    );
  }

  // `data` is an array – we only updated a single row
  const updatedUser = data?.[0] ?? null;

  return NextResponse.json(
    { success: true, user: updatedUser },
    { status: 200 }
  );
}
