import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyJobsAccess } from "@/lib/jobs/auth-guard";
import {
  evaluateJobMatch,
  detectExperienceLevel,
  detectWorkMode,
  COMMON_TECH_TAXONOMY,
  containsSkill,
  isValidGeographicLocation,
} from "@/lib/jobs/ats-client";
import { getCuratedInsiders } from "@/lib/jobs/corporate-insiders";
import { cleanJobApplyUrl } from "@/lib/jobs/url-cleaner";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const { data: job, error: dbError } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (dbError) {
      console.error("Error fetching job by ID:", dbError);
      return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let candidateSkills: string[] = [];
    let detectedSeniority = "Senior";
    let candidateLocation = "";
    let candidateCurrentRole = "";
    let candidateCurrentCompany = "";
    let isCurrentlyWorking = false;
    let hasMasterResume = false;

    try {
      const authCheck = await verifyJobsAccess(request);
      if (authCheck.allowed && authCheck.userId) {
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("city, company:companies(name)")
          .eq("id", authCheck.userId)
          .maybeSingle();

        if (userData?.city?.trim() && isValidGeographicLocation(userData.city)) {
          candidateLocation = userData.city.trim();
        }
        const registeredCompany = (userData as any)?.company?.name?.trim() || "";
        if (registeredCompany) {
          candidateCurrentCompany = registeredCompany;
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

          if (!candidateLocation && docSchema.contact?.location?.trim() && isValidGeographicLocation(docSchema.contact.location)) {
            candidateLocation = docSchema.contact.location.trim();
          }

          if (Array.isArray(docSchema.experience) && docSchema.experience.length > 0) {
            const currentExp = docSchema.experience.find(
              (e: any) => e.isCurrent === true || /\b(present|current)\b/i.test(e.endDate || "")
            );
            if (currentExp && currentExp.roleTitle?.trim()) {
              candidateCurrentRole = currentExp.roleTitle.trim();
              if (!candidateCurrentCompany && currentExp.company?.trim()) {
                candidateCurrentCompany = currentExp.company.trim();
              }
              isCurrentlyWorking = true;
            } else if (docSchema.experience[0]?.roleTitle?.trim()) {
              candidateCurrentRole = docSchema.experience[0].roleTitle.trim();
              if (!candidateCurrentCompany && docSchema.experience[0].company?.trim()) {
                candidateCurrentCompany = docSchema.experience[0].company.trim();
              }
            }
          }

          if (Array.isArray(docSchema.skills)) {
            candidateSkills = docSchema.skills.flatMap((c: any) => c.items || []).slice(0, 30);
          }
          if (Array.isArray(docSchema.projects)) {
            const projectTech = docSchema.projects.flatMap((p: any) => p.techStack || []);
            candidateSkills = Array.from(new Set([...candidateSkills, ...projectTech])).slice(0, 30);
          }
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

          const roleForSeniority = candidateCurrentRole || docSchema.experience?.[0]?.roleTitle;
          if (roleForSeniority) {
            detectedSeniority = detectExperienceLevel(roleForSeniority);
          }
        }
      }
    } catch (authErr) {
      console.warn("Job detail auth resolution note:", authErr);
    }

    const workplaceType = detectWorkMode(job.location || "");
    const matchEvaluation = evaluateJobMatch(
      {
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        experienceLevel: job.experience_level || detectExperienceLevel(job.title),
        workplaceType,
        location: job.location,
        companyName: job.company_name,
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

    let insiderCount = 0;
    try {
      const { data: companiesData } = await supabaseAdmin
        .from("companies")
        .select("id, name");

      if (companiesData) {
        const lowerComp = (job.company_name || "").toLowerCase();
        const matched = companiesData.filter((c) => {
          const n = c.name.toLowerCase();
          return lowerComp.includes(n) || n.includes(lowerComp);
        });
        if (matched.length > 0) {
          const { count } = await supabaseAdmin
            .from("users")
            .select("id", { count: "exact", head: true })
            .in("company_id", matched.map((c) => c.id))
            .eq("is_verified", true);
          insiderCount = count || 0;
        }
      }
    } catch {
      // Fallback to curated
    }

    if (insiderCount === 0) {
      const curated = getCuratedInsiders(job.company_name || "");
      if (curated && curated.length > 0) {
        insiderCount = curated.length;
      }
    }

    return NextResponse.json({
      success: true,
      hasMasterResume,
      job: {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        company_logo: job.company_logo || "",
        location: job.location,
        workplace_type: workplaceType,
        job_type: job.job_type || "Full-time",
        experience_level: job.experience_level || detectExperienceLevel(job.title),
        category: job.category || "Engineering",
        salary_range: job.salary_range || "",
        description: job.description || "",
        requirements: job.requirements || "",
        external_apply_url: cleanJobApplyUrl(job.external_apply_url),
        is_internal: Boolean(job.is_internal || job.recruiter_id),
        recruiter_id: job.recruiter_id || null,
        match_score: matchEvaluation.matchScore,
        match_breakdown: matchEvaluation.matchBreakdown,
        why_you_match: matchEvaluation.whyYouMatch,
        matching_skills: matchEvaluation.matchingSkills,
        missing_skills: matchEvaluation.missingSkills,
        insider_count: insiderCount,
        created_at: job.created_at,
      },
    });
  } catch (error: any) {
    console.error("GET /api/jobs/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch job details" },
      { status: 500 }
    );
  }
}
