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
  ResumeDocument,
  ResumeExportConfig,
  DEFAULT_EXPORT_CONFIG,
  ResumeTemplateId,
  ResumePageSize,
  ResumeFontFamily,
  ResumeAccentScope,
  ResumeDateFormat,
  ResumeBulletStyle,
} from '@/lib/jobs/types';
import {
  CheckCircle2,
  Download,
  Loader2,
  ChevronDown,
  Palette,
  Type,
  FileText,
  Calendar,
  ListFilter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportResumeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: ResumeDocument;
  resumeName?: string;
}

const PRESET_COLORS = [
  { name: 'Vouchins Navy', hex: '#0A1B5C' },
  { name: 'Classic Crimson', hex: '#6B1010' },
  { name: 'Royal Blue', hex: '#1E3A8A' },
  { name: 'Forest Emerald', hex: '#065F46' },
  { name: 'Slate Gray', hex: '#334155' },
  { name: 'Charcoal Minimal', hex: '#111827' },
];

/**
 * Format resume date strings based on selected user preference.
 */
function formatPreviewDate(dateStr: string, format: ResumeDateFormat): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (trimmed.toLowerCase() === 'present' || trimmed.toLowerCase() === 'current') {
    return 'Present';
  }

  const dateMatch = trimmed.match(/^([A-Za-z]+|\d{1,2})?[/-]?\s*(\d{4})$/);
  if (!dateMatch) return trimmed;

  const rawMonth = dateMatch[1];
  const year = dateMatch[2];
  if (!rawMonth) return year;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  let monthIndex = -1;
  const numMonth = parseInt(rawMonth, 10);
  if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) {
    monthIndex = numMonth - 1;
  } else {
    monthIndex = shortMonths.findIndex(
      (m) => m.toLowerCase() === rawMonth.toLowerCase().slice(0, 3)
    );
  }

  if (monthIndex === -1) return trimmed;

  switch (format) {
    case 'short':
      return `${shortMonths[monthIndex]} ${year}`;
    case 'full':
      return `${monthNames[monthIndex]} ${year}`;
    case 'numeric':
      return `${String(monthIndex + 1).padStart(2, '0')}/${year}`;
    case 'year':
      return year;
    default:
      return `${shortMonths[monthIndex]} ${year}`;
  }
}

export function ExportResumeDialog({
  isOpen,
  onClose,
  document,
  resumeName,
}: ExportResumeDialogProps) {
  const [config, setConfig] = useState<ResumeExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);

  const handleDownload = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Generating vector ATS PDF with selectable text...');

    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ResumePDFDocument } = await import('./pdf-document');

      const blob = await pdf(<ResumePDFDocument document={document} config={config} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      const safeName = (document.contact.fullName || resumeName || 'Candidate')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${safeName}_ATS_Resume.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Vector ATS PDF exported successfully!', { id: toastId });
      onClose();
    } catch (err: any) {
      console.warn('PDF export error, falling back to print dialog:', err);
      toast.dismiss(toastId);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Preview styling calculations
  const nameColor =
    config.accentScope === 'all' || config.accentScope === 'name'
      ? config.accentColor
      : '#111827';
  const headingColor =
    config.accentScope === 'all' || config.accentScope === 'titles'
      ? config.accentColor
      : '#111827';

  const previewFontFamily =
    config.fontFamily === 'Times-Roman'
      ? '"Times New Roman", Times, serif'
      : config.fontFamily === 'Courier'
      ? 'Courier, monospace'
      : 'Helvetica, Arial, sans-serif';

  const isCompact = config.template === 'compact';
  const isCentered = config.template === 'centered';
  const isStructured = config.template === 'structured';

  const contactParts = [
    document.contact.email,
    document.contact.phone,
    document.contact.location,
    document.contact.linkedinUrl
      ? document.contact.linkedinUrl.replace(/^https?:\/\//, '')
      : '',
    document.contact.githubUrl
      ? document.contact.githubUrl.replace(/^https?:\/\//, '')
      : '',
  ].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1220px] w-[96vw] h-[92vh] max-h-[940px] p-0 overflow-hidden flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-2xl [&>button]:hidden">
        <DialogDescription className="sr-only">
          Export your ATS-friendly resume with customizable templates, fonts, and colors.
        </DialogDescription>

        {/* Modal Top Header Bar with Top-Left Close Button (Matches Jobright) */}
        <div className="px-5 py-3 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 -ml-1 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <DialogTitle className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Export Resume
            </DialogTitle>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>ATS-friendly format</span>
            </span>
          </div>
        </div>

        {/* Modal Main Body (2 Columns: Controls on Left, Live Preview on Right) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Customization Controls (Matched to Jobright Screenshot) */}
          <div className="w-full md:w-[380px] lg:w-[410px] shrink-0 border-r border-neutral-200 flex flex-col h-full bg-[#FAFAFA] overflow-y-auto p-5 space-y-4">
            {/* 1. ATS-friendly Resume Template Header & Paper Size Dropdown */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-neutral-900 block">
                ATS-friendly Resume Template
              </label>

              {/* Paper Format Dropdown (Directly below header) */}
              <div className="relative">
                <label htmlFor="paper-size-select" className="sr-only">
                  Paper Size
                </label>
                <select
                  id="paper-size-select"
                  value={config.pageSize}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      pageSize: e.target.value as ResumePageSize,
                    }))
                  }
                  className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] cursor-pointer"
                >
                  <option value="LETTER">Letter (8.5&quot; x 11&quot;)</option>
                  <option value="A4">A4 (210 x 297 mm)</option>
                </select>
                <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* 4 Template Thumbnails */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  {
                    id: 'standard' as ResumeTemplateId,
                    name: 'Standard',
                    recommended: true,
                  },
                  {
                    id: 'compact' as ResumeTemplateId,
                    name: 'Compact',
                    recommended: false,
                  },
                  {
                    id: 'centered' as ResumeTemplateId,
                    name: 'Centered',
                    recommended: false,
                  },
                  {
                    id: 'structured' as ResumeTemplateId,
                    name: 'Structured',
                    recommended: false,
                  },
                ].map((tmpl) => {
                  const isSelected = config.template === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, template: tmpl.id }))}
                      className={`relative flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all bg-white min-h-[96px] ${
                        isSelected
                          ? 'border-[#0A1B5C] ring-2 ring-[#0A1B5C]/20 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {/* Mini Template Visual Wireframe */}
                      <div className="w-full h-12 bg-neutral-50 rounded-lg border border-neutral-150 p-1 flex flex-col justify-between mb-1 overflow-hidden">
                        {tmpl.id === 'centered' ? (
                          <>
                            <div className="w-6 h-1 bg-neutral-400 rounded-full mx-auto" />
                            <div className="w-10 h-0.5 bg-neutral-300 rounded-full mx-auto" />
                            <div className="w-full h-px bg-neutral-200" />
                            <div className="space-y-0.5">
                              <div className="w-full h-0.5 bg-neutral-300 rounded-full" />
                              <div className="w-4/5 h-0.5 bg-neutral-200 rounded-full" />
                            </div>
                          </>
                        ) : tmpl.id === 'structured' ? (
                          <>
                            <div className="w-8 h-1 bg-neutral-400 rounded-full" />
                            <div className="w-full h-px bg-neutral-200 my-0.5" />
                            <div className="flex gap-1 h-full">
                              <div className="flex-1 space-y-0.5">
                                <div className="w-full h-0.5 bg-neutral-300 rounded-full" />
                                <div className="w-3/4 h-0.5 bg-neutral-200 rounded-full" />
                              </div>
                              <div className="w-1/3 border-l border-neutral-200 pl-0.5 space-y-0.5">
                                <div className="w-full h-0.5 bg-neutral-300 rounded-full" />
                                <div className="w-full h-0.5 bg-neutral-200 rounded-full" />
                              </div>
                            </div>
                          </>
                        ) : tmpl.id === 'compact' ? (
                          <>
                            <div className="w-8 h-1 bg-neutral-400 rounded-full" />
                            <div className="space-y-0.5 my-auto">
                              <div className="w-full h-0.5 bg-neutral-300 rounded-full" />
                              <div className="w-5/6 h-0.5 bg-neutral-200 rounded-full" />
                              <div className="w-4/6 h-0.5 bg-neutral-200 rounded-full" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-1 bg-neutral-400 rounded-full" />
                            <div className="w-12 h-0.5 bg-neutral-300 rounded-full" />
                            <div className="w-full h-px bg-neutral-200" />
                            <div className="space-y-0.5">
                              <div className="w-full h-0.5 bg-neutral-300 rounded-full" />
                              <div className="w-5/6 h-0.5 bg-neutral-200 rounded-full" />
                            </div>
                          </>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-neutral-800 leading-tight">
                        {tmpl.name}
                      </span>

                      {tmpl.recommended && (
                        <span className="mt-1 px-1.5 py-0.5 bg-[#4FD1C5]/20 text-[#0A1B5C] text-[8px] font-black rounded uppercase tracking-wider leading-none">
                          Recommended
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Accent Color (Swatch + Hex on Left, Scope Dropdown on Right) */}
            <div className="space-y-2 pt-1 border-t border-neutral-200">
              <label className="text-xs font-bold text-neutral-900 block">
                Accent Color
              </label>

              <div className="flex items-center gap-2">
                {/* Color Swatch Button with Hex Code */}
                <label
                  title="Click to choose custom accent color"
                  className="flex items-center gap-2 px-3 h-9 bg-white border border-neutral-300 rounded-xl cursor-pointer hover:border-neutral-400 shadow-2xs shrink-0"
                >
                  <span
                    className="w-4 h-4 rounded-md border border-black/15 shrink-0"
                    style={{ backgroundColor: config.accentColor }}
                  />
                  <span className="text-xs font-mono font-bold text-neutral-800 uppercase">
                    {config.accentColor}
                  </span>
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="sr-only"
                  />
                </label>

                {/* Scope Selector (All Headings / Section Titles Only / Candidate Name Only) */}
                <div className="relative flex-1">
                  <select
                    value={config.accentScope}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        accentScope: e.target.value as ResumeAccentScope,
                      }))
                    }
                    className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                  >
                    <option value="all">All Headings</option>
                    <option value="titles">Section Titles Only</option>
                    <option value="name">Candidate Name Only</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 3. Font Section (Font Family & 2x2 Clean Size Grid) */}
            <div className="space-y-2 pt-1 border-t border-neutral-200">
              <label className="text-xs font-bold text-neutral-900 block">
                Font
              </label>

              {/* Font Family */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-600 block">Font Family</span>
                <div className="relative">
                  <select
                    value={config.fontFamily}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        fontFamily: e.target.value as ResumeFontFamily,
                      }))
                    }
                    className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times-Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Font Sizes Grid (2x2 matching Jobright) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Name Size */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-600 block">
                    Name
                  </span>
                  <div className="relative">
                    <select
                      value={config.fontSizes.name}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fontSizes: { ...prev.fontSizes, name: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                    >
                      {[18, 19, 20, 21, 22, 24].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Section Headers Size */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-600 block">
                    Section Headers
                  </span>
                  <div className="relative">
                    <select
                      value={config.fontSizes.sectionHeaders}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fontSizes: { ...prev.fontSizes, sectionHeaders: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                    >
                      {[11, 12, 13, 14].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Sub-Headers Size */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-neutral-600 block">
                      Sub-Headers
                    </span>
                    <HelpCircle className="h-3 w-3 text-neutral-400" />
                  </div>
                  <div className="relative">
                    <select
                      value={config.fontSizes.subHeaders}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fontSizes: { ...prev.fontSizes, subHeaders: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                    >
                      {[10, 10.5, 11, 11.5, 12].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Body Text Size */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-neutral-600 block">
                    Body Text
                  </span>
                  <div className="relative">
                    <select
                      value={config.fontSizes.bodyText}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          fontSizes: { ...prev.fontSizes, bodyText: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-neutral-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                    >
                      {[9, 9.5, 10, 10.5, 11].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Content Style Section (Date Format & Bullet Icon Dropdowns) */}
            <div className="space-y-2 pt-1 border-t border-neutral-200">
              <label className="text-xs font-bold text-neutral-900 block">
                Content Style
              </label>

              {/* Date Format */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-600 block">Date Format</span>
                <div className="relative">
                  <select
                    value={config.dateFormat}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        dateFormat: e.target.value as ResumeDateFormat,
                      }))
                    }
                    className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                  >
                    <option value="short">Short month name (Jan YYYY)</option>
                    <option value="full">Full month name (January YYYY)</option>
                    <option value="numeric">Numeric (MM/YYYY)</option>
                    <option value="year">Year only (YYYY)</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Bullet Icon Dropdown */}
              <div className="space-y-1 pt-0.5">
                <span className="text-[11px] font-semibold text-neutral-600 block">Bullet Icon</span>
                <div className="relative">
                  <select
                    value={config.bulletStyle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        bulletStyle: e.target.value as ResumeBulletStyle,
                      }))
                    }
                    className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 cursor-pointer"
                  >
                    <option value="•">• (Dot)</option>
                    <option value="-">- (Dash)</option>
                    <option value="▪">▪ (Square)</option>
                    <option value="▸">▸ (Arrow)</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dynamic Preview Canvas & Action Bar */}
          <div className="flex-1 flex flex-col h-full bg-[#EAEFF4] min-w-0 overflow-hidden relative">
            {/* Live Preview Toolbar (Zoom, Page Counter) */}
            <div className="px-4 py-2 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold">
                <span>Preview Format:</span>
                <span className="font-extrabold text-[#0A1B5C]">
                  {config.pageSize === 'LETTER' ? 'Letter (8.5" x 11")' : 'A4'}
                </span>
                <span>·</span>
                <span className="capitalize">{config.template} Layout</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                  <button
                    type="button"
                    title="Zoom Out"
                    onClick={() => setPreviewZoom((z) => Math.max(0.6, z - 0.1))}
                    className="p-1 text-neutral-600 hover:text-neutral-900 rounded hover:bg-white"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-black text-neutral-700 px-1.5 min-w-[36px] text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    title="Zoom In"
                    onClick={() => setPreviewZoom((z) => Math.min(1.2, z + 0.1))}
                    className="p-1 text-neutral-600 hover:text-neutral-900 rounded hover:bg-white"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Reset to 85%"
                    onClick={() => setPreviewZoom(0.85)}
                    className="p-1 text-neutral-600 hover:text-neutral-900 rounded hover:bg-white ml-0.5"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Canvas Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center">
              {/* Scaled White Paper Sheet */}
              <div
                style={{
                  transform: `scale(${previewZoom})`,
                  transformOrigin: 'top center',
                  fontFamily: previewFontFamily,
                }}
                className="w-[790px] min-h-[1020px] bg-white rounded-sm shadow-[0_4px_30px_rgba(0,0,0,0.12)] p-10 transition-all select-text shrink-0 mb-12 relative text-[#111827]"
              >
                {/* Header */}
                <div
                  className={`border-b pb-3 mb-4 ${
                    isCentered ? 'text-center border-transparent' : 'border-neutral-200 text-left'
                  }`}
                >
                  <h1
                    style={{
                      fontSize: `${config.fontSizes.name}pt`,
                      color: nameColor,
                    }}
                    className="font-black tracking-tight leading-tight mb-1"
                  >
                    {document.contact.fullName || 'Candidate Profile'}
                  </h1>
                  <div
                    className={`flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-medium ${
                      isCentered ? 'justify-center' : 'justify-start'
                    }`}
                  >
                    {contactParts.map((part, idx) => (
                      <span key={idx} className="flex items-center gap-1.5">
                        {idx > 0 && <span className="text-neutral-300">•</span>}
                        <span>{part}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Structured vs Linear Layout */}
                {isStructured ? (
                  <div className="flex gap-6">
                    {/* Left Column (65%) */}
                    <div className="flex-[65] space-y-4">
                      {/* Summary */}
                      {document.summary && (
                        <div>
                          <h2
                            style={{
                              fontSize: `${config.fontSizes.sectionHeaders}pt`,
                              color: headingColor,
                            }}
                            className="font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2"
                          >
                            Professional Summary
                          </h2>
                          <p
                            style={{ fontSize: `${config.fontSizes.bodyText * 0.95}pt` }}
                            className="text-neutral-700 leading-relaxed font-normal"
                          >
                            {document.summary}
                          </p>
                        </div>
                      )}

                      {/* Work Experience */}
                      {document.experience && document.experience.length > 0 && (
                        <div>
                          <h2
                            style={{
                              fontSize: `${config.fontSizes.sectionHeaders}pt`,
                              color: headingColor,
                            }}
                            className="font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2"
                          >
                            Work Experience
                          </h2>
                          <div className="space-y-3">
                            {document.experience.map((role, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <span
                                      style={{ fontSize: `${config.fontSizes.subHeaders}pt` }}
                                      className="font-bold text-neutral-900"
                                    >
                                      {role.roleTitle}
                                    </span>
                                    <span className="text-neutral-500 text-xs ml-1 font-medium">
                                      • {role.company}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-neutral-500 font-medium">
                                    {formatPreviewDate(role.startDate, config.dateFormat)} -{' '}
                                    {formatPreviewDate(role.endDate, config.dateFormat)}{' '}
                                    {role.location ? `| ${role.location}` : ''}
                                  </span>
                                </div>
                                <ul className="space-y-1 pl-2">
                                  {role.bullets.map((b, bIdx) => (
                                    <li
                                      key={bIdx}
                                      style={{ fontSize: `${config.fontSizes.bodyText * 0.92}pt` }}
                                      className="flex items-start gap-1.5 text-neutral-800 leading-snug font-normal"
                                    >
                                      <span
                                        style={{ color: headingColor }}
                                        className="font-bold shrink-0"
                                      >
                                        {config.bulletStyle}
                                      </span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects */}
                      {document.projects && document.projects.length > 0 && (
                        <div>
                          <h2
                            style={{
                              fontSize: `${config.fontSizes.sectionHeaders}pt`,
                              color: headingColor,
                            }}
                            className="font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2"
                          >
                            Key Technical Projects
                          </h2>
                          <div className="space-y-2">
                            {document.projects.map((proj, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-baseline justify-between">
                                  <span className="font-bold text-neutral-900 text-xs">
                                    {proj.title}
                                  </span>
                                  {proj.techStack && (
                                    <span className="text-[11px] text-neutral-500">
                                      {proj.techStack.join(' • ')}
                                    </span>
                                  )}
                                </div>
                                <ul className="space-y-0.5 pl-2">
                                  {proj.bullets.map((b, bIdx) => (
                                    <li
                                      key={bIdx}
                                      style={{ fontSize: `${config.fontSizes.bodyText * 0.9}pt` }}
                                      className="flex items-start gap-1.5 text-neutral-700 leading-snug"
                                    >
                                      <span
                                        style={{ color: headingColor }}
                                        className="font-bold shrink-0"
                                      >
                                        {config.bulletStyle}
                                      </span>
                                      <span>{b}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column (35%) */}
                    <div className="flex-[35] border-l border-neutral-200 pl-5 space-y-4">
                      {/* Skills */}
                      {document.skills && document.skills.length > 0 && (
                        <div>
                          <h2
                            style={{
                              fontSize: `${config.fontSizes.sectionHeaders}pt`,
                              color: headingColor,
                            }}
                            className="font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2"
                          >
                            Technical Skills
                          </h2>
                          <div className="space-y-2">
                            {document.skills.map((s, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <span className="font-bold text-[11px] text-neutral-900 block">
                                  {s.category}
                                </span>
                                <span className="text-neutral-700 text-[10.5px] leading-tight block">
                                  {s.items.join(', ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Education */}
                      {document.education && document.education.length > 0 && (
                        <div>
                          <h2
                            style={{
                              fontSize: `${config.fontSizes.sectionHeaders}pt`,
                              color: headingColor,
                            }}
                            className="font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2"
                          >
                            Education
                          </h2>
                          <div className="space-y-2">
                            {document.education.map((edu, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <span className="font-bold text-[11px] text-neutral-900 block">
                                  {edu.institution}
                                </span>
                                <span className="text-neutral-600 text-[10.5px] block">
                                  {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                                </span>
                                {edu.endDate && (
                                  <span className="text-neutral-400 text-[10px] block">
                                    {formatPreviewDate(edu.endDate, config.dateFormat)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard / Compact / Centered Linear Layout */
                  <div className={`space-y-${isCompact ? '3' : '4'}`}>
                    {/* Summary */}
                    {document.summary && (
                      <div>
                        <h2
                          style={{
                            fontSize: `${config.fontSizes.sectionHeaders}pt`,
                            color: headingColor,
                          }}
                          className={`font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2 ${
                            isCentered ? 'text-center' : 'text-left'
                          }`}
                        >
                          Professional Summary
                        </h2>
                        <p
                          style={{ fontSize: `${config.fontSizes.bodyText * 0.95}pt` }}
                          className="text-neutral-700 leading-relaxed font-normal"
                        >
                          {document.summary}
                        </p>
                      </div>
                    )}

                    {/* Technical Skills */}
                    {document.skills && document.skills.length > 0 && (
                      <div>
                        <h2
                          style={{
                            fontSize: `${config.fontSizes.sectionHeaders}pt`,
                            color: headingColor,
                          }}
                          className={`font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2 ${
                            isCentered ? 'text-center' : 'text-left'
                          }`}
                        >
                          Technical Skills
                        </h2>
                        <div className="space-y-1">
                          {document.skills.map((s, idx) => (
                            <div key={idx} className="flex items-start text-xs">
                              <span className="font-bold text-neutral-900 w-36 shrink-0">
                                {s.category}:
                              </span>
                              <span className="text-neutral-700 flex-1">{s.items.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Work Experience */}
                    {document.experience && document.experience.length > 0 && (
                      <div>
                        <h2
                          style={{
                            fontSize: `${config.fontSizes.sectionHeaders}pt`,
                            color: headingColor,
                          }}
                          className={`font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2 ${
                            isCentered ? 'text-center' : 'text-left'
                          }`}
                        >
                          Work Experience
                        </h2>
                        <div className="space-y-3">
                          {document.experience.map((role, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-baseline justify-between">
                                <div>
                                  <span
                                    style={{ fontSize: `${config.fontSizes.subHeaders}pt` }}
                                    className="font-bold text-neutral-900"
                                  >
                                    {role.roleTitle}
                                  </span>
                                  <span className="text-neutral-500 text-xs ml-1 font-medium">
                                    • {role.company}
                                  </span>
                                </div>
                                <span className="text-[11px] text-neutral-500 font-medium">
                                  {formatPreviewDate(role.startDate, config.dateFormat)} -{' '}
                                  {formatPreviewDate(role.endDate, config.dateFormat)}{' '}
                                  {role.location ? `| ${role.location}` : ''}
                                </span>
                              </div>
                              <ul className="space-y-1 pl-2">
                                {role.bullets.map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    style={{ fontSize: `${config.fontSizes.bodyText * 0.92}pt` }}
                                    className="flex items-start gap-1.5 text-neutral-800 leading-snug font-normal"
                                  >
                                    <span
                                      style={{ color: headingColor }}
                                      className="font-bold shrink-0"
                                    >
                                      {config.bulletStyle}
                                    </span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {document.education && document.education.length > 0 && (
                      <div>
                        <h2
                          style={{
                            fontSize: `${config.fontSizes.sectionHeaders}pt`,
                            color: headingColor,
                          }}
                          className={`font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2 ${
                            isCentered ? 'text-center' : 'text-left'
                          }`}
                        >
                          Education
                        </h2>
                        <div className="space-y-1.5">
                          {document.education.map((edu, idx) => (
                            <div key={idx} className="flex items-baseline justify-between">
                              <div>
                                <span className="font-bold text-neutral-900 text-xs">
                                  {edu.institution}
                                </span>
                                <span className="text-neutral-600 text-xs ml-1">
                                  {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                                  {edu.gpaOrHonors ? ` - ${edu.gpaOrHonors}` : ''}
                                </span>
                              </div>
                              {edu.endDate && (
                                <span className="text-neutral-400 text-[11px]">
                                  {formatPreviewDate(edu.endDate, config.dateFormat)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Projects */}
                    {document.projects && document.projects.length > 0 && (
                      <div>
                        <h2
                          style={{
                            fontSize: `${config.fontSizes.sectionHeaders}pt`,
                            color: headingColor,
                          }}
                          className={`font-bold uppercase tracking-wider border-b border-neutral-200 pb-1 mb-2 ${
                            isCentered ? 'text-center' : 'text-left'
                          }`}
                        >
                          Key Technical Projects
                        </h2>
                        <div className="space-y-2">
                          {document.projects.map((proj, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex items-baseline justify-between">
                                <span className="font-bold text-neutral-900 text-xs">
                                  {proj.title}
                                </span>
                                {proj.techStack && (
                                  <span className="text-[11px] text-neutral-500">
                                    {proj.techStack.join(' • ')}
                                  </span>
                                )}
                              </div>
                              <ul className="space-y-0.5 pl-2">
                                {proj.bullets.map((b, bIdx) => (
                                  <li
                                    key={bIdx}
                                    style={{ fontSize: `${config.fontSizes.bodyText * 0.9}pt` }}
                                    className="flex items-start gap-1.5 text-neutral-700 leading-snug"
                                  >
                                    <span
                                      style={{ color: headingColor }}
                                      className="font-bold shrink-0"
                                    >
                                      {config.bulletStyle}
                                    </span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Floating Page Counter Badge (Like Jobright screenshot) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-900/90 text-white text-[11px] font-black shadow-md flex items-center gap-1 select-none pointer-events-none">
                  <span>1 / {isCompact ? '1' : '2'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Centered Action Bar (Matches Jobright Screenshot) */}
            <div className="px-5 py-3 border-t border-neutral-200/90 bg-white/95 backdrop-blur-md flex items-center justify-center shrink-0 shadow-xs z-20">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="h-10 px-8 rounded-full bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#4FD1C5]" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-[#4FD1C5]" />
                    <span>Download Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

