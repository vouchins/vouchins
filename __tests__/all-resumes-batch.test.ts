/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { extractResumeText } from '@/lib/jobs/parser';
import {
  parseRawTextToDocument,
  evaluateResumeHeuristically,
  detectResumeDomain,
} from '@/lib/jobs/xyz-evaluator';
import { partitionResumePages } from '@/lib/jobs/pagination';
import { ResumeDocument, ResumeTemplateId, ResumePageSize } from '@/lib/jobs/types';

const RESUMES_DIR = '/Users/shaiktaher/Downloads/Resumes';

describe('Comprehensive 25-Resume Real World Pipeline Suite', () => {
  // Set generous timeout for processing all 25 candidate resumes
  jest.setTimeout(180000);

  const files = fs.existsSync(RESUMES_DIR)
    ? fs.readdirSync(RESUMES_DIR).filter((f) => !f.startsWith('.') && (f.endsWith('.pdf') || f.endsWith('.docx')))
    : [];

  it('found all expected candidate resumes in directory', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  files.forEach((file) => {
    describe(`Resume: ${file}`, () => {
      const filePath = path.join(RESUMES_DIR, file);
      const mimeType = file.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      let rawText = '';
      let doc: ResumeDocument;

      // 1. Extraction Test
      it('successfully extracts text from PDF or DOCX without timeout or empty result', async () => {
        const buf = fs.readFileSync(filePath);
        expect(buf.length).toBeGreaterThan(0);

        const extraction = await extractResumeText(buf, mimeType, file);
        expect(extraction).toBeDefined();
        expect(extraction.rawText).toBeDefined();
        expect(extraction.rawText.trim().length).toBeGreaterThan(50);
        expect(['pdf', 'docx']).toContain(extraction.detectedFormat);

        rawText = extraction.rawText;
      });

      // 2. Parsing & Contact Hygiene Test
      it('parses raw text into structured document with clean contact details', () => {
        expect(rawText).toBeTruthy();
        doc = parseRawTextToDocument(rawText);

        expect(doc).toBeDefined();
        expect(doc.contact).toBeDefined();
        expect(doc.contact.fullName).toBeTruthy();

        // Contact location hygiene: must not contain raw field labels or colons
        if (doc.contact.location) {
          expect(doc.contact.location).not.toContain(':');
          expect(doc.contact.location.toLowerCase()).not.toContain('phone');
          expect(doc.contact.location.toLowerCase()).not.toContain('email');
          expect(doc.contact.location.toLowerCase()).not.toContain('tel:');
        }
      });

      // 3. Domain & Role Evaluation Test
      it('evaluates resume with valid score, domain, seniority, and target role', () => {
        expect(doc).toBeDefined();
        const domain = detectResumeDomain(rawText, doc);
        expect(domain).toBeTruthy();

        const evalResult = evaluateResumeHeuristically(doc, rawText);
        expect(evalResult).toBeDefined();
        expect(evalResult.overallScore).toBeGreaterThanOrEqual(0);
        expect(evalResult.overallScore).toBeLessThanOrEqual(100);
        expect(evalResult.detectedSeniority).toBeTruthy();
        expect(evalResult.targetRole).toBeTruthy();
        expect(Array.isArray(evalResult.suggestions)).toBe(true);
      });

      // 4. Duplicate Suggestions Elimination Test
      it('contains zero duplicate suggestions in evaluation output', () => {
        expect(doc).toBeDefined();
        const evalResult = evaluateResumeHeuristically(doc, rawText);

        const seenOriginals = new Set<string>();
        const seenRewrites = new Set<string>();

        evalResult.suggestions.forEach((s) => {
          const original = s.originalText.trim().toLowerCase();
          const rewrite = s.suggestedRewrite.trim().toLowerCase();

          expect(seenOriginals.has(original)).toBe(false);
          expect(seenRewrites.has(rewrite)).toBe(false);

          seenOriginals.add(original);
          seenRewrites.add(rewrite);
        });
      });

      // 5. ATS Score Progression Invariance Test (Score must NEVER decrease)
      it('maintains or improves ATS score after applying suggestions', () => {
        expect(doc).toBeDefined();
        const evalBefore = evaluateResumeHeuristically(doc, rawText);

        if (evalBefore.suggestions.length === 0) {
          return; // No suggestions to apply
        }

        const docWithAppliedSuggestions: ResumeDocument = JSON.parse(JSON.stringify(doc));

        // Apply suggestions to bullets
        evalBefore.suggestions.forEach((s) => {
          if (
            s.roleIndex !== undefined &&
            s.bulletIndex !== undefined &&
            docWithAppliedSuggestions.experience?.[s.roleIndex]?.bullets?.[s.bulletIndex]
          ) {
            docWithAppliedSuggestions.experience[s.roleIndex].bullets[s.bulletIndex] = s.suggestedRewrite;
          }
        });

        const evalAfter = evaluateResumeHeuristically(docWithAppliedSuggestions, rawText);

        // Core requirement: ATS score must never drop after applying recommended improvements
        expect(evalAfter.overallScore).toBeGreaterThanOrEqual(evalBefore.overallScore);
      });

      // 6. Multi-Template Layout Partitioning & Export Integrity Test
      it('partitions cleanly across all templates and page sizes without layout failure', () => {
        expect(doc).toBeDefined();
        const templates: ResumeTemplateId[] = ['standard', 'compact', 'centered', 'structured'];
        const pageSizes: ResumePageSize[] = ['LETTER', 'A4'];

        templates.forEach((template) => {
          pageSizes.forEach((pageSize) => {
            const pages = partitionResumePages(doc, pageSize, template);
            expect(pages).toBeDefined();
            expect(pages.length).toBeGreaterThanOrEqual(1);

            pages.forEach((page, pageIdx) => {
              expect(page.pageNumber).toBe(pageIdx + 1);
              expect(page.totalPages).toBe(pages.length);
              const hasContent =
                Boolean(page.showContact) ||
                Boolean(page.showSummary) ||
                Boolean(page.showSkills) ||
                Boolean(page.showEducation) ||
                Boolean(page.showProjects) ||
                Boolean(page.showCertifications) ||
                (Array.isArray(page.roles) && page.roles.length > 0) ||
                (Array.isArray(page.educationIndices) && page.educationIndices.length > 0) ||
                (Array.isArray(page.projectIndices) && page.projectIndices.length > 0) ||
                (Array.isArray(page.certificationIndices) && page.certificationIndices.length > 0);
              expect(hasContent).toBe(true);
            });
          });
        });
      });
    });
  });
});
