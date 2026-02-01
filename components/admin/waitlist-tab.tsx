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
import { FileText, ExternalLink, CheckCircle2, XCircle } from "lucide-react";

interface WaitlistEntry {
  id: string;
  corporate_email: string;
  personal_email: string;
  city: string;
  linkedin_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes?: string;
}

interface WaitlistTabProps {
  entries: WaitlistEntry[];
  onAction: (
    id: string,
    action: "approve" | "reject",
    notes: string
  ) => Promise<void>;
}

export function WaitlistTab({ entries, onAction }: WaitlistTabProps) {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  if (entries.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-20 text-center text-neutral-500">
          No waitlist applications found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className={`overflow-hidden transition-all ${
            entry.status === "pending"
              ? "border-l-4 border-l-primary shadow-md"
              : "opacity-75"
          }`}
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
                  value={notes[entry.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [entry.id]: e.target.value })
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
                    onAction(entry.id, "approve", notes[entry.id] || "")
                  }
                  className="flex-1 sm:flex-none px-8"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    onAction(entry.id, "reject", notes[entry.id] || "")
                  }
                  className="text-neutral-500 hover:text-destructive hover:border-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
