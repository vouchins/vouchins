"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, Flag, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { AdminStats } from "@/components/admin/admin-stats";
import { UsersTab } from "@/components/admin/users-tab";
import { WaitlistTab } from "@/components/admin/waitlist-tab";
import { ReportsTab } from "@/components/admin/reports-tab";
import { FlaggedTab } from "@/components/admin/flagged-tab";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, [router]);

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
    await refreshAllData();
    setLoading(false);
  };

  const refreshAllData = async () => {
    await Promise.all([
      fetchReports(),
      fetchFlaggedPosts(),
      fetchWaitlist(),
      fetchAllUsers(),
    ]);
  };

  // --- Fetchers ---
  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select(
        `
        *,
        reporter:users!reports_reporter_id_fkey(first_name, email),
        post:posts(id, text, user:users!posts_user_id_fkey(first_name, email))
      `
      )
      .order("created_at", { ascending: false });
    setReports(data || []);
  };

  const fetchFlaggedPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(
        `*, user:users!posts_user_id_fkey(first_name, email, company:companies(name))`
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
    first_name,
    city,
    email,
    personal_email,
    linkedin_url
  )
`
      )

      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching verification requests:", error);
      return;
    }

    console.log("Fetched waitlist entries:", data);

    setWaitlist(data || []);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select(
        `
      id, 
      first_name, 
      email, 
      personal_email, 
      linkedin_url, 
      is_active, 
      is_admin, 
      is_verified, 
      onboarded, 
      created_at, 
      company:companies(name)
    `
      )
      .order("created_at", { ascending: false });
    setAllUsers(data || []);
  };

  // --- Global Handlers (Passed to children) ---
  const handleReviewReport = async (
    reportId: string,
    status: "reviewed" | "dismissed"
  ) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (!error) await fetchReports();
  };

  const handleRemovePost = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .update({ is_removed: true })
      .eq("id", postId);
    if (!error) {
      await Promise.all([fetchFlaggedPosts(), fetchReports()]);
    }
  };

  // --- User Management Handlers ---

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;

      // Refresh the local state so the table reflects changes
      await fetchAllUsers();
    } catch (err: any) {
      alert("Error updating user: " + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;

      await fetchAllUsers();
    } catch (err: any) {
      alert("Error deleting user: " + err.message);
    }
  };

  const handleDisableUser = async (userId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", userId);
    if (!error) {
      await fetchReports();
      await fetchFlaggedPosts();
      await fetchAllUsers();
    }
  };

  const handleWaitlistAction = async (
    waitlistId: string,
    action: "approve" | "reject",
    notes: string,
    domain?: string
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
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-neutral-600 text-sm font-medium">
            Initializing Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const pendingWaitlistCount = waitlist.filter(
    (w) => w.status === "pending"
  ).length;
  const pendingReportsCount = reports.filter(
    (r) => r.status === "pending"
  ).length;

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Admin Console
          </h2>
          <p className="text-neutral-500 mt-2">
            Oversee platform health, safety, and manual onboarding.
          </p>
        </header>

        <AdminStats
          totalUsers={allUsers.length}
          pendingReports={pendingReportsCount}
          flaggedPosts={flaggedPosts.length}
          pendingWaitlist={pendingWaitlistCount}
        />

        <Tabs defaultValue="waitlist" className="space-y-6">
          <TabsList className="bg-neutral-100/50 p-1 h-12">
            <TabsTrigger value="waitlist" className="px-6">
              <Clock className="h-4 w-4 mr-2" />
              Waitlist{" "}
              {pendingWaitlistCount > 0 && (
                <Badge className="ml-2 bg-primary">
                  {pendingWaitlistCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="px-6">
              <Users className="h-4 w-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="px-6">
              <Flag className="h-4 w-4 mr-2" />
              Reports{" "}
              {pendingReportsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingReportsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="px-6">
              <AlertTriangle className="h-4 w-4 mr-2" /> Flagged
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </div>
  );
}
