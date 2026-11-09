import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyJobsAccess } from "@/lib/jobs/auth-guard";
import { fetchFreehireJobs } from "@/lib/jobs/freehire-client";
import {
  fetchLiveAtsJobs,
  evaluateJobMatch,
  detectExperienceLevel,
  detectWorkMode,
  isLocationMatch,
  LOCATION_ALIASES,
  NormalizedAtsJob,
} from "@/lib/jobs/ats-client";
import { crawlAndSyncTechJobs } from "@/lib/jobs/crawler";
import { CURATED_TECH_JOBS } from "@/lib/jobs/curated-tech-jobs";
import { getCuratedInsiders } from "@/lib/jobs/corporate-insiders";

export const dynamic = "force-dynamic";

/**
 * Builds a safe PostgREST .or() filter string with properly double-quoted location terms
 * and regional/state aliases (e.g. Hyderabad -> Hyd, Telangana, Cyberabad, India).
 */
function buildPostgrestLocationFilter(locationStr: string): string {
  const locLower = locationStr.toLowerCase().trim();
  const searchTerms = new Set<string>([locLower]);
  const aliases = LOCATION_ALIASES[locLower] || [];
  for (const alias of aliases) {
    if (alias.length >= 2 && alias !== "remote") searchTerms.add(alias);
  }
  const conditions = Array.from(searchTerms).map(
    (term) => `location.ilike."%${term.replace(/"/g, "")}%"`
  );
  return conditions.join(",");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryStr = searchParams.get("q") || "";
    const category = searchParams.get("category") || "all";
    const jobType = searchParams.get("job_type") || "all";
    const experienceLevel = searchParams.get("experience_level") || "all";
    const locationParam = searchParams.get("location") || "";
    const workModeParam = (searchParams.get("work_mode") || searchParams.get("workMode") || "all").toLowerCase();
    const skillsParam = searchParams.get("skills") || "";
    const companiesParam = searchParams.get("companies") || "";
    const sortParam = searchParams.get("sort") || "relevance"; // "relevance" | "date"
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const selectedCompanies =
      companiesParam && companiesParam !== "all"
        ? companiesParam.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

    // 1. Resolve candidate skills, seniority, and preferred location from query or user profile / master resume
    let candidateSkills: string[] = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    let detectedSeniority = experienceLevel !== "all" ? experienceLevel : "Senior";
    let candidateLocation = locationParam && locationParam !== "all" ? locationParam.trim() : "";
    let hasMasterResume = false;

    try {
      const authCheck = await verifyJobsAccess(request);
      if (authCheck.allowed && authCheck.userId) {
        // Fetch user registered city from users table
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("city")
          .eq("id", authCheck.userId)
          .maybeSingle();

        if (!candidateLocation && userData?.city?.trim()) {
          candidateLocation = userData.city.trim();
        }

        const { data: latestResume } = await supabaseAdmin
          .from("job_resumes")
          .select("document_schema")
          .eq("user_id", authCheck.userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestResume?.document_schema) {
          hasMasterResume = true;
          const docSchema = latestResume.document_schema;

          // If location is still not set, fallback to resume contact location
          if (!candidateLocation && docSchema.contact?.location?.trim()) {
            candidateLocation = docSchema.contact.location.trim();
          }

          // Extract candidate skills from resume skills categories
          if (Array.isArray(docSchema.skills) && candidateSkills.length === 0) {
            const docSkills = docSchema.skills.flatMap((c: any) => c.items || []);
            if (docSkills.length > 0) {
              candidateSkills = docSkills.slice(0, 15);
            }
          }

          // Also pull from project tech stacks if still short
          if (candidateSkills.length < 5 && Array.isArray(docSchema.projects)) {
            const projectTech = docSchema.projects.flatMap((p: any) => p.techStack || []);
            candidateSkills = Array.from(new Set([...candidateSkills, ...projectTech])).slice(0, 15);
          }

          // Automatically detect candidate seniority from latest job title if not explicitly filtered
          if (
            experienceLevel === "all" &&
            Array.isArray(docSchema.experience) &&
            docSchema.experience.length > 0 &&
            docSchema.experience[0]?.roleTitle
          ) {
            detectedSeniority = detectExperienceLevel(docSchema.experience[0].roleTitle);
          }
        }
      }
    } catch (authErr) {
      console.warn("User candidate profile resolution note:", authErr);
    }

    if (candidateSkills.length === 0) {
      candidateSkills = ["TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "Kafka"];
    }

    // 2. Fetch active jobs from Supabase database with strict 90-day (3 months) pruning
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    try {
      // Strictly delete jobs older than 3 months (90 days)
      await supabaseAdmin.from("jobs").delete().lt("created_at", ninetyDaysAgo);
    } catch (pruneErr) {
      console.warn("Stale jobs pruning warning:", pruneErr);
    }

    let dbQuery = supabaseAdmin
      .from("jobs")
      .select(`
        *,
        recruiter:recruiters(company_name, company_logo, website)
      `)
      .eq("is_active", true)
      .gte("created_at", ninetyDaysAgo);

    if (category !== "all") dbQuery = dbQuery.eq("category", category);
    if (jobType !== "all") dbQuery = dbQuery.eq("job_type", jobType);
    if (experienceLevel !== "all") dbQuery = dbQuery.eq("experience_level", experienceLevel);

    if (workModeParam === "remote") {
      dbQuery = dbQuery.or("workplace_type.eq.Remote,location.ilike.%remote%,location.ilike.%anywhere%");
    } else if (workModeParam === "hybrid") {
      dbQuery = dbQuery.or("workplace_type.eq.Hybrid,location.ilike.%hybrid%");
    } else if (workModeParam === "onsite") {
      dbQuery = dbQuery.or("workplace_type.eq.Onsite,location.not.ilike.%remote%");
    }

    if (locationParam && locationParam !== "all") {
      const locationOrFilter = buildPostgrestLocationFilter(locationParam);
      dbQuery = dbQuery.or(locationOrFilter);
    }

    if (selectedCompanies.length > 0) {
      const compFilters = selectedCompanies.map(
        (c) => `company_name.ilike."%${c.replace(/"/g, "")}%"`
      );
      dbQuery = dbQuery.or(compFilters.join(","));
    }

    if (queryStr.trim()) {
      dbQuery = dbQuery.or(
        `title.ilike.%${queryStr}%,company_name.ilike.%${queryStr}%,description.ilike.%${queryStr}%`
      );
    }

    const { data: dbJobs, error: jobsError } = await dbQuery
      .order("created_at", { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.warn("Error querying database jobs:", jobsError);
    }

    // Direct recruiter jobs are currently paused per user request until direct recruiters are onboarded

    // 3. Fetch live tech jobs in parallel:
    // Source A: Direct Public ATS Boards (Greenhouse, Lever, Ashby) with Next.js ISR Cache
    // Source B: Freehire open-source client
    const atsWorkMode =
      workModeParam !== "all"
        ? workModeParam
        : locationParam.toLowerCase().includes("remote")
        ? "remote"
        : "all";

    const [liveAtsJobs, freehireJobs] = await Promise.all([
      fetchLiveAtsJobs({
        skills: candidateSkills,
        seniority: detectedSeniority,
        query: queryStr,
        workMode: atsWorkMode as any,
        location: candidateLocation,
        companies: selectedCompanies,
        limit: Math.min(limit, 60),
      }),
      fetchFreehireJobs(
        {
          skills: candidateSkills,
          seniority: detectedSeniority.toLowerCase() as any,
          workMode: atsWorkMode as any,
          query: queryStr,
          limit: Math.min(limit, 30),
        },
        candidateSkills
      ),
    ]);

    // 4. Collect company names to batch lookup verified insiders in Vouchins
    const allCompanyNames = new Set<string>();
    (dbJobs || []).forEach((j: any) => {
      if (j.company_name) allCompanyNames.add(j.company_name.trim());
    });
    liveAtsJobs.forEach((j) => {
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
          if (companyInsiderCountMap[key] > 0) {
            return companyInsiderCountMap[key];
          }
        }
      }
      const curated = getCuratedInsiders(compName);
      if (curated && curated.length > 0) {
        return curated.length;
      }
      return 0;
    };

    // 5. Augment DB jobs with personalized match calculation and insider counts
    const augmentedDbJobs = (dbJobs || []).map((j: any) => {
      const count = getInsiderCount(j.company_name || "");
      const workplaceType = detectWorkMode(j.location || "");
      const matchEvaluation = evaluateJobMatch(
        {
          title: j.title,
          description: j.description,
          requirements: j.requirements,
          experienceLevel: j.experience_level,
          workplaceType,
          location: j.location,
          companyName: j.company_name,
        },
        candidateSkills,
        detectedSeniority,
        candidateLocation
      );

      return {
        ...j,
        match_score: j.match_score || matchEvaluation.matchScore,
        match_breakdown: j.match_breakdown || matchEvaluation.matchBreakdown,
        why_you_match: j.why_you_match || matchEvaluation.whyYouMatch,
        matching_skills: j.matching_skills && j.matching_skills.length > 0 ? j.matching_skills : matchEvaluation.matchingSkills,
        missing_skills: j.missing_skills && j.missing_skills.length > 0 ? j.missing_skills : matchEvaluation.missingSkills,
        tailored_bullet_suggestion: matchEvaluation.tailoredBulletSuggestion,
        is_recommended: matchEvaluation.isRecommended,
        insider_count: count,
      };
    });

    // 6. Augment Live ATS jobs with insider counts
    const augmentedAtsJobs = liveAtsJobs.map((j) => {
      const count = getInsiderCount(j.company_name);
      return {
        ...j,
        insider_count: count,
      };
    });

    // 7. Convert Freehire normalized jobs to DB-compatible jobs
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
        tailored_bullet_suggestion: fh.tailoredBulletSuggestion,
        is_recommended: fh.isRecommended,
        insider_count: count,
        created_at: new Date().toISOString(),
      };
    });

    // 8. Deduplicate and merge:
    // Internal / DB jobs take priority, followed by Live ATS jobs, then Freehire jobs
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const combined: any[] = [];

    const addJobIfUnique = (job: any) => {
      const url = job.external_apply_url?.trim();
      const titleKey = `${(job.company_name || "").toLowerCase()}-${(job.title || "").toLowerCase()}`;

      if (!seenTitles.has(titleKey) && (!url || !seenUrls.has(url))) {
        seenTitles.add(titleKey);
        if (url) seenUrls.add(url);
        combined.push(job);
      }
    };

    // Priority 1: DB jobs
    for (const job of augmentedDbJobs) {
      const url = job.external_apply_url?.trim();
      const titleKey = `${(job.company_name || "").toLowerCase()}-${(job.title || "").toLowerCase()}`;
      if (url) seenUrls.add(url);
      seenTitles.add(titleKey);
      combined.push(job);
    }

    // Priority 2: Live ATS jobs (Figma, Stripe, Airbnb, Spotify, Linear, Notion, etc.)
    for (const job of augmentedAtsJobs) {
      addJobIfUnique(job);
    }

    // Priority 3: Freehire jobs
    for (const job of convertedFreehireJobs) {
      addJobIfUnique(job);
    }

    // Priority 4: Curated Premier Tech Hub Catalog (Emergency offline fallback only)
    // Only populated when all primary sources (DB, Live ATS, Freehire) return zero listings
    if (combined.length === 0) {
      const nowIso = new Date().toISOString();
      for (const cj of CURATED_TECH_JOBS) {
        const matchEvaluation = evaluateJobMatch(
          {
            title: cj.title,
            description: cj.description.about,
            requirements: cj.description.qualifications.join("\n"),
            experienceLevel: cj.experienceLevel,
            workplaceType: cj.workplaceType,
            location: cj.location,
            companyName: cj.companyName,
          },
          candidateSkills,
          detectedSeniority,
          candidateLocation
        );

        const count = getInsiderCount(cj.companyName);

        addJobIfUnique({
          id: cj.id,
          title: cj.title,
          company_name: cj.companyName,
          company_logo: cj.companyLogo,
          location: cj.location,
          workplace_type: cj.workplaceType,
          job_type: cj.jobType,
          experience_level: cj.experienceLevel,
          category: cj.category,
          salary_range: cj.salaryRange,
          description: cj.description.about,
          requirements: cj.description.qualifications.join("\n"),
          external_apply_url: cj.externalApplyUrl,
          is_internal: cj.isInternal,
          match_score: matchEvaluation.matchScore,
          match_breakdown: matchEvaluation.matchBreakdown,
          why_you_match: matchEvaluation.whyYouMatch,
          matching_skills: matchEvaluation.matchingSkills.length > 0 ? matchEvaluation.matchingSkills : cj.matchingSkills,
          missing_skills: matchEvaluation.missingSkills.length > 0 ? matchEvaluation.missingSkills : cj.missingSkills,
          tailored_bullet_suggestion: matchEvaluation.tailoredBulletSuggestion,
          insider_count: count > 0 ? count : cj.insiderCount,
          is_recommended: matchEvaluation.isRecommended,
          created_at: nowIso,
        });
      }
    }

    // 9. Prune stale jobs (> 90 days) and apply workplace mode & location matching
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    const freshCombined = combined.filter((job) => {
      // Strict 3-month (90-day) pruning check
      if (job.created_at) {
        const jobTime = new Date(job.created_at).getTime();
        if (!isNaN(jobTime) && nowMs - jobTime > ninetyDaysMs) {
          return false;
        }
      }

      // Workplace mode filter check
      if (workModeParam !== "all") {
        const matchesWorkMode = isLocationMatch(
          job.location || "",
          candidateLocation || "all",
          job.workplace_type,
          workModeParam as any
        );
        if (!matchesWorkMode) return false;
      }

      return true;
    });

    // 10. Sort by Date or Relevance (Match Score & Location Alignment descending)
    freshCombined.sort((a, b) => {
      if (sortParam === "date") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.match_score || 0) - (a.match_score || 0);
      }

      if (candidateLocation && candidateLocation.toLowerCase() !== "all") {
        const aMatches = isLocationMatch(a.location || "", candidateLocation, a.workplace_type, workModeParam as any);
        const bMatches = isLocationMatch(b.location || "", candidateLocation, b.workplace_type, workModeParam as any);

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;

        // If both match, prefer specific home city over generic remote
        const aLoc = (a.location || "").toLowerCase();
        const bLoc = (b.location || "").toLowerCase();
        const cLoc = candidateLocation.toLowerCase();
        const aSpecific =
          aLoc.includes(cLoc) ||
          (LOCATION_ALIASES[cLoc] || []).some((al) => !al.includes("remote") && aLoc.includes(al));
        const bSpecific =
          bLoc.includes(cLoc) ||
          (LOCATION_ALIASES[cLoc] || []).some((al) => !al.includes("remote") && bLoc.includes(al));

        if (aSpecific && !bSpecific) return -1;
        if (!aSpecific && bSpecific) return 1;
      }
      return (b.match_score || 0) - (a.match_score || 0);
    });

    let finalCombined = freshCombined;
    if (selectedCompanies.length > 0) {
      const lowerComps = selectedCompanies.map((c) => c.toLowerCase());
      finalCombined = finalCombined.filter((j) => {
        const comp = (j.company_name || "").toLowerCase();
        return lowerComps.some((c) => comp.includes(c) || c.includes(comp));
      });
    }

    const finalJobs = finalCombined.slice(0, limit);

    return NextResponse.json({
      success: true,
      jobs: finalJobs,
      totalCount: finalJobs.length,
      sourceBreakdown: {
        database: augmentedDbJobs.length,
        ats: augmentedAtsJobs.length,
        freehire: convertedFreehireJobs.length,
      },
      candidateProfile: {
        hasMasterResume,
        detectedSeniority,
        resolvedSkills: candidateSkills.slice(0, 10),
        resolvedLocation: candidateLocation,
      },
    });
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}
