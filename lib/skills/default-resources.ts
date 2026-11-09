import { SkillResource } from './types';

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

export const DEFAULT_SKILL_RESOURCES: SkillResource[] = [
  // ============================================================================
  // DSA (Data Structures & Algorithms)
  // ============================================================================
  {
    id: 'dsa-tracker-sheet',
    title: 'Comprehensive DSA Problem Tracker & Master Sheet',
    description:
      'Structured spreadsheet tracking essential coding interview problems categorized across Arrays, Trees, Dynamic Programming, Graphs, and Heaps with topic progress indicators.',
    category: 'DSA',
    url: 'https://docs.google.com/spreadsheets/d/1-wKcV99KtO91dXdPkwmXGTdtyxAfk1mbPXQg81R9sFE/edit?gid=0#gid=0',
    type: 'curriculum',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'docs.google.com',
    tags: ['Spreadsheet', 'Problem Tracker', 'Topic-wise', 'Interview Prep'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'dsa-grind-75',
    title: 'Grind 75 - Personalized Coding Interview Study Plan',
    description:
      'Modern successor to Blind 75 authored by Yangshun Tay. Customizes problem sets dynamically by available weeks, hours per week, topic coverage, and question difficulty.',
    category: 'DSA',
    url: 'https://www.techinterviewhandbook.org/grind75/',
    type: 'interactive',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'techinterviewhandbook.org',
    tags: ['LeetCode', 'Blind 75', 'Custom Schedule', 'High Yield'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'dsa-strivers-a2z',
    title: "Striver's A2Z DSA Sheet & Step-by-Step Roadmap",
    description:
      'Complete end-to-end curriculum by takeUforward covering 450+ core algorithmic problems with visual editorial solutions, video walk-throughs, and time complexity analyses.',
    category: 'DSA',
    url: 'https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet',
    type: 'curriculum',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'takeuforward.org',
    tags: ['Roadmap', 'Video Tutorials', 'takeUforward', 'Step by Step'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'dsa-visualgo',
    title: 'VisuAlgo - Visualising Data Structures and Algorithms',
    description:
      'Interactive visual learning tool conceptualizing sorting algorithms, binary search trees, graph algorithms, union-find, and DP through step-by-step animations.',
    category: 'DSA',
    url: 'https://visualgo.net/en',
    type: 'interactive',
    difficulty: 'Beginner',
    isFree: true,
    featured: false,
    domain: 'visualgo.net',
    tags: ['Visualization', 'Animations', 'Interactive', 'Fundamentals'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'dsa-leetcode-patterns',
    title: 'LeetCode Patterns by Sean Prashad',
    description:
      'Curated index of 170+ high-frequency interview problems grouped by foundational patterns such as Two Pointers, Sliding Window, Fast & Slow Pointers, and Topological Sort.',
    category: 'DSA',
    url: 'https://seanprashad.com/leetcode-patterns/',
    type: 'guide',
    difficulty: 'Intermediate',
    isFree: true,
    featured: false,
    domain: 'seanprashad.com',
    tags: ['Patterns', 'Sliding Window', 'Two Pointers', 'Filterable'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'dsa-algorithm-cheatsheet',
    title: 'Algorithm Study Cheatsheet & Big-O Reference',
    description:
      'Handy reference sheet summarizing time and space complexities for search, sorting, and tree traversals with corner cases to remember during live coding rounds.',
    category: 'DSA',
    url: 'https://www.techinterviewhandbook.org/algorithms/study-cheatsheet/',
    type: 'cheatsheet',
    difficulty: 'All Levels',
    isFree: true,
    featured: false,
    domain: 'techinterviewhandbook.org',
    tags: ['Cheatsheet', 'Big-O', 'Complexity', 'Quick Reference'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },

  // ============================================================================
  // SYSTEM DESIGN
  // ============================================================================
  {
    id: 'system-design-awesome-resources',
    title: 'Awesome System Design Resources',
    description:
      'Curated repository of architecture case studies, scalable database patterns, distributed systems papers, and interview question walk-throughs by Ashish Pratap Singh.',
    category: 'System Design',
    url: 'https://github.com/ashishps1/awesome-system-design-resources',
    type: 'repository',
    difficulty: 'Intermediate',
    isFree: true,
    featured: true,
    domain: 'github.com',
    tags: ['GitHub', 'Case Studies', 'Distributed Systems', 'Architectures'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'system-design-primer',
    title: 'System Design Primer by Donne Martin',
    description:
      'The premier open-source guide with 275k+ stars. Teaches how to design large-scale systems covering DNS, CDNs, Load Balancers, Caching, Sharding, CAP Theorem, and Microservices.',
    category: 'System Design',
    url: 'https://github.com/donnemartin/system-design-primer',
    type: 'repository',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'github.com',
    tags: ['Open Source', 'Definitive Guide', 'CAP Theorem', 'High Scale'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'system-design-notes',
    title: 'System Design Notes & Architectural Breakdowns',
    description:
      'In-depth engineering notes, data models, and architectural blueprints for real-world platforms including WhatsApp, Netflix, Rate Limiters, and Distributed Message Queues.',
    category: 'System Design',
    url: 'https://github.com/liquidslr/system-design-notes',
    type: 'repository',
    difficulty: 'Advanced',
    isFree: true,
    featured: false,
    domain: 'github.com',
    tags: ['Blueprints', 'Diagrams', 'Real-world Systems', 'Trade-offs'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },

  // ============================================================================
  // JAVASCRIPT
  // ============================================================================
  {
    id: 'javascript-info',
    title: 'The Modern JavaScript Tutorial (javascript.info)',
    description:
      'Deep, rigorous tutorial spanning foundational language syntax to advanced browser DOM APIs, Event Loop, Closures, Prototypal Inheritance, Generators, and Microtasks.',
    category: 'JavaScript',
    url: 'https://javascript.info/',
    type: 'guide',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'javascript.info',
    tags: ['Core JS', 'Event Loop', 'Closures', 'Modern ECMAScript'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },

  // ============================================================================
  // CSS
  // ============================================================================
  {
    id: 'css-flexbox-froggy',
    title: 'Flexbox Froggy - A Game for Learning CSS Flexbox',
    description:
      'Interactive puzzle game guiding you through 24 levels to master CSS flex-direction, justify-content, align-items, flex-wrap, and flex-flow properties in a fun browser sandbox.',
    category: 'CSS',
    url: 'https://flexboxfroggy.com/',
    type: 'interactive',
    difficulty: 'Beginner',
    isFree: true,
    featured: false,
    domain: 'flexboxfroggy.com',
    tags: ['Flexbox', 'Interactive Game', 'CSS Layout', 'Beginner Friendly'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'css-grid-generator',
    title: 'CSS Grid Generator & Interactive Builder',
    description:
      'Visual interactive grid canvas to design multi-column, multi-row CSS grid layouts visually and export clean, production-ready CSS and HTML code with one click.',
    category: 'CSS',
    url: 'https://cssgrid-generator.netlify.app/',
    type: 'interactive',
    difficulty: 'Intermediate',
    isFree: true,
    featured: false,
    domain: 'cssgrid-generator.netlify.app',
    tags: ['CSS Grid', 'Visual Generator', 'Code Export', 'Responsive Design'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },

  // ============================================================================
  // JAVA
  // ============================================================================
  {
    id: 'java-dev-learn',
    title: 'Dev.java - Official Oracle Modern Java Learning Portal',
    description:
      'Oracle’s dedicated developer portal offering curated tutorials on modern Java language features, Records, Virtual Threads (Project Loom), Streams, Concurrency, and Collections.',
    category: 'Java',
    url: 'https://dev.java/learn/',
    type: 'course',
    difficulty: 'All Levels',
    isFree: true,
    featured: true,
    domain: 'dev.java',
    tags: ['Oracle Official', 'Modern Java', 'Virtual Threads', 'Concurrency'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },

  // ============================================================================
  // AI
  // ============================================================================
  {
    id: 'ai-engineering-from-scratch',
    title: 'AI Engineering from Scratch',
    description:
      'Hands-on guide and open-source codebase for software engineers transitioning to AI engineering. Covers LLM APIs, prompt engineering, vector databases, embeddings, fine-tuning, and production RAG pipelines.',
    category: 'AI',
    url: 'https://aiengineeringfromscratch.com/',
    secondaryUrl: 'https://github.com/rohitg00/ai-engineering-from-scratch',
    secondaryUrlLabel: 'GitHub Repo',
    type: 'course',
    difficulty: 'Intermediate',
    isFree: true,
    featured: true,
    domain: 'aiengineeringfromscratch.com',
    tags: ['LLMs', 'RAG Pipelines', 'Vector Search', 'Open Source', 'GitHub Repo'],
    createdAt: '2026-11-10T00:00:00.000Z',
  },
];

