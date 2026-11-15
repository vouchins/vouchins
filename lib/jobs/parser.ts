import mammoth from 'mammoth';
import zlib from 'zlib';

export interface ExtractionResult {
  rawText: string;
  pageCount?: number;
  wordCount: number;
  characterCount: number;
  detectedFormat: 'pdf' | 'docx' | 'text';
}

/**
 * Robust pure JavaScript PDF text parser using pdfjs-dist legacy build.
 * Does NOT require native C++ bindings (@napi-rs/canvas) or external workers,
 * making it 100% resilient across serverless environments (Vercel, Netlify, Docker).
 */
async function parsePdfBuffer(buffer: Buffer): Promise<{ rawText: string; pageCount: number }> {
  // Use new Function to guarantee native dynamic ESM import across all runtimes
  // (prevents test runners and legacy CJS compilers from transpiling dynamic import to require)
  const importEsm = new Function('specifier', 'return import(specifier)');
  const pdfjs = await importEsm('pdfjs-dist/legacy/build/pdf.mjs');
  const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const loadingTask = pdfjs.getDocument({
    data: uint8Data,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pagesText: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items;

    // Group items by vertical position (Y) to preserve natural line layout
    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];

    for (const item of items) {
      if (!('str' in item)) continue;
      const str = item.str;
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      if (currentY === null || Math.abs(y - currentY) > 4) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' ').trim());
        }
        currentY = y;
        currentLine = [str];
      } else {
        currentLine.push(str);
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' ').trim());
    }
    pagesText.push(lines.join('\n'));
    page.cleanup();
  }

  await doc.destroy();
  return {
    rawText: pagesText.join('\n\n'),
    pageCount,
  };
}

/**
 * Resilient fallback parser that decompresses FlateDecode (zlib) streams and extracts raw text
 * if standard PDF parsing fails in restricted environments.
 */
function extractPdfStreamText(buffer: Buffer): string {
  try {
    const content = buffer.toString('binary');
    const chunks: string[] = [];

    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed: Buffer;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch {
          decompressed = rawStream;
        }
      }

      const streamText = decompressed.toString('latin1');
      if (streamText.includes('BT') && streamText.includes('ET')) {
        const btEtRegex = /BT[\s\S]*?ET/g;
        let btMatch: RegExpExecArray | null;
        while ((btMatch = btEtRegex.exec(streamText)) !== null) {
          const block = btMatch[0];
          const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
          let tjMatch: RegExpExecArray | null;
          while ((tjMatch = tjRegex.exec(block)) !== null) {
            const clean = tjMatch[1]
              .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
              .replace(/\\(.)/g, '$1')
              .trim();
            if (clean) chunks.push(clean);
          }

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
    try {
      const parsed = await parsePdfBuffer(buffer);
      rawText = parsed.rawText || '';
      pageCount = parsed.pageCount;
    } catch (pdfErr: any) {
      console.warn('[PDF Extraction Warning]: parsePdfBuffer failed, trying stream fallbacks...', pdfErr?.message);

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
          throw new Error(
            'Failed to extract text from PDF document. Please ensure the file contains selectable text and is not an image-only scan or password-protected.'
          );
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
    // Heal PDF kerning in phones (e.g. +1   ( 347 )   686 - 2993 -> +1 (347) 686-2993)
    .replace(/\+\s*(\d{1,3})\s*\(\s*(\d{3})\s*\)\s*(\d{3})\s*-\s*(\d{4})/g, '+$1 ($2) $3-$4')
    // Heal PDF kerning in email addresses (e.g. U mmufarwah .fm @gmail.com -> Ummufarwah.fm@gmail.com)
    .replace(/\b([a-zA-Z0-9._%+-]+(?:\s+[a-zA-Z0-9._%+-]+)*)\s*@\s*([a-zA-Z0-9.\s-]+)\s*\.\s*([a-zA-Z]{2,})\b/g, (match, local, domain, tld) => {
      return `${local.replace(/\s+/g, '')}@${domain.replace(/\s+/g, '')}.${tld}`;
    })
    // Heal PDF spacing before commas (e.g. "Jersey City ,   NJ" -> "Jersey City, NJ")
    .replace(/\s+,\s*/g, ', ')
    // Heal PDF kerning in common broken words
    .replace(/\bPharmacis\s+t\b/gi, 'Pharmacist')
    .replace(/\bdocumentatio\s+n\b/gi, 'documentation')
    .replace(/\bi\s+nteractions?\b/gi, 'interactions')
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
