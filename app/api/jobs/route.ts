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
  COMMON_TECH_TAXONOMY,
  containsSkill,
} from "@/lib/jobs/ats-client";
import { CURATED_TECH_JOBS } from "@/lib/jobs/curated-tech-jobs";
import { getCuratedInsiders } from "@/lib/jobs/corporate-insiders";
import { cleanJobApplyUrl } from "@/lib/jobs/url-cleaner";

export const dynamic = "force-dynamic";

/**
 * Builds a safe PostgREST .or() filter string with properly double-quoted location terms
 * and regional/state aliases (e.g. Hyderabad -> hyd, telangana, cyberabad, hitec city).
 */
export function buildPostgrestLocationFilter(locationStr: string): string {
  if (!locationStr || locationStr.toLowerCase() === "all") return "";
  const locLower = locationStr.toLowerCase().trim();
  const rawParts = locLower.split(/[,/|]+/).map((p) => p.trim()).filter((p) => p.length >= 2);
  const searchTerms = new Set<string>();

  for (const part of rawParts) {
    if (part.length >= 3 && part !== "remote" && part !== "india" && part !== "usa" && part !== "united states") {
      searchTerms.add(part);
    }
    const aliases = LOCATION_ALIASES[part] || [];
    for (const alias of aliases) {
      if (alias.length >= 2 && alias !== "remote" && alias !== "india") {
        searchTerms.add(alias);
      }
    }
  }

  // Check distinct city matches
  const distinctCities = [
    "hyderabad", "bangalore", "bengaluru", "pune", "mumbai", "delhi", "gurgaon", "noida", "chennai",
    "san francisco", "new york", "seattle", "austin", "boston", "chicago"
  ];
  const matchedCity = distinctCities.find((c) => locLower.includes(c));
  if (matchedCity) {
    searchTerms.add(matchedCity);
    const cityAliases = LOCATION_ALIASES[matchedCity] || [];
    for (const alias of cityAliases) {
      if (alias.length >= 2 && alias !== "remote" && alias !== "india") {
        searchTerms.add(alias);
      }
    }
  }

  // Also check if the whole input string has direct aliases
  const fullAliases = LOCATION_ALIASES[locLower] || [];
  for (const alias of fullAliases) {
    if (alias.length >= 2 && alias !== "remote" && alias !== "india") {
      searchTerms.add(alias);
    }
  }

  if (searchTerms.size === 0) {
    const firstWord = rawParts[0] || locLower;
    if (firstWord.length >= 2) searchTerms.add(firstWord);
  }

  const conditions = Array.from(searchTerms)
    .filter((term) => term.length >= 2)
    .map((term) => `location.ilike."%${term.replace(/["%,]/g, "")}%"`);

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
              candidateSkills = docSkills.slice(0, 30);
            }
          }

          // Also pull from project tech stacks if available
          if (Array.isArray(docSchema.projects)) {
            const projectTech = docSchema.projects.flatMap((p: any) => p.techStack || []);
            candidateSkills = Array.from(new Set([...candidateSkills, ...projectTech])).slice(0, 30);
          }

          // Extract tech keywords from experience bullets and roles
          if (Array.isArray(docSchema.experience)) {
            const expTech: string[] = [];
            for (const exp of docSchema.experience) {
              const bulletsText = Array.isArray(exp.bullets) ? exp.bullets.join(" ") : "";
              const fullExpText = `${exp.roleTitle || ""} ${bulletsText}`;
              for (const tech of COMMON_TECH_TAXONOMY) {
                if (containsSkill(fullExpText, tech)) {
                  expTech.push(tech);
                }
              }
            }
            if (expTech.length > 0) {
              candidateSkills = Array.from(new Set([...candidateSkills, ...expTech])).slice(0, 30);
            }
          }

          // Automatically detect candidate seniority from latest job title or experience breadth
          if (experienceLevel === "all") {
            if (
              Array.isArray(docSchema.experience) &&
              docSchema.experience.length > 0 &&
              docSchema.experience[0]?.roleTitle
            ) {
              detectedSeniority = detectExperienceLevel(docSchema.experience[0].roleTitle);
              if (detectedSeniority === "Mid" && docSchema.experience.length >= 3) {
                detectedSeniority = "Senior";
              }
            } else if (Array.isArray(docSchema.experience) && docSchema.experience.length === 0) {
              detectedSeniority = "Entry";
            }
          }
        }
      }
    } catch (authErr) {
      console.warn("User candidate profile resolution note:", authErr);
    }

    if (candidateSkills.length === 0) {
      candidateSkills = ["TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "Kafka"];
    }

    // 2. Fetch active jobs from Supabase database within 90 days (3 months)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const buildBaseDbQuery = () => {
      let q = supabaseAdmin
        .from("jobs")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", ninetyDaysAgo);

      if (category !== "all") {
        q = q.ilike("category", `%${category}%`);
      }
      if (jobType !== "all") {
        q = q.ilike("job_type", `%${jobType.toLowerCase()}%`);
      }
      if (experienceLevel !== "all") {
        q = q.ilike("experience_level", `%${experienceLevel.toLowerCase()}%`);
      }

      if (workModeParam === "remote") {
        q = q.or("location.ilike.%remote%,location.ilike.%anywhere%,location.ilike.%virtual%");
      } else if (workModeParam === "hybrid") {
        q = q.or("location.ilike.%hybrid%");
      } else if (workModeParam === "onsite") {
        q = q.not("location", "ilike", "%remote%").not("location", "ilike", "%anywhere%");
      }

      if (selectedCompanies.length > 0) {
        const compFilters = selectedCompanies.map(
          (c) => `company_name.ilike."%${c.replace(/["%,]/g, "")}%"`
        );
        q = q.or(compFilters.join(","));
      }

      if (queryStr.trim()) {
        const cleanQ = queryStr.trim().replace(/["%,]/g, "");
        q = q.or(
          `title.ilike."%${cleanQ}%",company_name.ilike."%${cleanQ}%",description.ilike."%${cleanQ}%"`
        );
      }

      return q;
    };

    let rawDbJobs: any[] = [];

    // Extract top core tech keywords from candidateSkills to build a skill-targeted query
    const skillKeywords: string[] = [];
    for (const s of candidateSkills) {
      const lower = s.toLowerCase();
      if (lower.includes('react') && !skillKeywords.includes('React')) skillKeywords.push('React');
      if ((lower.includes('front') || lower.includes('ui')) && !skillKeywords.includes('Frontend')) skillKeywords.push('Frontend');
      if (lower.includes('javascript') && !skillKeywords.includes('JavaScript')) skillKeywords.push('JavaScript');
      if (lower.includes('typescript') && !skillKeywords.includes('TypeScript')) skillKeywords.push('TypeScript');
      if (lower.includes('node') && !skillKeywords.includes('Node')) skillKeywords.push('Node');
      if (lower.includes('python') && !skillKeywords.includes('Python')) skillKeywords.push('Python');
      if (lower.includes('java') && !lower.includes('script') && !skillKeywords.includes('Java')) skillKeywords.push('Java');
      if ((lower.includes('golang') || lower === 'go') && !skillKeywords.includes('Go')) skillKeywords.push('Go');
    }

    let skillOrFilter = '';
    if (skillKeywords.length > 0) {
      const parts: string[] = [];
      for (const kw of skillKeywords.slice(0, 4)) {
        parts.push(`title.ilike."%${kw}%"`);
        parts.push(`requirements.ilike."%${kw}%"`);
      }
      skillOrFilter = parts.join(',');
    }

    const activeLocation = (locationParam && locationParam !== 'all')
      ? locationParam.trim()
      : (candidateLocation && candidateLocation.toLowerCase() !== 'all')
      ? candidateLocation.trim()
      : '';

    const locationOrFilter = activeLocation ? buildPostgrestLocationFilter(activeLocation) : '';
    const locFilterWithRemote = locationOrFilter
      ? `${locationOrFilter},location.ilike."%remote%",location.ilike."%anywhere%"`
      : '';

    if (locFilterWithRemote) {
      // Query dual pools in parallel:
      // Pool 1: Skill-targeted jobs matching candidate's tech domain in target location/remote
      // Pool 2: Most recent jobs in target location/remote
      const pool1Query = buildBaseDbQuery().or(locFilterWithRemote);
      if (skillOrFilter) {
        pool1Query.or(skillOrFilter);
      }

      const pool2Query = buildBaseDbQuery().or(locFilterWithRemote);

      const [pool1Res, pool2Res] = await Promise.all([
        pool1Query.order('created_at', { ascending: false }).limit(200),
        pool2Query.order('created_at', { ascending: false }).limit(100),
      ]);

      if (pool1Res.error) console.warn('Error querying skill-targeted DB jobs pool:', pool1Res.error);
      if (pool2Res.error) console.warn('Error querying location DB jobs pool:', pool2Res.error);

      const seenIds = new Set<string>();
      const merged: any[] = [];
      for (const j of pool1Res.data || []) {
        if (!seenIds.has(j.id)) {
          seenIds.add(j.id);
          merged.push(j);
        }
      }
      for (const j of pool2Res.data || []) {
        if (!seenIds.has(j.id)) {
          seenIds.add(j.id);
          merged.push(j);
        }
      }
      rawDbJobs = merged;
    } else {
      // General browsing without specific location preference
      let q1 = buildBaseDbQuery();
      if (skillOrFilter) {
        q1 = q1.or(skillOrFilter);
      }
      const [skillGeneralRes, recentGeneralRes] = await Promise.all([
        q1.order('created_at', { ascending: false }).limit(200),
        buildBaseDbQuery().order('created_at', { ascending: false }).limit(100),
      ]);

      if (skillGeneralRes.error) console.warn('Error querying skill general jobs pool:', skillGeneralRes.error);
      if (recentGeneralRes.error) console.warn('Error querying recent general jobs pool:', recentGeneralRes.error);

      const seenIds = new Set<string>();
      const merged: any[] = [];
      for (const j of skillGeneralRes.data || []) {
        if (!seenIds.has(j.id)) {
          seenIds.add(j.id);
          merged.push(j);
        }
      }
      for (const j of recentGeneralRes.data || []) {
        if (!seenIds.has(j.id)) {
          seenIds.add(j.id);
          merged.push(j);
        }
      }
      rawDbJobs = merged;
    }

    // ========================================================================
    // Parallel Live ATS & Freehire Fetchers (Commented per user request)
    // The Supabase database contains 11,000+ active crawled jobs.
    // Uncomment these sections when multi-source parallel live fetching
    // is desired with Vercel Pro.
    // ========================================================================
    /*
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
    */
    const liveAtsJobs: NormalizedAtsJob[] = [];
    const freehireJobs: any[] = [];

    // 4. Collect company names to batch lookup verified insiders in Vouchins
    const allCompanyNames = new Set<string>();
    rawDbJobs.forEach((j: any) => {
      if (j.company_name) allCompanyNames.add(j.company_name.trim());
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
    const augmentedDbJobs = rawDbJobs.map((j: any) => {
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
        id: j.id,
        title: j.title,
        company_name: j.company_name,
        company_logo: j.company_logo || "",
        location: j.location,
        workplace_type: workplaceType,
        job_type: j.job_type || "Full-time",
        experience_level: j.experience_level || "Mid",
        category: j.category || "Engineering",
        salary_range: j.salary_range || "",
        description: j.description || "",
        requirements: j.requirements || "",
        external_apply_url: cleanJobApplyUrl(j.external_apply_url),
        is_internal: false,
        match_score: matchEvaluation.matchScore,
        match_breakdown: matchEvaluation.matchBreakdown,
        why_you_match: matchEvaluation.whyYouMatch,
        matching_skills: matchEvaluation.matchingSkills,
        missing_skills: matchEvaluation.missingSkills,
        tailored_bullet_suggestion: matchEvaluation.tailoredBulletSuggestion,
        is_recommended: matchEvaluation.isRecommended,
        insider_count: count,
        created_at: j.created_at,
      };
    });

    // 6. Augment Live ATS jobs with insider counts (commented - see above)
    const augmentedAtsJobs = liveAtsJobs.map((j) => {
      const count = getInsiderCount(j.company_name);
      return {
        ...j,
        external_apply_url: cleanJobApplyUrl(j.external_apply_url),
        insider_count: count,
      };
    });

    // 7. Convert Freehire normalized jobs to DB-compatible jobs (commented - see above)
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
        external_apply_url: cleanJobApplyUrl(fh.externalApplyUrl),
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
    // Internal / DB jobs take primary priority
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

    // Priority 1: Supabase Database jobs (11,000+ active crawled listings)
    for (const job of augmentedDbJobs) {
      addJobIfUnique(job);
    }

    // Priority 2: Live ATS jobs (commented - see above)
    /*
    for (const job of augmentedAtsJobs) {
      addJobIfUnique(job);
    }
    */

    // Priority 3: Freehire jobs (commented - see above)
    /*
    for (const job of convertedFreehireJobs) {
      addJobIfUnique(job);
    }
    */

    // Fallback: Curated Premier Tech Hub Catalog
    // Only used when database query returns zero listings (e.g. offline dev or unit tests)
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
        ats: 0,
        freehire: 0,
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
