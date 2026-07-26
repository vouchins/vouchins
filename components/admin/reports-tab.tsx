"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportedAccount {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
}

interface Report {
  id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  resolution_action?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  reporter: { full_name: string; email: string };
  post?: {
    id: string;
    text: string;
    is_removed: boolean;
    user: ReportedAccount;
  } | null;
  comment?: {
    id: string;
    post_id: string;
    text: string;
    is_removed: boolean;
    user: ReportedAccount;
  } | null;
  reported_user?: (ReportedAccount & {
    company?: { name: string } | null;
  }) | null;
}

type ModerationAction =
  | "mark_reviewed"
  | "dismiss"
  | "remove_content"
  | "suspend_user";

interface ReportsTabProps {
  reports: Report[];
  onModerate: (reportId: string, action: ModerationAction) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

function getTarget(report: Report) {
  if (report.post) {
    return {
      type: "Post",
      icon: FileText,
      text: report.post.text,
      href: `/posts/${report.post.id}`,
      user: report.post.user,
      isRemoved: report.post.is_removed,
    };
  }

  if (report.comment) {
    return {
      type: "Comment",
      icon: MessageSquare,
      text: report.comment.text,
      href: `/posts/${report.comment.post_id}#comment-${report.comment.id}`,
      user: report.comment.user,
      isRemoved: report.comment.is_removed,
    };
  }

  if (report.reported_user) {
    return {
      type: "User",
      icon: UserRound,
      text: report.reported_user.company?.name
        ? `${report.reported_user.full_name} · ${report.reported_user.company.name}`
        : report.reported_user.full_name,
      href: `/users/${report.reported_user.id}`,
      user: report.reported_user,
      isRemoved: false,
    };
  }

  return {
    type: "Unavailable",
    icon: XCircle,
    text: "The reported target is no longer available.",
    href: null,
    user: null,
    isRemoved: true,
  };
}

export function ReportsTab({
  reports,
  onModerate,
  onRefresh,
  loading,
}: ReportsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      if (statusFilter !== "all" && report.status !== statusFilter) return false;
      if (!search) return true;

      const target = getTarget(report);
      return [
        report.reason,
        report.reporter?.full_name,
        report.reporter?.email,
        target.text,
        target.user?.full_name,
        target.user?.email,
      ].some((value) => value?.toLowerCase().includes(search));
    });
  }, [reports, searchTerm, statusFilter]);

  const moderate = async (
    report: Report,
    action: ModerationAction,
    confirmation?: string,
  ) => {
    if (confirmation && !window.confirm(confirmation)) return;

    setProcessingId(report.id);
    try {
      await onModerate(report.id, action);
    } catch (error: any) {
      toast.error(error?.message || "Moderation action failed");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search reports, people or content..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-full text-xs sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All reports</SelectItem>
          </SelectContent>
        </Select>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Refresh reports"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
        <p className="text-xs font-semibold text-neutral-400 sm:ml-auto">
          {filteredReports.length} report{filteredReports.length === 1 ? "" : "s"}
        </p>
      </div>

      {filteredReports.length === 0 ? (
        <Card className="border-2 border-dashed bg-white py-12 text-center">
          <CardContent className="text-sm text-neutral-500">
            No reports match this view.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => {
            const target = getTarget(report);
            const TargetIcon = target.icon;
            const processing = processingId === report.id;

            return (
              <Card key={report.id} className="border-neutral-200 bg-white">
                <CardHeader className="pb-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1.5">
                          <TargetIcon className="h-3 w-3" />
                          {target.type}
                        </Badge>
                        <Badge
                          variant={
                            report.status === "pending"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {report.status}
                        </Badge>
                        {report.resolution_action &&
                          report.resolution_action !== "none" && (
                            <Badge variant="secondary">
                              {report.resolution_action.replaceAll("_", " ")}
                            </Badge>
                          )}
                      </div>
                      <CardTitle className="mt-3 text-base font-bold">
                        Reported by {report.reporter.full_name}
                      </CardTitle>
                      <CardDescription>
                        {report.reporter.email} ·{" "}
                        {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                    {target.href && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={target.href} target="_blank">
                          View target
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      Reason
                    </span>
                    <p className="text-sm text-neutral-800">{report.reason}</p>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase text-neutral-500">
                      Reported {target.type}
                      {target.user && (
                        <span className="normal-case text-neutral-400">
                          by {target.user.full_name} ({target.user.email})
                        </span>
                      )}
                      {target.isRemoved && (
                        <Badge variant="secondary">Removed</Badge>
                      )}
                      {target.user && !target.user.is_active && (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm text-neutral-700">
                      {target.text}
                    </p>
                  </div>

                  {report.status === "pending" && (
                    <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                      {(report.post || report.comment) && !target.isRemoved && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing}
                          onClick={() =>
                            void moderate(
                              report,
                              "remove_content",
                              `Remove this ${target.type.toLowerCase()}?`,
                            )
                          }
                        >
                          {processing ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                          )}
                          Remove {target.type}
                        </Button>
                      )}
                      {target.user?.is_active && !target.user.is_admin && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processing}
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() =>
                            void moderate(
                              report,
                              "suspend_user",
                              `Suspend ${target.user?.full_name}?`,
                            )
                          }
                        >
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Suspend User
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={processing}
                        onClick={() =>
                          void moderate(report, "mark_reviewed")
                        }
                      >
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={processing}
                        onClick={() => void moderate(report, "dismiss")}
                      >
                        <XCircle className="mr-2 h-3.5 w-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
