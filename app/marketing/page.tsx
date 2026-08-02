"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Navigation } from "@/components/navigation";
import { BlogTab } from "@/components/admin/blog-tab";
import { MarketingPageSkeleton } from "@/components/marketing/marketing-page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMPTY_CAMPAIGN = { title: "", body: "", target_type: "email", recipient_group_id: "" };

export default function MarketingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [busyCampaign, setBusyCampaign] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_CAMPAIGN);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [blogResponse, campaignResponse, audienceResponse, analyticsResponse] = await Promise.all([
        fetch("/api/marketing/blog"), fetch("/api/marketing/campaigns"),
        fetch("/api/marketing/audiences"), fetch("/api/marketing/analytics"),
      ]);
      if (blogResponse.status === 403) { router.replace("/feed"); return; }
      const [blog, campaign, audience, stats] = await Promise.all([
        blogResponse.json(), campaignResponse.json(), audienceResponse.json(), analyticsResponse.json(),
      ]);
      if (!blogResponse.ok || !campaignResponse.ok || !audienceResponse.ok || !analyticsResponse.ok) {
        throw new Error(blog.error || campaign.error || audience.error || stats.error || "Unable to load marketing workspace");
      }
      setPosts(blog.posts || []); setCampaigns(campaign.campaigns || []);
      setAudiences(audience.audiences || []); setAnalytics(stats.blog);
      setReady(true);
    } catch (error: any) { toast.error(error.message || "Unable to load marketing workspace"); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { void load(); }, []);

  const blogRequest = async (method: string, body?: any, id?: string) => {
    const response = await fetch(`/api/marketing/blog${id ? `?id=${id}` : ""}`, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); await load();
  };

  const saveCampaign = async () => {
    const audience = audiences.find((item) => item.id === form.recipient_group_id);
    if (!audience) return toast.error("Select an audience");
    setSavingCampaign(true);
    try {
      const response = await fetch("/api/marketing/campaigns", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingId, recipient_group_name: audience.name }),
      });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      toast.success(editingId ? "Campaign updated" : "Campaign draft created");
      setForm(EMPTY_CAMPAIGN); setEditingId(null); await load();
    } catch (error: any) { toast.error(error.message); }
    finally { setSavingCampaign(false); }
  };

  const editCampaign = (campaign: any) => {
    setEditingId(campaign.id);
    setForm({ title: campaign.title, body: campaign.body, target_type: campaign.target_type, recipient_group_id: campaign.recipient_group_id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const action = async (id: string, actionName: string) => {
    setBusyCampaign(id);
    try {
      const response = await fetch("/api/marketing/campaigns/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: actionName }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      toast.success(result.warning || "Campaign updated"); await load();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusyCampaign(null); }
  };
  const removeCampaign = async (id: string) => {
    if (!confirm("Delete this campaign record? Delivered messages cannot be recalled.")) return;
    setBusyCampaign(id);
    try { const response = await fetch(`/api/marketing/campaigns?id=${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); await load(); }
    catch (error: any) { toast.error(error.message); } finally { setBusyCampaign(null); }
  };

  if (!ready) return <MarketingPageSkeleton />;
  return <><Navigation/><main className="mx-auto max-w-6xl p-4 md:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" size="sm" onClick={() => router.push("/feed")} className="mb-2 -ml-2"><ArrowLeft className="mr-2 h-4 w-4"/>Back to feed</Button><h1 className="text-3xl font-bold">Marketing workspace</h1><p className="mt-1 text-sm text-neutral-500">Manage your content, performance, and campaign approvals.</p></div><Button variant="outline" disabled={refreshing} onClick={() => { setRefreshing(true); void load(); }}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}Refresh</Button></div>
    <Tabs defaultValue="blog"><TabsList className="h-auto w-full justify-start overflow-x-auto"><TabsTrigger value="blog">My Blog Posts</TabsTrigger><TabsTrigger value="analytics">My Blog Analytics</TabsTrigger><TabsTrigger value="campaigns">My Campaigns</TabsTrigger></TabsList>
      <TabsContent value="blog"><BlogTab posts={posts} onCreate={(post) => blogRequest("POST", post)} onUpdate={(id, post) => blogRequest("PATCH", { ...post, id })} onDelete={(id) => blogRequest("DELETE", undefined, id)}/></TabsContent>
      <TabsContent value="analytics"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["30-day views",analytics?.summary?.views30d],["Readers",analytics?.summary?.readers30d],["Engagement",`${analytics?.summary?.engagementRate || 0}%`],["Completion",`${analytics?.summary?.completionRate || 0}%`]].map(([label,value]) => <Card key={label as string}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{value || 0}</CardContent></Card>)}</div></TabsContent>
      <TabsContent value="campaigns"><div className="grid gap-6 md:grid-cols-[1fr_1.4fr]"><Card><CardHeader><CardTitle>{editingId ? "Edit campaign draft" : "Create campaign draft"}</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Title" value={form.title} onChange={(event) => setForm({...form,title:event.target.value})}/><Textarea placeholder="Message (HTML supported for email)" value={form.body} onChange={(event) => setForm({...form,body:event.target.value})}/><Select value={form.target_type} onValueChange={(value) => setForm({...form,target_type:value})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="notification">Notification</SelectItem></SelectContent></Select><Select value={form.recipient_group_id} onValueChange={(value) => setForm({...form,recipient_group_id:value})}><SelectTrigger><SelectValue placeholder="Audience"/></SelectTrigger><SelectContent>{audiences.map((audience) => <SelectItem key={audience.id} value={audience.id}>{audience.name}</SelectItem>)}</SelectContent></Select><div className="flex gap-2"><Button disabled={savingCampaign} onClick={saveCampaign}>{savingCampaign && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{editingId ? "Save changes" : "Save draft"}</Button>{editingId && <Button variant="outline" disabled={savingCampaign} onClick={() => {setEditingId(null);setForm(EMPTY_CAMPAIGN);}}>Cancel</Button>}</div></CardContent></Card>
        <div className="space-y-3">{campaigns.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-neutral-500">No campaigns yet. Create your first draft.</CardContent></Card>}{campaigns.map((campaign) => { const busy = busyCampaign === campaign.id; return <Card key={campaign.id}><CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row"><div><div className="font-bold">{campaign.title}</div><div className="text-sm text-neutral-500">{campaign.recipient_group_name} · {campaign.target_type} · {campaign.status}</div>{campaign.rejection_reason && <p className="text-sm text-red-600">Rejected: {campaign.rejection_reason}</p>}{campaign.approval_email_error && <p className="text-sm text-amber-600">Approval email failed: {campaign.approval_email_error}</p>}</div><div className="flex flex-wrap gap-2">{busy && <Loader2 className="mt-2 h-4 w-4 animate-spin text-neutral-500"/>}{["draft","rejected"].includes(campaign.status) && <><Button size="sm" variant="outline" disabled={busy} onClick={() => editCampaign(campaign)}>Edit</Button><Button size="sm" disabled={busy} onClick={() => action(campaign.id,"submit")}>Submit</Button></>}{campaign.status === "pending_approval" && <Button size="sm" variant="outline" disabled={busy} onClick={() => action(campaign.id,"withdraw")}>Withdraw</Button>}{campaign.status !== "sending" && <Button size="sm" variant="destructive" disabled={busy} onClick={() => removeCampaign(campaign.id)}>Delete</Button>}</div></CardContent></Card>;})}</div>
      </div></TabsContent>
    </Tabs>
  </main></>;
}
