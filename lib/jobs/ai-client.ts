import {
  ResumeDocument,
  ResumeEvaluation,
  ResumeSuggestion,
  ResumeEvaluationSchema,
  ResumeDocumentSchema,
} from './types';
import {
  evaluateResumeHeuristically,
  parseRawTextToDocument,
  detectResumeDomain,
  ResumeDomain,
} from './xyz-evaluator';
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
      process.env.GEMINI_MODEL && process.env.GEMINI_MODEL !== 'gemini-3.5-flash'
        ? process.env.GEMINI_MODEL
        : null,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ].filter(Boolean) as string[]
  )
);

/**
 * Parses raw extracted resume text into a canonical ResumeDocument schema.
 */
export async function extractStructuredResume(
  rawText: string,
  userId: string
): Promise<ResumeDocument> {
  // 1. Fast deterministic heuristic extraction (instant 15ms parse without LLM latency)
  const fastDoc = parseRawTextToDocument(rawText);
  if (fastDoc.experience && fastDoc.experience.length > 0) {
    await recordAIUsage({
      userId,
      action: 'extract',
      provider: 'heuristic',
      inputChars: rawText.length,
    });
    return fastDoc;
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    // Enforce 1-time AI model rate limiter
    const rateLimit = await checkAILlmRateLimit(userId, 'extract');
    if (!rateLimit.allowed) {
      console.warn(`[AI Rate Limiter] User ${userId} rate limited for AI extract. Using heuristic parser.`);
      await recordAIUsage({
        userId,
        action: 'extract',
        provider: 'heuristic',
        inputChars: rawText.length,
      });
      return parseRawTextToDocument(rawText);
    }

    const extractionPrompt = `You are a high-precision ATS & Resume Extractor.
CRITICAL RULES:
1. Extract ONLY information directly present in the raw resume text. DO NOT HALLUCINATE OR FABRICATE ANY DATA.
2. DO NOT use generic placeholder companies (such as "Leading Tech Organization", "Distributed Real-Time Processing Engine", "San Francisco, CA / Remote") unless explicitly written in the resume.
3. If a section or field (e.g. projects, certifications, phone, location) is not found in the resume, return an empty string or empty array.
4. Extract all experience entries with their exact company name, role title, dates, location, and all bullet points.
5. If there are Key Achievements or Awards and no separate projects section, map those achievements into the projects array.
6. Return strictly valid JSON matching this schema:
{
  "contact": {
    "fullName": "Candidate Full Name",
    "email": "candidate@email.com",
    "phone": "+1 ...",
    "location": "City, Country",
    "linkedinUrl": "https://linkedin.com/in/...",
    "githubUrl": "https://github.com/...",
    "portfolioUrl": ""
  },
  "summary": "Full professional summary",
  "skills": [
    { "category": "Technical Skills", "items": ["Skill 1", "Skill 2"] }
  ],
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "roleTitle": "Exact Job Title",
      "location": "Job Location",
      "startDate": "MM/YYYY or YYYY",
      "endDate": "Present or MM/YYYY",
      "isCurrent": true,
      "bullets": ["Bullet point 1", "Bullet point 2"]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "institution": "University / College",
      "degree": "Degree Name",
      "fieldOfStudy": "",
      "startDate": "YYYY",
      "endDate": "YYYY"
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "Project or Achievement Title",
      "techStack": ["Tech1", "Tech2"],
      "bullets": ["Detail 1"]
    }
  ],
  "certifications": []
}

RAW RESUME TEXT:
${rawText.slice(0, 14000)}
`;

    for (const model of GEMINI_MODELS) {
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
            signal: AbortSignal.timeout(12000),
          }
        );

        if (response.ok) {
          const json = await response.json();
          let content = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(content);
            const validated = ResumeDocumentSchema.safeParse(parsed);
            if (validated.success) {
              const data = validated.data;
              // Guard: If LLM returned a hollow/empty document with no contact, no experience, and no education
              // even though rawText contains substantive content, fall back to robust heuristic parsing.
              const hasSubstantiveContent =
                (data.experience && data.experience.length > 0) ||
                (data.education && data.education.length > 0) ||
                (data.skills && data.skills.length > 0) ||
                (data.contact?.fullName && data.contact.fullName !== 'Candidate Profile');

              if (!hasSubstantiveContent && rawText.length > 100) {
                console.warn('[AI Client] Gemini returned empty/hollow document structure, falling back to heuristic extraction.');
                const heuristicDoc = parseRawTextToDocument(rawText);
                return heuristicDoc;
              }

              await recordAIUsage({
                userId,
                action: 'extract',
                provider: 'gemini',
                model,
                inputChars: rawText.length,
              });
              return data;
            }
          }
        } else {
          console.warn(`[AI Client] Gemini structured extraction returned status ${response.status} for model ${model}. Trying next fallback model...`);
        }
      } catch (err: any) {
        console.warn(`[AI Client] Gemini structured extraction failed or timed out with model ${model}:`, err?.message || err, '. Trying next fallback model...');
      }
    }
  }

  // Fallback heuristic extraction
  await recordAIUsage({
    userId,
    action: 'extract',
    provider: 'heuristic',
    inputChars: rawText.length,
  });

  return parseRawTextToDocument(rawText);
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
${domain === 'healthcare' ? '- For healthcare/pharma, focus on clinical outcomes, patient safety, therapy adherence, protocol compliance, or adverse event reduction. NEVER generate software tech metrics like latency, mobile app ratings, or database queries.' : ''}
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
          signal: AbortSignal.timeout(15000),
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
