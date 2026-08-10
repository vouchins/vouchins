"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Clock,
  Flag,
  AlertTriangle,
  Users,
  MessageSquare,
  FileText,
  Briefcase,
  RefreshCw,
  Building2,
  Megaphone,
  BarChart3,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { UsersTab } from "@/components/admin/users-tab";
import { toast } from "sonner";
import { WaitlistTab } from "@/components/admin/waitlist-tab";
import { ReportsTab } from "@/components/admin/reports-tab";
import { FlaggedTab } from "@/components/admin/flagged-tab";
import { FeedbackTab } from "@/components/admin/feedback-tab";
import { BlogTab } from "@/components/admin/blog-tab";
import { RecruitersTab } from "@/components/admin/recruiters-tab";
import { CompaniesTab } from "@/components/admin/companies-tab";
import { CampaignsTab } from "@/components/admin/campaigns-tab";
import { AnalyticsTab } from "@/components/admin/analytics-tab";
import { ContentImporterTab } from "@/components/admin/content-importer-tab";

function AdminPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Lazy Loading & Counts States
  const [activeTab, setActiveTab] = useState("users");
  const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});
  const [loadingTabs, setLoadingTabs] = useState<Record<string, boolean>>({});
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});

  // Data States
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const sessionInvalidated = useRef(false);

  const clearAdminState = () => {
    setUser(null);
    setDbCounts({});
    setReports([]);
    setFlaggedPosts([]);
    setWaitlist([]);
    setAllUsers([]);
    setFeedback([]);
    setBlogPosts([]);
    setRecruiters([]);
    setCompanies([]);
    setLoadedTabs({});
  };

  const expireAdminSession = () => {
    if (sessionInvalidated.current) return;
    sessionInvalidated.current = true;
    clearAdminState();
    router.replace("/login?reason=session-expired");
  };

  const adminFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, { ...init, cache: "no-store" });
    if (response.status === 401 || response.status === 403) {
      expireAdminSession();
      throw new Error("Your admin session has expired");
    }
    return response;
  };

  useEffect(() => {
    void checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || ((event === "TOKEN_REFRESHED" || event === "USER_UPDATED") && !session)) {
        expireAdminSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const fetchDbCounts = async () => {
    try {
      const response = await adminFetch("/api/admin/dashboard?resource=counts");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load counts");
      setDbCounts(result.data || {});
    } catch (error) {
      console.error("Failed to fetch database counts:", error);
    }
  };

  const loadTabData = async (tabName: string, forceRefetch = false) => {
    if (loadedTabs[tabName] && !forceRefetch) return;

    setLoadingTabs((prev) => ({ ...prev, [tabName]: true }));
    try {
      switch (tabName) {
        case "waitlist":
          await fetchWaitlist();
          break;
        case "users":
          await fetchAllUsers();
          break;
        case "reports":
          await fetchReports();
          break;
        case "flagged":
          await fetchFlaggedPosts();
          break;
        case "feedback":
          await fetchFeedback();
          break;
        case "blog":
          await fetchBlogPosts();
          break;
        case "recruiters":
          await fetchRecruiters();
          break;
        case "companies":
          await fetchCompanies();
          break;
        default:
          break;
      }
      setLoadedTabs((prev) => ({ ...prev, [tabName]: true }));
    } catch (error) {
      console.error(`Error loading tab data for ${tabName}:`, error);
    } finally {
      setLoadingTabs((prev) => ({ ...prev, [tabName]: false }));
    }
  };

  const checkAuth = async () => {
    try {
      const response = await adminFetch("/api/admin/dashboard?resource=overview");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to initialize admin dashboard");
      setUser(result.profile);
      setDbCounts(result.dbCounts || {});
      setAllUsers(result.users || []);
      setLoadedTabs({ users: true });
      setLoading(false);
    } catch (error) {
      if (!sessionInvalidated.current) {
        console.error("Admin initialization failed", error);
        toast.error("Unable to initialize the admin dashboard");
      }
    }
  };

  // --- Fetchers ---
  const fetchReports = async () => {
    setReports(await fetchAdminResource("reports"));
  };

  const fetchFlaggedPosts = async () => {
    setFlaggedPosts(await fetchAdminResource("flagged"));
  };

  const fetchWaitlist = async () => {
    setWaitlist(await fetchAdminResource("waitlist"));
  };

  const fetchAdminResource = async (resource: string) => {
    const response = await adminFetch(`/api/admin/dashboard?resource=${encodeURIComponent(resource)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Unable to load ${resource}`);
    return result.data || [];
  };

  const fetchAllUsers = async () => {
    setAllUsers(await fetchAdminResource("users"));
  };

  const fetchFeedback = async () => {
    try {
      setFeedback(await fetchAdminResource("feedback"));
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      setFeedback([]);
    }
  };

  const fetchBlogPosts = async () => {
    setBlogPosts(await fetchAdminResource("blog"));
  };

  const fetchRecruiters = async () => {
    setRecruiters(await fetchAdminResource("recruiters"));
  };

  const fetchCompanies = async () => {
    setCompanies(await fetchAdminResource("companies"));
  };

  // --- Global Handlers (Passed to children) ---
  const handleModerateReport = async (
    reportId: string,
    action:
      | "mark_reviewed"
      | "dismiss"
      | "remove_content"
      | "suspend_user",
  ) => {
    const response = await adminFetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || "Moderation action failed");
    }

    toast.success("Report updated");
    await Promise.all([
      fetchReports(),
      fetchFlaggedPosts(),
      fetchAllUsers(),
      fetchDbCounts(),
    ]);
  };

  const handleFlaggedAction = async (
    action: "ignore" | "remove" | "suspend",
    postIds: string[],
  ) => {
    const actionLabel = {
      ignore: "ignore",
      remove: "remove",
      suspend: "suspend the authors of",
    }[action];

    if (
      action !== "ignore" &&
      !confirm(
        `Are you sure you want to ${actionLabel} ${postIds.length} selected flagged post${postIds.length === 1 ? "" : "s"}?`,
      )
    ) {
      return false;
    }

    try {
      const response = await adminFetch("/api/admin/flagged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postIds }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Moderation action failed");
      }

      toast.success(
        `${postIds.length} flagged post${postIds.length === 1 ? "" : "s"} updated`,
      );
      await Promise.all([
        fetchFlaggedPosts(),
        fetchReports(),
        fetchAllUsers(),
        fetchDbCounts(),
      ]);
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Moderation action failed");
      return false;
    }
  };

  // --- User Management Handlers ---
  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const res = await adminFetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to update user');
      }
      await fetchAllUsers();
      await fetchDbCounts();
    } catch (err: any) {
      alert('Error updating user: ' + err.message);
    }
  };

  const handleAdjustVouchScore = async (
    userId: string,
    delta: number,
    reason?: string,
  ) => {
    try {
      const res = await adminFetch("/api/admin/vouch-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, delta, reason }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error || "Failed to update vouch score");
      }
      await fetchAllUsers();
      await fetchDbCounts();
    } catch (err: any) {
      throw new Error(err?.message || "Failed to update vouch score");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This will remove all their posts, messages, and account details.")) return;
    try {
      const res = await adminFetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }

      await fetchAllUsers();
      await fetchDbCounts();
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  const handleCreateCompany = async (name: string, domain: string) => {
    const res = await adminFetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name, domain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create company");
    }
    await fetchCompanies();
    await fetchDbCounts();
  };

  const handleUpdateCompany = async (companyId: string, name: string, domain: string) => {
    const res = await adminFetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", companyId, name, domain }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update company");
    }
    await fetchCompanies();
    await fetchDbCounts();
  };

  const handleDeleteCompany = async (companyId: string) => {
    const res = await adminFetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", companyId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete company");
    }
    await fetchCompanies();
    await fetchDbCounts();
  };

  const handleWaitlistAction = async (
    waitlistId: string,
    action: "approve" | "reject",
    notes: string,
    domain?: string,
  ) => {
    if (action === "reject" && !confirm("Reject this applicant?")) return;
    try {
      const res = await adminFetch("/api/auth/approve-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId, notes, action, domain }),
      });
      if (!res.ok) throw new Error("Action failed");
      await fetchWaitlist();
      await fetchDbCounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRecruiterAction = async (recruiterId: string, action: "approved" | "rejected" | "suspended") => {
    const response = await adminFetch("/api/admin/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-recruiter", id: recruiterId, status: action }),
    });
    if (response.ok) {
      await fetchRecruiters();
      await fetchDbCounts();
    } else {
      const result = await response.json();
      alert("Failed to update recruiter status: " + (result.error || "Unknown error"));
    }
  };

  const handleReviewFeedback = async (feedbackId: string) => {
    try {
      const res = await adminFetch("/api/feedback/update-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status: "reviewed" }),
      });

      if (res.ok) {
        await fetchFeedback();
        await fetchDbCounts();
      }
    } catch (error) {
      console.error("Failed to update feedback:", error);
    }
  };

  const handleCreateBlog = async (post: any) => {
    const response = await adminFetch("/api/admin/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-blog", values: post }),
    });
    if (!response.ok) {
      const result = await response.json();
      alert("Error creating post: " + (result.error || "Unknown error"));
    } else {
      await fetchBlogPosts();
    }
  };

  const handleUpdateBlog = async (id: string, updates: any) => {
    const response = await adminFetch("/api/admin/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-blog", id, values: updates }),
    });
    if (!response.ok) {
      const result = await response.json();
      alert("Error updating post: " + (result.error || "Unknown error"));
    } else {
      await fetchBlogPosts();
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    const response = await adminFetch("/api/admin/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-blog", id }),
    });
    if (!response.ok) {
      const result = await response.json();
      alert("Error deleting post: " + (result.error || "Unknown error"));
    } else {
      await fetchBlogPosts();
    }
  };

  const getCount = (tab: string, dbCountKey: string, localCalc: () => number) => {
    if (loadedTabs[tab]) {
      return localCalc();
    }
    return dbCounts[dbCountKey] ?? 0;
  };

  const totalUsersCount = getCount("users", "users", () => allUsers.length);
  const pendingWaitlistCount = getCount("waitlist", "waitlist", () => waitlist.filter((w) => w.status === "pending").length);
  const pendingReportsCount = getCount("reports", "reports", () => reports.filter((r) => r.status === "pending").length);
  const flaggedPostsCount = getCount("flagged", "flagged", () => flaggedPosts.length);
  const pendingFeedbackCount = getCount("feedback", "feedback", () => feedback.filter((f) => f.status === "pending").length);
  const pendingRecruitersCount = getCount("recruiters", "recruiters", () => recruiters.filter((r) => r.status === "pending").length);
  const totalCompaniesCount = getCount("companies", "companies", () => companies.length);
  const totalBlogPostsCount = getCount("blog", "blog", () => blogPosts.length);

  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    await loadTabData(value);
  };

  const handleRefreshActiveTab = async () => {
    await Promise.all([
      fetchDbCounts(),
      loadTabData(activeTab, true)
    ]);
  };

  const isTabLoading = loadingTabs[activeTab];

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <Navigation />

      <div className="w-full px-4 md:px-8 pt-4 pb-8">

        {loading ? (
          <div className="min-h-[450px] flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200/60 shadow-sm p-8 transition-all">
            <div className="flex flex-col items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
              <p className="text-neutral-600 text-sm font-semibold">
                Initializing Dashboard...
              </p>
            </div>
          </div>
        ) : (
          <>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-100/50 p-1 md:h-auto md:flex-wrap md:gap-2 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0">
                <TabsTrigger value="users" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Users className="h-4 w-4 mr-2" /> Users{" "}
                  {totalUsersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {totalUsersCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="waitlist" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Clock className="h-4 w-4 mr-2" />
                  Waitlist{" "}
                  {pendingWaitlistCount > 0 && (
                    <Badge className="ml-2 bg-primary">
                      {pendingWaitlistCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recruiters" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Recruiters{" "}
                  {pendingRecruitersCount > 0 && (
                    <Badge className="ml-2 bg-primary">
                      {pendingRecruitersCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Flag className="h-4 w-4 mr-2" />
                  Reports{" "}
                  {pendingReportsCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingReportsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="flagged" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Flagged{" "}
                  {flaggedPostsCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {flaggedPostsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="feedback" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Feedback{" "}
                  {pendingFeedbackCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-indigo-100 text-indigo-700 font-bold"
                    >
                      {pendingFeedbackCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="blog" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  Blog{" "}
                  {totalBlogPostsCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {totalBlogPostsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="companies" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Building2 className="h-4 w-4 mr-2" />
                  Companies{" "}
                  {totalCompaniesCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {totalCompaniesCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="content-importer" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Download className="h-4 w-4 mr-2" /> Content Importer
                </TabsTrigger>
                 <TabsTrigger value="campaigns" className="px-6 font-bold text-xs md:rounded-full md:border md:border-neutral-200 md:bg-white md:px-4 md:py-2.5 md:shadow-sm md:data-[state=active]:border-primary md:data-[state=active]:bg-primary md:data-[state=active]:text-white">
                  <Megaphone className="h-4 w-4 mr-2" /> Campaigns{" "}
                  {(dbCounts.campaigns || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {dbCounts.campaigns}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="relative">
                {isTabLoading ? (
                  <div className="min-h-[350px] flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200/60 shadow-sm p-8 transition-all">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-neutral-500 text-sm font-semibold">
                        Loading tab data...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                     <TabsContent value="waitlist">
                      <WaitlistTab
                        entries={waitlist}
                        onAction={handleWaitlistAction}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="users">
                      <UsersTab
                        users={allUsers}
                        onUpdateUser={handleUpdateUser}
                        onAdjustVouchScore={handleAdjustVouchScore}
                        onDeleteUser={handleDeleteUser}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="reports">
                      <ReportsTab
                        reports={reports}
                        onModerate={handleModerateReport}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="flagged">
                      <FlaggedTab
                        posts={flaggedPosts}
                        onAction={handleFlaggedAction}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="feedback">
                      <FeedbackTab
                        feedbacks={feedback}
                        onReview={handleReviewFeedback}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="blog">
                      <BlogTab
                        posts={blogPosts}
                        onCreate={handleCreateBlog}
                        onUpdate={handleUpdateBlog}
                        onDelete={handleDeleteBlog}
                      />
                    </TabsContent>

                    <TabsContent value="analytics">
                      <AnalyticsTab />
                    </TabsContent>

                    <TabsContent value="recruiters">
                      <RecruitersTab
                        entries={recruiters}
                        onAction={handleRecruiterAction}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="companies">
                      <CompaniesTab
                        companies={companies}
                        onCreateCompany={handleCreateCompany}
                        onUpdateCompany={handleUpdateCompany}
                        onDeleteCompany={handleDeleteCompany}
                        onRefresh={handleRefreshActiveTab}
                        loading={loading || isTabLoading}
                      />
                    </TabsContent>

                    <TabsContent value="campaigns">
                      <CampaignsTab />
                    </TabsContent>
                    <TabsContent value="content-importer">
                      <ContentImporterTab />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </>
        )}
      </div>
    </div>
    );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-neutral-600 text-sm font-medium">
              Initializing Admin Dashboard...
            </p>
          </div>
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
