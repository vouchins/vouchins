'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  GraduationCap,
  Sparkles,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { ResumeDocument } from '@/lib/jobs/types';
import { exportResumeAsPDF } from '@/lib/jobs/pdf-exporter';
import { ExportResumeDialog } from './export-resume-dialog';
import { toast } from 'sonner';

interface PublicResumeViewerProps {
  resumeId: string;
  title: string;
  document: ResumeDocument;
  isVerifiedCandidate?: boolean;
}

export function PublicResumeViewer({
  resumeId,
  title,
  document,
  isVerifiedCandidate = false,
}: PublicResumeViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const contact = document.contact || {
    fullName: 'Candidate',
    email: '',
    phone: '',
    location: '',
  };

  const candidateName = contact.fullName || title || 'Candidate';

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(url);
      setHasCopied(true);
      toast.success('Shareable resume link copied to clipboard!');
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error('Could not copy link to clipboard');
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    const toastId = toast.loading('Generating ATS-compliant PDF...');
    try {
      await exportResumeAsPDF(document, candidateName);
      toast.success('Resume PDF downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Download PDF error:', err);
      toast.error('Failed to generate PDF. You can also use the Print button.', { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C] flex flex-col">
      {/* 1. Sticky Navigation & Action Toolbar (Hidden when printing) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 px-4 sm:px-6 lg:px-8 py-3 print:hidden shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Brand & Resume Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <Link
              href="/"
              className="flex items-center group transition-opacity hover:opacity-90 active:scale-95 shrink-0"
              title="Vouchins"
            >
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={125}
                height={32}
                className="h-7 sm:h-8 w-auto object-contain"
                priority
              />
            </Link>

            {isVerifiedCandidate && (
              <>
                <span className="h-4 w-px bg-neutral-200 hidden sm:block" />

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Verified Candidate Resume</span>
                </div>
              </>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Copy Shareable Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 bg-white"
              title="Copy shareable resume link"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 bg-white"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5 text-neutral-500" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Customize / Template Options */}
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-[#0A1B5C]/20 hover:bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 bg-white"
              title="Customize styling or layout"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#0A1B5C]" />
              <span className="hidden sm:inline">Styles</span>
            </button>

            {/* Primary Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 sm:px-5 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#4FD1C5]" />
              <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Printable Resume Canvas */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 flex justify-center print:p-0 print:m-0">
        <article className="w-full max-w-4xl bg-white rounded-3xl sm:border border-neutral-200/80 p-6 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none space-y-7">
          {/* Header & Contact Information */}
          <header className="border-b border-neutral-200 pb-6 space-y-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 tracking-tight">
                {candidateName}
              </h1>
              {title && title !== candidateName && (
                <p className="text-sm sm:text-base font-bold text-[#0A1B5C] mt-0.5">
                  {title}
                </p>
              )}
            </div>

            {/* Contact details row */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-neutral-600 font-medium">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 hover:text-[#0A1B5C] transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#0A1B5C] transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.location && (
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <span>{contact.location}</span>
                </div>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl.startsWith('http') ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#0A1B5C] transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5 text-[#0A1B5C] shrink-0" />
                  <span>LinkedIn</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              )}
              {contact.githubUrl && (
                <a
                  href={contact.githubUrl.startsWith('http') ? contact.githubUrl : `https://${contact.githubUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#0A1B5C] transition-colors"
                >
                  <Github className="h-3.5 w-3.5 text-neutral-800 shrink-0" />
                  <span>GitHub</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              )}
              {contact.portfolioUrl && (
                <a
                  href={contact.portfolioUrl.startsWith('http') ? contact.portfolioUrl : `https://${contact.portfolioUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[#0A1B5C] transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-[#0A1B5C] shrink-0" />
                  <span>Portfolio</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              )}
            </div>
          </header>

          {/* Professional Summary */}
          {document.summary && (
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Professional Summary</span>
              </h2>
              <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                {document.summary}
              </p>
            </section>
          )}

          {/* Work Experience */}
          {document.experience && document.experience.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Experience</span>
              </h2>

              <div className="space-y-5">
                {document.experience.map((exp, idx) => (
                  <div key={exp.id || idx} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">
                          {exp.roleTitle}
                        </h3>
                        <p className="text-xs font-semibold text-[#0A1B5C]">
                          {exp.company}
                          {exp.location ? ` · ${exp.location}` : ''}
                        </p>
                      </div>

                      <div className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
                        {exp.startDate} - {exp.endDate || (exp.isCurrent ? 'Present' : '')}
                      </div>
                    </div>

                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc list-outside pl-4 space-y-1 text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                        {exp.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="pl-1">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Technical Skills */}
          {document.skills && document.skills.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Skills & Competencies</span>
              </h2>

              <div className="space-y-2">
                {document.skills.map((skillGroup, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-3 text-xs">
                    <span className="font-bold text-neutral-900 sm:w-36 shrink-0">
                      {skillGroup.category}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {skillGroup.items.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {document.projects && document.projects.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Key Projects</span>
              </h2>

              <div className="space-y-4">
                {document.projects.map((proj, idx) => (
                  <div key={proj.id || idx} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-neutral-900">
                          {proj.title}
                        </h3>
                        {proj.liveUrl && (
                          <a
                            href={proj.liveUrl.startsWith('http') ? proj.liveUrl : `https://${proj.liveUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#0A1B5C] hover:underline flex items-center gap-0.5"
                          >
                            <span>Live</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        {proj.repoUrl && (
                          <a
                            href={proj.repoUrl.startsWith('http') ? proj.repoUrl : `https://${proj.repoUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-neutral-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Code</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>

                      {proj.techStack && proj.techStack.length > 0 && (
                        <div className="text-[11px] font-semibold text-neutral-500">
                          {proj.techStack.join(' · ')}
                        </div>
                      )}
                    </div>

                    {proj.bullets && proj.bullets.length > 0 && (
                      <ul className="list-disc list-outside pl-4 space-y-1 text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal">
                        {proj.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="pl-1">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {document.education && document.education.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Education</span>
              </h2>

              <div className="space-y-3">
                {document.education.map((edu, idx) => (
                  <div key={edu.id || idx} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">
                        {edu.degree}
                        {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}
                      </h3>
                      <p className="text-xs font-semibold text-[#0A1B5C]">
                        {edu.institution}
                        {edu.gpaOrHonors ? ` · ${edu.gpaOrHonors}` : ''}
                      </p>
                    </div>

                    <div className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
                      {edu.startDate ? `${edu.startDate} - ` : ''}{edu.endDate}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {document.certifications && document.certifications.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#0A1B5C] border-b border-neutral-100 pb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0A1B5C]" />
                <span>Certifications & Credentials</span>
              </h2>

              <ul className="list-disc list-outside pl-4 space-y-1 text-xs sm:text-sm text-neutral-700">
                {document.certifications.map((cert, idx) => (
                  <li key={idx} className="pl-1">
                    {cert}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Footer watermark */}
          <footer className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-400">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={80}
                height={20}
                className="h-3.5 w-auto object-contain opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
              />
              <span>
                {isVerifiedCandidate
                  ? 'Verified Candidate Resume - Corporate Referral & Career Acceleration Platform'
                  : 'Candidate Resume - Corporate Referral & Career Acceleration Platform'}
              </span>
            </div>
            <span>https://www.vouchins.com</span>
          </footer>
        </article>
      </main>

      {/* Export Resume Customization Dialog */}
      {isExportDialogOpen && (
        <ExportResumeDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          document={document}
          resumeName={candidateName}
        />
      )}
    </div>
  );
}

