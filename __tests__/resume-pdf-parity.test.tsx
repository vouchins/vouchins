import React from 'react';
import { render } from '@testing-library/react';
import { ResumePDFDocument } from '@/components/jobs/pdf-document';
import {
  getPdfLayoutTokens,
  MAX_UNBREAKABLE_CHARS,
  sanitizePdfText,
  splitPathologicalToken,
} from '@/lib/jobs/pdf-layout-tokens';
import { DEFAULT_EXPORT_CONFIG, ResumeDocument, ResumeExportConfig } from '@/lib/jobs/types';

jest.mock('@react-pdf/renderer', () => ({
  Font: {
    registerHyphenationCallback: jest.fn(),
  },
  pdf: jest.fn(() => ({
    toBlob: jest.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' })),
  })),
  Document: ({ children, title }: any) => (
    <div data-testid="pdf-document" data-title={title}>
      {children}
    </div>
  ),
  Page: ({ children, size }: any) => (
    <div data-testid="pdf-page" data-size={size}>
      {children}
    </div>
  ),
  View: ({ children, wrap, fixed, minPresenceAhead }: any) => (
    <div
      data-testid="pdf-view"
      data-wrap={wrap === undefined ? 'default' : String(wrap)}
      data-fixed={fixed ? 'true' : 'false'}
      data-min-presence={minPresenceAhead ?? ''}
    >
      {children}
    </div>
  ),
  Text: ({ children, minPresenceAhead, fixed, wrap }: any) => (
    <span
      data-testid="pdf-text"
      data-min-presence={minPresenceAhead ?? ''}
      data-fixed={fixed ? 'true' : 'false'}
      data-wrap={wrap === undefined ? 'default' : String(wrap)}
    >
      {children}
    </span>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

const DENSE_STAFF_RESUME: ResumeDocument = {
  contact: {
    fullName: 'José García',
    email: 'jose.garcia@example.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    linkedinUrl: 'https://www.linkedin.com/in/jose-garcia-staff-eng',
    githubUrl: 'https://github.com/josegarcia',
    portfolioUrl: '',
  },
  summary:
    'Staff Data & Platform Engineer with 8+ years architecting distributed pipelines and reducing infrastructure spend by ₹4.5 Cr annually.',
  skills: [
    { category: 'Core Languages', items: ['TypeScript', 'Python', 'SQL', 'Go'] },
    { category: 'Cloud & Data', items: ['AWS', 'Kubernetes', 'PostgreSQL', 'Spark', 'Kafka'] },
  ],
  experience: Array.from({ length: 4 }, (_, idx) => ({
    id: `exp-${idx}`,
    company: `Enterprise Corp ${idx + 1}`,
    roleTitle: `UniqueRoleHeader_${idx + 1}`,
    startDate: 'Jan 2020',
    endDate: idx === 0 ? 'Present' : 'Dec 2022',
    isCurrent: idx === 0,
    location: 'Bengaluru',
    bullets: [
      `UniqueFirstBullet_${idx + 1}: Scaled real-time ingestion pipelines saving ₹${idx + 2} Cr in annual cloud spend.`,
      'Automated data quality checks across 120+ tables reducing manual validation effort by 45%.',
    ],
  })),
  education: [
    {
      id: 'edu-1',
      institution: 'Indian Institute of Technology Madras',
      degree: 'B.Tech in Computer Science',
      endDate: 'May 2018',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Distributed Query Optimizer',
      techStack: ['Rust', 'Apache Arrow'],
      bullets: ['Built vectorized execution engine accelerating analytical queries by 6x.'],
    },
  ],
  certifications: ['AWS Certified Solutions Architect'],
};

describe('Resume PDF Parity & Structural Integrity', () => {
  it('sanitizes non-WinAnsi symbols like ₹ while preserving WinAnsi dashes and accents', () => {
    expect(sanitizePdfText('Saved ₹4.5 Cr – Q1 to Q4 — José')).toBe('Saved Rs. 4.5 Cr – Q1 to Q4 — José');
    expect(sanitizePdfText('Latency ≥ 99% → 2x faster')).toBe('Latency >= 99% -> 2x faster');
  });

  it('splits only pathological unbroken tokens (>45 chars) without touching normal words or short URLs', () => {
    expect(splitPathologicalToken('cross-functional')).toEqual(['cross-functional']);
    expect(splitPathologicalToken('Node.js')).toEqual(['Node.js']);
    expect(splitPathologicalToken('linkedin.com/in/jose-garcia')).toEqual(['linkedin.com/in/jose-garcia']);

    const longSkillList = 'Docker/Kubernetes/Terraform/PostgreSQL/Redis/Kafka/Prometheus/Grafana';
    const chunks = splitPathologicalToken(longSkillList);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(longSkillList);
  });

  it('renders native flow Page without fixed footers or continuation headers and sanitizes ₹', () => {
    const { container, getAllByTestId } = render(
      <ResumePDFDocument document={DENSE_STAFF_RESUME} config={DEFAULT_EXPORT_CONFIG} />
    );

    const pages = getAllByTestId('pdf-page');
    expect(pages).toHaveLength(1); // Single native-flowing <Page> container

    // No fixed footer or continuation text
    const fixedEls = container.querySelectorAll('[data-fixed="true"]');
    expect(fixedEls).toHaveLength(0);
    expect(container.textContent).not.toContain('(Continued)');
    expect(container.textContent).not.toContain('Page 1 of');

    // Sanitized ₹ and preserved accents + contiguous URL
    expect(container.textContent).toContain('Rs. 4.5 Cr');
    expect(container.textContent).not.toContain('₹');
    expect(container.textContent).toContain('José García');
    expect(container.textContent).toContain('linkedin.com/in/jose-garcia-staff-eng');
  });

  it('renders structured template with 2-column header band and full-width stacked Skills/Education', () => {
    const structuredConfig: ResumeExportConfig = {
      ...DEFAULT_EXPORT_CONFIG,
      template: 'structured',
    };
    const { container } = render(
      <ResumePDFDocument document={DENSE_STAFF_RESUME} config={structuredConfig} />
    );

    const text = container.textContent || '';
    expect(text).toContain('José García');
    expect(text).toContain('Core Languages: TypeScript, Python, SQL, Go');
    expect(text).toContain('Indian Institute of Technology Madras');
    expect(text).toContain('UniqueRoleHeader_1');
  });

  it('enforces uniform MAX_UNBREAKABLE_CHARS = 450 bound on wrap={false} blocks', () => {
    const longBullet = 'A'.repeat(MAX_UNBREAKABLE_CHARS + 110);
    const docWithLongBullet: ResumeDocument = {
      ...DENSE_STAFF_RESUME,
      experience: [
        {
          id: 'exp-long',
          company: 'HyperScale Corp',
          roleTitle: 'Principal Architect',
          startDate: 'Jan 2021',
          endDate: 'Present',
          isCurrent: true,
          bullets: [longBullet, 'Short second bullet under 450 chars.'],
        },
      ],
    };

    const { container } = render(
      <ResumePDFDocument document={docWithLongBullet} config={DEFAULT_EXPORT_CONFIG} />
    );

    const views = Array.from(container.querySelectorAll('[data-testid="pdf-view"]'));
    const longBulletView = views
      .filter((v) => v.textContent?.includes(longBullet) && !v.textContent?.includes('Principal Architect'))
      .pop();
    expect(longBulletView?.getAttribute('data-wrap')).toBe('true');

    const shortBulletView = views
      .filter((v) => v.textContent?.includes('Short second bullet under 450 chars.'))
      .pop();
    expect(shortBulletView?.getAttribute('data-wrap')).toBe('false');
  });

  it('computes consistent PDF layout tokens across page sizes and templates', () => {
    const a4Compact = getPdfLayoutTokens({
      ...DEFAULT_EXPORT_CONFIG,
      pageSize: 'A4',
      template: 'compact',
    });
    expect(a4Compact.pageWidthPt).toBeCloseTo(595.28, 1);
    expect(a4Compact.paddingTop).toBe(18);
  });
});
