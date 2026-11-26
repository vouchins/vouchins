import {
  ResumeDocument,
  ResumeEvaluation,
  ResumeSuggestion,
  ResumeEvaluationSchema,
  ResumeDocumentSchema,
  CandidateExtractedProfile,
  CandidateExtractedProfileSchema,
} from './types';
import {
  evaluateResumeHeuristically,
  parseRawTextToDocument,
  detectResumeDomain,
  ResumeDomain,
} from './xyz-evaluator';
import { detectExperienceLevel } from './ats-client';
import { recordAIUsage, checkAILlmRateLimit } from './cost-guard';

export interface AIEvaluationOptions {
  userId: string;
  rawText: string;
  existingDoc?: ResumeDocument;
  baselineScore?: number;
  previousSuggestions?: ResumeSuggestion[];
  forceHeuristic?: boolean;
}

/**
 * Dynamic System Prompt enforcing domain-appropriate XYZ formula and high-bar standards.
 */
function getDomainSystemPrompt(domain: ResumeDomain, targetRole: string): string {
  if (domain === 'healthcare') {
    return `
You are a Senior Healthcare & Clinical Hiring Bar Raiser (top hospital systems, academic medical centers, and FDA-regulated pharmaceutical leaders).
Evaluate the candidate's resume strictly against high-bar clinical practice, patient care, and regulatory standards.

Scoring Criteria:
1. Impact & Metrics (XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]"):
   - Heavily penalize passive/weak language ("worked on", "assisted", "responsible for").
   - Reward quantifiable patient care, clinical research, protocol adherence, and regulatory compliance metrics (e.g. adverse event reduction %, patient cohort size, audit compliance %, trial data records).
   - NEVER suggest tech/software engineering metrics (such as query latency, mobile app ratings, or production systems).
2. Domain & Competency Relevance:
   - Identify clinical, pharmaceutical, and regulatory expertise (FDA/GCP compliance, pharmacovigilance, clinical pharmacology, pharmacokinetics, medication therapy management, EHR/EMR, clinical trials).
3. Brevity & Readability:
   - ATS scan efficiency, bullet density (1-2 lines per bullet, strong clinical action verbs).

Provide targeted rewrite suggestions with exact roleIndex and bulletIndex coordinates.
You MUST output strictly valid JSON conforming to the requested schema.
`;
  }

  if (domain === 'data') {
    return `
You are a Principal Data Governance, Quality, and Analytics Hiring Bar Raiser (leading cloud data enterprises, financial institutions, and global consulting firms like EY, Amazon, Snowflake, Databricks).
Evaluate the candidate's resume strictly against high-bar enterprise data governance, data quality, data lineage, and metadata management standards.

Scoring Criteria:
1. Impact & Metrics (XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]"):
   - Heavily penalize passive/weak language ("worked on", "assisted", "responsible for").
   - Reward quantifiable data quality outcomes (% accuracy, % data discrepancy reduction, # critical data elements (CDEs) cataloged, data discovery speed %, query/ETL pipeline latency reduction %, audit compliance % across PII/GDPR).
   - NEVER suggest irrelevant web development metrics (such as React page performance or mobile app store ratings).
2. Domain & Competency Relevance:
   - Identify enterprise data tools and governance frameworks: Collibra (Data Quality, Data Catalog), Snowflake, Databricks, Data Lineage, Metadata Management, PII Classification, Data Profiling, DQIM, SQL, Power BI, ETL pipelines.
3. Brevity & Readability:
   - ATS scan efficiency, bullet density (1-2 lines per bullet, strong data leadership verbs like architected, cataloged, profiled, remediated, enforced, automated).

Provide targeted rewrite suggestions with exact roleIndex and bulletIndex coordinates.
You MUST output strictly valid JSON conforming to the requested schema.
`;
  }

  if (domain === 'business') {
    return `
You are an Executive Hiring Director and Talent Bar Raiser at leading global enterprises.
Evaluate the candidate's resume strictly against high-bar professional and business standards.

Scoring Criteria:
1. Impact & Metrics (XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]"):
   - Heavily penalize passive language.
   - Reward quantifiable business outcomes (% revenue increase, cost savings $, turnaround time reduction, operational throughput).
2. Domain Relevance:
   - Industry-specific tools, methodologies, and business competencies.
3. Brevity & Readability:
   - ATS scan efficiency, concise bullets, strong action verbs.

Provide targeted rewrite suggestions with exact roleIndex and bulletIndex coordinates.
You MUST output strictly valid JSON conforming to the requested schema.
`;
  }

  return `
You are a Principal Staff Engineer and Technical Bar Raiser at top-tier companies (Google, Meta, Uber, Amazon, Salesforce).
Evaluate the candidate's resume strictly against high-bar engineering hiring standards.

Scoring Criteria:
1. Impact & Metrics (Google XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]"):
   - Heavily penalize passive/weak language ("worked on", "assisted", "responsible for").
   - Reward quantifiable metrics (% latency reduction, RPS throughput, dollar revenue, cluster scale, user counts).
2. Tech Stack Relevance:
   - Identify modern engineering tools (TypeScript, Next.js, Go/Python, PostgreSQL, Redis, Kafka, Docker/Kubernetes, Microservices, System Observability).
3. Brevity & Readability:
   - ATS scan efficiency, bullet density (1-2 lines per bullet, strong action verbs).

Provide targeted rewrite suggestions with exact roleIndex and bulletIndex coordinates.
You MUST output strictly valid JSON conforming to the requested schema.
`;
}

const GEMINI_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,   // 1. Your .env choice ('gemini-3.5-flash-lite')
      'gemini-flash-lite-latest', // 2. Auto-updating Lite pointer
      'gemini-3.1-flash-lite',    // 3. Separate low-cost Lite pool (supported May 2027+)
      'gemini-3.8-flash',         // 4. Higher-intelligence Flash backup (supported Sept 2027+)
      'gemini-4-hydrogen',
    ].filter(Boolean) as string[]
  )
);

/**
 * Derives a structured CandidateExtractedProfile deterministically from a ResumeDocument
 * as a fallback when Gemini AI is unavailable.
 */
export function deriveCandidateProfileFromDoc(doc: ResumeDocument): CandidateExtractedProfile {
  const firstRole = doc.experience?.[0];
  const allSkills = Array.from(
    new Set((doc.skills || []).flatMap((s) => s.items || []).filter(Boolean))
  );
  const highestEdu = doc.education?.[0];
  const fieldsOfStudy = Array.from(
    new Set((doc.education || []).map((e) => e.fieldOfStudy || e.degree || '').filter(Boolean))
  );

  const years: number[] = [];
  const currentYear = new Date().getFullYear();
  (doc.experience || []).forEach((exp) => {
    const sm = exp.startDate?.match(/\b(19\d{2}|20\d{2})\b/);
    if (sm) years.push(parseInt(sm[1], 10));
    if (exp.isCurrent || /present|current/i.test(exp.endDate || '')) {
      years.push(currentYear);
    } else {
      const em = exp.endDate?.match(/\b(19\d{2}|20\d{2})\b/);
      if (em) years.push(parseInt(em[1], 10));
    }
  });
  const totalYearsExperience =
    years.length >= 2 ? Math.max(0, Math.max(...years) - Math.min(...years)) : 0;

  return {
    fullName: doc.contact?.fullName || '',
    location: doc.contact?.location || '',
    currentJobTitle: firstRole?.roleTitle || '',
    currentCompany: firstRole?.company || '',
    totalYearsExperience,
    seniorityLevel: detectExperienceLevel(firstRole?.roleTitle || ''),
    workTypePreference: 'Any',
    skills: allSkills.slice(0, 30),
    toolsAndPlatforms: allSkills.slice(0, 20),
    highestEducationLevel: highestEdu?.degree || '',
    fieldsOfStudy,
    certifications: doc.certifications || [],
  };
}

/**
 * AI-first extraction of both canonical ResumeDocument and CandidateExtractedProfile.
 * Uses Gemini Flash-Lite with deterministic heuristic fallback.
 */
export async function extractResumeAndProfileWithAI(
  rawText: string,
  userId: string
): Promise<{
  document: ResumeDocument;
  extractedProfile: CandidateExtractedProfile;
  provider: 'gemini' | 'heuristic';
}> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const extractionPrompt = `You are a high-precision ATS & Resume Extractor.
CRITICAL RULES:
1. Extract ONLY information directly present in the raw resume text. DO NOT HALLUCINATE OR FABRICATE ANY DATA.
2. Separate wrapped bullet continuations cleanly so a wrapped line never becomes a job title or company name.
3. For each experience entry where "Company  Date - Date" is on one line and the Role Title is on the next line, assign the exact Role Title to "roleTitle" and Company to "company".
4. Ignore standalone inline sub-headings inside experience (like "AI and Automation:") instead of merging them into bullets.
5. Return strictly valid JSON with TWO top-level keys: "document" and "extractedProfile":
{
  "document": {
    "contact": {
      "fullName": "Candidate Full Name",
      "email": "candidate@email.com",
      "phone": "+1 ...",
      "location": "City, State/Country",
      "linkedinUrl": "https://linkedin.com/in/...",
      "githubUrl": "https://github.com/...",
      "portfolioUrl": ""
    },
    "summary": "Full professional summary",
    "skills": [
      { "category": "Category Name", "items": ["Skill 1", "Skill 2"] }
    ],
    "experience": [
      {
        "id": "exp-1",
        "company": "Exact Company Name",
        "roleTitle": "Exact Job Title",
        "location": "Job Location if listed",
        "startDate": "MMM YYYY or YYYY",
        "endDate": "Present or MMM YYYY",
        "isCurrent": true,
        "bullets": ["Complete bullet 1", "Complete bullet 2"]
      }
    ],
    "education": [
      {
        "id": "edu-1",
        "institution": "University / College",
        "degree": "Degree Name",
        "fieldOfStudy": "Field if stated",
        "startDate": "YYYY",
        "endDate": "YYYY",
        "gpaOrHonors": "Distinction / GPA if stated"
      }
    ],
    "projects": [
      {
        "id": "proj-1",
        "title": "Project or Award Title",
        "techStack": ["Tech1"],
        "bullets": ["Detail 1"]
      }
    ],
    "certifications": ["Cert 1"]
  },
  "extractedProfile": {
    "fullName": "Candidate Full Name",
    "location": "City, State/Country",
    "currentJobTitle": "Most recent job title",
    "currentCompany": "Most recent company",
    "totalYearsExperience": 5,
    "seniorityLevel": "Entry" | "Mid" | "Senior" | "Staff" | "Lead" | "Principal",
    "workTypePreference": "Remote" | "Hybrid" | "Onsite" | "Any",
    "skills": ["All technical & domain skills"],
    "toolsAndPlatforms": ["Specific tools, clouds, databases, frameworks"],
    "highestEducationLevel": "e.g. Master of Computer Application (MCA) or B.Tech",
    "fieldsOfStudy": ["e.g. Computer Applications", "Data Governance"],
    "certifications": ["Cert 1"]
  }
}

RAW RESUME TEXT:
${rawText.slice(0, 14000)}
`;

    for (const model of GEMINI_MODELS.slice(0, 2)) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: extractionPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (response.status === 429 || response.status >= 500) {
          break;
        }
        if (response.ok) {
          const json = await response.json();
          let content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(content);
            const rawDoc = parsed.document || parsed;
            const validatedDoc = ResumeDocumentSchema.safeParse(rawDoc);

            if (validatedDoc.success) {
              const data = validatedDoc.data;
              const hasSubstantiveContent =
                (data.experience && data.experience.length > 0) ||
                (data.education && data.education.length > 0) ||
                (data.skills && data.skills.length > 0);

              if (hasSubstantiveContent) {
                const validatedProfile = CandidateExtractedProfileSchema.safeParse(
                  parsed.extractedProfile || {}
                );
                const extractedProfile = validatedProfile.success
                  ? validatedProfile.data
                  : deriveCandidateProfileFromDoc(data);

                await recordAIUsage({
                  userId,
                  action: 'extract',
                  provider: 'gemini',
                  model,
                  inputChars: rawText.length,
                });

                return {
                  document: data,
                  extractedProfile,
                  provider: 'gemini',
                };
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[AI Client] AI resume extraction failed for ${model}:`, err?.message || err);
      }
    }
  }

  const fallbackDoc = parseRawTextToDocument(rawText);
  await recordAIUsage({
    userId,
    action: 'extract',
    provider: 'heuristic',
    inputChars: rawText.length,
  });
  return {
    document: fallbackDoc,
    extractedProfile: deriveCandidateProfileFromDoc(fallbackDoc),
    provider: 'heuristic',
  };
}

/**
 * Gemini-First 1-step multimodal PDF parser: extracts rawText, ResumeDocument,
 * and CandidateExtractedProfile directly from the PDF buffer in a single call.
 * Returns null if Gemini is unavailable or rate-limited so caller can fall back
 * to local PDF text extraction + extractResumeAndProfileWithAI.
 */
export async function extractResumeFromPdfBufferWithAI(
  pdfBuffer: Buffer,
  userId: string
): Promise<{
  rawText: string;
  document: ResumeDocument;
  extractedProfile: CandidateExtractedProfile;
  provider: 'gemini';
} | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || pdfBuffer.length === 0 || pdfBuffer.length > 4.5 * 1024 * 1024) {
    return null;
  }

  const prompt = `You are an expert ATS Resume Parser.
Read the attached PDF resume visually and structurally (handling multi-column layouts, tables, or scanned text accurately).
Return ONLY valid JSON matching this exact structure:
{
  "rawText": "Full readable plain text of the resume preserving reading order, headings, dates, and bullets",
  "document": {
    "contact": {
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "location": "string",
      "linkedinUrl": "string",
      "githubUrl": "string",
      "portfolioUrl": "string"
    },
    "summary": "string",
    "skills": [{ "category": "string", "items": ["string"] }],
    "experience": [{
      "id": "exp-1",
      "company": "string",
      "roleTitle": "string",
      "startDate": "string",
      "endDate": "string",
      "isCurrent": boolean,
      "location": "string",
      "bullets": ["string"]
    }],
    "education": [{
      "id": "edu-1",
      "institution": "string",
      "degree": "string",
      "fieldOfStudy": "string",
      "startDate": "string",
      "endDate": "string"
    }],
    "projects": [{
      "id": "proj-1",
      "title": "string",
      "techStack": ["string"],
      "bullets": ["string"]
    }],
    "certifications": ["string"]
  },
  "extractedProfile": {
    "fullName": "string",
    "location": "string",
    "currentJobTitle": "string",
    "currentCompany": "string",
    "totalYearsExperience": number,
    "seniorityLevel": "Entry" | "Mid" | "Senior" | "Staff" | "Lead" | "Principal",
    "workTypePreference": "Remote" | "Hybrid" | "Onsite" | "Any",
    "skills": ["string"],
    "toolsAndPlatforms": ["string"],
    "highestEducationLevel": "string",
    "fieldsOfStudy": ["string"],
    "certifications": ["string"]
  }
}`;

  const base64Pdf = pdfBuffer.toString('base64');
  const fastPdfModels = GEMINI_MODELS.slice(0, 2);

  for (const model of fastPdfModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64Pdf,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (response.status === 429 || response.status >= 500) {
        break; // Immediately fall back to fast local parser instead of compounding latency
      }
      if (!response.ok) continue;

      const json = await response.json();
      let content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(content);
      const rawDoc = parsed.document || parsed;
      const validatedDoc = ResumeDocumentSchema.safeParse(rawDoc);
      if (!validatedDoc.success) continue;

      const data = validatedDoc.data;
      const hasSubstantiveContent =
        (data.experience && data.experience.length > 0) ||
        (data.education && data.education.length > 0) ||
        (data.skills && data.skills.length > 0);
      if (!hasSubstantiveContent) continue;

      const validatedProfile = CandidateExtractedProfileSchema.safeParse(
        parsed.extractedProfile || {}
      );
      const extractedProfile = validatedProfile.success
        ? validatedProfile.data
        : deriveCandidateProfileFromDoc(data);

      const rawText =
        typeof parsed.rawText === 'string' && parsed.rawText.trim().length >= 50
          ? parsed.rawText.trim()
          : [
            data.contact.fullName,
            data.summary,
            ...(data.experience || []).flatMap((e) => [e.roleTitle, e.company, ...(e.bullets || [])]),
            ...(data.skills || []).flatMap((s) => s.items || []),
          ]
            .filter(Boolean)
            .join('\n');

      await recordAIUsage({
        userId,
        action: 'extract',
        provider: 'gemini',
        model,
        inputChars: rawText.length,
      });

      return {
        rawText,
        document: data,
        extractedProfile,
        provider: 'gemini',
      };
    } catch (err: any) {
      console.warn(`[AI Client] Gemini PDF extraction failed for ${model}:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Parses raw extracted resume text into a canonical ResumeDocument schema.
 */
export async function extractStructuredResume(
  rawText: string,
  userId: string
): Promise<ResumeDocument> {
  const result = await extractResumeAndProfileWithAI(rawText, userId);
  return result.document;
}

/**
 * Runs evaluation against Google XYZ benchmarks and top-tier tech bar using the AI model alone.
 */
export async function evaluateResumeAI(options: AIEvaluationOptions): Promise<{
  doc: ResumeDocument;
  evaluation: ResumeEvaluation;
  provider: 'gemini';
}> {
  const { userId, rawText } = options;
  const doc = options.existingDoc || (await extractStructuredResume(rawText, userId));
  const heuristic = evaluateResumeHeuristically(doc, rawText);
  const baselineScore = Math.max(options.baselineScore || 0, heuristic.overallScore);
  const docBullets = new Set((doc.experience || []).flatMap((e) => e.bullets || []));

  // Helper to merge previously applied suggestions and anchor scores deterministically
  const finalizeEvaluation = (baseEval: ResumeEvaluation): ResumeEvaluation => {
    // The overall score and pillar scores are anchored strictly to the deterministic mathematical evaluation.
    // This eliminates LLM temperature jitter and guarantees that identical resume text always produces the exact same score.
    const calibratedOverallScore = heuristic.overallScore;

    const calibratedPillarScores = {
      impact: heuristic.pillarScores.impact,
      relevance: heuristic.pillarScores.relevance,
      brevity: heuristic.pillarScores.brevity,
    };

    // Preserve previously applied suggestions whose rewrites are present in the document
    const previouslyApplied = (options.previousSuggestions || [])
      .filter((s) => s.applied || docBullets.has(s.suggestedRewrite))
      .map((s) => ({ ...s, applied: true }));

    const appliedRewrites = new Set(previouslyApplied.map((s) => s.suggestedRewrite));
    const appliedOriginals = new Set(previouslyApplied.map((s) => s.originalText));

    // New suggestions: keep any that don't overwrite applied rewrites
    const newSuggestions = (baseEval.suggestions || []).filter((s) => {
      if (
        appliedRewrites.has(s.originalText) ||
        appliedRewrites.has(s.suggestedRewrite) ||
        appliedOriginals.has(s.originalText)
      ) {
        return false;
      }
      return docBullets.has(s.originalText);
    });

    const mergedSuggestions = [...previouslyApplied, ...newSuggestions];

    // Supplement with heuristic suggestions if Gemini missed any improvable bullets
    const coveredCoordinates = new Set(
      mergedSuggestions.map((s) => `${s.roleIndex}-${s.bulletIndex}`)
    );

    (heuristic.suggestions || []).forEach((hs) => {
      const coord = `${hs.roleIndex}-${hs.bulletIndex}`;
      if (!coveredCoordinates.has(coord) && docBullets.has(hs.originalText)) {
        mergedSuggestions.push(hs);
        coveredCoordinates.add(coord);
      }
    });

    return {
      ...baseEval,
      overallScore: calibratedOverallScore,
      pillarScores: calibratedPillarScores,
      strengths: baseEval.strengths?.length ? baseEval.strengths : heuristic.strengths,
      suggestions: mergedSuggestions.length > 0 ? mergedSuggestions : heuristic.suggestions,
      detectedSeniority: heuristic.detectedSeniority || baseEval.detectedSeniority,
      targetRole: (doc.experience?.[0]?.roleTitle ? heuristic.targetRole : (baseEval.targetRole || heuristic.targetRole)),
      missingKeywords: baseEval.missingKeywords?.length ? baseEval.missingKeywords : heuristic.missingKeywords,
      jobMatchVectors: baseEval.jobMatchVectors || heuristic.jobMatchVectors,
    };
  };

  if (options.forceHeuristic) {
    return {
      doc,
      evaluation: finalizeEvaluation(heuristic),
      provider: 'gemini',
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return {
      doc,
      evaluation: finalizeEvaluation(heuristic),
      provider: 'gemini',
    };
  }

  // Enforce 1-time AI model rate limiter (Pro users have unlimited access)
  const rateLimit = await checkAILlmRateLimit(userId, 'evaluate');
  if (!rateLimit.allowed) {
    const error: any = new Error(
      rateLimit.reason || "You've used your 1 free AI resume analysis. Upgrade to Jobs Pro for unlimited AI suggestions."
    );
    error.code = 'PRO_PLAN_REQUIRED';
    throw error;
  }

  const isReanalysis = Boolean(options.existingDoc || options.baselineScore);
  const reanalysisPromptAddition = isReanalysis
    ? `
CRITICAL INSTRUCTIONS FOR RE-ANALYZING THIS RESUME:
- The candidate has already applied suggestions and revisions to this resume.
- The current verified ATS readiness score is ${baselineScore}/100 (Impact: ${heuristic.pillarScores.impact}/100, Relevance: ${heuristic.pillarScores.relevance}/100, Brevity: ${heuristic.pillarScores.brevity}/100).
- Your evaluation MUST evaluate this CURRENT version to find remaining, higher-order optimizations to push this score even higher (from ${baselineScore} towards 95-100).
- Under NO circumstances should the overallScore or pillar scores be downgraded below ${baselineScore}. The overallScore MUST be >= ${baselineScore}.
- Do NOT suggest changes for bullet points that already have strong Google XYZ quantifiable metrics. Provide suggestions ONLY for remaining un-optimized bullets or high-bar stack enhancements.
`
    : '';

  const domain = detectResumeDomain(rawText, doc);
  const systemPrompt = getDomainSystemPrompt(domain, heuristic.targetRole);
  const targetCompanies = domain === 'healthcare'
    ? 'Top Healthcare Systems, Clinical Research Organizations, and Pharmaceutical Leaders'
    : domain === 'data'
      ? 'Top Enterprise Data Organizations (Snowflake, Databricks, Amazon, EY, Big 4)'
      : domain === 'business'
        ? 'Top Global Enterprise & Consulting Organizations'
        : 'Google, Meta, Amazon, Uber, Salesforce';

  const prompt = `
Evaluate this structured resume JSON.
Target companies / employers: ${targetCompanies}.
Domain context: ${domain.toUpperCase()}.
Candidate target role: ${heuristic.targetRole}.
Candidate career stage: ${heuristic.detectedSeniority}.
Scoring requirements:
- overallScore (0-100)
- pillarScores: { impact (0-100), relevance (0-100), brevity (0-100) }
- detectedSeniority (string, accurately reflecting candidate career stage for their profession, e.g. "${heuristic.detectedSeniority}")
- targetRole (string, strictly derived from candidate's latest work title or target focus: "${heuristic.targetRole}")
- strengths (array of strings)
- missingKeywords (array of strings)
- suggestions (array of { id, roleIndex, bulletIndex, pillar: 'impact'|'relevance'|'brevity', severity: 'critical'|'recommended'|'optional', originalText, suggestedRewrite, rationale, applied: false })
- jobMatchVectors: { detectedRole, seniority, primarySkills, secondarySkills, estimatedYearsExperience, targetCompanyTier, preferredLocations }

CRITICAL SUGGESTION AUDIT RULES:
- Perform a comprehensive, complete audit of ALL experience roles and bullet points in this single pass.
- Do NOT stop at 2 or 3 suggestions. Evaluate every single bullet point across all roles.
- For EVERY bullet point that lacks measurable metrics, uses passive phrasing, or can be improved with the Google XYZ formula ("Accomplished [X], measured by [Y], by doing [Z]"), provide a high-impact rewrite with exact roleIndex, bulletIndex, and originalText.
${domain === 'healthcare' ? '- For healthcare/pharma, focus on clinical outcomes, patient safety, therapy adherence, protocol compliance, or adverse event reduction. NEVER generate software tech metrics like latency, mobile app ratings, or database queries.' : domain === 'data' ? '- For data governance/quality, focus on data accuracy, critical data element (CDE) coverage, discrepancy remediation, lineage mapping, and PII/GDPR audit compliance. NEVER suggest frontend or web development metrics.' : ''}
- Aim to provide all actionable rewrite suggestions (typically 6-12 suggestions across all roles) at once, so the candidate can elevate their resume and boost their ATS score in one single pass without multiple re-analyses.

${reanalysisPromptAddition}

Resume JSON:
${JSON.stringify(doc)}
`;

  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const json = await response.json();
        let content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (content) {
          content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
          const parsed = JSON.parse(content);
          const validated = ResumeEvaluationSchema.safeParse(parsed);
          if (validated.success) {
            await recordAIUsage({
              userId,
              action: 'evaluate',
              provider: 'gemini',
              model,
              inputChars: rawText.length,
            });

            return { doc, evaluation: finalizeEvaluation(validated.data), provider: 'gemini' };
          }
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `Gemini API returned status ${response.status}`);
        console.warn(`[AI Client] Gemini evaluation call returned status ${response.status} with model ${model}. Trying next fallback model...`);
      }
    } catch (geminiErr: any) {
      lastError = geminiErr;
      console.warn(`[AI Client] Gemini evaluation call failed or timed out with model ${model}:`, geminiErr?.message || geminiErr, '. Trying next fallback model...');
    }
  }

  // Graceful fallback: If all Gemini models were unavailable or timed out, fall back to high-fidelity calibrated heuristic evaluation
  if (doc) {
    console.warn('[AI Client] All Gemini models failed or timed out. Falling back to calibrated Google XYZ heuristic evaluation.');
    return {
      doc,
      evaluation: finalizeEvaluation(heuristic),
      provider: 'gemini',
    };
  }

  throw new Error(lastError?.message || 'AI model was unable to generate suggestions. Please try again.');
}
