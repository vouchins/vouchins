'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResumeDocument } from '@/lib/jobs/types';
import { toast } from 'sonner';

interface PDFDownloadButtonProps {
  document: ResumeDocument;
  className?: string;
}

export function PDFDownloadButton({ document, className }: PDFDownloadButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating vector ATS PDF...');

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ResumePDFDocument } = await import('./pdf-document');

      const blob = await pdf(<ResumePDFDocument document={document} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      const safeName = (document.contact.fullName || 'Candidate')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}_ATS_Resume.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Vector PDF downloaded with 100% selectable text!', { id: toastId });
    } catch (err: any) {
      console.warn('React-PDF export encountered an issue, falling back to print dialog:', err);
      toast.dismiss(toastId);
      // Safe fallback: Browser native print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isExporting}
      className={`h-9 px-4 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white gap-2 transition-all shadow-xs ${className || ''}`}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4FD1C5]" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5 text-[#4FD1C5]" />
          Download PDF
        </>
      )}
    </Button>
  );
}
