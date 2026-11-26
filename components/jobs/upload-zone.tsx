'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AI_LOADING_PHRASES = [
  'Reading resume layout & sections...',
  'Extracting skills, tools & years of experience...',
  'Structuring career timeline for ATS parity...',
  'Running Google XYZ impact & brevity audit...',
  'Calibrating seniority & job match signals...',
];

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
  const [phraseIndex, setPhraseIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      setPhraseIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % AI_LOADING_PHRASES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsDragOver(false);
    setErrorMsg(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcess(file);
    }
    e.target.value = '';
  };

  const validateAndProcess = async (file: File) => {
    if (isLoading) return;
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
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-disabled={isLoading}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isLoading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLoading) fileInputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`w-full flex flex-col items-center justify-center gap-4 p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all duration-300 text-center ${
          isLoading
            ? 'cursor-not-allowed border-[#0A1B5C]/30 bg-neutral-50/80 opacity-90'
            : isDragOver
            ? 'cursor-pointer border-[#0A1B5C] bg-[#0A1B5C]/5 scale-[1.01]'
            : 'cursor-pointer border-neutral-300 hover:border-[#0A1B5C] bg-white hover:bg-neutral-50/50 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          disabled={isLoading}
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-[#0A1B5C]/5 text-[#0A1B5C] shadow-inner">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#0A1B5C]" />
          ) : (
            <UploadCloud className="h-8 w-8" />
          )}
        </div>

        <div className="flex flex-col gap-1.5 max-w-sm">
          <span className="text-base font-bold text-neutral-900">
            {isLoading
              ? (loadingMessage || 'Processing your resume with AI...')
              : 'Upload your resume for AI intelligence'}
          </span>
          {isLoading ? (
            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#0A1B5C]">
              <Sparkles className="h-3.5 w-3.5 text-[#4FD1C5] animate-pulse shrink-0" />
              <span>{AI_LOADING_PHRASES[phraseIndex]}</span>
            </span>
          ) : (
            <span className="text-xs text-neutral-500">
              Drag and drop your PDF or DOCX file here, or click to browse. Max 5MB.
            </span>
          )}
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
