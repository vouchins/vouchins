'use client';

import React from 'react';
import { Check, Undo2, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { ResumeSuggestion } from '@/lib/jobs/types';
import { Button } from '@/components/ui/button';

interface SuggestionCardProps {
  suggestion: ResumeSuggestion;
  roleTitle?: string;
  companyName?: string;
  onApply: (suggestion: ResumeSuggestion) => void;
  onRevert?: (suggestion: ResumeSuggestion) => void;
}

export function SuggestionCard({
  suggestion,
  roleTitle,
  companyName,
  onApply,
  onRevert,
}: SuggestionCardProps) {
  const isApplied = suggestion.applied;

  const pillarBadge = {
    impact: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    relevance: 'bg-[#0A1B5C]/10 text-[#0A1B5C] border-[#0A1B5C]/20',
    brevity: 'bg-teal-50 text-teal-800 border-teal-200',
  }[suggestion.pillar];

  const severityBadge = {
    critical: 'text-rose-700 bg-rose-50 border-rose-200',
    recommended: 'text-amber-700 bg-amber-50 border-amber-200',
    optional: 'text-neutral-600 bg-neutral-100 border-neutral-200',
  }[suggestion.severity];

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isApplied
          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
          : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
      }`}
    >
      {/* Header tags */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${pillarBadge}`}>
            {suggestion.pillar}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${severityBadge}`}>
            {suggestion.severity}
          </span>
          {companyName && (
            <span className="text-[11px] font-medium text-neutral-500 truncate max-w-[140px]">
              {companyName}
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono font-medium text-neutral-400">
          Bullet #{suggestion.bulletIndex + 1}
        </span>
      </div>

      {/* Comparison: Original vs Rewrite */}
      <div className="flex flex-col gap-2.5 mb-3 text-xs">
        {/* Original Bullet */}
        <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/70">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
            <AlertCircle className="h-3 w-3 text-neutral-400" />
            Original phrasing
          </div>
          <p className="text-neutral-700 line-clamp-3 leading-relaxed">
            {suggestion.originalText}
          </p>
        </div>

        {/* Recommended Rewrite */}
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
            <Zap className="h-3 w-3 text-emerald-600" />
            Recommended Google XYZ rewrite
          </div>
          <p className="text-neutral-900 font-medium leading-relaxed">
            {suggestion.suggestedRewrite}
          </p>
        </div>
      </div>

      {/* Rationale */}
      <p className="text-[11px] text-neutral-600 leading-normal mb-3.5 italic bg-neutral-50/60 p-2 rounded border border-neutral-100">
        &ldquo;{suggestion.rationale}&rdquo;
      </p>

      {/* Action Footer adhering to Brand Button Rule */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-neutral-100">
        {isApplied ? (
          <div className="flex items-center justify-between w-full">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check className="h-4 w-4 text-emerald-600" />
              Applied to canvas
            </span>
            {onRevert && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRevert(suggestion)}
                className="h-8 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 gap-1.5"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </Button>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => onApply(suggestion)}
            className="w-full h-8 text-xs font-semibold bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Apply Suggestion
            <ArrowRight className="h-3.5 w-3.5 text-[#4FD1C5]" />
          </Button>
        )}
      </div>
    </div>
  );
}
