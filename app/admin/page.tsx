"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  XCircle,
  Flag,
  AlertTriangle,
  UserX,
  Clock,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<any[]>([]);

  // --- Waitlist State ---
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [hasFetchedWaitlist, setHasFetchedWaitlist] = useState(false);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>(
    {}
  );

  useEffect(() => {
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
      await Promise.all([fetchReports(), fetchFlaggedPosts(), fetchWaitlist()]);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select(
        `
        *,
        reporter:users!reports_reporter_id_fkey(first_name, email),
        post:posts(id, text, user:users!posts_user_id_fkey(first_name, email)),
        comment:comments(id, text, user:users!comments_user_id_fkey(first_name, email))
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
    setWaitlistLoading(true);
    const { data } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });
    setWaitlist(data || []);
    setHasFetchedWaitlist(true);
    setWaitlistLoading(false);
  };

  // --- Handlers ---
  const handleReviewReport = async (
    reportId: string,
    status: "reviewed" | "dismissed"
  ) => {
    if (!user) return;
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
      await fetchFlaggedPosts();
      await fetchReports();
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
    }
  };

  const handleWaitlistAction = async (
    waitlistId: string,
    action: "approve" | "reject"
  ) => {
    const note = editingNotes[waitlistId] || "";
    if (
      action === "reject" &&
      !confirm("Are you sure you want to reject this applicant?")
    )
      return;

    try {
      const res = await fetch("/api/auth/approve-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId, notes: note, action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);

      alert(data.message || `User successfully ${action}ed`);
      await fetchWaitlist();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 font-sans">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-neutral-600 text-sm font-medium">
            Initializing Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const pendingReports = reports.filter((r) => r.status === "pending");
  const pendingWaitlist = waitlist.filter((w) => w.status === "pending");

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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                Content Integrity
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                {pendingReports.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">Pending user reports</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                Automated Safety
              </CardDescription>
              <CardTitle className="text-4xl font-bold">
                {flaggedPosts.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                Auto-flagged violations
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white ring-1 ring-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-primary/70">
                Access Management
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-primary">
                {pendingWaitlist.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 font-medium">
                Pending manual approvals
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="waitlist" className="space-y-6">
          <TabsList className="bg-neutral-100/50 p-1 h-12">
            <TabsTrigger
              value="waitlist"
              className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              Waitlist
              {pendingWaitlist.length > 0 && (
                <Badge className="ml-2 bg-primary text-white border-none h-5 min-w-[20px] flex items-center justify-center">
                  {pendingWaitlist.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Flag className="h-4 w-4 mr-2" />
              Reports
              {pendingReports.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="flagged"
              className="px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Flagged
            </TabsTrigger>
          </TabsList>

          {/* Waitlist Content */}
          <TabsContent value="waitlist" className="space-y-4 outline-none">
            {waitlistLoading ? (
              <div className="py-20 text-center text-neutral-400">
                Fetching waitlist records...
              </div>
            ) : waitlist.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-20 text-center text-neutral-500">
                  No waitlist applications found.
                </CardContent>
              </Card>
            ) : (
              waitlist.map((entry) => (
                <Card
                  key={entry.id}
                  className={`overflow-hidden transition-all ${entry.status === "pending" ? "border-l-4 border-l-primary shadow-md" : "opacity-75"}`}
                >
                  <CardHeader className="bg-white">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold text-neutral-900">
                          {entry.corporate_email}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          Applied{" "}
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          entry.status === "pending"
                            ? "default"
                            : entry.status === "approved"
                              ? "secondary"
                              : "outline"
                        }
                        className="px-3"
                      >
                        {entry.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="bg-white space-y-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                          Personal Email
                        </p>
                        <p className="text-sm font-medium text-neutral-800">
                          {entry.personal_email}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                          Location
                        </p>
                        <p className="text-sm font-medium text-neutral-800">
                          {entry.city}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                          Verification Link
                        </p>
                        <a
                          href={
                            entry.linkedin_url.startsWith("http")
                              ? entry.linkedin_url
                              : `https://${entry.linkedin_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary font-semibold flex items-center hover:underline"
                        >
                          View LinkedIn Profile{" "}
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        Internal Review Notes
                      </p>
                      {entry.status === "pending" ? (
                        <Input
                          placeholder="Add context for approval/rejection..."
                          value={editingNotes[entry.id] || ""}
                          onChange={(e) =>
                            setEditingNotes({
                              ...editingNotes,
                              [entry.id]: e.target.value,
                            })
                          }
                          className="bg-white"
                        />
                      ) : (
                        <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-md border border-neutral-100 italic">
                          {entry.notes || "No notes provided for this action."}
                        </div>
                      )}
                    </div>

                    {entry.status === "pending" && (
                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          onClick={() =>
                            handleWaitlistAction(entry.id, "approve")
                          }
                          className="flex-1 sm:flex-none px-8"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleWaitlistAction(entry.id, "reject")
                          }
                          className="text-neutral-500 hover:text-destructive hover:border-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Reports Content */}
          <TabsContent value="reports" className="space-y-4 outline-none">
            {reports.map((report) => (
              <Card key={report.id} className="bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold">
                        Report by {report.reporter.first_name}
                      </CardTitle>
                      <CardDescription>
                        {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        report.status === "pending"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-neutral-50 rounded text-sm border border-neutral-100">
                    <span className="font-bold text-neutral-400 text-[10px] uppercase block mb-1">
                      Reason
                    </span>
                    {report.reason}
                  </div>
                  {report.post && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-neutral-50 px-3 py-2 border-b text-[11px] font-medium text-neutral-500">
                        REPORTED POST BY {report.post.user.first_name}
                      </div>
                      <div className="p-3 text-sm italic">
                        "{report.post.text.substring(0, 150)}..."
                      </div>
                    </div>
                  )}
                  {report.status === "pending" && (
                    <div className="flex gap-2">
                      {report.post && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemovePost(report.post.id)}
                        >
                          Remove Post
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleReviewReport(report.id, "reviewed")
                        }
                      >
                        Mark Reviewed
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Flagged Content */}
          <TabsContent value="flagged" className="space-y-4 outline-none">
            {flaggedPosts.map((post) => (
              <Card key={post.id} className="bg-white">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <CardTitle className="text-base font-bold">
                      {post.user.first_name}
                    </CardTitle>
                    <Badge variant="destructive">Auto-Flagged</Badge>
                  </div>
                  <CardDescription>
                    {post.user.email} • {post.user.company.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert
                    variant="destructive"
                    className="bg-red-50/50 border-red-100"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      Flag Reasons: {post.flag_reasons.join(", ")}
                    </AlertDescription>
                  </Alert>
                  <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100 text-sm whitespace-pre-wrap italic">
                    "{post.text}"
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePost(post.id)}
                    >
                      Remove Content
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisableUser(post.user_id)}
                    >
                      Suspend User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
