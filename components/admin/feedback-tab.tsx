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
import { CheckCircle2 } from "lucide-react";

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
}

export function FeedbackTab({ feedbacks, onReview }: FeedbackTabProps) {
  if (feedbacks.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-20 text-center text-neutral-500 font-medium">
          No feedback submitted yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((item) => (
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
      ))}
    </div>
  );
}
