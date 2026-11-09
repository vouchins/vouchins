'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Search,
  RefreshCw,
  GraduationCap,
  Sparkles,
  Link2,
  Code,
  CheckCircle2,
  Layers,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SkillResource } from '@/lib/skills/types';

interface SkillsTabProps {
  onRefresh?: () => void;
  loading?: boolean;
}

const CATEGORIES = ['All', 'DSA', 'System Design', 'JavaScript', 'CSS', 'Java', 'AI'];

export function SkillsTab({ onRefresh, loading = false }: SkillsTabProps) {
  const [courses, setCourses] = useState<SkillResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SkillResource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'DSA',
    url: '',
    secondaryUrl: '',
    secondaryUrlLabel: '',
    type: 'guide',
    difficulty: 'All Levels',
    isFree: true,
    featured: false,
    tagsString: '',
  });

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/skills-courses');
      const data = await res.json();
      if (data.success && Array.isArray(data.courses)) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching skill courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      description: '',
      category: selectedCategory !== 'All' ? selectedCategory : 'DSA',
      url: '',
      secondaryUrl: '',
      secondaryUrlLabel: '',
      type: 'guide',
      difficulty: 'All Levels',
      isFree: true,
      featured: false,
      tagsString: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditModal = (course: SkillResource) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      category: course.category,
      url: course.url,
      secondaryUrl: course.secondaryUrl || '',
      secondaryUrlLabel: course.secondaryUrlLabel || '',
      type: course.type || 'guide',
      difficulty: course.difficulty || 'All Levels',
      isFree: course.isFree !== false,
      featured: Boolean(course.featured),
      tagsString: (course.tags || []).join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.url.trim()) {
      toast.error('Resource URL is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = formData.tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        url: formData.url.trim(),
        secondaryUrl: formData.secondaryUrl.trim() || null,
        secondaryUrlLabel: formData.secondaryUrlLabel.trim() || null,
        type: formData.type,
        difficulty: formData.difficulty,
        isFree: formData.isFree,
        featured: formData.featured,
        tags,
      };

      if (editingCourse) {
        // Edit existing
        const res = await fetch(`/api/skills-courses/${editingCourse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update course');
        }
        toast.success(`Updated "${formData.title}"`);
      } else {
        // Create new
        const res = await fetch('/api/skills-courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create course');
        }
        toast.success(`Created "${formData.title}"`);
      }

      setIsDialogOpen(false);
      fetchCourses();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/skills-courses/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete course');
      }
      toast.success(`Deleted "${title}"`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        'Are you sure you want to re-seed all standard course links? Any custom courses will be reset to default.'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/skills-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-defaults' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reset failed');
      }
      toast.success('Successfully restored standard course curriculum');
      fetchCourses();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Reset failed');
    }
  };

  // Filtered List
  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      course.category.toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q) ||
      course.url.toLowerCase().includes(q) ||
      course.category.toLowerCase().includes(q) ||
      (course.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-neutral-200/80 shadow-xs">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-[#0A1B5C]" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-neutral-900 tracking-tight flex items-center gap-2">
                  <span>Skills Development Resources & Courses</span>
                  <Badge variant="secondary" className="bg-[#0A1B5C]/10 text-[#0A1B5C] font-bold">
                    {courses.length} Available
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500">
                  Manage the curated catalog of free courses, sheets, and repositories displayed on /jobs/skills-development.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className="text-xs font-semibold gap-1.5 border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                title="Restore default curated resource links"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
                <span>Reset Defaults</span>
              </Button>

              <Button
                size="sm"
                onClick={handleOpenAddModal}
                className="bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Add Resource</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
          {/* Category Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-neutral-100">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const count =
                  cat === 'All'
                    ? courses.length
                    : courses.filter((c) => c.category.toLowerCase() === cat.toLowerCase()).length;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-[#0A1B5C] text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900'
                    }`}
                  >
                    <span>{cat}</span>
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

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-neutral-300 focus-visible:ring-[#0A1B5C]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      {isLoading || loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-neutral-200/80 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#0A1B5C] animate-spin mb-3" />
          <p className="text-xs font-bold text-neutral-500">Loading skill resources...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-neutral-200/80 shadow-xs text-center">
          <GraduationCap className="w-10 h-10 text-neutral-300 mb-2" />
          <h3 className="text-sm font-bold text-neutral-800">No resources found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            {searchQuery
              ? `No courses matching "${searchQuery}" in category ${selectedCategory}.`
              : `No resources added yet under ${selectedCategory}.`}
          </p>
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="mt-4 bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold gap-1.5"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add First {selectedCategory !== 'All' ? selectedCategory : ''} Resource</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="border-neutral-200/80 shadow-xs hover:border-[#0A1B5C]/40 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="bg-[#0A1B5C]/10 text-[#0A1B5C] font-extrabold text-[10px] uppercase tracking-wider"
                    >
                      {course.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold text-neutral-600 border-neutral-200 capitalize"
                    >
                      {course.type}
                    </Badge>
                    {course.featured && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    Free
                  </span>
                </div>

                <CardTitle className="text-sm font-black text-neutral-900 tracking-tight pt-2 line-clamp-2">
                  {course.title}
                </CardTitle>

                <CardDescription className="text-xs text-neutral-500 line-clamp-3 pt-1 leading-relaxed">
                  {course.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                {/* Domain & Link */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[170px]">
                    {course.domain || 'resource link'}
                  </span>

                  <div className="flex items-center gap-1">
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A1B5C] hover:text-[#0c2277] text-xs font-bold inline-flex items-center gap-1 transition-colors"
                      title="Open external link"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3 h-3 text-[#0A1B5C]" />
                    </a>
                  </div>
                </div>

                {course.secondaryUrl && (
                  <div className="flex items-center justify-between text-[11px] bg-neutral-50 p-2 rounded-lg border border-neutral-200/70">
                    <span className="text-neutral-500 font-medium">
                      {course.secondaryUrlLabel || 'Secondary Link'}:
                    </span>
                    <a
                      href={course.secondaryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A1B5C] font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Repository</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditModal(course)}
                    className="h-8 px-2.5 text-xs font-semibold gap-1 text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Edit</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteCourse(course.id, course.title)}
                    className="h-8 px-2.5 text-xs font-semibold gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-neutral-900">
              {editingCourse ? 'Edit Skill Resource' : 'Add New Skill Resource'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Curate high-leverage free courses, spreadsheets, problem sheets, or documentation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Resource Title *</Label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Striver's A2Z DSA Sheet"
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Category *</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 rounded-md border border-neutral-300 bg-white px-3 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                >
                  <option value="DSA">DSA</option>
                  <option value="System Design">System Design</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="CSS">CSS</option>
                  <option value="Java">Java</option>
                  <option value="AI">AI</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Resource Type</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-neutral-300 bg-white px-3 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
                >
                  <option value="guide">Guide / Tutorial</option>
                  <option value="curriculum">Curriculum / Roadmap</option>
                  <option value="interactive">Interactive Tool / Game</option>
                  <option value="repository">GitHub Repository</option>
                  <option value="cheatsheet">Cheatsheet / Reference</option>
                  <option value="course">Structured Course</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Primary URL *</Label>
              <Input
                type="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Secondary URL (Optional)</Label>
                <Input
                  type="url"
                  value={formData.secondaryUrl}
                  onChange={(e) => setFormData({ ...formData, secondaryUrl: e.target.value })}
                  placeholder="https://github.com/..."
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-700">Secondary Label</Label>
                <Input
                  type="text"
                  value={formData.secondaryUrlLabel}
                  onChange={(e) => setFormData({ ...formData, secondaryUrlLabel: e.target.value })}
                  placeholder="e.g. GitHub Repo"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Description</Label>
              <Textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain what candidates learn and why this resource is high leverage..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-700">Tags (comma-separated)</Label>
              <Input
                type="text"
                value={formData.tagsString}
                onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                placeholder="e.g. LeetCode, High Scale, Free, Interactive"
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded text-[#0A1B5C] focus:ring-[#0A1B5C]"
                />
                <span>Featured Resource (Pins to top)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                <input
                  type="checkbox"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                  className="rounded text-[#0A1B5C] focus:ring-[#0A1B5C]"
                />
                <span>100% Free Resource</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#0A1B5C] hover:bg-[#0c2277] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingCourse ? 'Save Changes' : 'Create Resource'}</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

