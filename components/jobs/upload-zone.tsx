'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFileUpload: (file: File) => Promise<void>;
  onLoadSample: () => void;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function UploadZone({
  onFileUpload,
  onLoadSample,
  isLoading = false,
  loadingMessage,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const validateAndProcess = async (file: File) => {
    const validExtensions = ['.pdf', '.docx'];
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExt) {
      setErrorMsg('Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5MB limit. Please upload a smaller resume.');
      return;
    }

    await onFileUpload(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-12 w-full max-w-2xl mx-auto">
      {/* Upload Drop Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full cursor-pointer flex flex-col items-center justify-center gap-4 p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all duration-300 text-center ${isDragOver
            ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 scale-[1.01]'
            : 'border-neutral-300 hover:border-[#0A1B5C] bg-white hover:bg-neutral-50/50 shadow-sm'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-neutral-100 text-[#0A1B5C] shadow-inner">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#0A1B5C]" />
          ) : (
            <UploadCloud className="h-8 w-8" />
          )}
        </div>

        <div className="flex flex-col gap-1 max-w-sm">
          <span className="text-base font-bold text-neutral-900">
            {isLoading
              ? (loadingMessage || 'Auditing and persisting to database...')
              : 'Upload your resume for AI intelligence'}
          </span>
          <span className="text-xs text-neutral-500">
            {isLoading
              ? 'Analyzing ATS keywords and calculating Google XYZ metrics'
              : 'Drag and drop your PDF or DOCX file here, or click to browse. Max 5MB.'}
          </span>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Zero-friction sample action */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 text-center">
        <span className="text-xs text-neutral-400">or explore instantly with sample data:</span>
        <Button
          type="button"
          variant="outline"
          onClick={onLoadSample}
          disabled={isLoading}
          className="h-9 px-4 text-xs font-semibold text-[#0A1B5C] border-[#0A1B5C]/30 hover:bg-[#0A1B5C]/5 gap-2 rounded-xl transition-all"
        >
          Use Sample Resume
        </Button>
      </div>
    </div>
  );
}
