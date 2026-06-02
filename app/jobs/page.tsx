"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Building2,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { toast } from "sonner";

export default function JobsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterExperienceLevel, setFilterExperienceLevel] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");

  // Application Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [userApplications, setUserApplications] = useState<string[]>([]); // Array of job IDs user has applied to

  useEffect(() => {
    initPage();
  }, []);

  const initPage = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      // Fetch standard user data to verify verification status
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!userData) {
        router.push("/login");
        return;
      }

      setCurrentUser(userData);
      await fetchJobs();
      await fetchUserApplications(authUser.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (
    q = searchQuery,
    cat = filterCategory,
    type = filterJobType,
    exp = filterExperienceLevel,
    loc = filterLocation
  ) => {
    try {
      const params = new URLSearchParams({
        q,
        category: cat,
        job_type: type,
        experience_level: exp,
        location: loc,
      });

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
        if (data.jobs && data.jobs.length > 0) {
          setSelectedJob(data.jobs[0]);
          logJobView(data.jobs[0].id);
        } else {
          setSelectedJob(null);
        }
      }
    } catch (err) {
      console.error("Fetch jobs error:", err);
    }
  };

  const fetchUserApplications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("job_id")
        .eq("user_id", userId);

      if (!error && data) {
        setUserApplications(data.map((app) => app.job_id));
      }
    } catch (e) {
      console.error("Fetch user applications error:", e);
    }
  };

  const logJobView = async (jobId: string) => {
    try {
      await fetch("/api/jobs/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
    } catch (e) { }
  };

  // Perform search/filter refresh
  const handleFilterChange = (
    key: "q" | "category" | "job_type" | "experience_level" | "location",
    value: string
  ) => {
    let q = searchQuery;
    let cat = filterCategory;
    let type = filterJobType;
    let exp = filterExperienceLevel;
    let loc = filterLocation;

    if (key === "q") {
      setSearchQuery(value);
      q = value;
    } else if (key === "category") {
      setFilterCategory(value);
      cat = value;
    } else if (key === "job_type") {
      setFilterJobType(value);
      type = value;
    } else if (key === "experience_level") {
      setFilterExperienceLevel(value);
      exp = value;
    } else if (key === "location") {
      setFilterLocation(value);
      loc = value;
    }

    fetchJobs(q, cat, type, exp, loc);
  };

  const handleSelectJob = (job: any) => {
    setSelectedJob(job);
    logJobView(job.id);
  };

  const registerExternalApplication = async (jobId: string) => {
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          resumeUrl: "External Link Redirect",
          coverLetter: "Redirected to company site to complete application.",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserApplications((prev) => [...prev, jobId]);
        toast.success("Redirecting to application page...");
      }
    } catch (err) {
      console.error("External application logging error:", err);
    }
  };

  const handleOpenApplyModal = (job: any) => {
    if (!currentUser?.is_verified) {
      toast.error("You must verify your profile to apply for jobs.");
      return;
    }

    if (job.external_apply_url) {
      const win = window.open(
        job.external_apply_url.startsWith("http") ? job.external_apply_url : `https://${job.external_apply_url}`,
        "_blank"
      );
      if (win) win.focus();
      registerExternalApplication(job.id);
      return;
    }

    setApplyingJob(job);
    setResumeFile(null);
    setCoverLetter("");
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !applyingJob) return;
    setIsSubmittingApp(true);

    try {
      // 1. Upload resume to Supabase storage
      const fileExt = resumeFile.name.split(".").pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(uploadData.path);

      // 2. Submit application details
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: applyingJob.id,
          resumeUrl: publicUrl,
          coverLetter,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Application submitted successfully!");
        setIsApplyModalOpen(false);
        setUserApplications((prev) => [...prev, applyingJob.id]);
      } else {
        toast.error(data.error || "Failed to submit application");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#F8F9FB]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
      <Navigation />

      {/* Hero & Search Header */}
      <div className="bg-white border-b border-neutral-200 py-8">
        <div className="max-w-7xl mx-auto px-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-none">
              Explore Verified Careers
            </h1>
            <p className="text-neutral-500 text-sm mt-2">
              Jobs posted by verified recruiters at top-tier companies.
            </p>
          </div>

          {/* Search bar & filter selectors */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search job title, company, or keywords..."
                value={searchQuery}
                onChange={(e) => handleFilterChange("q", e.target.value)}
                className="pl-9 h-11 border-neutral-200 rounded-xl"
              />
            </div>

            {/* Category */}
            <div>
              <Select value={filterCategory} onValueChange={(val) => handleFilterChange("category", val)}>
                <SelectTrigger className="h-11 border-neutral-200 rounded-xl font-medium text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Product Management">Product</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Type */}
            <div>
              <Select value={filterJobType} onValueChange={(val) => handleFilterChange("job_type", val)}>
                <SelectTrigger className="h-11 border-neutral-200 rounded-xl font-medium text-xs">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Experience Level */}
            <div>
              <Select value={filterExperienceLevel} onValueChange={(val) => handleFilterChange("experience_level", val)}>
                <SelectTrigger className="h-11 border-neutral-200 rounded-xl font-medium text-xs">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Experience</SelectItem>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="lead/director">Lead / Director</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Select value={filterLocation} onValueChange={(val) => handleFilterChange("location", val)}>
                <SelectTrigger className="h-11 border-neutral-200 rounded-xl font-medium text-xs">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Remote">Remote</SelectItem>
                  <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                  <SelectItem value="Bangalore">Bangalore</SelectItem>
                  <SelectItem value="Mumbai">Mumbai</SelectItem>
                  <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                  <SelectItem value="Pune">Pune</SelectItem>
                  <SelectItem value="Chennai">Chennai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Left Column: Job List (1 Col) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-y-auto">
            <div className="p-4 border-b border-neutral-100 bg-[#FAFAFC] flex justify-between items-center">
              <span className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                Jobs Found ({jobs.length})
              </span>
            </div>

            {jobs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                <Briefcase className="h-10 w-10 text-neutral-300 mb-3" />
                <p className="font-bold text-sm">No job matches found</p>
                <p className="text-xs text-neutral-400 mt-1">Try expanding your search criteria or filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {jobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  const alreadyApplied = userApplications.includes(job.id);

                  return (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`p-4 cursor-pointer transition-colors text-left flex gap-3 ${isSelected ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-neutral-50"
                        }`}
                    >
                      {job.company_logo ? (
                        <img
                          src={job.company_logo}
                          alt={job.company_name}
                          className="h-10 w-10 rounded-lg object-contain border border-neutral-100 p-0.5 bg-white shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center border border-neutral-200 shrink-0">
                          <Building2 className="h-5 w-5 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-sm text-neutral-900 line-clamp-1">{job.title}</h3>
                          {alreadyApplied && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold uppercase py-0.5 shrink-0">
                              Applied
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-semibold uppercase tracking-tight">
                          {job.company_name}
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          <Badge variant="secondary" className="bg-[#EAEBF0] text-[#1F2557] border-none text-[9px] font-bold uppercase py-0.5">
                            {job.job_type}
                          </Badge>
                          <Badge variant="outline" className="text-neutral-500 border-neutral-200 text-[9px] font-bold uppercase py-0.5">
                            {job.location}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Job Details (2 Cols) */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm h-[calc(100vh-280px)] flex flex-col">
              {/* Job Header */}
              <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="text-left space-y-2">
                  <div className="flex items-start gap-4">
                    {selectedJob.company_logo ? (
                      <img
                        src={selectedJob.company_logo}
                        alt={selectedJob.company_name}
                        className="h-12 w-12 rounded-xl object-contain border border-neutral-100 p-1 bg-white shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200 shrink-0">
                        <Building2 className="h-6 w-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="text-left space-y-1.5">
                      <h2 className="text-xl font-bold text-neutral-900 leading-tight">{selectedJob.title}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">{selectedJob.company_name}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-neutral-400" /> {selectedJob.location}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" /> {selectedJob.job_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase">
                      {selectedJob.experience_level}
                    </Badge>
                    {selectedJob.salary_range && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase">
                        {selectedJob.salary_range}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="self-stretch sm:self-start flex flex-col items-stretch gap-2">
                  {userApplications.includes(selectedJob.id) ? (
                    <Button disabled className="bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1.5 h-10 px-6">
                      <CheckCircle className="h-4 w-4" /> Applied
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenApplyModal(selectedJob)}
                      className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-10 px-6 shadow-md shadow-primary/10 transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {selectedJob.external_apply_url ? (
                        <>
                          Apply Externally <ExternalLink className="h-4 w-4" />
                        </>
                      ) : (
                        "Apply Now"
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Job Details Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-left">
                {/* Description */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">Job Description</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Requirements */}
                {selectedJob.requirements && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">Requirements</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.requirements}
                    </p>
                  </div>
                )}

                {/* Company Link / Meta info */}
                <div className="pt-6 border-t border-neutral-100 flex flex-wrap gap-6 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-neutral-400" />
                    Posted {new Date(selectedJob.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center text-neutral-500 h-[calc(100vh-280px)] flex flex-col justify-center items-center">
              <Briefcase className="h-12 w-12 text-neutral-300 mb-4 animate-pulse" />
              <p className="font-bold text-base">Select a job post</p>
              <p className="text-xs text-neutral-400 mt-1">Select any job on the left to see complete details and apply.</p>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div className="text-left">
                <h3 className="font-bold text-lg text-neutral-900 leading-tight">Apply to {applyingJob?.company_name}</h3>
                <p className="text-xs text-neutral-500 mt-1">Position: {applyingJob?.title}</p>
              </div>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label>Upload Resume (PDF, Word, or Image)</Label>
                <div className="border-2 border-dashed rounded-xl p-5 text-center hover:bg-neutral-50 cursor-pointer relative border-neutral-200">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(e) => e.target.files && setResumeFile(e.target.files[0])}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  <Upload className="h-7 w-7 text-neutral-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-neutral-600">
                    {resumeFile ? resumeFile.name : "Click to choose file"}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">PDF or Word docs up to 10MB</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Cover Letter / Note (Optional)</Label>
                <textarea
                  id="coverLetter"
                  placeholder="Introduce yourself to the hiring team..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-neutral-50 focus:bg-white transition-all"
                  rows={4}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingApp || !resumeFile} className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl px-5 h-9 flex items-center gap-1.5">
                  {isSubmittingApp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
