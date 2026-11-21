/**
 * @jest-environment node
 */
import fs from 'fs';
import { extractResumeText } from '@/lib/jobs/parser';
import { parseRawTextToDocument, evaluateHeuristically, sanitizeBulletText, detectResumeDomain } from '@/lib/jobs/xyz-evaluator';

describe('M_A_Fuzel ATS Resume Ingestion and Evaluation', () => {
  let rawText = '';

  beforeAll(async () => {
    const primaryPath = '/Users/shaiktaher/Downloads/Resumes/M A Fuzel Resume.pdf';
    const fallbackPath = '/Users/shaiktaher/Downloads/M_A_Fuzel_ATS_Resume.pdf';
    const filePath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath;
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      const parsed = await extractResumeText(buf, 'application/pdf', 'M_A_Fuzel_ATS_Resume.pdf');
      rawText = parsed.rawText;
    }
  });

  it('correctly parses candidate contact without "Phone: Email:" glitch', () => {
    if (!rawText) return;
    const doc = parseRawTextToDocument(rawText);

    expect(doc.contact.fullName).toBe('M A Fuzel');
    expect(doc.contact.email).toBe('ammaar.fuzail@gmail.com');
    expect(doc.contact.phone).toBe('+91 8978751456');
    // Location must NOT be "Phone: Email:"
    expect(doc.contact.location).not.toContain('Phone');
    expect(doc.contact.location).not.toContain('Email');
    expect(doc.contact.location).not.toContain(':');
  });

  it('detects domain as "data" and derives target role as Data Governance & Quality Consultant', () => {
    if (!rawText) return;
    const doc = parseRawTextToDocument(rawText);
    const domain = detectResumeDomain(rawText, doc);

    expect(domain).toBe('data');

    const evaluation = evaluateHeuristically(rawText, doc);
    expect(evaluation.domain).toBe('data');
    expect(evaluation.targetRole).toContain('Data Governance');
    // Missing keywords should be data-specific, not SWE/Next.js
    expect(evaluation.missingKeywords).not.toContain('TypeScript');
    expect(evaluation.missingKeywords).not.toContain('Next.js / SSR');
  });

  it('prevents role boundary bleeding between EY and Amazon', () => {
    if (!rawText) return;
    const doc = parseRawTextToDocument(rawText);
    expect(doc.experience.length).toBeGreaterThanOrEqual(3);

    // EY role
    const eyRole = doc.experience[0];
    expect(eyRole.roleTitle + ' ' + eyRole.company).toContain('Ernst & Young');
    // No bullet in EY should contain Amazon's title or company
    eyRole.bullets.forEach((bullet) => {
      expect(bullet).not.toContain('Data Quality Specialist | Amazon');
      expect(bullet).not.toContain('Amazon Development Centre');
    });

    // Amazon role
    const amazonRole = doc.experience[1];
    expect(amazonRole.roleTitle + ' ' + amazonRole.company).toContain('Amazon');
  });

  it('eliminates robotic metric repetition across bullets', () => {
    if (!rawText) return;
    const doc = parseRawTextToDocument(rawText);

    // Collect all sanitized bullets across all roles
    const allBullets = doc.experience.flatMap((exp) => exp.bullets.map((b) => sanitizeBulletText(b, 'data')));

    // Count occurrences of the static repeated phrase
    const repeatedCount = allBullets.filter((b) =>
      b.includes('improving system delivery efficiency by 30% across production workloads')
    ).length;

    // After cleansing and domain-specific sanitization, this robotic trailer should be eliminated
    expect(repeatedCount).toBe(0);
  });

  it('partitions Fuzel resume into clean pages without runaway overflow', async () => {
    if (!rawText) return;
    const doc = parseRawTextToDocument(rawText);
    const { partitionResumePages } = await import('@/lib/jobs/pagination');
    (['standard', 'compact', 'centered', 'structured'] as const).forEach((tmpl) => {
      const pages = partitionResumePages(doc, 'LETTER', tmpl);
      expect(pages.length).toBeLessThanOrEqual(2);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].totalPages).toBe(pages.length);
    });
  });
});
