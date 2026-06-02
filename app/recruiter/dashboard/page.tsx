"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Plus,
  Trash2,
  Loader2,
  Users,
  Eye,
  LogOut,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Ban,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export default function RecruiterDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recruiter, setRecruiter] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedJobIdForApplicants, setSelectedJobIdForApplicants] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  // Job Modal/Form State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Engineering");
  const [formLocation, setFormLocation] = useState("Hyderabad");
  const [formJobType, setFormJobType] = useState("full-time");
  const [formExperienceLevel, setFormExperienceLevel] = useState("mid");
  const [formSalaryRange, setFormSalaryRange] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRequirements, setFormRequirements] = useState("");
  const [formExternalApplyUrl, setFormExternalApplyUrl] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formCompanyLogo, setFormCompanyLogo] = useState("");
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);

  useEffect(() => {
    fetchRecruiterData();
  }, []);

  const fetchRecruiterData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/recruiter/login");
        return;
      }

      const { data: recData, error: dbError } = await supabase
        .from("recruiters")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (dbError || !recData) {
        await supabase.auth.signOut();
        router.push("/recruiter/login");
        return;
      }

      setRecruiter(recData);

      const { data: userData } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(userData?.is_admin || false);

      await fetchJobsAndApplications();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchJobsAndApplications = async () => {
    try {
      // 1. Fetch Jobs
      const jobsRes = await fetch("/api/recruiter/jobs");
      const jobsData = await jobsRes.json();
      if (jobsData.success) {
        setJobs(jobsData.jobs || []);
      }

      // 2. Fetch Applications
      const appsRes = await fetch("/api/recruiter/applications");
      const appsData = await appsRes.json();
      if (appsData.success) {
        setApplications(appsData.applications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/recruiter/login");
  };

  const handleOpenPostJobModal = (job: any = null) => {
    if (job) {
      setEditingJob(job);
      setFormTitle(job.title);
      setFormCategory(job.category);
      setFormLocation(job.location);
      setFormJobType(job.job_type);
      setFormExperienceLevel(job.experience_level);
      setFormSalaryRange(job.salary_range || "");
      setFormDescription(job.description);
      setFormRequirements(job.requirements || "");
      setFormExternalApplyUrl(job.external_apply_url || "");
      setFormCompanyName(job.company_name || "");
      setFormCompanyLogo(job.company_logo || "");
    } else {
      setEditingJob(null);
      setFormTitle("");
      setFormCategory("Engineering");
      setFormLocation("Hyderabad");
      setFormJobType("full-time");
      setFormExperienceLevel("mid");
      setFormSalaryRange("");
      setFormDescription("");
      setFormRequirements("");
      setFormExternalApplyUrl("");
      setFormCompanyName("");
      setFormCompanyLogo("");
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingJob(true);

    try {
      const res = await fetch("/api/recruiter/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingJob?.id,
          title: formTitle,
          category: formCategory,
          location: formLocation,
          job_type: formJobType,
          experience_level: formExperienceLevel,
          salary_range: formSalaryRange,
          description: formDescription,
          requirements: formRequirements,
          external_apply_url: formExternalApplyUrl,
          company_name: isAdmin ? formCompanyName : undefined,
          company_logo: isAdmin ? formCompanyLogo : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingJob ? "Job updated successfully!" : "Job posted successfully!");
        setIsJobModalOpen(false);
        fetchJobsAndApplications();
      } else {
        toast.error(data.error || "Failed to save job");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job post?")) return;

    try {
      const res = await fetch(`/api/recruiter/jobs?id=${jobId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Job deleted successfully!");
        fetchJobsAndApplications();
      } else {
        toast.error(data.error || "Failed to delete job");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const res = await fetch("/api/recruiter/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Application status updated!");
        fetchJobsAndApplications();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  // Metrics calculations
  const totalJobs = jobs.length;
  const totalViews = jobs.reduce((acc, job) => acc + (job.views_count || 0), 0);
  const totalApps = applications.length;
  const conversionRate = totalViews > 0 ? ((totalApps / totalViews) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recruiter && recruiter.status !== "approved") {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between">
        <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Image
              src="/images/logo.png"
              alt="Vouchins"
              width={120}
              height={35}
              className="object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-neutral-500 hover:text-red-600 font-bold text-xs flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </header>

        <div className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm max-w-md w-full">
            {recruiter.status === "pending" && (
              <>
                <div className="h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100">
                  <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                </div>
                <h2 className="text-2xl font-black mb-2 text-neutral-900">Approval Pending</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Your recruiter registration for <span className="font-bold text-neutral-700">{recruiter.company_name}</span> is currently pending admin approval.
                </p>
                <p className="text-neutral-400 text-xs mt-4">
                  We verify all recruiter workspaces to maintain high network trust. You will receive access once approved.
                </p>
              </>
            )}

            {recruiter.status === "rejected" && (
              <>
                <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black mb-2 text-neutral-900">Registration Rejected</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Unfortunately, your recruiter registration for <span className="font-bold text-neutral-700">{recruiter.company_name}</span> has been rejected by our administrators.
                </p>
                <p className="text-neutral-400 text-xs mt-4">
                  Please contact support if you believe this was an error.
                </p>
              </>
            )}

            {recruiter.status === "suspended" && (
              <>
                <div className="h-16 w-16 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-200">
                  <Ban className="h-8 w-8 text-neutral-500" />
                </div>
                <h2 className="text-2xl font-black mb-2 text-neutral-900">Workspace Suspended</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Your recruiter workspace has been temporarily suspended by Vouchins administrators.
                </p>
                <p className="text-neutral-400 text-xs mt-4">
                  Please contact the administration panel for more details.
                </p>
              </>
            )}
          </div>
        </div>

        <footer className="py-6 bg-white border-t text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Vouchins. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-16">
      {/* Recruiter Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/recruiter/dashboard">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={120}
                height={35}
                className="object-contain"
              />
            </Link>
            <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase font-black px-2 tracking-wider">
              Recruiter Hub
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center border border-neutral-200">
                <Building2 className="h-4 w-4 text-neutral-500" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-neutral-900 leading-none">
                  {recruiter?.company_name}
                </p>
                {recruiter?.website && (
                  <a
                    href={recruiter.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-neutral-400 hover:text-primary flex items-center gap-0.5 mt-0.5"
                  >
                    Visit Website <ExternalLink className="h-2 w-2" />
                  </a>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-neutral-500 hover:text-red-600 font-bold text-xs flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Dashboard Title & Post CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900 leading-none">
              Recruiter Dashboard
            </h1>
            <p className="text-neutral-500 text-sm mt-2">
              Review stats, post jobs, and manage candidates.
            </p>
          </div>

          <Button
            onClick={() => handleOpenPostJobModal()}
            className="bg-primary hover:bg-primary/95 text-white font-bold flex items-center gap-2 rounded-xl px-5 shadow-md shadow-primary/10 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" /> Post a Job
          </Button>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-neutral-400">
              <span className="text-xs font-black uppercase tracking-wider">Jobs Posted</span>
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{totalJobs}</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-neutral-400">
              <span className="text-xs font-black uppercase tracking-wider">Impressions</span>
              <Eye className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{totalViews}</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-neutral-400">
              <span className="text-xs font-black uppercase tracking-wider">Applicants</span>
              <Users className="h-5 w-5 text-teal-500" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{totalApps}</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3 text-neutral-400">
              <span className="text-xs font-black uppercase tracking-wider">Apply Rate</span>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{conversionRate}%</p>
          </div>
        </div>

        {/* Main Content Area: Job Listings & Candidate List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Listings Panel (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#FAFAFC]">
                <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">
                  Your Job Postings
                </h3>
              </div>

              {jobs.length === 0 ? (
                <div className="p-16 text-center text-neutral-500">
                  <Briefcase className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
                  <p className="font-medium text-sm">No jobs posted yet</p>
                  <p className="text-xs text-neutral-400 mt-1">Get started by creating your first job listing.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {jobs.map((job) => {
                    const isSelected = selectedJobIdForApplicants === job.id;
                    const jobApps = applications.filter((app) => app.job_id === job.id);

                    return (
                      <div key={job.id} className="p-5 hover:bg-neutral-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-neutral-900">{job.title}</h4>
                              <Badge className="bg-[#EAEBF0] text-[#1F2557] border-none text-[10px] font-bold">
                                {job.job_type.toUpperCase()}
                              </Badge>
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                                {job.experience_level.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">
                              {job.category} • {job.location} • Posted {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-start">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPostJobModal(job)}
                              className="text-xs font-bold px-3"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                              className="text-neutral-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Job Metrics & Toggle Applicants */}
                        <div className="mt-4 pt-4 border-t border-neutral-100/60 flex flex-wrap items-center justify-between gap-4 text-xs">
                          <div className="flex items-center gap-4 text-neutral-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5 text-neutral-400" />
                              {job.views_count} Impressions
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-neutral-400" />
                              {job.applications_count} Candidates
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedJobIdForApplicants(isSelected ? null : job.id);
                            }}
                            className="text-primary hover:opacity-85 font-black text-xs uppercase flex items-center gap-1"
                          >
                            {isSelected ? (
                              <>
                                Hide Applicants <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                View Applicants ({jobApps.length}) <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Applicant Tracking / Sidebar Panel (Right Column) */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm sticky top-24">
              <div className="p-5 border-b border-neutral-100 bg-[#FAFAFC]">
                <h3 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">
                  {selectedJobIdForApplicants
                    ? `Candidates (${applications.filter(a => a.job_id === selectedJobIdForApplicants).length})`
                    : "All Applicants"}
                </h3>
              </div>

              {/* Filter applicants by selectedJobIdForApplicants */}
              {(() => {
                const filteredApps = selectedJobIdForApplicants
                  ? applications.filter((app) => app.job_id === selectedJobIdForApplicants)
                  : applications;

                if (filteredApps.length === 0) {
                  return (
                    <div className="p-12 text-center text-neutral-500">
                      <Users className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
                      <p className="font-medium text-xs">No applicants listed</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {selectedJobIdForApplicants
                          ? "Nobody has applied to this listing yet."
                          : "Your job listings haven't received applications yet."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                    {filteredApps.map((app) => (
                      <div key={app.id} className="p-5 space-y-4 hover:bg-neutral-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 uppercase">
                              {app.user?.full_name?.substring(0, 2) || "JS"}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-neutral-900 leading-tight">
                                {app.user?.full_name}
                              </h4>
                              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5 uppercase tracking-wide">
                                Verified @ {app.user?.company?.name || "Corporate"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-neutral-400">
                              {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Candidate Details & Resume */}
                        <div className="space-y-2 text-xs">
                          {app.cover_letter && (
                            <div className="bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                              <p className="text-neutral-500 leading-normal italic text-[11px]">
                                "{app.cover_letter}"
                              </p>
                            </div>
                          )}

                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold text-[11px]"
                          >
                            <FileText className="h-3.5 w-3.5" /> View Uploaded Resume
                          </a>
                        </div>

                        {/* Recruitment Status Dropdown */}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-100/60">
                          <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                            Status
                          </span>
                          <Select
                            value={app.status}
                            onValueChange={(val) => handleUpdateApplicationStatus(app.id, val)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs font-bold border-neutral-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-xs">
                              <SelectItem value="applied">Applied</SelectItem>
                              <SelectItem value="reviewing">Reviewing</SelectItem>
                              <SelectItem value="interviewing">Interviewing</SelectItem>
                              <SelectItem value="offered">Offered</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      {/* Post/Edit Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-neutral-900">
                {editingJob ? "Edit Job Listing" : "Post a New Job"}
              </h3>
              <button
                onClick={() => setIsJobModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Senior React Developer"
                  required
                />
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Hiring Company Name</Label>
                    <Input
                      id="companyName"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                      placeholder="e.g. SpaceX"
                      required={isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLogo">Company Logo URL</Label>
                    <Input
                      id="companyLogo"
                      value={formCompanyLogo}
                      onChange={(e) => setFormCompanyLogo(e.target.value)}
                      placeholder="e.g. https://logo.com/logo.png"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobCategory">Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger id="jobCategory">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="space-y-2">
                  <Label htmlFor="jobLocation">Location</Label>
                  <Select value={formLocation} onValueChange={setFormLocation}>
                    <SelectTrigger id="jobLocation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobType">Job Type</Label>
                  <Select value={formJobType} onValueChange={setFormJobType}>
                    <SelectTrigger id="jobType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select value={formExperienceLevel} onValueChange={setFormExperienceLevel}>
                    <SelectTrigger id="experienceLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead/director">Lead / Director</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryRange">Salary Range (Optional)</Label>
                <Input
                  id="salaryRange"
                  value={formSalaryRange}
                  onChange={(e) => setFormSalaryRange(e.target.value)}
                  placeholder="e.g. ₹15,00,000 - ₹25,00,000 / year"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalApplyUrl">External Apply Link (Optional)</Label>
                <Input
                  id="externalApplyUrl"
                  value={formExternalApplyUrl}
                  onChange={(e) => setFormExternalApplyUrl(e.target.value)}
                  placeholder="e.g. https://careers.company.com/job/123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the job duties and responsibilities..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  value={formRequirements}
                  onChange={(e) => setFormRequirements(e.target.value)}
                  placeholder="e.g. 3+ years experience with Next.js, TypeScript..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsJobModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingJob}>
                  {isSubmittingJob ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...
                    </>
                  ) : (
                    "Save Listing"
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
