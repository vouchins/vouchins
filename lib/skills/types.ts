export type SkillCategory =
  | 'All'
  | 'DSA'
  | 'System Design'
  | 'JavaScript'
  | 'CSS'
  | 'Java'
  | 'AI'
  | string;

export type SkillResourceType =
  | 'interactive'
  | 'guide'
  | 'curriculum'
  | 'repository'
  | 'cheatsheet'
  | 'course';

export type SkillDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export interface SkillResource {
  id: string;
  title: string;
  description: string;
  category: SkillCategory;
  url: string;
  secondaryUrl?: string | null;
  secondaryUrlLabel?: string | null;
  type: SkillResourceType;
  difficulty?: SkillDifficulty;
  isFree: boolean;
  featured?: boolean;
  domain?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSkillResourceInput {
  title: string;
  description: string;
  category: SkillCategory;
  url: string;
  secondaryUrl?: string | null;
  secondaryUrlLabel?: string | null;
  type?: SkillResourceType;
  difficulty?: SkillDifficulty;
  isFree?: boolean;
  featured?: boolean;
  tags?: string[];
}

export interface UpdateSkillResourceInput extends Partial<CreateSkillResourceInput> {
  id: string;
}

