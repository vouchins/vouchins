"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface AdminJob {
  id: string;
  recruiter_id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  location: string;
  job_type: "full-time" | "part-time" | "contract" | "internship" | string;
  salary_range?: string;
  experience_level: "entry" | "mid" | "senior" | "lead/director" | string;
  category: string;
  impressions: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  external_apply_url?: string;
  description: string;
  requirements?: string;
}

interface JobsTabProps {
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

const CATEGORIES = [
  "All",
  "Engineering",
  "Product Management",
  "Design",
  "Data / AI",
  "Sales",
  "Marketing",
  "HR",
  "Finance / Risk",
  "Operations",
];

const EXPERIENCE_LEVELS = [
  { value: "all", label: "All Seniorities" },
  { value: "entry", label: "Entry Level (L0 / L1)" },
  { value: "mid", label: "Mid Level (L2)" },
  { value: "senior", label: "Senior (L3)" },
  { value: "lead/director", label: "Lead / Director (L4 / L5+)" },
];

const JOB_TYPES = [
  { value: "all", label: "All Types" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

export function JobsTab({ onRefresh, loading: parentLoading }: JobsTabProps) {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("all");
  const [selectedJobType, setSelectedJobType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedSort, setSelectedSort] = useState("newest");

  // Company Searchable Dropdown State
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [isCompanyComboOpen, setIsCompanyComboOpen] = useState(false);
  const [companySearchInput, setCompanySearchInput] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalJobs, setTotalJobs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ activeJobs: 0, totalJobs: 0, inactiveJobs: 0 });

  // Dialog State
  const [inspectJob, setInspectJob] = useState<AdminJob | null>(null);
  const [jobToDelete, setJobToDelete] = useState<AdminJob | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  // Bulk Selection & Delete State
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isAllPageSelected =
    jobs.length > 0 && jobs.every((job) => selectedJobIds.has(job.id));
  const isSomePageSelected =
    jobs.some((job) => selectedJobIds.has(job.id));

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        jobs.forEach((job) => next.add(job.id));
      } else {
        jobs.forEach((job) => next.delete(job.id));
        setIsAllMatchingSelected(false);
      }
      return next;
    });
  };

  const toggleSelectJob = (jobId: string, checked: boolean) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(jobId);
      } else {
        next.delete(jobId);
        setIsAllMatchingSelected(false);
      }
      return next;
    });
  };

  const handleSelectAllMatching = () => {
    setIsAllMatchingSelected(true);
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      jobs.forEach((job) => next.add(job.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedJobIds(new Set());
    setIsAllMatchingSelected(false);
  };

  const fetchJobs = useCallback(async (loadCompanies = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        experience_level: selectedExperience,
        job_type: selectedJobType,
        category: selectedCategory === "All" ? "all" : selectedCategory,
        status: selectedStatus,
        sort: selectedSort,
      });

      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (selectedCompany.trim()) {
        params.set("company", selectedCompany.trim());
      }
      if (selectedLocation.trim()) {
        params.set("location", selectedLocation.trim());
      }
      if (loadCompanies || availableCompanies.length === 0) {
        params.set("include_companies", "true");
      }

      const res = await fetch(`/api/admin/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load jobs");
      }

      setJobs(data.jobs || []);
      setTotalJobs(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
      if (Array.isArray(data.companies) && data.companies.length > 0) {
        setAvailableCompanies(data.companies);
      }
    } catch (err: any) {
      console.error("Error fetching jobs in admin:", err);
      toast.error(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    selectedCompany,
    selectedLocation,
    selectedExperience,
    selectedJobType,
    selectedCategory,
    selectedStatus,
    selectedSort,
    availableCompanies.length,
  ]);

  const filteredCompaniesForDropdown = availableCompanies.filter((comp) =>
    comp.toLowerCase().includes(companySearchInput.toLowerCase().trim())
  );

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleToggleJobStatus = async (job: AdminJob) => {
    const nextStatus = !job.is_active;
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, is_active: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update job status");

      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, is_active: nextStatus } : j))
      );
      if (inspectJob && inspectJob.id === job.id) {
        setInspectJob({ ...inspectJob, is_active: nextStatus });
      }
      setStats((prev) => ({
        ...prev,
        activeJobs: nextStatus ? prev.activeJobs + 1 : Math.max(0, prev.activeJobs - 1),
        inactiveJobs: nextStatus ? Math.max(0, prev.inactiveJobs - 1) : prev.inactiveJobs + 1,
      }));
      toast.success(`Job marked as ${nextStatus ? "active" : "inactive"}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Error updating job status");
    }
  };

  useEffect(() => {
    // Reset selection when search or filters change
    handleClearSelection();
  }, [
    searchQuery,
    selectedCompany,
    selectedLocation,
    selectedExperience,
    selectedJobType,
    selectedCategory,
    selectedStatus,
    selectedSort,
  ]);

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/jobs?id=${jobToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete job");

      toast.success("Job deleted permanently");
      const deletedId = jobToDelete.id;
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
      setJobToDelete(null);
      if (inspectJob?.id === deletedId) {
        setInspectJob(null);
      }
      fetchJobs();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAllMatchingSelected && selectedJobIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      let res: Response;
      if (isAllMatchingSelected) {
        res = await fetch("/api/admin/jobs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allMatching: true,
            q: searchQuery.trim(),
            company: selectedCompany.trim(),
            location: selectedLocation.trim(),
            experience_level: selectedExperience,
            job_type: selectedJobType,
            category: selectedCategory === "All" ? "all" : selectedCategory,
            status: selectedStatus,
          }),
        });
      } else {
        res = await fetch("/api/admin/jobs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: Array.from(selectedJobIds),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete jobs");

      const count = data.count ?? (isAllMatchingSelected ? totalJobs : selectedJobIds.size);
      toast.success(
        isAllMatchingSelected
          ? `Successfully deleted all ${count} matching jobs`
          : `Successfully deleted ${count} ${count === 1 ? "job" : "jobs"}`
      );

      handleClearSelection();
      setIsBulkDeleteDialogOpen(false);
      await fetchJobs();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete jobs");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setHasCopiedUrl(true);
    toast.success("Job application URL copied to clipboard");
    setTimeout(() => setHasCopiedUrl(false), 2000);
  };

  const renderSeniorityBadge = (level: string) => {
    const l = (level || "").toLowerCase();
    if (l === "entry") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Entry
        </span>
      );
    }
    if (l === "senior") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Senior
        </span>
      );
    }
    if (l.includes("lead") || l.includes("director") || l === "staff" || l === "principal") {
      return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Lead / Director
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        Mid
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Active Jobs
            </p>
            <p className="text-2xl font-black text-[#0A1B5C] mt-1">{stats.activeJobs}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#4FD1C5]/15 flex items-center justify-center text-[#0A1B5C]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Database Jobs
            </p>
            <p className="text-2xl font-black text-neutral-800 mt-1">{stats.totalJobs}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Inactive / Paused
            </p>
            <p className="text-2xl font-black text-neutral-600 mt-1">{stats.inactiveJobs}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <XCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/70 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Filtered Matches
            </p>
            <p className="text-2xl font-black text-[#0A1B5C] mt-1">{totalJobs}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0A1B5C]/10 flex items-center justify-center text-[#0A1B5C]">
            <Filter className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by job title, company name, or city..."
              className="pl-10 text-xs h-10 bg-neutral-50/70 border-neutral-200 focus:bg-white rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(searchQuery || selectedCompany || selectedLocation || selectedExperience !== "all" || selectedJobType !== "all" || selectedCategory !== "All" || selectedStatus !== "all") && (
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompany("");
                  setSelectedLocation("");
                  setSelectedExperience("all");
                  setSelectedJobType("all");
                  setSelectedCategory("All");
                  setSelectedStatus("all");
                  setPage(1);
                }}
                variant="ghost"
                size="sm"
                className="h-10 text-xs font-bold text-neutral-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 px-3 rounded-xl"
              >
                <X className="h-3.5 w-3.5" />
                Clear Filters
              </Button>
            )}

            {jobs.length > 0 && (
              <Button
                onClick={() => {
                  if (isAllMatchingSelected || isAllPageSelected) {
                    handleClearSelection();
                  } else {
                    toggleSelectAllOnPage(true);
                  }
                }}
                variant="outline"
                size="sm"
                className="h-10 text-xs font-bold border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 px-3.5 rounded-xl shadow-2xs"
              >
                <Check className="h-3.5 w-3.5 text-[#0A1B5C]" />
                {isAllMatchingSelected || isAllPageSelected ? "Deselect Page" : "Select Page"}
              </Button>
            )}

            <Button
              onClick={() => fetchJobs()}
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5 px-3.5 rounded-xl shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#0A1B5C]" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 pt-3 border-t border-neutral-100">
          {/* Company Searchable Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Building2 className="h-3 w-3 text-[#0A1B5C]" />
              Company
            </label>
            <Popover open={isCompanyComboOpen} onOpenChange={setIsCompanyComboOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-label="Filter by company"
                  aria-expanded={isCompanyComboOpen}
                  className="w-full h-9 flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-2.5 text-xs text-neutral-800 shadow-2xs hover:bg-neutral-50/80 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] transition-all"
                >
                  <span className="truncate font-semibold text-left">
                    {selectedCompany ? selectedCompany : "All Companies"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    {selectedCompany && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCompany("");
                          setPage(1);
                        }}
                        className="text-neutral-400 hover:text-red-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400 opacity-70" />
                  </div>
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[260px] p-2 bg-white border border-neutral-200/90 shadow-lg rounded-xl z-50 space-y-1.5"
              >
                {/* Search input inside dropdown */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                  <Input
                    placeholder="Search company..."
                    value={companySearchInput}
                    onChange={(e) => setCompanySearchInput(e.target.value)}
                    autoFocus
                    className="h-8 pl-8 pr-7 text-xs bg-neutral-50/80 border-neutral-200 rounded-lg focus:bg-white"
                  />
                  {companySearchInput && (
                    <button
                      type="button"
                      onClick={() => setCompanySearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Company Options List */}
                <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-0.5 pt-1">
                  {/* All Companies reset option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompany("");
                      setIsCompanyComboOpen(false);
                      setCompanySearchInput("");
                      setPage(1);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      !selectedCompany
                        ? "bg-[#0A1B5C]/10 text-[#0A1B5C] font-bold"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span>All Companies</span>
                    {!selectedCompany && <Check className="h-3.5 w-3.5 text-[#0A1B5C]" />}
                  </button>

                  {/* Filtered company results */}
                  {filteredCompaniesForDropdown.length === 0 ? (
                    <div className="py-3 px-2 text-center text-xs text-neutral-400">
                      <p>No company found.</p>
                      {companySearchInput.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompany(companySearchInput.trim());
                            setIsCompanyComboOpen(false);
                            setCompanySearchInput("");
                            setPage(1);
                          }}
                          className="mt-1.5 inline-block text-[11px] font-bold text-[#0A1B5C] hover:underline"
                        >
                          Filter by "{companySearchInput.trim()}" anyway
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCompaniesForDropdown.map((company) => {
                      const isSelected = selectedCompany.toLowerCase() === company.toLowerCase();
                      return (
                        <button
                          key={company}
                          type="button"
                          onClick={() => {
                            setSelectedCompany(company);
                            setIsCompanyComboOpen(false);
                            setCompanySearchInput("");
                            setPage(1);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors truncate ${
                            isSelected
                              ? "bg-[#0A1B5C]/10 text-[#0A1B5C] font-bold"
                              : "text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="truncate">{company}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#0A1B5C] shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Location Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-[#0A1B5C]" />
              Location
            </label>
            <div className="relative">
              <Input
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter location..."
                className="text-xs h-9 pr-7 bg-white border-neutral-200 rounded-lg shadow-2xs focus:ring-1 focus:ring-[#0A1B5C]"
              />
              {selectedLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Seniority */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Seniority
            </label>
            <select
              value={selectedExperience}
              onChange={(e) => {
                setSelectedExperience(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-semibold rounded-lg border border-neutral-200 bg-white px-2.5 h-9 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] shadow-2xs"
            >
              {EXPERIENCE_LEVELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Job Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Job Type
            </label>
            <select
              value={selectedJobType}
              onChange={(e) => {
                setSelectedJobType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-semibold rounded-lg border border-neutral-200 bg-white px-2.5 h-9 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] shadow-2xs"
            >
              {JOB_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-semibold rounded-lg border border-neutral-200 bg-white px-2.5 h-9 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] shadow-2xs"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setPage(1);
              }}
              className="w-full text-xs font-semibold rounded-lg border border-neutral-200 bg-white px-2.5 h-9 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Sort By
            </label>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs font-semibold rounded-lg border border-neutral-200 bg-white px-2.5 h-9 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] shadow-2xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Job Title (A - Z)</option>
              <option value="company">Company (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {(selectedCompany || selectedLocation) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 text-xs">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {selectedCompany && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A1B5C]/10 text-[#0A1B5C] font-semibold text-xs border border-[#0A1B5C]/20">
                <Building2 className="h-3 w-3" />
                Company: {selectedCompany}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompany("");
                    setPage(1);
                  }}
                  className="hover:text-red-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedLocation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200">
                <MapPin className="h-3 w-3" />
                Location: {selectedLocation}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocation("");
                    setPage(1);
                  }}
                  className="hover:text-red-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk Selection Action Bar */}
      {(selectedJobIds.size > 0 || isAllMatchingSelected) && (
        <div className="bg-[#0A1B5C] text-white px-4 py-3 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center justify-center bg-[#4FD1C5] text-[#0A1B5C] text-xs font-black h-6 min-w-6 px-2 rounded-full">
              {isAllMatchingSelected ? totalJobs : selectedJobIds.size}
            </span>
            <span className="text-xs font-bold">
              {isAllMatchingSelected ? (
                <>All {totalJobs} jobs selected across all pages</>
              ) : (
                <>
                  {selectedJobIds.size} {selectedJobIds.size === 1 ? "job" : "jobs"} selected on this page
                </>
              )}
            </span>

            {!isAllMatchingSelected && totalJobs > jobs.length && (
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="text-xs font-semibold text-[#4FD1C5] hover:underline cursor-pointer ml-1"
              >
                Select all {totalJobs} jobs matching criteria
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              onClick={handleClearSelection}
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/10"
            >
              Clear selection
            </Button>
            <Button
              type="button"
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              size="sm"
              className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 px-3.5 rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {isAllMatchingSelected ? `All (${totalJobs})` : `Selected (${selectedJobIds.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* Jobs Listing Table */}
      <div className="bg-white rounded-xl border border-neutral-200/70 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-7 w-7 text-[#0A1B5C] animate-spin" />
            <p className="text-xs font-semibold text-neutral-500">Loading jobs from database...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Briefcase className="h-10 w-10 text-neutral-300 mx-auto" />
            <h3 className="text-sm font-bold text-neutral-800">No jobs found matching your criteria</h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Try adjusting your search query, location or company filters, or run the Content Importer crawler to pull latest tech openings.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCompany("");
                setSelectedLocation("");
                setSelectedExperience("all");
                setSelectedJobType("all");
                setSelectedCategory("All");
                setSelectedStatus("all");
                setPage(1);
              }}
              variant="outline"
              size="sm"
              className="text-xs font-semibold text-[#0A1B5C] border-neutral-300"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-200/80 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <Checkbox
                      checked={
                        isAllMatchingSelected || isAllPageSelected
                          ? true
                          : isSomePageSelected
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={(checked) => toggleSelectAllOnPage(checked === true)}
                      aria-label="Select all jobs on current page"
                    />
                  </th>
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Seniority</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Posted</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {jobs.map((job) => {
                  const companyDomain = `${job.company_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
                  const logoSrc = job.company_logo || `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=64`;
                  const isSelected = isAllMatchingSelected || selectedJobIds.has(job.id);

                  return (
                    <tr
                      key={job.id}
                      className={`hover:bg-neutral-50/60 transition-colors ${
                        isSelected ? "bg-[#0A1B5C]/5" : ""
                      }`}
                    >
                      {/* Row Selection Checkbox */}
                      <td
                        className="py-3.5 px-3 w-10 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleSelectJob(job.id, checked === true)}
                          aria-label={`Select job ${job.title}`}
                        />
                      </td>

                      {/* Company & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg border border-neutral-200 bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={logoSrc}
                              alt={job.company_name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => setInspectJob(job)}
                              className="font-bold text-neutral-900 hover:text-[#0A1B5C] hover:underline text-left line-clamp-1 cursor-pointer"
                            >
                              {job.title}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCompany(job.company_name);
                                setPage(1);
                              }}
                              title={`Filter jobs for ${job.company_name}`}
                              className="text-[11px] font-medium text-neutral-500 hover:text-[#0A1B5C] hover:underline cursor-pointer truncate text-left block"
                            >
                              {job.company_name}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3 text-neutral-600 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLocation(job.location);
                            setPage(1);
                          }}
                          title={`Filter jobs in ${job.location}`}
                          className="flex items-center gap-1 line-clamp-1 max-w-[140px] hover:text-[#0A1B5C] hover:underline cursor-pointer text-left"
                        >
                          <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                          <span className="truncate">{job.location || "Remote"}</span>
                        </button>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700">
                          {job.category || "Engineering"}
                        </span>
                      </td>

                      {/* Seniority */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderSeniorityBadge(job.experience_level)}
                      </td>

                      {/* Job Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-neutral-600 capitalize">
                          {job.job_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleJobStatus(job)}
                          className="cursor-pointer group flex items-center gap-1.5 focus:outline-none"
                          title="Click to toggle status"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              job.is_active ? "bg-emerald-500" : "bg-neutral-300"
                            }`}
                          />
                          <span
                            className={`text-[11px] font-bold ${
                              job.is_active
                                ? "text-emerald-700 group-hover:underline"
                                : "text-neutral-500 group-hover:underline"
                            }`}
                          >
                            {job.is_active ? "Active" : "Inactive"}
                          </span>
                        </button>
                      </td>

                      {/* Posted Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-neutral-400 text-[11px]">
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => setInspectJob(job)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-neutral-500 hover:text-[#0A1B5C] hover:bg-neutral-100 rounded-lg"
                            title="Inspect Job Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {job.external_apply_url && (
                            <a
                              href={job.external_apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 w-7 inline-flex items-center justify-center text-neutral-500 hover:text-[#0A1B5C] hover:bg-neutral-100 rounded-lg"
                              title="Open External Apply Link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}

                          <Button
                            onClick={() => setJobToDelete(job)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Job"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {jobs.length > 0 && (
          <div className="py-3 px-4 bg-neutral-50/50 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <span>
                Showing <span className="font-bold">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-bold">{Math.min(page * pageSize, totalJobs)}</span> of{" "}
                <span className="font-bold">{totalJobs}</span> jobs
              </span>

              <span className="text-neutral-300">|</span>

              <label htmlFor="pageSizeSelect" className="text-neutral-500 text-[11px]">
                Per page:
              </label>
              <select
                id="pageSizeSelect"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="text-xs font-semibold rounded border border-neutral-200 bg-white px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold border-neutral-200"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>

              <span className="px-2 text-xs font-bold text-neutral-700">
                Page {page} of {totalPages}
              </span>

              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold border-neutral-200"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Job Modal */}
      <Dialog open={!!inspectJob} onOpenChange={(open) => !open && setInspectJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          {inspectJob && (
            <>
              <DialogHeader className="shrink-0 space-y-2 border-b border-neutral-100 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        inspectJob.is_active ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                    />
                    <Badge variant="outline" className="text-xs font-bold capitalize">
                      {inspectJob.is_active ? "Active Requisition" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderSeniorityBadge(inspectJob.experience_level)}
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 capitalize">
                      {inspectJob.job_type}
                    </span>
                  </div>
                </div>

                <DialogTitle className="text-xl font-bold text-[#0A1B5C] leading-snug">
                  {inspectJob.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-neutral-500 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 font-bold text-neutral-700">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                    {inspectJob.company_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    {inspectJob.location || "Remote"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    Posted {new Date(inspectJob.created_at).toLocaleDateString()}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Scrollable Details Content */}
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 text-xs">
                {inspectJob.salary_range && (
                  <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    <p className="text-[10px] uppercase font-bold text-neutral-400">
                      Estimated Compensation
                    </p>
                    <p className="text-sm font-black text-neutral-800 mt-0.5">
                      {inspectJob.salary_range}
                    </p>
                  </div>
                )}

                {inspectJob.external_apply_url && (
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/70 space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-blue-900">
                      Authentic ATS Application Link
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-neutral-700 truncate flex-1">
                        {inspectJob.external_apply_url}
                      </p>
                      <Button
                        onClick={() => handleCopyUrl(inspectJob.external_apply_url!)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-semibold text-[#0A1B5C]"
                      >
                        {hasCopiedUrl ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                          </>
                        )}
                      </Button>
                      <a
                        href={inspectJob.external_apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Job Description */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Role Description
                  </h4>
                  <div className="bg-neutral-50/60 p-3 rounded-lg border border-neutral-100 text-neutral-700 whitespace-pre-line leading-relaxed">
                    {inspectJob.description || "No description provided."}
                  </div>
                </div>

                {/* Job Requirements */}
                {inspectJob.requirements && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                      Requirements & Technical Skills
                    </h4>
                    <div className="bg-neutral-50/60 p-3 rounded-lg border border-neutral-100 text-neutral-700 whitespace-pre-line leading-relaxed">
                      {inspectJob.requirements}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <DialogFooter className="shrink-0 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <Button
                  onClick={() => handleToggleJobStatus(inspectJob)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold border-neutral-300"
                >
                  {inspectJob.is_active ? "Mark as Inactive" : "Mark as Active"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setJobToDelete(inspectJob);
                      setInspectJob(null);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete Requisition
                  </Button>
                  <Button
                    onClick={() => setInspectJob(null)}
                    className="bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold px-4 rounded-xl"
                  >
                    Done
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Permanently Delete Job?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-600 pt-2 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-neutral-800">{jobToDelete?.title}</span> at{" "}
              <span className="font-bold text-neutral-800">{jobToDelete?.company_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              onClick={() => setJobToDelete(null)}
              variant="outline"
              size="sm"
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteJob}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 rounded-xl"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={(open) => !isBulkDeleting && setIsBulkDeleteDialogOpen(open)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              {isAllMatchingSelected
                ? "Permanently Delete All Matching Jobs?"
                : `Permanently Delete ${selectedJobIds.size} Selected ${
                    selectedJobIds.size === 1 ? "Job" : "Jobs"
                  }?`}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-600 pt-2 leading-relaxed">
              {isAllMatchingSelected ? (
                <>
                  Are you sure you want to delete all{" "}
                  <span className="font-bold text-neutral-900">{totalJobs} jobs</span> matching
                  your active filters across all pages? This action cannot be undone and will permanently
                  remove them from the database.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-neutral-900">
                    {selectedJobIds.size} selected {selectedJobIds.size === 1 ? "job" : "jobs"}
                  </span>
                  ? This action cannot be undone and will permanently remove them from the database.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              onClick={() => setIsBulkDeleteDialogOpen(false)}
              variant="outline"
              size="sm"
              disabled={isBulkDeleting}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 rounded-xl flex items-center gap-1.5"
            >
              {isBulkDeleting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

