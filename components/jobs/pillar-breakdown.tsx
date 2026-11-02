'use client';

import React from 'react';
import { Target, Layers, AlignLeft } from 'lucide-react';
import { PillarScores } from '@/lib/jobs/types';

interface PillarBreakdownProps {
  pillars: PillarScores;
}

export function PillarBreakdown({ pillars }: PillarBreakdownProps) {
  const items = [
    {
      key: 'impact',
      label: 'Impact & Metrics',
      score: pillars.impact,
      icon: Target,
      desc: 'Google XYZ formula ("Accomplished [X], measured by [Y], by doing [Z]")',
      barColor: 'bg-emerald-600',
    },
    {
      key: 'relevance',
      label: 'Stack Relevance',
      score: pillars.relevance,
      icon: Layers,
      desc: 'Modern tech stack alignment (TypeScript, Next.js, Distributed DBs, Caching)',
      barColor: 'bg-[#0A1B5C]',
    },
    {
      key: 'brevity',
      label: 'Brevity & ATS Structure',
      score: pillars.brevity,
      icon: AlignLeft,
      desc: 'Single-column scanning efficiency, concise 1-2 line bullets, strong verbs',
      barColor: 'bg-[#4FD1C5]',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Evaluation Pillars
      </h4>

      <div className="grid gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="p-3 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 transition-colors shadow-xs"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-neutral-100 text-neutral-700">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-neutral-900">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-neutral-800">{item.score}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${item.barColor}`}
                  style={{ width: `${item.score}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-500 leading-tight">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
