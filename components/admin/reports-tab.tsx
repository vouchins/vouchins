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

interface Report {
  id: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter: { first_name: string };
  post?: { id: string; text: string; user: { first_name: string } };
}

interface ReportsTabProps {
  reports: Report[];
  onReview: (reportId: string, status: "reviewed" | "dismissed") => void;
  onRemovePost: (postId: string) => void;
}

export function ReportsTab({
  reports,
  onReview,
  onRemovePost,
}: ReportsTabProps) {
  return (
    <div className="space-y-4">
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
                  Reported Post by {report.post.user.first_name}
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
      ))}
    </div>
  );
}
