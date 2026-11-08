import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function formatPartialName(fullName: string): string {
  if (!fullName) return "V**** M****";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0].toUpperCase();
    const second = parts[parts.length - 1][0].toUpperCase();
    return `${first}**** ${second}****`;
  }
  if (parts.length === 1) {
    const first = parts[0][0].toUpperCase();
    return `${first}****`;
  }
  return "V**** M****";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = (searchParams.get("company") || "").trim();
    const domain = (searchParams.get("domain") || "").trim().toLowerCase();

    if (!company && !domain) {
      return NextResponse.json({ success: true, insiders: [], totalCount: 0 });
    }

    // Check if the requesting viewer is corporate verified
    let isViewerVerified = false;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
          },
        }
      );
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.id) {
        const { data: viewerData } = await supabaseAdmin
          .from("users")
          .select("is_verified")
          .eq("id", authUser.id)
          .maybeSingle();

        if (viewerData?.is_verified) {
          isViewerVerified = true;
        }
      }
    } catch {
      isViewerVerified = false;
    }

    // Clean common corporate suffixes (Inc, LLC, Corp, Technologies, etc.) for fuzzy matching
    const cleanCompanyName = company
      .replace(/\b(inc|llc|corp|corporation|technologies|technology|solutions|services|ltd|limited|india|pvt)\b/gi, "")
      .trim();

    // 1. Search for matching companies
    let matchedCompanyIds: string[] = [];
    let matchedDomains: string[] = [];

    if (cleanCompanyName || domain) {
      let companyQuery = supabaseAdmin
        .from("companies")
        .select("id, name, domain");

      const domainGuess = cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const spacedName = cleanCompanyName.replace(/([a-z])([A-Z])/g, "$1 $2");
      const unspacedName = cleanCompanyName.replace(/\s+/g, "");

      if (domain) {
        companyQuery = companyQuery.or(
          `name.ilike.%${cleanCompanyName}%,name.ilike.%${spacedName}%,name.ilike.%${unspacedName}%,domain.ilike.%${domain}%,domain.ilike.%${domainGuess}%`
        );
      } else {
        companyQuery = companyQuery.or(
          `name.ilike.%${cleanCompanyName}%,name.ilike.%${spacedName}%,name.ilike.%${unspacedName}%,domain.ilike.%${domainGuess}%`
        );
      }

      const { data: companiesData, error: compErr } = await companyQuery.limit(5);

      if (companiesData && companiesData.length > 0) {
        matchedCompanyIds = companiesData.map((c) => c.id).filter(Boolean);
        matchedDomains = companiesData.map((c) => c.domain?.toLowerCase()).filter(Boolean);
      }
    }

    if (domain && !matchedDomains.includes(domain)) {
      matchedDomains.push(domain);
    }

    // 2. Query users matching company_id or corporate email domain
    let userQuery = supabaseAdmin
      .from("users")
      .select(`
        id,
        full_name,
        email,
        secondary_email,
        city,
        avatar_url,
        bio,
        is_verified,
        is_active,
        company_id,
        company:companies(id, name, domain)
      `)
      .eq("is_active", true);

    const orConditions: string[] = [];
    if (matchedCompanyIds.length > 0) {
      orConditions.push(`company_id.in.(${matchedCompanyIds.join(",")})`);
    }

    for (const dom of matchedDomains) {
      if (dom && dom.includes(".")) {
        orConditions.push(`email.ilike.%@${dom}`);
        orConditions.push(`secondary_email.ilike.%@${dom}`);
      }
    }

    if (orConditions.length > 0) {
      userQuery = userQuery.or(orConditions.join(","));
    } else if (cleanCompanyName) {
      // Fallback: search users whose email contains clean company name
      const fallbackDomain = cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "");
      userQuery = userQuery.or(`email.ilike.%@${fallbackDomain}.%,secondary_email.ilike.%@${fallbackDomain}.%`);
    }

    let { data: users, error: usersError } = await userQuery
      .order("is_verified", { ascending: false })
      .limit(15);

    if (usersError) {
      console.error("Error querying insiders from users table:", usersError);
      return NextResponse.json({ success: true, insiders: [], totalCount: 0 });
    }

    // 3. Format response
    const formattedInsiders = (users || []).map((u: any) => {
      const compName = u.company?.name || company;
      const compDomain =
        u.company?.domain ||
        domain ||
        (compName ? `${compName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com` : "vouchins.com");

      let role = "Software Engineer";
      if (u.bio && u.bio.trim().length > 0) {
        const firstLine = u.bio.split("\n")[0].trim();
        if (firstLine.length < 50) {
          role = firstLine;
        }
      } else if (u.is_verified) {
        role = `Verified ${compName} Member`;
      }

      const rawFullName = u.full_name || "Vouchins Member";
      const displayName = isViewerVerified ? rawFullName : formatPartialName(rawFullName);

      return {
        id: u.id,
        name: displayName,
        role,
        city: u.city || null,
        domain: compDomain,
        companyName: compName,
        avatarUrl: isViewerVerified ? (u.avatar_url || null) : null,
        isVerified: Boolean(u.is_verified),
        vouchPoints: u.is_verified ? 50 : 10,
        responseRate: "98% response rate",
        isRegisteredUser: true,
        isMasked: !isViewerVerified,
      };
    });

    return NextResponse.json({
      success: true,
      company: cleanCompanyName,
      insiders: formattedInsiders,
      totalCount: formattedInsiders.length,
    });
  } catch (error: any) {
    console.error("GET /api/jobs/insiders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch company insiders", insiders: [] },
      { status: 500 }
    );
  }
}

