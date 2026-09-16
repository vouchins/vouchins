import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function requireActiveAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // First try service role admin client, fallback to user's authenticated client
  let profile = null;
  const { data: adminProfile } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email, is_admin, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfile) {
    profile = adminProfile;
  } else {
    const { data: userProfile } = await supabase
      .from("users")
      .select("id, full_name, email, is_admin, is_active")
      .eq("id", user.id)
      .maybeSingle();
    profile = userProfile;
  }

  if (!profile?.is_admin || profile.is_active === false) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, profile };
}

