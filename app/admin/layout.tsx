import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?returnTo=/admin");
    return null;
  }

  // Verify that the user is an active administrator before rendering any admin pages
  let profile = null;
  const { data: adminProfile } = await supabaseAdmin
    .from("users")
    .select("is_admin, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfile) {
    profile = adminProfile;
  } else {
    const { data: userProfile } = await supabase
      .from("users")
      .select("is_admin, is_active")
      .eq("id", user.id)
      .maybeSingle();
    profile = userProfile;
  }

  if (!profile?.is_admin || profile.is_active === false) {
    redirect("/feed");
    return null;
  }

  return <>{children}</>;
}
