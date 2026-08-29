import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMarketingPrincipal } from "@/lib/marketing/auth";
export async function GET() {
  if (!await getMarketingPrincipal()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [{ data: groups, error }, { data: companies, error: companyError }, { data: userLocations, error: locationError }] = await Promise.all([
    supabaseAdmin.from("user_groups").select("id,name,description,is_system").order("name"),
    supabaseAdmin.from("companies").select("id,name,domain").order("name"),
    supabaseAdmin.from("users").select("city").eq("is_active", true).not("city", "is", null),
  ]);
  if (error || companyError || locationError) return NextResponse.json({ error: (error || companyError || locationError)?.message }, { status: 400 });
  const locations = Array.from(new Set(
    (userLocations || []).map((user: any) => String(user.city || "").trim()).filter(Boolean),
  )).sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ audiences: [
    { id: "default_all", name: "All active users", is_system: true },
    { id: "default_verified", name: "Verified users", is_system: true },
    { id: "default_unverified", name: "Unverified users", is_system: true },
    { id: "default_email", name: "Logged in via Email", is_system: true },
    { id: "default_google", name: "Logged in via Google", is_system: true },
    { id: "default_linkedin", name: "Logged in via LinkedIn", is_system: true },
    ...(companies || []).map((company: any) => ({
      id: `default_company_${company.id}`,
      name: `Users from ${company.name}`,
      description: company.domain ? `Active professionals at ${company.name} (${company.domain})` : undefined,
      is_system: true,
    })),
    ...locations.map((location) => ({
      id: `default_location_${encodeURIComponent(location)}`,
      name: `Users in ${location}`,
      description: `Active users whose profile location is ${location}`,
      is_system: true,
    })),
    ...(groups || []),
  ] });
}
