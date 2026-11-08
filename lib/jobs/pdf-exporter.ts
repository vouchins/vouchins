import React from 'react';
import { ResumeDocument, ResumeExportConfig, DEFAULT_EXPORT_CONFIG } from '@/lib/jobs/types';

/**
 * Generates and downloads a clean vector ATS-compliant PDF in the browser.
 * Uses @react-pdf/renderer and ResumePDFDocument.
 */
export async function exportResumeAsPDF(
  document: ResumeDocument,
  resumeName?: string,
  config: ResumeExportConfig = DEFAULT_EXPORT_CONFIG
): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer');
  const { ResumePDFDocument } = await import('@/components/jobs/pdf-document');

  const element = React.createElement(ResumePDFDocument, { document, config });
  const blob = await pdf(element as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;

  const candidateName = document.contact?.fullName || resumeName || 'Candidate';
  const safeName = candidateName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeName}_ATS_Resume.pdf`;

  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
