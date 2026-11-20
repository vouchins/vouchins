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

async function parseWithPdfParse(buffer: Buffer): Promise<{ rawText: string; pageCount: number }> {
  const { PDFParse } = await import('pdf-parse');
  const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const parser = new (PDFParse as any)({ data: uint8Data });
  const result = await parser.getText();
  return {
    rawText: result.text || '',
    pageCount: result.pages?.length || 1,
  };
}

/**
 * Resilient fallback parser that decompresses FlateDecode (zlib) streams and extracts raw text
 * if standard PDF parsing fails in restricted environments.
 * Processes stream operations sequentially to preserve line layout, text coordinates, and ligatures.
 */
function decodePdfStreamString(s: string): string {
  return s
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\(.)/g, '$1')
    .replace(/\x1C/g, 'fi')
    .replace(/\x1D/g, 'fl')
    .replace(/\x1E/g, 'ffi')
    .replace(/\x1F/g, 'ffl')
    .replace(/\x15/g, ' - ')
    .replace(/[\x88\x95\uF0B7\u25AA]/g, '• ');
}

function parseStreamSequential(streamText: string): string[] {
  const lines: string[] = [];
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btEtRegex.exec(streamText)) !== null) {
    const block = btMatch[1];
    let currentLine = '';
    let lastY: number | null = null;

    // Tokenize stream operators:
    // 1) [(...)...] TJ (array of strings and kerning offsets)
    // 2) (...) Tj or (...) ' or (...) " (string showing operators)
    // 3) tx ty Td / TD (move text position)
    // 4) a b c d e f Tm (set text matrix)
    // 5) T* (move to next line)
    const opRegex = /\[([\s\S]*?)\]\s*TJ|\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(Tj|["\x27])|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(Td|TD)|(-?\d+(?:\.\d+)?\s+){5}(-?\d+(?:\.\d+)?)\s+Tm|(T\*)/g;
    let opMatch: RegExpExecArray | null;

    const flushLine = () => {
      const trimmed = currentLine.trim();
      if (trimmed) {
        lines.push(trimmed);
      }
      currentLine = '';
    };

    while ((opMatch = opRegex.exec(block)) !== null) {
      if (opMatch[1] !== undefined) {
        // TJ array
        const innerStr = opMatch[1];
        const tokenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|(-?\d+(?:\.\d+)?)/g;
        let tokenMatch: RegExpExecArray | null;
        let run = '';
        while ((tokenMatch = tokenRegex.exec(innerStr)) !== null) {
          if (tokenMatch[1] !== undefined) {
            run += decodePdfStreamString(tokenMatch[1]);
          } else if (tokenMatch[2] !== undefined) {
            const spacing = parseFloat(tokenMatch[2]);
            if (spacing <= -180) {
              run += ' ';
            }
          }
        }
        if (run) {
          currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + run;
        }
      } else if (opMatch[2] !== undefined) {
        // Tj or ' or "
        const str = decodePdfStreamString(opMatch[2]);
        const op = opMatch[3];
        if (op === "'" || op === '"') {
          flushLine();
        }
        currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + str;
      } else if (opMatch[6] !== undefined) {
        // Td or TD: opMatch[4] is tx, opMatch[5] is ty
        const ty = parseFloat(opMatch[5]);
        if (Math.abs(ty) > 1) {
          flushLine();
        }
      } else if (opMatch[8] !== undefined) {
        // Tm: opMatch[8] is f (vertical translation)
        const y = parseFloat(opMatch[8]);
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          flushLine();
        }
        lastY = y;
      } else if (opMatch[9] !== undefined) {
        // T*
        flushLine();
      }
    }
    flushLine();
  }
  return lines;
}

function extractPdfStreamText(buffer: Buffer): string {
  try {
    const content = buffer.toString('binary');
    const allLines: string[] = [];

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
        const streamLines = parseStreamSequential(streamText);
        if (streamLines.length > 0) {
          allLines.push(...streamLines);
        }
      }
    }

    return allLines.join('\n');
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
    // Default to PDF parsing with a 3-tier resilient parser
    detectedFormat = 'pdf';
    try {
      const parsed = await parsePdfBuffer(buffer);
      if (parsed.rawText && parsed.rawText.trim().length >= 50) {
        rawText = parsed.rawText;
        pageCount = parsed.pageCount;
      } else {
        throw new Error('parsePdfBuffer returned insufficient text');
      }
    } catch (pdfErr: any) {
      console.warn('[PDF Extraction Warning]: parsePdfBuffer failed or returned insufficient text, trying PDFParse...', pdfErr?.message);
      try {
        const parsed = await parseWithPdfParse(buffer);
        if (parsed.rawText && parsed.rawText.trim().length >= 50) {
          rawText = parsed.rawText;
          pageCount = parsed.pageCount;
        } else {
          throw new Error('PDFParse returned insufficient text');
        }
      } catch (parseErr: any) {
        console.warn('[PDF Extraction Warning]: PDFParse fallback failed, trying stream decompressor...', parseErr?.message);
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
  }

  // Normalize text: clean irregular spacing, control chars, ligatures, and fix null-byte glyph delimiters
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\x1C/g, 'fi')
    .replace(/\x1D/g, 'fl')
    .replace(/\x1E/g, 'ffi')
    .replace(/\x1F/g, 'ffl')
    .replace(/\x15/g, ' - ')
    .replace(/[\x88\x95\uF0B7\u25AA]/g, '• ')
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
