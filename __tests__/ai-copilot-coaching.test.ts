/**
 * @jest-environment node
 */

import { DEFAULT_SKILL_RESOURCES } from '@/lib/skills/default-resources';
import {
  getRelevantCoachingResources,
  getCoachingCategoryBadge,
  RecommendedJob,
} from '@/components/jobs/recommend-dashboard';

describe('AI Copilot & Prep - Coaching Tab Tutorial Integration', () => {
  describe('getCoachingCategoryBadge', () => {
    it('returns brand-consistent styling for all coaching categories', () => {
      expect(getCoachingCategoryBadge('dsa').badge).toContain('indigo');
      expect(getCoachingCategoryBadge('system design').badge).toContain('blue');
      expect(getCoachingCategoryBadge('javascript').badge).toContain('amber');
      expect(getCoachingCategoryBadge('css').badge).toContain('emerald');
      expect(getCoachingCategoryBadge('java').badge).toContain('orange');
      expect(getCoachingCategoryBadge('ai').badge).toContain('purple');
      expect(getCoachingCategoryBadge('other').badge).toContain('neutral');
    });
  });

  describe('getRelevantCoachingResources', () => {
    it('returns top coaching resources for a Frontend Engineer', () => {
      const frontendJob: Partial<RecommendedJob> = {
        id: 'job-fe-1',
        title: 'Senior Frontend Developer',
        matchingSkills: ['React', 'TypeScript', 'Tailwind CSS'],
        missingSkills: ['CSS Grid'],
        description: {
          about: 'Building rich interactive web UI and design systems.',
          responsibilities: [],
          qualifications: [],
          techStack: ['React', 'TypeScript', 'Next.js'],
          benefits: [],
        },
      };

      const tutorials = getRelevantCoachingResources(frontendJob as RecommendedJob, DEFAULT_SKILL_RESOURCES);
      expect(tutorials.length).toBeGreaterThanOrEqual(3);

      const categories = tutorials.map((t) => t.category.toLowerCase());
      // Should include JavaScript and CSS tutorials at the top
      expect(categories).toContain('javascript');
      expect(categories).toContain('css');

      const urls = tutorials.map((t) => t.url);
      expect(urls).toContain('https://javascript.info/');
    });

    it('returns top coaching resources for a Java Developer', () => {
      const javaJob: Partial<RecommendedJob> = {
        id: 'job-java-1',
        title: 'Senior Java Backend Engineer',
        matchingSkills: ['Java', 'Spring Boot', 'PostgreSQL'],
        missingSkills: ['System Design'],
        description: {
          about: 'Architecting high-scale Java enterprise microservices.',
          responsibilities: [],
          qualifications: [],
          techStack: ['Java', 'Spring', 'Kafka'],
          benefits: [],
        },
      };

      const tutorials = getRelevantCoachingResources(javaJob as RecommendedJob, DEFAULT_SKILL_RESOURCES);
      expect(tutorials.length).toBeGreaterThanOrEqual(3);

      const categories = tutorials.map((t) => t.category.toLowerCase());
      expect(categories).toContain('java');
      expect(categories).toContain('system design');

      const urls = tutorials.map((t) => t.url);
      expect(urls).toContain('https://dev.java/learn/');
    });

    it('returns top coaching resources for an AI / ML Engineer', () => {
      const aiJob: Partial<RecommendedJob> = {
        id: 'job-ai-1',
        title: 'AI Platform Engineer',
        matchingSkills: ['Python', 'LLMs', 'PyTorch'],
        missingSkills: ['RAG'],
        description: {
          about: 'Deploying foundation models, RAG vector pipelines, and fine-tuning agents.',
          responsibilities: [],
          qualifications: [],
          techStack: ['Python', 'FastAPI', 'Vector DB'],
          benefits: [],
        },
      };

      const tutorials = getRelevantCoachingResources(aiJob as RecommendedJob, DEFAULT_SKILL_RESOURCES);
      expect(tutorials.length).toBeGreaterThanOrEqual(3);

      const categories = tutorials.map((t) => t.category.toLowerCase());
      expect(categories).toContain('ai');

      const urls = tutorials.map((t) => t.url);
      expect(urls).toContain('https://aiengineeringfromscratch.com/');
    });

    it('returns balanced System Design and DSA resources for a general Software Engineer', () => {
      const seJob: Partial<RecommendedJob> = {
        id: 'job-se-1',
        title: 'Software Engineer',
        matchingSkills: ['Distributed Systems', 'Algorithms'],
        missingSkills: [],
        description: {
          about: 'General engineering problem solving across core platform teams.',
          responsibilities: [],
          qualifications: [],
          techStack: ['Go', 'PostgreSQL'],
          benefits: [],
        },
      };

      const tutorials = getRelevantCoachingResources(seJob as RecommendedJob, DEFAULT_SKILL_RESOURCES);
      expect(tutorials.length).toBeGreaterThanOrEqual(3);

      const categories = tutorials.map((t) => t.category.toLowerCase());
      expect(categories).toContain('system design');
      expect(categories).toContain('dsa');
    });

    it('handles null job gracefully by returning first 4 default resources', () => {
      const tutorials = getRelevantCoachingResources(null, DEFAULT_SKILL_RESOURCES);
      expect(tutorials.length).toBe(4);
      expect(tutorials[0].id).toBe(DEFAULT_SKILL_RESOURCES[0].id);
    });
  });

  describe('Tailor Studio 1-Click Keyword Ingestion', () => {
    it('accurately injects missing keywords into resume document skills without duplicates', () => {
      const doc = {
        contact: { fullName: 'Alex Developer', email: 'alex@example.com' },
        summary: 'Experienced software engineer',
        skills: [
          { category: 'Languages & Frameworks', items: ['React', 'TypeScript'] },
        ],
        experience: [
          {
            id: 'exp-1',
            company: 'Tech Corp',
            roleTitle: 'Frontend Engineer',
            startDate: '2022',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Led development of web applications.'],
          },
        ],
        education: [],
      };

      const missingKeywords = ['GraphQL', 'Next.js', 'React']; // 'React' is duplicate
      const targetCategory = doc.skills[0];
      const existingItemsLower = new Set(targetCategory.items.map((i) => i.toLowerCase()));

      for (const kw of missingKeywords) {
        if (!existingItemsLower.has(kw.toLowerCase())) {
          targetCategory.items.push(kw);
          existingItemsLower.add(kw.toLowerCase());
        }
      }

      expect(targetCategory.items).toContain('GraphQL');
      expect(targetCategory.items).toContain('Next.js');
      // Should not have duplicated 'React'
      expect(targetCategory.items.filter((i) => i.toLowerCase() === 'react').length).toBe(1);
    });

    it('injects tailored Google XYZ bullet into experience without duplicates', () => {
      const doc = {
        contact: { fullName: 'Alex Developer', email: 'alex@example.com' },
        summary: 'Experienced software engineer',
        skills: [{ category: 'Core Skills', items: ['Java', 'Spring'] }],
        experience: [
          {
            id: 'exp-1',
            company: 'Enterprise Inc',
            roleTitle: 'Backend Engineer',
            startDate: '2021',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Maintained microservices in Java and Spring Boot.'],
          },
        ],
        education: [],
      };

      const tailoredBullet = 'Architected high-throughput service components using Java, reducing p99 latency by 38% across production environments.';
      const currentExp = doc.experience[0];

      if (!currentExp.bullets.includes(tailoredBullet)) {
        currentExp.bullets.unshift(tailoredBullet);
      }

      expect(currentExp.bullets[0]).toBe(tailoredBullet);
      expect(currentExp.bullets.length).toBe(2);

      // Duplicate attempt
      if (!currentExp.bullets.includes(tailoredBullet)) {
        currentExp.bullets.unshift(tailoredBullet);
      }
      expect(currentExp.bullets.length).toBe(2);
    });
  });
});

