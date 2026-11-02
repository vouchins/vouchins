import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractionResult {
  rawText: string;
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  detectedFormat: 'pdf' | 'docx' | 'text';
}

/**
 * Extracts normalized text content from an uploaded resume buffer.
 * Supports PDF and DOCX binaries.
 */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string = ''
): Promise<ExtractionResult> {
  const isDocx =
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    fileName.toLowerCase().endsWith('.docx');

  let rawText = '';
  let pageCount: number | undefined;
  let detectedFormat: 'pdf' | 'docx' | 'text' = 'text';

  if (isDocx) {
    detectedFormat = 'docx';
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value || '';
  } else {
    // Default to PDF parsing
    detectedFormat = 'pdf';
    let parser: any;
    try {
      parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      rawText = data.text || '';
      pageCount = data.total;
    } catch (pdfErr: any) {
      console.error('[PDF Extraction Error Details]:', pdfErr);
      // If pdf-parse failed on a docx without mime type match, try mammoth fallback
      try {
        const docxResult = await mammoth.extractRawText({ buffer });
        if (docxResult.value && docxResult.value.trim().length > 50) {
          rawText = docxResult.value;
          detectedFormat = 'docx';
        } else {
          throw pdfErr;
        }
      } catch {
        throw new Error(
          'Failed to extract text from PDF document. Please ensure the file is not password-protected or corrupted.'
        );
      }
    } finally {
      if (parser && typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }

  // Normalize text: clean irregular spacing, control chars, and fix null-byte glyph delimiters
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\d{4})\s*[\x00\u0000]\s*(\d{4}|present)/gi, '$1 - $2')
    .replace(/(\d{1,2}\/\d{4})\s*[\x00\u0000]\s*(\d{1,2}\/\d{4}|present)/gi, '$1 - $2')
    .replace(/[\x00\u0000]/g, ' ')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove non-printable control chars
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length < 50) {
    throw new Error(
      'Could not extract meaningful text from resume. Please ensure the document is not an image-only scan or empty.'
    );
  }

  // Bounded safe slice
  const boundedText = normalized.slice(0, 15000);
  const words = boundedText.split(/\s+/).filter(Boolean);

  return {
    rawText: boundedText,
    pageCount,
    wordCount: words.length,
    characterCount: boundedText.length,
    detectedFormat,
  };
}
