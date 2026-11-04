import { z } from 'zod';

// ============================================================================
// 1. Resume Document Canonical Schemas
// ============================================================================

export const ContactInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  linkedinUrl: z.string().optional().default(''),
  githubUrl: z.string().optional().default(''),
  portfolioUrl: z.string().optional().default(''),
});

export const WorkExperienceItemSchema = z.object({
  id: z.string(),
  company: z.string().min(1, 'Company name is required'),
  roleTitle: z.string().min(1, 'Role title is required'),
  location: z.string().optional(),
  startDate: z.string().default(''),
  endDate: z.string().default('Present'),
  isCurrent: z.boolean().default(false),
  bullets: z.array(z.string()).min(1, 'At least one bullet point is required'),
});

export const EducationItemSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().default(''),
  gpaOrHonors: z.string().optional(),
});

export const SkillCategorySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const ProjectItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Project title is required'),
  techStack: z.array(z.string()).default([]),
  liveUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});

export const ResumeDocumentSchema = z.object({
  contact: ContactInfoSchema,
  summary: z.string().default(''),
  skills: z.array(SkillCategorySchema).default([]),
  experience: z.array(WorkExperienceItemSchema).default([]),
  education: z.array(EducationItemSchema).default([]),
  projects: z.array(ProjectItemSchema).optional().default([]),
  certifications: z.array(z.string()).optional().default([]),
});

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type WorkExperienceItem = z.infer<typeof WorkExperienceItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;

// ============================================================================
// 2. Evaluation & Suggestion Schemas
// ============================================================================

export const PillarScoresSchema = z.object({
  impact: z.union([z.number(), z.string().transform((s) => parseFloat(s) || 75)]).pipe(z.number().min(0).max(100)),
  relevance: z.union([z.number(), z.string().transform((s) => parseFloat(s) || 75)]).pipe(z.number().min(0).max(100)),
  brevity: z.union([z.number(), z.string().transform((s) => parseFloat(s) || 75)]).pipe(z.number().min(0).max(100)),
});

export const ResumeSuggestionSchema = z.object({
  id: z.string().default(() => `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  roleIndex: z.union([z.number().int().nonnegative(), z.string().transform((s) => parseInt(s, 10) || 0)]),
  bulletIndex: z.union([z.number().int().nonnegative(), z.string().transform((s) => parseInt(s, 10) || 0)]),
  pillar: z.string().transform((s) => s.toLowerCase() as 'impact' | 'relevance' | 'brevity'),
  severity: z.string().transform((s) => s.toLowerCase() as 'critical' | 'recommended' | 'optional'),
  originalText: z.string(),
  suggestedRewrite: z.string(),
  rationale: z.string(),
  applied: z.boolean().default(false),
});

export const JobMatchVectorsSchema = z.object({
  detectedRole: z.string().default('Software Engineer'),
  seniority: z.string().default('Senior Software Engineer'),
  primarySkills: z.union([z.array(z.string()), z.string().transform((s) => [s])]).default([]),
  secondarySkills: z.union([z.array(z.string()), z.string().transform((s) => [s])]).default([]),
  estimatedYearsExperience: z.union([z.number(), z.string().transform((s) => parseFloat(s) || 3)]).default(3),
  targetCompanyTier: z.union([z.array(z.string()), z.string().transform((s) => [s])]).default(['Tier 1 Tech']),
  preferredLocations: z.union([z.array(z.string()), z.string().transform((s) => [s])]).default(['Remote']),
});

export const ResumeEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  pillarScores: PillarScoresSchema,
  detectedSeniority: z.string(),
  targetRole: z.string(),
  strengths: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestions: z.array(ResumeSuggestionSchema),
  jobMatchVectors: JobMatchVectorsSchema,
});

export type PillarScores = z.infer<typeof PillarScoresSchema>;
export type ResumeSuggestion = z.infer<typeof ResumeSuggestionSchema>;
export type JobMatchVectors = z.infer<typeof JobMatchVectorsSchema>;
export type ResumeEvaluation = z.infer<typeof ResumeEvaluationSchema>;

// ============================================================================
// 3. Subscription & Rate Limiting Types
// ============================================================================

export type SubscriptionPlanType =
  | 'jobs_pro'
  | 'accelerator_pro'
  | 'premium_bundle'
  | 'fast_lane_free'
  | 'job_pass_free'
  | 'job_pass_pro'
  | 'job_pass_elite'
  | 'free';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'none'
  | 'free';

export interface SubscriptionInfo {
  hasAccess: boolean;
  status: SubscriptionStatus;
  planType?: SubscriptionPlanType;
  currentPeriodEnd?: string;
  isAdmin?: boolean;
  isPro?: boolean;
  isElite?: boolean;
}

/**
 * Checks whether a user holds active Pro or Elite privileges.
 * Recognizes platform admins, explicit Pro/Elite flags, active/trialing status,
 * and Pro/Elite plan tiers (jobs_pro, premium_bundle, accelerator_pro, job_pass_pro, job_pass_elite).
 */
export function isUserProOrElite(sub?: SubscriptionInfo | null): boolean {
  if (!sub) return false;
  if (sub.isAdmin === true) return true;
  if (sub.isPro === true) return true;
  if (sub.isElite === true) return true;

  const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
  if (sub.status && activeStatuses.includes(sub.status)) {
    return true;
  }

  const proPlans: SubscriptionPlanType[] = [
    'jobs_pro',
    'accelerator_pro',
    'premium_bundle',
    'job_pass_pro',
    'job_pass_elite',
  ];
  if (sub.planType && proPlans.includes(sub.planType)) {
    return true;
  }

  return false;
}

export interface UserSubscriptionGuard {
  allowed: boolean;
  userId?: string;
  reason?: 'UNAUTHENTICATED' | 'SUBSCRIPTION_REQUIRED';
  isAdmin?: boolean;
  isPro?: boolean;
}

// ============================================================================
// 4. Default Constructor Utilities
// ============================================================================

export function createDefaultResumeDocument(partial?: Partial<ResumeDocument>): ResumeDocument {
  return {
    contact: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      ...(partial?.contact || {}),
    },
    summary: partial?.summary || '',
    skills: partial?.skills || [],
    experience: partial?.experience || [],
    education: partial?.education || [],
    projects: partial?.projects || [],
    certifications: partial?.certifications || [],
  };
}
