import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type MarketingPrincipal = {
  id: string;
  email?: string;
  isAdmin: boolean;
  isMarketingManager: boolean;
};

export async function getMarketingPrincipal(): Promise<MarketingPrincipal | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let data = null;
  const { data: adminData } = await supabaseAdmin
    .from("users")
    .select("is_admin, is_marketing_manager, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (adminData) {
    data = adminData;
  } else {
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin, is_marketing_manager, is_active")
      .eq("id", user.id)
      .maybeSingle();
    data = userData;
  }

  if (data?.is_active === false || (!data?.is_admin && !data?.is_marketing_manager)) return null;
  return {
    id: user.id,
    email: user.email,
    isAdmin: Boolean(data.is_admin),
    isMarketingManager: Boolean(data.is_marketing_manager),
  };
}

