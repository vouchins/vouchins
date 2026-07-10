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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, ExternalLink, CheckCircle2, XCircle, Search, RefreshCw } from "lucide-react";
import { isValidDomain } from "@/lib/utils";
interface WaitlistEntry {
  id: string;
  corporate_email: string;
  personal_email: string;
  city: string;
  linkedin_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  notes?: string;
  company_name: string;
  email: string;
  user: {
    city: string;
    email: string;
  };
}

interface WaitlistTabProps {
  entries: WaitlistEntry[];
  onAction: (
    id: string,
    action: "approve" | "reject",
    notes: string,
    domain?: string,
  ) => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function WaitlistTab({ entries, onAction, onRefresh, loading }: WaitlistTabProps) {
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [domain, setDomain] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = entries.filter((entry) => {
    const matchesFilter = entry.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (entry.corporate_email || "").toLowerCase().includes(searchLower) ||
      (entry.personal_email || "").toLowerCase().includes(searchLower) ||
      (entry.company_name || "").toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by email or company..."
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
            className="text-xs h-9 px-4 font-bold"
          >
            Pending Approval
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
            className="text-xs h-9 px-4 font-bold"
          >
            Approved
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            onClick={() => setFilter("rejected")}
            className="text-xs h-9 px-4 font-bold"
          >
            Rejected
          </Button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <Card className="border-dashed border-2 mt-4">
          <CardContent className="py-20 text-center text-neutral-500">
            No {filter} waitlist applications found.
          </CardContent>
        </Card>
      ) : filter === "pending" ? (
        filteredEntries.map((entry) => (
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
                  Company
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {entry?.company_name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                  Personal Email
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {entry?.user?.email || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                  Location
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {entry?.user?.city || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                  Corporate Email
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {entry?.corporate_email || "N/A"}
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
                  placeholder="Enter review notes"
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

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Enter Domain
              </p>

              <Input
                placeholder="Enter valid domain (e.g. company.com)"
                value={
                  entry.corporate_email
                    ? entry.corporate_email.split("@")[1] ||
                      entry.corporate_email
                    : domain[entry.id] || ""
                }
                onChange={(e) =>
                  setDomain({ ...domain, [entry.id]: e.target.value })
                }
                className="bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                required
                disabled={!!entry.corporate_email || entry.status !== "pending"}
              />
            </div>

            {entry.status === "pending" && (
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    if (
                      !entry.corporate_email &&
                      (!domain[entry.id] || !isValidDomain(domain[entry.id]))
                    ) {
                      alert("Please provide a valid domain for approval.");
                      return;
                    }
                    onAction(
                      entry.id,
                      "approve",
                      notes[entry.id] || "",
                      domain[entry.id] || "",
                    );
                  }}
                  className="flex-1 sm:flex-none px-8"
                  disabled={
                    !entry.corporate_email &&
                    (!domain[entry.id] || !isValidDomain(domain[entry.id]))
                  }
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
        ))
      ) : (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Applied</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Personal Email</TableHead>
                <TableHead>Corporate Email</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>{entry.company_name || "N/A"}</TableCell>
                  <TableCell>{entry.user?.email || "N/A"}</TableCell>
                  <TableCell>{entry.corporate_email || "N/A"}</TableCell>
                  <TableCell>{entry.user?.city || "N/A"}</TableCell>
                  <TableCell>
                    <a
                      href={
                        entry.linkedin_url.startsWith("http")
                          ? entry.linkedin_url
                          : `https://${entry.linkedin_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center whitespace-nowrap"
                    >
                      Profile <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={entry.notes || ""}>
                    {entry.notes || "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
