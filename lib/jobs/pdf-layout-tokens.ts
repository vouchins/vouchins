import { DEFAULT_EXPORT_CONFIG, ResumeExportConfig } from './types';

export const MAX_UNBREAKABLE_CHARS = 450;

export interface PdfLayoutTokens {
  pageSize: 'LETTER' | 'A4';
  pageWidthPt: number;
  pageHeightPt: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  lineHeight: number;
  summaryLineHeight: number;
  sectionMarginBottom: number;
  roleMarginBottom: number;
  bulletMarginBottom: number;
  bulletIndent: number;
  accentColor: string;
  fontSizes: ResumeExportConfig['fontSizes'];
}

export function getPdfLayoutTokens(
  config: ResumeExportConfig = DEFAULT_EXPORT_CONFIG
): PdfLayoutTokens {
  const {
    pageSize = 'LETTER',
    template = 'standard',
    accentColor = '#0A1B5C',
    fontSizes = DEFAULT_EXPORT_CONFIG.fontSizes,
  } = config;

  const isCompact = template === 'compact';
  const isStructured = template === 'structured';

  return {
    pageSize,
    pageWidthPt: pageSize === 'A4' ? 595.28 : 612,
    pageHeightPt: pageSize === 'A4' ? 841.89 : 792,
    paddingTop: isCompact ? 18 : isStructured ? 20 : 22,
    paddingBottom: isCompact ? 20 : isStructured ? 22 : 22,
    paddingLeft: isCompact ? 26 : isStructured ? 28 : 28,
    paddingRight: isCompact ? 26 : isStructured ? 28 : 28,
    lineHeight: isCompact || isStructured ? 1.18 : 1.2,
    summaryLineHeight: isCompact || isStructured ? 1.18 : 1.22,
    sectionMarginBottom: isCompact ? 5 : isStructured ? 5 : 6,
    roleMarginBottom: isCompact ? 4 : isStructured ? 4.5 : 5,
    bulletMarginBottom: isCompact ? 1.5 : isStructured ? 1.5 : 2,
    bulletIndent: 9,
    accentColor,
    fontSizes,
  };
}

/**
 * Render-time WinAnsi sanitizer for built-in PDF fonts (Times-Roman, Helvetica, Courier).
 * Preserves WinAnsi characters (en-dash, em-dash, smart quotes, bullet, Latin-1 accents)
 * while converting missing symbols like Indian Rupee (₹) and math arrows cleanly.
 */
export function sanitizePdfText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\u20B9/g, 'Rs. ') // ₹ -> Rs.
    .replace(/\u2192/g, '->')   // →
    .replace(/\u2190/g, '<-')   // ←
    .replace(/\u2265/g, '>=')   // ≥
    .replace(/\u2264/g, '<=')   // ≤
    .replace(/[\u2713\u2714]/g, '*') // ✓ ✔
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // strip zero-width chars
}

/**
 * Splits only pathological unbroken tokens (> 45 chars) at slash/comma boundaries
 * so they never clip outside page margins. Normal words & typical URLs stay intact.
 */
export function splitPathologicalToken(token: string): string[] {
  if (!token || token.length <= 45) return [token];
  if (token.includes('/')) {
    return token.split(/(?<=\/)/).filter(Boolean);
  }
  if (token.includes(',')) {
    return token.split(/(?<=,)/).filter(Boolean);
  }
  const chunks: string[] = [];
  for (let i = 0; i < token.length; i += 40) {
    chunks.push(token.slice(i, i + 40));
  }
  return chunks;
}
