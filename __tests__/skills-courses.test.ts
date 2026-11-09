/**
 * @jest-environment node
 */

import { DEFAULT_SKILL_RESOURCES } from '@/lib/skills/default-resources';
import {
  getAllSkillResources,
  getSkillResourceById,
  createSkillResource,
  updateSkillResource,
  deleteSkillResource,
  resetToDefaultSkillResources,
} from '@/lib/skills/service';
import { GET as getSkillsRoute } from '@/app/api/skills-courses/route';

jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('Table not migrated yet') }),
        })),
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        neq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}));

describe('Skills Development Catalog & API', () => {
  beforeEach(async () => {
    await resetToDefaultSkillResources();
  });

  describe('Default Seeded Resources', () => {
    it('contains all 14 mandatory curated resource links requested by the user', () => {
      const urls = DEFAULT_SKILL_RESOURCES.map((r) => r.url);

      // DSA links
      expect(urls).toContain(
        'https://docs.google.com/spreadsheets/d/1-wKcV99KtO91dXdPkwmXGTdtyxAfk1mbPXQg81R9sFE/edit?gid=0#gid=0'
      );
      expect(urls).toContain('https://www.techinterviewhandbook.org/grind75/');
      expect(urls).toContain('https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet');
      expect(urls).toContain('https://visualgo.net/en');
      expect(urls).toContain('https://seanprashad.com/leetcode-patterns/');
      expect(urls).toContain('https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/');

      // System Design links
      expect(urls).toContain('https://github.com/ashishps1/awesome-system-design-resources');
      expect(urls).toContain('https://github.com/donnemartin/system-design-primer');
      expect(urls).toContain('https://github.com/liquidslr/system-design-notes');

      // JavaScript link
      expect(urls).toContain('https://javascript.info/');

      // CSS links
      expect(urls).toContain('https://flexboxfroggy.com/');
      expect(urls).toContain('https://cssgrid-generator.netlify.app/');

      // Java link
      expect(urls).toContain('https://dev.java/learn/');

      // AI link & secondary repo
      const aiResource = DEFAULT_SKILL_RESOURCES.find(
        (r) => r.url === 'https://aiengineeringfromscratch.com/'
      );
      expect(aiResource).toBeDefined();
      expect(aiResource?.secondaryUrl).toBe('https://github.com/rohitg00/ai-engineering-from-scratch');

      expect(DEFAULT_SKILL_RESOURCES.length).toBe(14);
    });

    it('categorizes courses under the expected pillars', () => {
      const categories = new Set(DEFAULT_SKILL_RESOURCES.map((r) => r.category));
      expect(categories).toContain('DSA');
      expect(categories).toContain('System Design');
      expect(categories).toContain('JavaScript');
      expect(categories).toContain('CSS');
      expect(categories).toContain('Java');
      expect(categories).toContain('AI');
    });
  });

  describe('Service Layer', () => {
    it('returns all resources when no filter is provided', async () => {
      const all = await getAllSkillResources();
      expect(all.length).toBeGreaterThanOrEqual(14);
    });

    it('filters correctly by category (case-insensitive)', async () => {
      const dsaList = await getAllSkillResources({ category: 'dsa' });
      expect(dsaList.length).toBe(6);
      dsaList.forEach((r) => expect(r.category).toBe('DSA'));

      const sysDesignList = await getAllSkillResources({ category: 'System Design' });
      expect(sysDesignList.length).toBe(3);
    });

    it('filters correctly by search query across title, description, tags, and category', async () => {
      const froggyMatch = await getAllSkillResources({ query: 'froggy' });
      expect(froggyMatch.length).toBe(1);
      expect(froggyMatch[0].title).toContain('Flexbox Froggy');

      const leetcodeMatches = await getAllSkillResources({ query: 'leetcode' });
      expect(leetcodeMatches.length).toBeGreaterThanOrEqual(2);
    });

    it('allows creating, updating, and deleting a custom skill resource', async () => {
      const created = await createSkillResource({
        title: 'Rust for Systems Programmers',
        description: 'Comprehensive guide to memory safety and ownership model.',
        category: 'Java',
        url: 'https://doc.rust-lang.org/book/',
        type: 'guide',
        difficulty: 'Intermediate',
        isFree: true,
        tags: ['Rust', 'Systems'],
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('Rust for Systems Programmers');

      const found = await getSkillResourceById(created.id);
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Rust for Systems Programmers');

      const updated = await updateSkillResource({
        id: created.id,
        title: 'The Rust Programming Book',
      });
      expect(updated.title).toBe('The Rust Programming Book');

      const deleted = await deleteSkillResource(created.id);
      expect(deleted).toBe(true);

      const afterDelete = await getSkillResourceById(created.id);
      expect(afterDelete).toBeNull();
    });
  });

  describe('GET /api/skills-courses Endpoint', () => {
    it('returns 200 with list of courses', async () => {
      const req = new Request('http://localhost:3000/api/skills-courses');
      const res = await getSkillsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.courses)).toBe(true);
      expect(json.courses.length).toBeGreaterThanOrEqual(14);
    });

    it('supports query string filtering for category and search', async () => {
      const req = new Request('http://localhost:3000/api/skills-courses?category=CSS&query=grid');
      const res = await getSkillsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.courses.length).toBe(1);
      expect(json.courses[0].title).toContain('CSS Grid');
    });
  });
});

