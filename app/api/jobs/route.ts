import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyJobsAccess } from "@/lib/jobs/auth-guard";
import { fetchFreehireJobs } from "@/lib/jobs/freehire-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.get("q") || "";
    const category = searchParams.get("category") || "all";
    const jobType = searchParams.get("job_type") || "all";
    const experienceLevel = searchParams.get("experience_level") || "all";
    const location = searchParams.get("location") || "all";
    const skillsParam = searchParams.get("skills") || "";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // 1. Resolve candidate skills from query or user master resume
    let candidateSkills: string[] = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    let detectedSeniority = experienceLevel !== "all" ? experienceLevel : "Senior";

    try {
      const authCheck = await verifyJobsAccess(request);
      if (authCheck.allowed && authCheck.userId) {
        const { data: latestResume } = await supabaseAdmin
          .from("job_resumes")
          .select("document_schema")
          .eq("user_id", authCheck.userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestResume?.document_schema?.skills && candidateSkills.length === 0) {
          const docSkills = latestResume.document_schema.skills;
          if (Array.isArray(docSkills)) {
            candidateSkills = docSkills.flatMap((c: any) => c.items || []).slice(0, 10);
          }
        }
      }
    } catch {
      // Continue with default / query skills
    }

    if (candidateSkills.length === 0) {
      candidateSkills = ["TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "Kafka"];
    }

    // 2. Fetch active jobs from Supabase database
    let query = supabaseAdmin
      .from("jobs")
      .select(`
        *,
        recruiter:recruiters(company_name, company_logo, website)
      `)
      .eq("is_active", true);

    if (category !== "all") query = query.eq("category", category);
    if (jobType !== "all") query = query.eq("job_type", jobType);
    if (experienceLevel !== "all") query = query.eq("experience_level", experienceLevel);
    if (location !== "all") query = query.eq("location", location);

    if (queryStr.trim()) {
      query = query.or(
        `title.ilike.%${queryStr}%,company_name.ilike.%${queryStr}%,description.ilike.%${queryStr}%`
      );
    }

    const { data: dbJobs, error: jobsError } = await query
      .order("created_at", { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.warn("Error querying database jobs:", jobsError);
    }

    // 3. Fetch live tech jobs from Freehire API (strelov1/freehire open aggregator)
    const freehireJobs = await fetchFreehireJobs(
      {
        skills: candidateSkills,
        seniority: detectedSeniority.toLowerCase() as any,
        workMode: location.toLowerCase().includes("remote") ? "remote" : "all",
        query: queryStr,
        limit: Math.min(limit, 50),
      },
      candidateSkills
    );

    // 4. Collect company names to batch lookup verified insiders in Vouchins
    const allCompanyNames = new Set<string>();
    (dbJobs || []).forEach((j: any) => {
      if (j.company_name) allCompanyNames.add(j.company_name.trim());
    });
    freehireJobs.forEach((j) => {
      if (j.companyName) allCompanyNames.add(j.companyName.trim());
    });

    const companyInsiderCountMap: Record<string, number> = {};

    if (allCompanyNames.size > 0) {
      try {
        const { data: companiesData } = await supabaseAdmin
          .from("companies")
          .select("id, name, domain");

        if (companiesData && companiesData.length > 0) {
          const matchedCompanies = companiesData.filter((c) =>
            Array.from(allCompanyNames).some((name) => {
              const n1 = name.toLowerCase();
              const n2 = c.name.toLowerCase();
              return n1.includes(n2) || n2.includes(n1);
            })
          );

          if (matchedCompanies.length > 0) {
            const companyIds = matchedCompanies.map((c) => c.id);
            const { data: verifiedUsers } = await supabaseAdmin
              .from("users")
              .select("company_id")
              .in("company_id", companyIds)
              .eq("is_verified", true);

            if (verifiedUsers) {
              const countPerCompanyId = new Map<string, number>();
              verifiedUsers.forEach((u) => {
                if (u.company_id) {
                  countPerCompanyId.set(u.company_id, (countPerCompanyId.get(u.company_id) || 0) + 1);
                }
              });

              matchedCompanies.forEach((mc) => {
                const count = countPerCompanyId.get(mc.id) || 0;
                companyInsiderCountMap[mc.name.toLowerCase()] = count;
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not calculate company insider counts:", err);
      }
    }

    const getInsiderCount = (compName: string): number => {
      const lower = (compName || "").toLowerCase();
      for (const key of Object.keys(companyInsiderCountMap)) {
        if (lower.includes(key) || key.includes(lower)) {
          return companyInsiderCountMap[key];
        }
      }
      return 0;
    };

    // 5. Augment DB jobs with insider counts
    const augmentedDbJobs = (dbJobs || []).map((j: any) => {
      const count = getInsiderCount(j.company_name || "");
      return {
        ...j,
        insider_count: count,
      };
    });

    // 6. Convert Freehire normalized jobs to DB-compatible jobs
    const convertedFreehireJobs = freehireJobs.map((fh) => {
      const count = getInsiderCount(fh.companyName);
      return {
        id: fh.id,
        title: fh.title,
        company_name: fh.companyName,
        company_logo: fh.companyLogo,
        location: fh.location,
        job_type: fh.jobType,
        experience_level: fh.experienceLevel,
        salary_range: fh.salaryRange,
        description: fh.description.about,
        requirements: fh.description.qualifications.join("\n"),
        external_apply_url: fh.externalApplyUrl,
        is_internal: false,
        match_score: fh.matchScore,
        match_breakdown: fh.matchBreakdown,
        why_you_match: fh.whyYouMatch,
        matching_skills: fh.matchingSkills,
        missing_skills: fh.missingSkills,
        insider_count: count,
        created_at: new Date().toISOString(),
      };
    });

    // 7. Deduplicate and merge: Internal / DB jobs take priority, followed by Freehire jobs
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const combined: any[] = [];

    for (const job of augmentedDbJobs) {
      const url = job.external_apply_url?.trim();
      const titleKey = `${(job.company_name || "").toLowerCase()}-${(job.title || "").toLowerCase()}`;
      if (url) seenUrls.add(url);
      seenTitles.add(titleKey);
      combined.push(job);
    }

    for (const job of convertedFreehireJobs) {
      const url = job.external_apply_url?.trim();
      const titleKey = `${(job.company_name || "").toLowerCase()}-${(job.title || "").toLowerCase()}`;
      if (!seenTitles.has(titleKey) && (!url || !seenUrls.has(url))) {
        seenTitles.add(titleKey);
        if (url) seenUrls.add(url);
        combined.push(job);
      }
    }

    return NextResponse.json({
      success: true,
      jobs: combined,
      totalCount: combined.length,
      sourceBreakdown: {
        database: augmentedDbJobs.length,
        freehire: convertedFreehireJobs.length,
      },
    });
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}
