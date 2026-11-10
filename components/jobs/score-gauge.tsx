'use client';

import React from 'react';
import { Award, TrendingUp } from 'lucide-react';

interface ScoreGaugeProps {
  score: number;
  seniority?: string;
  size?: number;
}

export function ScoreGauge({ score, seniority, size = 130 }: ScoreGaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = '#4FD1C5'; // Vouchins accent teal
  let tierLabel = 'Strong Contender';
  let tierBadgeBg = 'bg-[#4FD1C5]/10 text-emerald-800 border-[#4FD1C5]/30';

  if (score >= 85) {
    color = '#10B981';
    tierLabel = 'Top Contender';
    tierBadgeBg = 'bg-emerald-50 text-emerald-900 border-emerald-200';
  } else if (score < 70) {
    color = '#F59E0B';
    tierLabel = 'Needs Polish';
    tierBadgeBg = 'bg-amber-50 text-amber-900 border-amber-200';
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-white border border-neutral-200/80 shadow-sm">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold tracking-tight text-neutral-900">{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">out of 100</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-center sm:text-left">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierBadgeBg}`}>
            <TrendingUp className="h-3 w-3" />
            {tierLabel}
          </span>
          {seniority && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs text-neutral-600 font-medium">
              <Award className="h-3 w-3 text-neutral-400" />
              {seniority}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-neutral-900">
          Executive Readiness Score
        </h3>

        <p className="text-xs leading-relaxed text-neutral-600">
          Benchmarked against engineering hiring bars at Google, Meta, Amazon, and top tech companies.
        </p>
      </div>
    </div>
  );
}
