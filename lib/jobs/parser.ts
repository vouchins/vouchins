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
 * Fallback parser to extract text strings from PDF streams if pdf-parse fails in restricted serverless runtimes.
 */
function extractPdfStreamText(buffer: Buffer): string {
  try {
    const content = buffer.toString('latin1');
    const chunks: string[] = [];
    
    // Match text blocks inside BT (Begin Text) and ET (End Text)
    const btEtRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;
    
    while ((match = btEtRegex.exec(content)) !== null) {
      const block = match[0];
      
      // Match text strings inside parentheses followed by Tj, TJ, ', or "
      const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const clean = tjMatch[1]
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, '$1')
          .trim();
        if (clean) chunks.push(clean);
      }
      
      // Match text arrays in TJ operators: [(str) 20 (str)] TJ
      const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let arrMatch: RegExpExecArray | null;
      while ((arrMatch = arrayRegex.exec(block)) !== null) {
        const innerStr = arrMatch[1];
        const innerRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
        let sMatch: RegExpExecArray | null;
        while ((sMatch = innerRegex.exec(innerStr)) !== null) {
          const clean = sMatch[1]
            .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\(.)/g, '$1')
            .trim();
          if (clean) chunks.push(clean);
        }
      }
    }
    
    return chunks.join(' ');
  } catch {
    return '';
  }
}

/**
 * Extracts normalized text content from an uploaded resume buffer.
 * Supports PDF, DOCX, and plain text binaries.
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

  const isPlainText =
    mimeType.includes('text/plain') ||
    fileName.toLowerCase().endsWith('.txt') ||
    fileName.toLowerCase().endsWith('.md');

  let rawText = '';
  let pageCount: number | undefined;
  let detectedFormat: 'pdf' | 'docx' | 'text' = 'text';

  if (isPlainText) {
    detectedFormat = 'text';
    rawText = buffer.toString('utf-8');
  } else if (isDocx) {
    detectedFormat = 'docx';
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value || '';
  } else {
    // Default to PDF parsing
    detectedFormat = 'pdf';
    let parser: any;
    try {
      const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      parser = new PDFParse({ data: uint8Data });
      const data = await parser.getText();
      rawText = data.text || '';
      pageCount = data.total;
    } catch (pdfErr: any) {
      console.warn('[PDF Extraction Warning]: PDFParse failed, trying fallbacks...', pdfErr?.message);
      
      // Try fallback stream text extraction
      const fallbackText = extractPdfStreamText(buffer);
      if (fallbackText && fallbackText.trim().length >= 50) {
        rawText = fallbackText;
      } else {
        // If file might be a mislabeled docx, try mammoth
        try {
          const docxResult = await mammoth.extractRawText({ buffer });
          if (docxResult.value && docxResult.value.trim().length > 50) {
            rawText = docxResult.value;
            detectedFormat = 'docx';
          } else {
            throw pdfErr;
          }
        } catch {
          // If still no text, throw friendly message
          throw new Error(
            'Failed to extract text from PDF document. Please ensure the file contains selectable text and is not an image-only scan or password-protected.'
          );
        }
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
    .replace(/\u00AD/g, '') // remove soft hyphens inserted by PDF typesetting
    // Re-join words broken across line wraps (e.g. "ori-\nented" -> "oriented", "distrib-\nuted" -> "distributed")
    .replace(/(\b[a-zA-Z]{2,})-(?:[ \t]*\n[ \t]*|[ \t]+)([a-zA-Z]{2,}\b)/g, (match, prefix, suffix) => {
      const lowerSuffix = suffix.toLowerCase();
      const compoundSuffixes = new Set([
        'time', 'stack', 'end', 'scale', 'driven', 'facing', 'level', 'party', 'first',
        'native', 'based', 'centric', 'critical', 'tier', 'grade', 'wide', 'bound'
      ]);
      if (compoundSuffixes.has(lowerSuffix)) {
        return `${prefix}-${suffix}`;
      }
      return `${prefix}${suffix}`;
    })
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
