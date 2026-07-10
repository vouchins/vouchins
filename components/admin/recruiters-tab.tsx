"use client";

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
import { ExternalLink, CheckCircle2, XCircle, Ban, RefreshCw, Search } from "lucide-react";

interface RecruiterEntry {
  id: string;
  company_name: string;
  company_logo?: string;
  website?: string;
  billing_email: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
}

interface RecruitersTabProps {
  entries: RecruiterEntry[];
  onAction: (id: string, action: "approved" | "rejected" | "suspended") => Promise<void>;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function RecruitersTab({ entries, onAction, onRefresh, loading }: RecruitersTabProps) {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "suspended">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filteredEntries = entries.filter(
    (entry) =>
      entry.status === filter &&
      (entry.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.billing_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.website && entry.website.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleAction = async (id: string, action: "approved" | "rejected" | "suspended") => {
    setActioningId(id);
    try {
      await onAction(id, action);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search company or email..."
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
            Pending Approval ({entries.filter(e => e.status === 'pending').length})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            onClick={() => setFilter("approved")}
            className="text-xs h-9 px-4 font-bold"
          >
            Approved ({entries.filter(e => e.status === 'approved').length})
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            onClick={() => setFilter("rejected")}
            className="text-xs h-9 px-4 font-bold"
          >
            Rejected ({entries.filter(e => e.status === 'rejected').length})
          </Button>
          <Button
            variant={filter === "suspended" ? "default" : "outline"}
            onClick={() => setFilter("suspended")}
            className="text-xs h-9 px-4 font-bold"
          >
            Suspended ({entries.filter(e => e.status === 'suspended').length})
          </Button>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <Card className="border-dashed border-2 mt-4">
          <CardContent className="py-20 text-center text-neutral-500 text-sm">
            No {filter} recruiter accounts found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-white overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-neutral-500">Date Registered</TableHead>
                <TableHead className="text-xs font-bold text-neutral-500">Company</TableHead>
                <TableHead className="text-xs font-bold text-neutral-500">Billing Email</TableHead>
                <TableHead className="text-xs font-bold text-neutral-500">Website</TableHead>
                <TableHead className="text-xs font-bold text-neutral-500">Status</TableHead>
                <TableHead className="text-xs font-bold text-neutral-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((recruiter) => (
                <TableRow key={recruiter.id}>
                  <TableCell className="whitespace-nowrap text-xs text-neutral-600">
                    {formatDistanceToNow(new Date(recruiter.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-bold text-xs text-neutral-900">{recruiter.company_name}</TableCell>
                  <TableCell className="text-xs text-neutral-700">{recruiter.billing_email}</TableCell>
                  <TableCell className="text-xs">
                    {recruiter.website ? (
                      <a
                        href={recruiter.website.startsWith("http") ? recruiter.website : `https://${recruiter.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        Visit Website <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-neutral-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        recruiter.status === "pending"
                          ? "default"
                          : recruiter.status === "approved"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-[10px] font-bold"
                    >
                      {recruiter.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {recruiter.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAction(recruiter.id, "approved")}
                            disabled={actioningId === recruiter.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold h-8 px-3"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(recruiter.id, "rejected")}
                            disabled={actioningId === recruiter.id}
                            className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 text-[11px] font-bold h-8 px-3"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {recruiter.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(recruiter.id, "suspended")}
                          disabled={actioningId === recruiter.id}
                          className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 text-[11px] font-bold h-8 px-3"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                        </Button>
                      )}

                      {(recruiter.status === "rejected" || recruiter.status === "suspended") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(recruiter.id, "approved")}
                          disabled={actioningId === recruiter.id}
                          className="text-primary hover:bg-neutral-50 text-[11px] font-bold h-8 px-3"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-Approve
                        </Button>
                      )}
                    </div>
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
