'use client';

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResumeDocument } from '@/lib/jobs/types';
import { ExportResumeDialog } from './export-resume-dialog';

interface PDFDownloadButtonProps {
  document: ResumeDocument;
  className?: string;
  resumeName?: string;
}

export function PDFDownloadButton({
  document,
  className,
  resumeName,
}: PDFDownloadButtonProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsExportDialogOpen(true)}
        className={`h-9 px-4 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#11287e] text-white gap-2 transition-all shadow-xs ${className || ''}`}
      >
        <Download className="h-3.5 w-3.5 text-[#4FD1C5]" />
        <span>Download PDF</span>
      </Button>

      {isExportDialogOpen && (
        <ExportResumeDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          document={document}
          resumeName={resumeName}
        />
      )}
    </>
  );
}
