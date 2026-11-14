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
  isValidGeographicLocation,
  CandidateMatchingContext,
  detectRoleDomain,
  isSameCompany,
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
  if (!locationStr || locationStr.toLowerCase() === "all" || !isValidGeographicLocation(locationStr)) return "";
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
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 5), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const selectedCompanies =
      companiesParam && companiesParam !== "all"
        ? companiesParam.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

    // 1. Resolve candidate skills, seniority, role, company, and preferred location from query or user profile / master resume
    const currentRoleParam = searchParams.get("current_role") || searchParams.get("role") || "";
    const currentCompanyParam = searchParams.get("current_company") || searchParams.get("company") || "";
    const isWorkingParam = searchParams.get("is_working");

    let candidateCurrentRole = currentRoleParam.trim();
    let candidateCurrentCompany = currentCompanyParam.trim();
    let isCurrentlyWorking = isWorkingParam !== null ? isWorkingParam === "true" : false;

    let candidateSkills: string[] = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    let detectedSeniority = experienceLevel !== "all" ? experienceLevel : "Senior";
    let candidateLocation =
      locationParam && locationParam !== "all" && isValidGeographicLocation(locationParam)
        ? locationParam.trim()
        : "";
    let hasMasterResume = false;

    try {
      const authCheck = await verifyJobsAccess(request);
      if (authCheck.allowed && authCheck.userId) {
        // Fetch user registered city and affiliated company from users table
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("city, company_id, company:companies(name)")
          .eq("id", authCheck.userId)
          .maybeSingle();

        if (!candidateLocation && userData?.city?.trim() && isValidGeographicLocation(userData.city)) {
          candidateLocation = userData.city.trim();
        }

        const userRegisteredCompany = (userData as any)?.company?.name?.trim() || "";
        if (!candidateCurrentCompany && userRegisteredCompany) {
          candidateCurrentCompany = userRegisteredCompany;
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
          if (!candidateLocation && docSchema.contact?.location?.trim() && isValidGeographicLocation(docSchema.contact.location)) {
            candidateLocation = docSchema.contact.location.trim();
          }

          // Extract candidate's current or last role & company from work experience
          if (Array.isArray(docSchema.experience) && docSchema.experience.length > 0) {
            // Find active/current position if candidate is still working there
            const currentExp = docSchema.experience.find(
              (e: any) => e.isCurrent === true || /\b(present|current)\b/i.test(e.endDate || "")
            );

            if (currentExp && currentExp.roleTitle?.trim()) {
              if (!candidateCurrentRole) candidateCurrentRole = currentExp.roleTitle.trim();
              if (!candidateCurrentCompany && currentExp.company?.trim()) {
                candidateCurrentCompany = currentExp.company.trim();
              }
              if (isWorkingParam === null) isCurrentlyWorking = true;
            } else {
              // Last company / most recent experience entry if not currently working
              const latestExp = docSchema.experience[0];
              if (latestExp?.roleTitle?.trim()) {
                if (!candidateCurrentRole) candidateCurrentRole = latestExp.roleTitle.trim();
                if (!candidateCurrentCompany && latestExp.company?.trim()) {
                  candidateCurrentCompany = latestExp.company.trim();
                }
                if (isWorkingParam === null) isCurrentlyWorking = false;
              }
            }
          }

          if (!candidateCurrentRole && docSchema.targetJobTitle?.trim()) {
            candidateCurrentRole = docSchema.targetJobTitle.trim();
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

          // Automatically detect candidate seniority from current role, latest job title, or experience breadth
          if (experienceLevel === "all") {
            const roleForSeniority = candidateCurrentRole || docSchema.experience?.[0]?.roleTitle;
            if (roleForSeniority) {
              detectedSeniority = detectExperienceLevel(roleForSeniority);
              if (detectedSeniority === "Mid" && Array.isArray(docSchema.experience) && docSchema.experience.length >= 3) {
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

    if (experienceLevel === "all" && candidateCurrentRole && detectedSeniority === "Senior") {
      detectedSeniority = detectExperienceLevel(candidateCurrentRole);
    }

    // Only apply generic fallback skills if the candidate explicitly has a master resume
    // but no parseable skills were extracted.
    // If the candidate does NOT have a master resume, do NOT assume dummy skills.
    if (candidateSkills.length === 0 && hasMasterResume) {
      candidateSkills = ["TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "Kafka"];
    }

    // 2. Fetch active jobs from Supabase database within 90 days (3 months)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const buildBaseDbQuery = (withCount = false) => {
      let q = supabaseAdmin
        .from("jobs")
        .select("*", withCount ? { count: "exact" } : undefined)
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

    // Extract top core tech keywords from candidateSkills and current/last role to build a skill-targeted query
    const skillKeywords: string[] = [];
    if (candidateCurrentRole) {
      const roleDomain = detectRoleDomain(candidateCurrentRole);
      if (roleDomain === 'frontend' && !skillKeywords.includes('Frontend')) skillKeywords.push('Frontend');
      if (roleDomain === 'backend' && !skillKeywords.includes('Backend')) skillKeywords.push('Backend');
      if (roleDomain === 'devops_sre' && !skillKeywords.includes('DevOps')) skillKeywords.push('DevOps');
      if (roleDomain === 'data_ai' && !skillKeywords.includes('Data')) skillKeywords.push('Data');
      if (roleDomain === 'mobile' && !skillKeywords.includes('Mobile')) skillKeywords.push('Mobile');
      if (roleDomain === 'qa_sdet' && !skillKeywords.includes('QA')) skillKeywords.push('QA');
      if (roleDomain === 'product' && !skillKeywords.includes('Product')) skillKeywords.push('Product');
    }

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

    let totalCount = 0;

    if (locFilterWithRemote) {
      if (!skillOrFilter) {
        // Candidate has no resume or skill filter: Paginated location query with exact total count
        const { data, count, error } = await buildBaseDbQuery(true)
          .or(locFilterWithRemote)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) console.warn("Error querying location DB jobs:", error);
        rawDbJobs = data || [];
        totalCount = typeof count === "number" ? count : rawDbJobs.length;
      } else {
        // Candidate has resume skills: Skill-matched query with exact location count
        const [poolRes, countRes] = await Promise.all([
          buildBaseDbQuery(false)
            .or(locFilterWithRemote)
            .or(skillOrFilter)
            .order("created_at", { ascending: false })
            .range(from, to),
          buildBaseDbQuery(true)
            .or(locFilterWithRemote)
            .range(0, 0),
        ]);

        if (poolRes.error) console.warn("Error querying skill-targeted DB jobs pool:", poolRes.error);
        rawDbJobs = poolRes.data || [];
        totalCount = typeof countRes.count === "number" ? countRes.count : rawDbJobs.length;
      }
    } else {
      // General browsing without specific location preference
      if (!skillOrFilter) {
        const { data, count, error } = await buildBaseDbQuery(true)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) console.warn("Error querying general DB jobs:", error);
        rawDbJobs = data || [];
        totalCount = typeof count === "number" ? count : rawDbJobs.length;
      } else {
        const [poolRes, countRes] = await Promise.all([
          buildBaseDbQuery(false)
            .or(skillOrFilter)
            .order("created_at", { ascending: false })
            .range(from, to),
          buildBaseDbQuery(true)
            .range(0, 0),
        ]);

        if (poolRes.error) console.warn("Error querying skill general jobs pool:", poolRes.error);
        rawDbJobs = poolRes.data || [];
        totalCount = typeof countRes.count === "number" ? countRes.count : rawDbJobs.length;
      }
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
        candidateLocation,
        {
          currentRole: candidateCurrentRole,
          currentCompany: candidateCurrentCompany,
          isStillWorking: isCurrentlyWorking,
        }
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
      const filteredCurated = CURATED_TECH_JOBS.filter((cj) => {
        if (activeLocation && !isLocationMatch(cj.location, activeLocation, cj.workplaceType)) {
          return false;
        }
        return true;
      });
      totalCount = filteredCurated.length;

      const pagedCurated = filteredCurated.slice(from, to + 1);
      for (const cj of pagedCurated) {
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
          candidateLocation,
          {
            currentRole: candidateCurrentRole,
            currentCompany: candidateCurrentCompany,
            isStillWorking: isCurrentlyWorking,
          }
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

    // 10. Sort by Date or Relevance (Match Score & Role Alignment descending)
    freshCombined.sort((a, b) => {
      if (sortParam === "date") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.match_score || 0) - (a.match_score || 0);
      }

      // 1. Primary: Significant Match Score difference (>= 4%)
      const scoreDiff = (b.match_score || 0) - (a.match_score || 0);
      if (Math.abs(scoreDiff) >= 4) {
        return scoreDiff;
      }

      // 2. Title & Domain Role Relevance
      const computeTitleRelevance = (title: string, compName: string): number => {
        const t = (title || "").toLowerCase();
        let weight = 0;
        for (const kw of skillKeywords) {
          if (t.includes(kw.toLowerCase())) weight += 3;
        }

        if (candidateCurrentRole) {
          const candDomain = detectRoleDomain(candidateCurrentRole);
          const jobDomain = detectRoleDomain(title);
          if (candDomain !== 'general_tech' && jobDomain !== 'general_tech') {
            if (candDomain === jobDomain) {
              weight += 8;
            } else if (
              (candDomain === 'fullstack' && (jobDomain === 'frontend' || jobDomain === 'backend')) ||
              (jobDomain === 'fullstack' && (candDomain === 'frontend' || candDomain === 'backend')) ||
              (candDomain === 'backend' && (jobDomain === 'devops_sre' || jobDomain === 'data_ai')) ||
              (candDomain === 'devops_sre' && (jobDomain === 'security' || jobDomain === 'backend'))
            ) {
              weight += 4;
            } else {
              weight -= 8;
            }
          }
        } else {
          if (t.includes("front-end") || t.includes("frontend") || t.includes("ui")) {
            weight += 4;
          } else if (t.includes("fullstack") || t.includes("full-stack") || t.includes("full stack")) {
            weight += 2;
          }

          // Penalize mismatched titles for candidates with frontend/react background
          const isFrontendCandidate = skillKeywords.some((k) => {
            const lk = k.toLowerCase();
            return lk.includes("react") || lk.includes("front") || lk.includes("ui");
          });

          if (isFrontendCandidate) {
            if (
              t.includes(".net") ||
              (t.includes("java") && !t.includes("script")) ||
              t.includes("pega") ||
              t.includes("automation") ||
              t.includes("relationship manager")
            ) {
              weight -= 4;
            }
          }
        }

        if (candidateCurrentCompany && isSameCompany(compName, candidateCurrentCompany)) {
          weight += isCurrentlyWorking ? 5 : 3;
        }

        return weight;
      };

      const aWeight = computeTitleRelevance(a.title, a.company_name);
      const bWeight = computeTitleRelevance(b.title, b.company_name);
      if (bWeight !== aWeight) {
        return bWeight - aWeight;
      }

      // 3. Number of Matched Competencies
      const aMatchedCount = Array.isArray(a.matching_skills) ? a.matching_skills.length : 0;
      const bMatchedCount = Array.isArray(b.matching_skills) ? b.matching_skills.length : 0;
      if (bMatchedCount !== aMatchedCount) {
        return bMatchedCount - aMatchedCount;
      }

      // 4. Exact score difference if close
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      // 5. Location preference: Candidate home city over generic remote
      if (candidateLocation && candidateLocation.toLowerCase() !== "all") {
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

      // 6. Recency descending
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
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
      totalCount: Math.max(totalCount, finalJobs.length),
      page,
      limit,
      hasMore: totalCount > to + 1,
      sourceBreakdown: {
        database: totalCount,
        ats: 0,
        freehire: 0,
      },
      candidateProfile: {
        hasMasterResume,
        detectedSeniority,
        resolvedSkills: candidateSkills.slice(0, 10),
        resolvedLocation: candidateLocation,
        currentRole: candidateCurrentRole || null,
        currentCompany: candidateCurrentCompany || null,
        isStillWorking: isCurrentlyWorking,
      },
    });
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch jobs" }, { status: 500 });
  }
}
