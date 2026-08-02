"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CampaignApprovalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/campaign-approvals/${id}`);
      if (response.status === 403) { router.replace("/feed"); return; }
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setCampaign(result.campaign);
    } catch (error: any) { toast.error(error.message || "Unable to load campaign"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [id]);

  const decide = async (action: "approve" | "reject") => {
    setDecision(action);
    try {
      const response = await fetch(`/api/admin/campaign-approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      toast.success(result.warning || (action === "approve" ? "Campaign approved and delivery started" : "Campaign rejected"));
      await load();
    } catch (error: any) { toast.error(error.message); }
    finally { setDecision(null); }
  };

  return <><Navigation/><main className="mx-auto max-w-3xl p-4 md:p-6">
    <div className="mb-4 flex items-center justify-between gap-3"><Button variant="ghost" onClick={() => router.push("/admin")} className="-ml-3"><ArrowLeft className="mr-2 h-4 w-4"/>Back to admin</Button><Button variant="outline" size="sm" disabled={loading || Boolean(decision)} onClick={() => void load()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}Refresh</Button></div>
    {loading && !campaign ? <Card><CardHeader><Skeleton className="h-7 w-48"/></CardHeader><CardContent className="space-y-4"><Skeleton className="h-8 w-3/4"/><Skeleton className="h-4 w-1/2"/><Skeleton className="h-48 w-full"/><Skeleton className="h-24 w-full"/></CardContent></Card> : campaign ? <Card><CardHeader><CardTitle>Campaign approval</CardTitle></CardHeader><CardContent className="space-y-5"><div><h1 className="text-2xl font-bold">{campaign.title}</h1><p className="text-sm text-neutral-500">By {campaign.creator?.full_name || campaign.creator?.email} · {campaign.target_type} · {campaign.recipient_group_name}</p></div><div className="whitespace-pre-wrap rounded border bg-neutral-50 p-4">{campaign.body}</div><div className="flex items-center gap-2">Status: <strong className="capitalize">{campaign.status.replaceAll("_", " ")}</strong></div>{campaign.status === "pending_approval" && <><Textarea disabled={Boolean(decision)} placeholder="Rejection reason (required when rejecting)" value={reason} onChange={(event) => setReason(event.target.value)}/><div className="flex flex-wrap gap-3"><Button disabled={Boolean(decision)} onClick={() => decide("approve")}>{decision === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}Approve and send</Button><Button variant="destructive" disabled={Boolean(decision)} onClick={() => decide("reject")}>{decision === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}Reject</Button></div></>}</CardContent></Card> : <Card><CardContent className="p-10 text-center"><p className="mb-4 text-neutral-500">Campaign approval could not be loaded.</p><Button onClick={() => void load()}>Try again</Button></CardContent></Card>}
  </main></>;
}
