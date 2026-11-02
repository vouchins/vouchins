import {
  ResumeDocument,
  ResumeEvaluation,
  ResumeEvaluationSchema,
  ResumeDocumentSchema,
} from './types';
import {
  evaluateResumeHeuristically,
  parseRawTextToDocument,
} from './xyz-evaluator';
import { recordAIUsage, checkAILlmRateLimit } from './cost-guard';

export interface AIEvaluationOptions {
  userId: string;
  rawText: string;
  existingDoc?: ResumeDocument;
  forceHeuristic?: boolean;
}

/**
 * Top-Tier Tech System Prompt enforcing Google's XYZ formula and high-bar standards.
 */
const SYSTEM_PROMPT = `
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

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest',
].filter(Boolean) as string[];

/**
 * Parses raw extracted resume text into a canonical ResumeDocument schema.
 */
export async function extractStructuredResume(
  rawText: string,
  userId: string
): Promise<ResumeDocument> {
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
              await recordAIUsage({
                userId,
                action: 'extract',
                provider: 'gemini',
                model,
                inputChars: rawText.length,
              });
              return validated.data;
            }
          }
        }
      } catch (err) {
        console.warn(`[AI Client] Gemini structured extraction failed with model ${model}:`, err);
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

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('AI evaluation service is unavailable. GEMINI_API_KEY is not configured.');
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

  const prompt = `
Evaluate this structured resume JSON.
Target companies: Google, Meta, Amazon, Uber, Salesforce.
Scoring requirements:
- overallScore (0-100)
- pillarScores: { impact (0-100), relevance (0-100), brevity (0-100) }
- detectedSeniority (string, e.g. "Staff Software Engineer (L6)", "Senior Software Engineer (L5)")
- targetRole (string)
- strengths (array of strings)
- missingKeywords (array of strings)
- suggestions (array of { id, roleIndex, bulletIndex, pillar: 'impact'|'relevance'|'brevity', severity: 'critical'|'recommended'|'optional', originalText, suggestedRewrite, rationale, applied: false })
- jobMatchVectors: { detectedRole, seniority, primarySkills, secondarySkills, estimatedYearsExperience, targetCompanyTier, preferredLocations }

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
            contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
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
            return { doc, evaluation: validated.data, provider: 'gemini' };
          }
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `Gemini API returned status ${response.status}`);
      }
    } catch (geminiErr: any) {
      lastError = geminiErr;
      console.warn(`[AI Client] Gemini evaluation call failed with model ${model}:`, geminiErr);
    }
  }

  throw new Error(lastError?.message || 'AI model was unable to generate suggestions. Please try again.');
}
