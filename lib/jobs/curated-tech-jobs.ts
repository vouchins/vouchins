/**
 * Curated Premier Tech Jobs Catalog
 *
 * Previously held static hardcoded jobs fallback.
 * Now completely deprecated - all jobs are dynamically queried from the live Supabase database.
 */

export interface CuratedJobDefinition {
  id: string;
  title: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workplaceType: 'Remote' | 'Hybrid' | 'Onsite';
  jobType: 'Full-time' | 'Contract' | 'Part-time';
  experienceLevel: 'Senior' | 'Staff' | 'Lead' | 'Principal' | 'Mid' | 'Entry';
  category: string;
  salaryRange: string;
  postedAt: string;
  createdAt?: string;
  description: {
    about: string;
    responsibilities: string[];
    qualifications: string[];
    techStack: string[];
    benefits: string[];
  };
  matchingSkills: string[];
  missingSkills: string[];
  insiderCount: number;
  externalApplyUrl: string;
  externalJobId: string;
  isInternal: boolean;
  isCurated: boolean;
  isRecommended: boolean;
}

export const CURATED_TECH_JOBS: CuratedJobDefinition[] = [];
