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

const CATEGORY_TABS: { id: SkillCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'All', label: 'All Resources', icon: Layers },
  { id: 'DSA', label: 'DSA & Algorithms', icon: Terminal },
  { id: 'System Design', label: 'System Design', icon: Database },
  { id: 'JavaScript', label: 'JavaScript', icon: Code2 },
  { id: 'CSS', label: 'CSS Layouts', icon: Layers },
  { id: 'Java', label: 'Java', icon: BookOpen },
  { id: 'AI', label: 'AI & LLMs', icon: Cpu },
];

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
        badge: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        dot: 'bg-neutral-600',
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="coaching" />

      <main className="flex-1 flex flex-col min-w-0">
        <JobsNavbar />

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Hero Banner Card */}
          <section className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    100% Free Curated Resources
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-xs font-bold border border-[#0A1B5C]/20">
                    Tier-1 Interview Ready
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  Skills Development & Free Course Hub
                </h1>

                <p className="text-xs sm:text-sm text-neutral-600 font-medium leading-relaxed">
                  Handpicked engineering learning paths, interactive algorithmic visualizers, problem tracker sheets, and system design roadmaps to level up your interview readiness.
                </p>

                {/* Highlight badges */}
                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs font-bold text-neutral-600">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700">
                    <Terminal className="w-3 h-3 text-[#0A1B5C]" />
                    DSA & LeetCode Sheets
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700">
                    <Database className="w-3 h-3 text-[#0A1B5C]" />
                    System Design Primers
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700">
                    <Cpu className="w-3 h-3 text-[#0A1B5C]" />
                    AI & Modern Stacks
                  </span>
                </div>
              </div>

              {/* Right Side Stats & Admin Action */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 shrink-0">
                <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/80 text-left lg:text-right min-w-[200px]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    Curated Materials
                  </span>
                  <div className="text-2xl font-black text-[#0A1B5C] tracking-tight">
                    {courses.length} Resources
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    Verified Free & Open Access
                  </span>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold shadow-xs transition-all active:scale-95"
                    title="Manage course catalog in Admin Dashboard"
                  >
                    <Settings className="w-3.5 h-3.5 text-white" />
                    <span>Admin: Manage Courses</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Subtle decorative background gradient */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#0A1B5C]/5 rounded-full blur-3xl pointer-events-none" />
          </section>

          {/* Search Bar & Category Filter Bar */}
          <section className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {CATEGORY_TABS.map((tab) => {
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
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-[#0A1B5C] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-neutral-500'}`} />
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
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
                  className="w-full pl-9 pr-8 h-10 text-xs font-medium rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] focus:border-[#0A1B5C]"
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
          <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold px-1">
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
                className="text-[#0A1B5C] hover:underline font-bold"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Courses Grid */}
          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-neutral-900">No resources found</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                We couldn&apos;t find any course matching your current criteria. Try adjusting your search term or select &quot;All Resources&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
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
                    className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs hover:border-[#0A1B5C]/30 hover:shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${color.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                            {course.category}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[10px] font-bold border border-neutral-200 capitalize">
                            {course.type}
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 shrink-0">
                          Free
                        </span>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-base font-black text-neutral-900 tracking-tight group-hover:text-[#0A1B5C] transition-colors leading-snug">
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
                      <p className="text-xs text-neutral-500 font-medium leading-relaxed line-clamp-3">
                        {course.description}
                      </p>

                      {/* Tags */}
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {course.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-600 text-[10px] font-semibold border border-neutral-200/70"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 mt-4 border-t border-neutral-100 space-y-3">
                      {/* Secondary Link Row (e.g. GitHub Repo) */}
                      {course.secondaryUrl && (
                        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/70">
                          <span className="text-[11px] font-semibold text-neutral-500">
                            {course.secondaryUrlLabel || 'Companion Repo'}:
                          </span>
                          <a
                            href={course.secondaryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0A1B5C] text-xs font-bold inline-flex items-center gap-1 hover:underline"
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
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                          title="Open resource in a new tab"
                        >
                          <span>Open Resource</span>
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                        </a>

                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(course)}
                          className="px-3 py-2.5 rounded-xl border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
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
                        <span className="text-[10px] font-sans font-bold text-neutral-400 uppercase">
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

