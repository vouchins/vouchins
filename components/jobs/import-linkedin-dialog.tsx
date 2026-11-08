'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileUp,
  Link2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Linkedin,
} from 'lucide-react';
import { toast } from 'sonner';
import { ResumeDocument, createDefaultResumeDocument } from '@/lib/jobs/types';
import { supabase } from '@/lib/supabase/browser';

interface ImportLinkedinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLinkedinUrl?: string;
  onProfileImported: (importedDoc?: ResumeDocument, linkedinUrl?: string) => void;
}

export function ImportLinkedinDialog({
  isOpen,
  onClose,
  currentLinkedinUrl = '',
  onProfileImported,
}: ImportLinkedinDialogProps) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'url'>('pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState(currentLinkedinUrl);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize internal state when prop changes
  React.useEffect(() => {
    if (currentLinkedinUrl) {
      setLinkedinUrl(currentLinkedinUrl);
    }
  }, [currentLinkedinUrl, isOpen]);

  // Helper for auth headers
  async function getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    } catch { }
    return {};
  }

  // Handle LinkedIn PDF Upload and Heuristic / AI Extraction
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file exported from LinkedIn.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Reading LinkedIn profile PDF...');

    try {
      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);

      // 1. Extract text and parse structured candidate document
      const extractRes = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      if (!extractRes.ok) {
        const errData = await extractRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to parse LinkedIn PDF text.');
      }

      const extractData = await extractRes.json();
      setStatusMessage('Extracting career history, skills, and education...');

      let document: ResumeDocument = extractData.document;

      // 2. Optionally attempt AI normalization if allowed (gracefully fall back if cost guard or rate limit kicks in)
      try {
        const evalRes = await fetch('/api/jobs/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            rawText: extractData.rawText,
            title: 'LinkedIn Imported Profile',
          }),
        });

        if (evalRes.ok) {
          const evalData = await evalRes.json();
          if (evalData.document || evalData.doc) {
            document = evalData.document || evalData.doc;
          }
        }
      } catch (evalErr) {
        console.info('Using heuristic document extraction for LinkedIn PDF:', evalErr);
      }

      if (!document) {
        throw new Error('Could not extract structured data from LinkedIn PDF.');
      }

      // Also persist to candidate profile API
      await fetch('/api/jobs/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          document,
          userUpdates: {
            linkedin_url: document.contact.linkedinUrl || linkedinUrl,
          },
        }),
      });

      toast.success('Successfully imported your profile from LinkedIn!');
      onProfileImported(document, document.contact.linkedinUrl || linkedinUrl);
      onClose();
    } catch (err: any) {
      console.error('LinkedIn PDF import failed:', err);
      toast.error(err.message || 'Failed to import from LinkedIn PDF.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // Handle URL Save & Verification
  const handleSaveLinkedinUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkedinUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a valid LinkedIn URL.');
      return;
    }

    if (!trimmed.toLowerCase().includes('linkedin.com/in/')) {
      toast.error('Please enter a valid profile URL (e.g., https://www.linkedin.com/in/your-name)');
      return;
    }

    setIsProcessing(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/jobs/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          userUpdates: {
            linkedin_url: trimmed,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update LinkedIn URL.');
      }

      toast.success('LinkedIn profile URL saved and insider network refreshed!');
      // Only pass the URL without clearing existing candidate sections
      onProfileImported(undefined, trimmed);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save LinkedIn URL.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-xl bg-white border border-neutral-200 rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#0077B5]/10 text-[#0077B5] flex items-center justify-center shrink-0">
              <Linkedin className="h-5 w-5 fill-[#0077B5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-neutral-900 tracking-tight">
                Import from LinkedIn
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Sync your verified experience, education, and insider connection paths.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-2xl my-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'pdf'
                ? 'bg-white text-[#0A1B5C] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Upload LinkedIn PDF</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'url'
                ? 'bg-white text-[#0A1B5C] shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>LinkedIn URL</span>
          </button>
        </div>

        {/* TAB 1: Upload LinkedIn PDF */}
        {activeTab === 'pdf' && (
          <div className="space-y-4 pt-1">
            {/* Step-by-Step Instructions */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
              <span className="font-extrabold text-neutral-800 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-[#0A1B5C]" />
                How to download your official LinkedIn PDF (30 seconds):
              </span>
              <ol className="list-decimal pl-5 space-y-1 text-neutral-600 font-medium leading-relaxed">
                <li>
                  Go to your profile on{' '}
                  <a
                    href="https://www.linkedin.com/in/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0A1B5C] font-bold underline inline-flex items-center gap-0.5"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Click the <strong>&ldquo;More&rdquo;</strong> button located directly beneath your name.
                </li>
                <li>
                  Select <strong>&ldquo;Save to PDF&rdquo;</strong> from the dropdown menu.
                </li>
                <li>Drop the downloaded PDF file into the box below.</li>
              </ol>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${isDragging
                  ? 'border-[#0A1B5C] bg-[#0A1B5C]/5'
                  : 'border-neutral-300 hover:border-neutral-400 bg-white'
                }`}
            >
              <input
                type="file"
                accept=".pdf"
                id="linkedin-pdf-file-input"
                className="hidden"
                disabled={isProcessing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              {isProcessing ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  <Loader2 className="h-7 w-7 text-[#0A1B5C] animate-spin" />
                  <span className="text-xs font-bold text-neutral-700">{statusMessage}</span>
                  <span className="text-[11px] text-neutral-400">
                    Extracting all work experiences, universities, and skills...
                  </span>
                </div>
              ) : (
                <label
                  htmlFor="linkedin-pdf-file-input"
                  className="flex flex-col items-center gap-2 cursor-pointer w-full"
                >
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <FileUp className="h-6 w-6 text-[#0A1B5C]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Click to choose or drag & drop your LinkedIn PDF
                    </span>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Official LinkedIn &ldquo;Save to PDF&rdquo; format supported (up to 5MB)
                    </span>
                  </div>
                  <span className="mt-1 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-black shadow-xs transition-all active:scale-95">
                    Browse File
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LinkedIn Profile URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleSaveLinkedinUrl} className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 text-xs text-neutral-700 leading-relaxed font-medium space-y-1">
              <span className="font-extrabold text-[#0A1B5C] block">Insider Referral Network Match</span>
              <p>
                We use your LinkedIn profile to uncover alumni and verified insider contacts at companies
                currently hiring so you can request employee referrals in 1 click.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-800 block mb-1.5">
                LinkedIn Profile URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://www.linkedin.com/in/john-doe"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 text-xs font-medium rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C]"
                />
                <Linkedin className="h-4 w-4 text-[#0077B5] absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                E.g. https://www.linkedin.com/in/username
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 text-xs font-black rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Sync Network</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
