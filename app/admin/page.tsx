"use client";

import { useEffect, useState, Suspense } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase/browser";
import { AdminStats } from "@/components/admin/admin-stats";
import { UsersTab } from "@/components/admin/users-tab";
import { WaitlistTab } from "@/components/admin/waitlist-tab";
import { ReportsTab } from "@/components/admin/reports-tab";
import { FlaggedTab } from "@/components/admin/flagged-tab";
import { FeedbackTab } from "@/components/admin/feedback-tab";
import { BlogTab } from "@/components/admin/blog-tab";
import { RecruitersTab } from "@/components/admin/recruiters-tab";
import { CompaniesTab } from "@/components/admin/companies-tab";

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

  useEffect(() => {
    checkAuth();
  }, [router]);

  const fetchDbCounts = async () => {
    try {
      const [
        usersRes,
        reportsRes,
        flaggedRes,
        waitlistRes,
        feedbackRes,
        recruitersRes,
        companiesRes,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_flagged", true).eq("is_removed", false),
        supabase.from("manual_verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("feedback").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("recruiters").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("companies").select("*", { count: "exact", head: true }),
      ]);

      setDbCounts({
        users: usersRes.count || 0,
        reports: reportsRes.count || 0,
        flagged: flaggedRes.count || 0,
        waitlist: waitlistRes.count || 0,
        feedback: feedbackRes.count || 0,
        recruiters: recruitersRes.count || 0,
        companies: companiesRes.count || 0,
      });
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
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select(`*, company:companies(*)`)
      .eq("id", authUser.id)
      .maybeSingle();

    if (!userData || !userData.is_admin) {
      router.push("/feed");
      return;
    }

    setUser(userData);
    await fetchDbCounts();
    await loadTabData("users");
    setLoading(false);
  };

  // --- Fetchers ---
  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select(
        `
        *,
        reporter:users!reports_reporter_id_fkey(full_name, email),
        post:posts(id, text, user:users!posts_user_id_fkey(full_name, email))
      `,
      )
      .order("created_at", { ascending: false });
    setReports(data || []);
  };

  const fetchFlaggedPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(
        `*, user:users!posts_user_id_fkey(full_name, email, company:companies(name))`,
      )
      .eq("is_flagged", true)
      .eq("is_removed", false)
      .order("created_at", { ascending: false });
    setFlaggedPosts(data || []);
  };

  const fetchWaitlist = async () => {
    const { data, error } = await supabase
      .from("manual_verification_requests")
      .select(
        `
  *,
  user:users!manual_verification_requests_user_id_fkey(
    id,
    full_name,
    city,
    email,
    personal_email,
    linkedin_url
  )
`,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching verification requests:", error);
      return;
    }

    setWaitlist(data || []);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select(
        `
      id, 
      full_name, 
      email, 
      personal_email, 
      linkedin_url, 
      is_active, 
      is_admin, 
      is_verified, 
      onboarded, 
      created_at, 
      company:companies(id, name)
    `,
      )
      .order("created_at", { ascending: false });
    setAllUsers(data || []);
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch("/api/feedback/get-feedback");
      const data = await res.json();
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      setFeedback([]);
    }
  };

  const fetchBlogPosts = async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setBlogPosts(data || []);
  };

  const fetchRecruiters = async () => {
    const { data } = await supabase
      .from("recruiters")
      .select("*")
      .order("created_at", { ascending: false });
    setRecruiters(data || []);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("name", { ascending: true });
    setCompanies(data || []);
  };

  // --- Global Handlers (Passed to children) ---
  const handleReviewReport = async (
    reportId: string,
    status: "reviewed" | "dismissed",
  ) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (!error) {
      await fetchReports();
      await fetchDbCounts();
    }
  };

  const handleRemovePost = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .update({ is_removed: true })
      .eq("id", postId);
    if (!error) {
      await Promise.all([fetchFlaggedPosts(), fetchReports()]);
      await fetchDbCounts();
    }
  };

  // --- User Management Handlers ---
  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const res = await fetch('/api/users/update', {
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user? This will remove all their posts, messages, and account details.")) return;
    try {
      const res = await fetch("/api/admin/delete-user", {
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
    const res = await fetch("/api/admin/companies", {
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
    const res = await fetch("/api/admin/companies", {
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
    const res = await fetch("/api/admin/companies", {
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

  const handleDisableUser = async (userId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", userId);
    if (!error) {
      await Promise.all([fetchReports(), fetchFlaggedPosts(), fetchAllUsers()]);
      await fetchDbCounts();
    }
  };

  const handleWaitlistAction = async (
    waitlistId: string,
    action: "approve" | "reject",
    notes: string,
    domain?: string,
  ) => {
    if (action === "reject" && !confirm("Reject this applicant?")) return;
    try {
      const res = await fetch("/api/auth/approve-waitlist", {
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
    const { error } = await supabase
      .from("recruiters")
      .update({ status: action })
      .eq("id", recruiterId);
    if (!error) {
      await fetchRecruiters();
      await fetchDbCounts();
    } else {
      alert("Failed to update recruiter status: " + error.message);
    }
  };

  const handleReviewFeedback = async (feedbackId: string) => {
    try {
      const res = await fetch("/api/feedback/update-feedback", {
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
    const { error } = await supabase.from("blog_posts").insert({
      ...post,
      author_id: user.id,
      published_at:
        post.status === "published" ? new Date().toISOString() : null,
    });
    if (error) {
      alert("Error creating post: " + error.message);
    } else {
      await fetchBlogPosts();
    }
  };

  const handleUpdateBlog = async (id: string, updates: any) => {
    if (updates.status === "published" && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", id);
    if (error) {
      alert("Error updating post: " + error.message);
    } else {
      await fetchBlogPosts();
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      alert("Error deleting post: " + error.message);
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

      <div className="w-full px-4 md:px-8 py-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
              Admin Console
            </h2>
            <p className="text-neutral-500 mt-2">
              Oversee platform health, safety, and manual onboarding.
            </p>
          </div>
          <Button
            onClick={handleRefreshActiveTab}
            disabled={loading || isTabLoading}
            variant="outline"
            className="flex items-center gap-2 border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 h-10 px-4 font-semibold shadow-sm transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || isTabLoading) ? 'animate-spin' : ''}`} />
            Refresh Active Tab
          </Button>
        </header>

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
            <AdminStats
              totalUsers={totalUsersCount}
              pendingReports={pendingReportsCount}
              flaggedPosts={flaggedPostsCount}
              pendingWaitlist={pendingWaitlistCount}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="bg-neutral-100/50 p-1 h-12 overflow-x-auto flex-nowrap w-full justify-start border-b border-neutral-200">
                <TabsTrigger value="users" className="px-6 font-bold text-xs">
                  <Users className="h-4 w-4 mr-2" /> Users
                </TabsTrigger>
                <TabsTrigger value="waitlist" className="px-6 font-bold text-xs">
                  <Clock className="h-4 w-4 mr-2" />
                  Waitlist{" "}
                  {pendingWaitlistCount > 0 && (
                    <Badge className="ml-2 bg-primary">
                      {pendingWaitlistCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recruiters" className="px-6 font-bold text-xs">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Recruiters{" "}
                  {pendingRecruitersCount > 0 && (
                    <Badge className="ml-2 bg-primary">
                      {pendingRecruitersCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="reports" className="px-6 font-bold text-xs">
                  <Flag className="h-4 w-4 mr-2" />
                  Reports{" "}
                  {pendingReportsCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingReportsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="flagged" className="px-6 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Flagged
                </TabsTrigger>
                <TabsTrigger value="feedback" className="px-6 font-bold text-xs">
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
                <TabsTrigger value="blog" className="px-6 font-bold text-xs">
                  <FileText className="h-4 w-4 mr-2" />
                  Blog
                </TabsTrigger>
                <TabsTrigger value="companies" className="px-6 font-bold text-xs">
                  <Building2 className="h-4 w-4 mr-2" />
                  Companies{" "}
                  {totalCompaniesCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700 font-bold">
                      {totalCompaniesCount}
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
                      <WaitlistTab entries={waitlist} onAction={handleWaitlistAction} />
                    </TabsContent>

                    <TabsContent value="users">
                      <UsersTab
                        users={allUsers}
                        onUpdateUser={handleUpdateUser}
                        onDeleteUser={handleDeleteUser}
                      />
                    </TabsContent>

                    <TabsContent value="reports">
                      <ReportsTab
                        reports={reports}
                        onReview={handleReviewReport}
                        onRemovePost={handleRemovePost}
                      />
                    </TabsContent>

                    <TabsContent value="flagged">
                      <FlaggedTab
                        posts={flaggedPosts}
                        onRemovePost={handleRemovePost}
                        onSuspendUser={handleDisableUser}
                      />
                    </TabsContent>

                    <TabsContent value="feedback">
                      <FeedbackTab feedbacks={feedback} onReview={handleReviewFeedback} />
                    </TabsContent>

                    <TabsContent value="blog">
                      <BlogTab
                        posts={blogPosts}
                        onCreate={handleCreateBlog}
                        onUpdate={handleUpdateBlog}
                        onDelete={handleDeleteBlog}
                      />
                    </TabsContent>

                    <TabsContent value="recruiters">
                      <RecruitersTab entries={recruiters} onAction={handleRecruiterAction} />
                    </TabsContent>

                    <TabsContent value="companies">
                      <CompaniesTab
                        companies={companies}
                        onCreateCompany={handleCreateCompany}
                        onUpdateCompany={handleUpdateCompany}
                        onDeleteCompany={handleDeleteCompany}
                      />
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
