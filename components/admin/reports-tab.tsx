import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter: { full_name: string };
  post?: { id: string; text: string; user: { full_name: string } };
}

interface ReportsTabProps {
  reports: Report[];
  onReview: (reportId: string, status: "reviewed" | "dismissed") => void;
  onRemovePost: (postId: string) => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function ReportsTab({
  reports,
  onReview,
  onRemovePost,
  onRefresh,
  loading,
}: ReportsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredReports = reports.filter((report) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (report.reason || "").toLowerCase().includes(searchLower) ||
      (report.reporter?.full_name || "").toLowerCase().includes(searchLower) ||
      (report.post?.text || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Refresh Bar */}
      <div className="flex items-center gap-2 mb-4 justify-start">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-white shadow-sm rounded-lg text-xs"
          />
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-9 px-3 border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-lg shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center text-neutral-500 text-sm bg-white">
          <CardContent>No reports found.</CardContent>
        </Card>
      ) : (
        filteredReports.map((report) => (
        <Card key={report.id} className="bg-white">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold">
                  Report by {report.reporter.full_name}
                </CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(report.created_at), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </div>
              <Badge
                variant={
                  report.status === "pending" ? "destructive" : "secondary"
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
                <div className="bg-neutral-50 px-3 py-2 border-b text-[11px] font-medium text-neutral-500 uppercase">
                  Reported Post by {report.post.user.full_name}
                </div>
                <div className="p-3 text-sm italic">"{report.post.text}"</div>
              </div>
            )}
            {report.status === "pending" && (
              <div className="flex gap-2">
                {report.post && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemovePost(report.post!.id)}
                  >
                    Remove Post
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(report.id, "reviewed")}
                >
                  Mark Reviewed
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        ))
      )}
    </div>
  );
}
