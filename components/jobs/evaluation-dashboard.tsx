'use client';

import React, { useState } from 'react';
import {
  ResumeEvaluation,
  ResumeSuggestion,
  WorkExperienceItem,
} from '@/lib/jobs/types';
import { ScoreGauge } from './score-gauge';
import { PillarBreakdown } from './pillar-breakdown';
import { SuggestionCard } from './suggestion-card';
import { CheckCircle2, AlertTriangle, Filter } from 'lucide-react';

interface EvaluationDashboardProps {
  evaluation: ResumeEvaluation;
  experience: WorkExperienceItem[];
  onApplySuggestion: (suggestion: ResumeSuggestion) => void;
  onRevertSuggestion?: (suggestion: ResumeSuggestion) => void;
}

export function EvaluationDashboard({
  evaluation,
  experience,
  onApplySuggestion,
  onRevertSuggestion,
}: EvaluationDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'impact' | 'relevance' | 'brevity'>('all');

  const filteredSuggestions = evaluation.suggestions.filter((s) => {
    if (filter === 'all') return true;
    return s.pillar === filter;
  });

  const appliedCount = evaluation.suggestions.filter((s) => s.applied).length;
  const totalCount = evaluation.suggestions.length;

  return (
    <div className="flex flex-col h-full bg-neutral-50/60 border-r border-neutral-200 overflow-y-auto p-4 sm:p-5 gap-6">
      {/* 1. Readiness Score Gauge */}
      <ScoreGauge
        score={evaluation.overallScore}
        seniority={evaluation.detectedSeniority}
      />

      {/* 2. Detected Seniority & Strengths */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Target Benchmark
          </span>
          <span className="text-xs font-bold text-[#0A1B5C]">
            {evaluation.targetRole}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-100">
          <span className="text-[11px] font-semibold text-neutral-700">Key Strengths Detected:</span>
          <div className="flex flex-col gap-1">
            {evaluation.strengths.map((str, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-neutral-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{str}</span>
              </div>
            ))}
          </div>
        </div>

        {evaluation.missingKeywords && evaluation.missingKeywords.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              High-Bar Keywords to Consider:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {evaluation.missingKeywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium"
                >
                  +{kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Pillar Breakdown */}
      <PillarBreakdown pillars={evaluation.pillarScores} />

      {/* 4. Actionable Suggestions Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              High-Impact Rewrites
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-bold">
              {appliedCount} / {totalCount} Applied
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-neutral-100/90 text-neutral-600 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'all' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'hover:text-neutral-900'
            }`}
          >
            All ({evaluation.suggestions.length})
          </button>
          <button
            onClick={() => setFilter('impact')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'impact' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'hover:text-neutral-900'
            }`}
          >
            Impact
          </button>
          <button
            onClick={() => setFilter('relevance')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'relevance' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'hover:text-neutral-900'
            }`}
          >
            Stack
          </button>
          <button
            onClick={() => setFilter('brevity')}
            className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === 'brevity' ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'hover:text-neutral-900'
            }`}
          >
            Brevity
          </button>
        </div>

        {/* Suggestion Cards List */}
        <div className="flex flex-col gap-3">
          {filteredSuggestions.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-white border border-neutral-200 text-neutral-500 text-xs">
              No suggestions in this category. All bullets look strong!
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => {
              const role = experience[suggestion.roleIndex];
              return (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  roleTitle={role?.roleTitle}
                  companyName={role?.company}
                  onApply={onApplySuggestion}
                  onRevert={onRevertSuggestion}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
