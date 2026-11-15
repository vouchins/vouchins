import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCuratedInsiders } from "@/lib/jobs/corporate-insiders";
import { verifyJobsAccess } from "@/lib/jobs/auth-guard";

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

    // Check if the requesting viewer is corporate verified or platform admin
    let isViewerVerified = false;
    let callingUserId: string | null = null;
    let callingUserEmail: string | null = null;

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
        callingUserId = authUser.id;
        callingUserEmail = authUser.email || null;
        const { data: viewerData } = await supabaseAdmin
          .from("users")
          .select("is_verified, is_admin, email")
          .eq("id", authUser.id)
          .maybeSingle();

        if (viewerData?.email) {
          callingUserEmail = viewerData.email;
        }
        if (viewerData?.is_verified || viewerData?.is_admin) {
          isViewerVerified = true;
        }
      }

      // If cookie auth did not resolve verification, verify via auth-guard (handles bearer & dev fallback)
      if (!isViewerVerified || !callingUserId) {
        const guard = await verifyJobsAccess(request);
        if (guard.userId && !callingUserId) {
          callingUserId = guard.userId;
        }
        if (guard.isAdmin) {
          isViewerVerified = true;
        } else if (guard.userId) {
          const { data: viewerProfile } = await supabaseAdmin
            .from("users")
            .select("is_verified, is_admin, email")
            .eq("id", guard.userId)
            .maybeSingle();

          if (viewerProfile?.email && !callingUserEmail) {
            callingUserEmail = viewerProfile.email;
          }
          if (viewerProfile?.is_verified || viewerProfile?.is_admin) {
            isViewerVerified = true;
          }
        }
      }
    } catch {
      isViewerVerified = false;
    }

    // Clean common corporate suffixes and sanitize characters that break PostgREST syntax (, ( ) : & %)
    const sanitizedRaw = company
      .replace(/[(),:;%&]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const cleanCompanyName = sanitizedRaw
      .replace(/\b(inc|llc|corp|corporation|technologies|technology|solutions|services|ltd|limited|india|pvt|co|company)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const cleanDomain = domain ? domain.replace(/[^a-z0-9.-]/gi, "").toLowerCase() : "";
    const domainGuess = cleanCompanyName ? cleanCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    // 1. Search for matching companies in database using sanitized terms
    let matchedCompanyIds: string[] = [];
    let matchedDomains: string[] = [];

    const companyOrClauses: string[] = [];
    const searchTerms = new Set<string>();

    if (cleanCompanyName && cleanCompanyName.length >= 2) {
      searchTerms.add(cleanCompanyName);
      const spacedName = cleanCompanyName.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
      if (spacedName && spacedName !== cleanCompanyName) searchTerms.add(spacedName);
      const unspacedName = cleanCompanyName.replace(/\s+/g, "");
      if (unspacedName.length >= 3) searchTerms.add(unspacedName);
    } else if (sanitizedRaw && sanitizedRaw.length >= 2) {
      searchTerms.add(sanitizedRaw);
    }

    searchTerms.forEach((term) => {
      const safeTerm = term.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      if (safeTerm.length >= 2) {
        companyOrClauses.push(`name.ilike.%${safeTerm}%`);
      }
    });

    if (cleanDomain && cleanDomain.includes(".")) {
      companyOrClauses.push(`domain.ilike.%${cleanDomain}%`);
    }
    if (domainGuess && domainGuess.length >= 3) {
      companyOrClauses.push(`domain.ilike.%${domainGuess}%`);
    }

    if (companyOrClauses.length > 0) {
      try {
        const { data: companiesData } = await supabaseAdmin
          .from("companies")
          .select("id, name, domain")
          .or(companyOrClauses.join(","))
          .limit(5);

        if (companiesData && companiesData.length > 0) {
          matchedCompanyIds = companiesData.map((c) => c.id).filter(Boolean);
          matchedDomains = companiesData.map((c) => c.domain?.toLowerCase()).filter(Boolean);
        }
      } catch (companyQueryErr) {
        console.warn("Company search error in /api/jobs/insiders:", companyQueryErr);
      }
    }

    if (cleanDomain && cleanDomain.includes(".") && !matchedDomains.includes(cleanDomain)) {
      matchedDomains.push(cleanDomain);
    }

    // 2. Query users matching company_id or corporate email domain
    let users: any[] = [];
    try {
      const orConditions: string[] = [];
      if (matchedCompanyIds.length > 0) {
        orConditions.push(`company_id.in.(${matchedCompanyIds.join(",")})`);
      }

      for (const dom of matchedDomains) {
        const safeDom = dom.replace(/[^a-z0-9.-]/gi, "").toLowerCase();
        if (safeDom && safeDom.includes(".")) {
          orConditions.push(`email.ilike.%@${safeDom}`);
          orConditions.push(`secondary_email.ilike.%@${safeDom}`);
        }
      }

      if (orConditions.length === 0 && domainGuess && domainGuess.length >= 3) {
        orConditions.push(`email.ilike.%@${domainGuess}.%`);
        orConditions.push(`secondary_email.ilike.%@${domainGuess}.%`);
      }

      // Safeguard: Only execute user query when specific company or domain criteria are present.
      // This strictly prevents querying random database users if company name was stripped.
      if (orConditions.length > 0) {
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

        if (callingUserId) {
          userQuery = userQuery.neq("id", callingUserId);
        }

        const { data: dbUsers, error: usersError } = await userQuery
          .or(orConditions.join(","))
          .order("is_verified", { ascending: false })
          .limit(15);

        if (!usersError && dbUsers) {
          users = dbUsers.filter((u: any) => {
            if (callingUserId && u.id === callingUserId) return false;
            if (callingUserEmail && (u.email === callingUserEmail || u.secondary_email === callingUserEmail)) return false;
            return true;
          });
        }
      }
    } catch (err) {
      console.warn("Could not query DB users for insiders:", err);
    }

    // 3. Format DB registered insiders
    const formattedDbInsiders = users.map((u: any) => {
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

    // 4. Fallback to curated corporate directory if DB has 0 registered insiders for company
    let finalInsiders = formattedDbInsiders;
    if (finalInsiders.length === 0) {
      const curated = getCuratedInsiders(cleanCompanyName || sanitizedRaw || company, cleanDomain || domain);
      finalInsiders = curated
        .filter((c) => c.id !== callingUserId)
        .map((c) => ({
        id: c.id,
        name: isViewerVerified ? c.name : formatPartialName(c.name),
        role: c.role,
        city: c.city || null,
        domain: c.domain,
        companyName: c.companyName,
        avatarUrl: isViewerVerified ? (c.avatarUrl || null) : null,
        isVerified: true,
        vouchPoints: c.vouchPoints || 50,
        responseRate: c.responseRate || "98% response rate",
        isRegisteredUser: true,
        isMasked: !isViewerVerified,
      }));
    }

    return NextResponse.json({
      success: true,
      company: cleanCompanyName || company,
      insiders: finalInsiders,
      totalCount: finalInsiders.length,
    });
  } catch (error: any) {
    console.error("GET /api/jobs/insiders error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch company insiders", insiders: [], totalCount: 0 },
      { status: 500 }
    );
  }
}
