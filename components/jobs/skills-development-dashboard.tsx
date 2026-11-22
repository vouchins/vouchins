'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Search,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Code2,
  Terminal,
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  ArrowRight,
  Filter,
  X,
  Share2,
  Settings,
  Plus,
} from 'lucide-react';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { useUser } from '@/components/user-provider';
import { toast } from 'sonner';
import { SkillResource, SkillCategory } from '@/lib/skills/types';
import { DEFAULT_SKILL_RESOURCES } from '@/lib/skills/default-resources';

const STANDARD_CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  all: { label: 'All Resources', icon: Layers },
  dsa: { label: 'DSA & Algorithms', icon: Terminal },
  'system design': { label: 'System Design', icon: Database },
  'design patterns': { label: 'Design Patterns', icon: Sparkles },
  javascript: { label: 'JavaScript', icon: Code2 },
  css: { label: 'CSS Layouts', icon: Layers },
  java: { label: 'Java', icon: BookOpen },
  ai: { label: 'AI & LLMs', icon: Cpu },
};

function getCategoryColor(category: string) {
  switch (category.toLowerCase()) {
    case 'dsa':
      return {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-600',
      };
    case 'system design':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-600',
      };
    case 'design patterns':
      return {
        badge: 'bg-teal-50 text-teal-800 border-teal-200',
        dot: 'bg-teal-600',
      };
    case 'javascript':
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-600',
      };
    case 'css':
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-600',
      };
    case 'java':
      return {
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        dot: 'bg-orange-600',
      };
    case 'ai':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-600',
      };
    default:
      return {
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        dot: 'bg-cyan-600',
      };
  }
}

export function SkillsDevelopmentDashboard() {
  const { user } = useUser();
  const [courses, setCourses] = useState<SkillResource[]>(DEFAULT_SKILL_RESOURCES);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAdmin = Boolean(user?.is_admin || (user as any)?.isAdmin);

  useEffect(() => {
    let isMounted = true;
    async function loadLiveCourses() {
      try {
        const res = await fetch('/api/skills-courses');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        }
      } catch {
        // Silently use DEFAULT_SKILL_RESOURCES fallback
      }
    }
    loadLiveCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyLink = async (course: SkillResource) => {
    try {
      await navigator.clipboard.writeText(course.url);
      setCopiedId(course.id);
      toast.success(`Copied link for "${course.title}"`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Filtered list based on category & search
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        course.category.toLowerCase() === selectedCategory.toLowerCase();

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        course.domain?.toLowerCase().includes(q) ||
        (course.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [courses, selectedCategory, searchQuery]);

  // Dynamically compute category tabs from the actual courses list + standard presets
  const categoryTabs = useMemo(() => {
    // Collect all unique categories present in courses
    const foundCategories = new Set<string>();
    courses.forEach((c) => {
      if (c.category?.trim()) {
        foundCategories.add(c.category.trim());
      }
    });

    // Preset standard order
    const orderedPresets = ['DSA', 'System Design', 'Design Patterns', 'JavaScript', 'CSS', 'Java', 'AI'];
    const result: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'All', label: 'All Resources', icon: Layers },
    ];

    // Add ordered presets if they exist in courses or are defaults
    orderedPresets.forEach((cat) => {
      const matchInFound = Array.from(foundCategories).find((fc) => fc.toLowerCase() === cat.toLowerCase());
      if (matchInFound) {
        const meta = STANDARD_CATEGORY_META[cat.toLowerCase()] || { label: cat, icon: Sparkles };
        result.push({
          id: matchInFound,
          label: meta.label,
          icon: meta.icon,
        });
        foundCategories.delete(matchInFound);
      }
    });

    // Add any remaining dynamic/custom categories added by admin
    Array.from(foundCategories)
      .sort((a, b) => a.localeCompare(b))
      .forEach((customCat) => {
        const meta = STANDARD_CATEGORY_META[customCat.toLowerCase()] || { label: customCat, icon: Sparkles };
        result.push({
          id: customCat,
          label: meta.label || customCat,
          icon: meta.icon,
        });
      });

    return result;
  }, [courses]);

  return (
    <div className="relative flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C]">
      {/* Liquid Glass Ambient Background Blooms */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(10,27,92,0.05),transparent_70%),radial-gradient(circle_at_90%_90%,rgba(79,209,197,0.04),transparent_50%)]" />

      <JobsSidebar activeTab="coaching" />

      <main className="relative flex-1 flex flex-col min-w-0">
        <JobsNavbar />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Hero Banner Card - Liquid Glass Executive Navy */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1B5C]/95 via-[#0D2270]/90 to-[#142d8a]/85 backdrop-blur-2xl text-white p-6 sm:p-8 lg:p-10 shadow-[0_20px_50px_rgba(10,27,92,0.18),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/15">
            {/* Liquid Ambient Glow Orbs */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#4FD1C5]/15 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-[#4FD1C5] text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-white/15 shadow-inner">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4FD1C5]" />
                    100% Free Curated Resources
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-md border border-white/15">
                    Tier-1 Interview Ready
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                  Skills Development & Free Course Hub
                </h1>

                <p className="text-sm sm:text-base text-neutral-200/90 font-normal leading-relaxed">
                  Handpicked engineering learning paths, interactive algorithmic visualizers, problem tracker sheets, and system design roadmaps to accelerate your interview readiness.
                </p>

                {/* Highlight badges */}
                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs font-medium text-neutral-200">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-2xs">
                    <Terminal className="w-3.5 h-3.5 text-[#4FD1C5]" />
                    DSA & LeetCode Sheets
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-2xs">
                    <Database className="w-3.5 h-3.5 text-[#4FD1C5]" />
                    System Design Primers
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-2xs">
                    <Cpu className="w-3.5 h-3.5 text-[#4FD1C5]" />
                    AI & Modern Stacks
                  </span>
                </div>
              </div>

              {/* Right Side Stats & Admin Action */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/20 text-left lg:text-right min-w-[210px] shadow-inner">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
                    Curated Materials
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                    {courses.length} Resources
                  </div>
                  <span className="text-xs text-[#4FD1C5] font-medium block mt-1">
                    Verified Free & Open Access
                  </span>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4FD1C5] hover:bg-[#38b2ac] text-[#0A1B5C] text-xs font-bold shadow-md transition-all active:scale-95"
                    title="Manage course catalog in Admin Dashboard"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#0A1B5C]" />
                    <span>Admin: Manage Courses</span>
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* Search Bar & Category Filter Bar - Liquid Glass */}
          <section className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {categoryTabs.map((tab) => {
                  const count =
                    tab.id === 'All'
                      ? courses.length
                      : courses.filter((c) => c.category.toLowerCase() === tab.id.toLowerCase()).length;
                  const isActive = selectedCategory === tab.id;
                  const Icon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedCategory(tab.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-[#0A1B5C] text-white shadow-md shadow-[#0A1B5C]/20'
                          : 'bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/60 backdrop-blur-sm'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#4FD1C5]' : 'text-neutral-500'}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                          isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Instant Search Input */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search resources, topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 h-10 text-xs font-normal rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Results Counter Bar */}
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
            <span>
              Showing {filteredCourses.length} {filteredCourses.length === 1 ? 'course & resource' : 'courses & resources'}
              {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
              {searchQuery ? ` matching "${searchQuery}"` : ''}
            </span>

            {(selectedCategory !== 'All' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="text-[#0A1B5C] hover:underline font-semibold"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Courses Grid - Liquid Glass Cards */}
          {filteredCourses.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/80 p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]">
              <div className="w-12 h-12 rounded-2xl bg-white text-neutral-400 border border-neutral-200/70 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <GraduationCap className="w-6 h-6 text-[#0A1B5C]" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">No resources found</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                We couldn&apos;t find any course matching your current criteria. Try adjusting your search term or select &quot;All Resources&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white text-xs font-semibold transition-all active:scale-95 shadow-md shadow-[#0A1B5C]/15"
              >
                View All Resources
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {filteredCourses.map((course) => {
                const color = getCategoryColor(course.category);

                return (
                  <article
                    key={course.id}
                    className="bg-white/75 backdrop-blur-xl rounded-3xl border border-white/90 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_16px_40px_rgba(10,27,92,0.08)] hover:border-[#4FD1C5]/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 shadow-2xs ${color.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                            {course.category}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-neutral-100/80 text-neutral-600 text-[10px] font-medium border border-neutral-200/60 capitalize">
                            {course.type}
                          </span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200/80 shrink-0 shadow-2xs">
                          Free
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-semibold text-neutral-900 tracking-tight group-hover:text-[#0A1B5C] transition-colors leading-snug">
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {course.title}
                        </a>
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-neutral-600 font-normal leading-relaxed line-clamp-3">
                        {course.description}
                      </p>

                      {/* Tags */}
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {course.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/80 text-neutral-600 text-[10px] font-medium border border-neutral-200/60"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 mt-5 border-t border-neutral-100/80 space-y-3">
                      {/* Secondary Link Row (e.g. GitHub Repo) */}
                      {course.secondaryUrl && (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-neutral-50/80 border border-neutral-200/60">
                          <span className="text-[11px] font-medium text-neutral-500">
                            {course.secondaryUrlLabel || 'Companion Repo'}:
                          </span>
                          <a
                            href={course.secondaryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0A1B5C] text-xs font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            <span>Open Repository</span>
                            <ExternalLink className="w-3 h-3 text-[#0A1B5C]" />
                          </a>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Primary Button */}
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white text-xs font-semibold shadow-md shadow-[#0A1B5C]/15 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                          title="Open resource in a new tab"
                        >
                          <span>Open Resource</span>
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                        </a>

                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(course)}
                          className="px-3 py-2.5 rounded-xl border border-neutral-200/80 hover:border-[#0A1B5C]/40 bg-white text-neutral-700 hover:text-[#0A1B5C] text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          title="Copy resource URL"
                        >
                          {copiedId === course.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-neutral-600" />
                          )}
                        </button>
                      </div>

                      {/* Domain source footer */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                        <span className="truncate max-w-[200px]">
                          {course.domain || 'official site'}
                        </span>
                        <span className="text-[10px] font-sans font-medium text-neutral-400 uppercase">
                          {course.difficulty || 'All Levels'}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

