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
import { CheckCircle2, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Feedback {
  id: string;
  name: string;
  email: string;
  type: string;
  message: string;
  status: "pending" | "reviewed";
  created_at: string;
}

interface FeedbackTabProps {
  feedbacks: Feedback[];
  onReview: (id: string) => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function FeedbackTab({ feedbacks, onReview, onRefresh, loading }: FeedbackTabProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFeedbacks = feedbacks.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(searchLower) ||
      (item.email || "").toLowerCase().includes(searchLower) ||
      (item.type || "").toLowerCase().includes(searchLower) ||
      (item.message || "").toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Refresh Bar */}
      <div className="flex items-center gap-2 mb-4 justify-start">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search feedback..."
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

      {filteredFeedbacks.length === 0 ? (
        <Card className="border-dashed border-2 py-12 text-center text-neutral-500 text-sm bg-white">
          <CardContent>No feedback found.</CardContent>
        </Card>
      ) : (
        filteredFeedbacks.map((item) => (
        <Card
          key={item.id}
          className={`bg-white transition-opacity ${item.status === "reviewed" ? "opacity-60" : ""}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  {item.name}{" "}
                  <span className="text-sm font-normal text-neutral-500">
                    ({item.email})
                  </span>
                </CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(item.created_at), {
                    addSuffix: true,
                  })}
                </CardDescription>
              </div>
              <Badge
                variant={item.status === "pending" ? "default" : "secondary"}
                className={item.status === "pending" ? "bg-indigo-600" : ""}
              >
                {item.type.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-neutral-50 rounded-lg text-sm border border-neutral-100 whitespace-pre-wrap leading-relaxed text-neutral-700">
              {item.message}
            </div>
            {item.status === "pending" && (
              <Button
                size="sm"
                onClick={() => onReview(item.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Reviewed
              </Button>
            )}
          </CardContent>
        </Card>
        ))
      )}
    </div>
  );
}
