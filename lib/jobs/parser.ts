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
 * Dynamic ESM loader for pdfjs-dist that works reliably across both
 * local development and serverless/bundled environments (Vercel, Next.js, Jest).
 */
async function getPdfJs() {
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    const importEsm = new Function('specifier', 'return import(specifier)');
    return await importEsm('pdfjs-dist/legacy/build/pdf.mjs');
  }
}

/**
 * Robust pure JavaScript PDF text parser using pdfjs-dist legacy build.
 * Does NOT require native C++ bindings (@napi-rs/canvas) or external workers,
 * making it 100% resilient across serverless environments (Vercel, Netlify, Docker).
 */
async function parsePdfBuffer(buffer: Buffer): Promise<{ rawText: string; pageCount: number }> {
  const pdfjs = await getPdfJs();
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
    let currentLineItems: Array<{ str: string; x: number; width: number }> = [];

    const flushLine = () => {
      if (currentLineItems.length === 0) return;
      // Sort items on the same horizontal baseline by X-coordinate
      currentLineItems.sort((a, b) => a.x - b.x);

      let lineStr = '';
      for (let j = 0; j < currentLineItems.length; j++) {
        const cur = currentLineItems[j];
        if (j === 0) {
          lineStr += cur.str;
        } else {
          const prev = currentLineItems[j - 1];
          const gap = cur.x - (prev.x + prev.width);
          // Only insert space if neither side already has a space and the gap indicates a word break (> 2px)
          if (prev.str.endsWith(' ') || cur.str.startsWith(' ')) {
            lineStr += cur.str;
          } else if (gap > 2) {
            lineStr += ' ' + cur.str;
          } else {
            lineStr += cur.str;
          }
        }
      }
      lines.push(lineStr.trim());
      currentLineItems = [];
    };

    for (const item of items) {
      if (!('str' in item)) continue;
      const str = item.str;
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const width = item.width || 0;

      if (currentY === null || Math.abs(y - currentY) > 4) {
        flushLine();
        currentY = y;
        currentLineItems = [{ str, x, width }];
      } else {
        currentLineItems.push({ str, x, width });
      }
    }
    flushLine();
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
 * Correctly interprets PDF TJ array spacing operands so words are not fragmented into isolated characters.
 */
function extractPdfStreamText(buffer: Buffer): string {
  try {
    const content = buffer.toString('binary');
    const lines: string[] = [];

    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(content)) !== null) {
      const rawStream = Buffer.from(match[1], 'binary');
      let decompressed: Buffer;
      try {
        decompressed = zlib.inflateSync(new Uint8Array(rawStream));
      } catch {
        try {
          decompressed = zlib.inflateRawSync(new Uint8Array(rawStream));
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
          let blockText = '';

          // 1. Match TJ array operators: [(str) 20 (str)] TJ
          const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
          let arrMatch: RegExpExecArray | null;
          while ((arrMatch = arrayRegex.exec(block)) !== null) {
            const innerStr = arrMatch[1];
            // In PDF TJ operators, tokens are strings in parentheses or numeric font-relative kerning shifts
            const tokenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|(-?\d+(?:\.\d+)?)/g;
            let tokenMatch: RegExpExecArray | null;
            let currentRun = '';
            while ((tokenMatch = tokenRegex.exec(innerStr)) !== null) {
              if (tokenMatch[1] !== undefined) {
                const clean = tokenMatch[1]
                  .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                  .replace(/\\(.)/g, '$1');
                currentRun += clean;
              } else if (tokenMatch[2] !== undefined) {
                const spacing = parseFloat(tokenMatch[2]);
                // In PDF TJ syntax, negative offset moves forward in text space.
                // Displacements <= -180 units represent word spaces; smaller numbers are glyph kerning.
                if (spacing <= -180) {
                  currentRun += ' ';
                }
              }
            }
            if (currentRun.trim()) {
              blockText += (blockText ? ' ' : '') + currentRun.trim();
            }
          }

          // 2. Match single string operators: (str) Tj or (str) ' or (str) "
          const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|["\x27])/g;
          let tjMatch: RegExpExecArray | null;
          while ((tjMatch = tjRegex.exec(block)) !== null) {
            const clean = tjMatch[1]
              .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
              .replace(/\\(.)/g, '$1')
              .trim();
            if (clean) {
              blockText += (blockText ? ' ' : '') + clean;
            }
          }

          if (blockText.trim()) {
            lines.push(blockText.trim());
          }
        }
      }
    }

    return lines.join('\n');
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
    // Heal PDF kerning in email addresses (strictly bounded to avoid consuming previous lines/words)
    .replace(/(?:^|[ \t|•·])([a-zA-Z0-9._%+-]{1,40})\s*@\s*([a-zA-Z0-9.-]{1,40})\s*\.\s*([a-zA-Z]{2,10})\b/g, (match, local, domain, tld) => {
      return ` ${local.replace(/\s+/g, '')}@${domain.replace(/\s+/g, '')}.${tld}`;
    })
    // Heal PDF spacing before commas (e.g. "Jersey City ,   NJ" -> "Jersey City, NJ")
    .replace(/\s+,\s*/g, ', ')
    // Heal PDF kerning in common broken words
    .replace(/\bPharmacis\s+t\b/gi, 'Pharmacist')
    .replace(/\bdocumentatio\s+n\b/gi, 'documentation')
    .replace(/\bi\s+nteractions?\b/gi, 'interactions')
    // Heal PDF spaced letter sequences (e.g. "R e gul a to r y" -> "Regulatory")
    .replace(/\b([A-Z][a-z]{0,2})\s+([a-z]{1,4}(?:\s+[a-z]{1,4}){1,5})\b/g, (match, prefix, rest) => {
      const merged = prefix + rest.replace(/\s+/g, '');
      return merged.length > 3 ? merged : match;
    })
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
