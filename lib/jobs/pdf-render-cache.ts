import React from 'react';
import { DEFAULT_EXPORT_CONFIG, ResumeDocument, ResumeExportConfig } from './types';

export interface CachedPdfRender {
  cacheKey: string;
  blob: Blob;
  numPages: number;
  renderMs: number;
}

const MAX_CACHE_ENTRIES = 3;
const renderCache = new Map<string, CachedPdfRender>();
const inFlightRenders = new Map<string, Promise<CachedPdfRender>>();

/**
 * Builds a deterministic, property-order-independent cache key from docVersion and config.
 */
export function buildPdfCacheKey(
  docVersion: number | string,
  config: ResumeExportConfig = DEFAULT_EXPORT_CONFIG
): string {
  const fs = config.fontSizes || DEFAULT_EXPORT_CONFIG.fontSizes;
  return [
    String(docVersion),
    config.pageSize,
    config.template,
    config.accentColor,
    config.accentScope,
    config.fontFamily,
    fs.name,
    fs.sectionHeaders,
    fs.subHeaders,
    fs.bodyText,
    config.dateFormat,
    config.bulletStyle,
  ].join('|');
}

export async function loadPdfJsClient() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined' && pdfjs?.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.mjs',
        import.meta.url
      ).toString();
    } catch {
      // Fallback: pre-register in-process worker if URL resolution isn't available
      if (!(globalThis as any).pdfjsWorker) {
        try {
          // @ts-expect-error worker mjs has no .d.ts
          (globalThis as any).pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
        } catch {
          // ignore
        }
      }
    }
  }
  return pdfjs;
}

export function getCachedPdfRender(cacheKey: string): CachedPdfRender | undefined {
  return renderCache.get(cacheKey);
}

export function clearPdfRenderCache() {
  renderCache.clear();
  inFlightRenders.clear();
}

/**
 * Renders ResumePDFDocument to a Blob and reads its exact numPages via pdfjs-dist
 * (using a fresh ArrayBuffer so the worker never detaches shared buffers).
 * Bounded LRU cache (last 3 entries) + in-flight promise deduplication per cacheKey.
 */
export async function getOrRenderPdf(
  document: ResumeDocument,
  config: ResumeExportConfig = DEFAULT_EXPORT_CONFIG,
  docVersion: number | string = 0
): Promise<CachedPdfRender> {
  const cacheKey = buildPdfCacheKey(docVersion, config);

  const existing = renderCache.get(cacheKey);
  if (existing) {
    // Refresh LRU position
    renderCache.delete(cacheKey);
    renderCache.set(cacheKey, existing);
    return existing;
  }

  const inFlight = inFlightRenders.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const [{ pdf }, { ResumePDFDocument }, pdfjs] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/jobs/pdf-document'),
      loadPdfJsClient(),
    ]);

    const element = React.createElement(ResumePDFDocument, { document, config });
    const blob = await pdf(element as any).toBlob();

    // Fresh ArrayBuffer copy for pdfjs worker
    const arrayBuffer = await blob.arrayBuffer();
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), verbosity: 0 }).promise;
    const numPages = pdfDoc.numPages || 1;
    await pdfDoc.destroy();

    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result: CachedPdfRender = {
      cacheKey,
      blob,
      numPages,
      renderMs: Math.round(endedAt - startedAt),
    };

    // Enforce bounded LRU cache
    renderCache.set(cacheKey, result);
    if (renderCache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = renderCache.keys().next().value;
      if (oldestKey) renderCache.delete(oldestKey);
    }

    return result;
  })();

  inFlightRenders.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlightRenders.delete(cacheKey);
  }
}
