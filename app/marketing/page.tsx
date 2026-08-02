"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { BlogTab } from "@/components/admin/blog-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function MarketingPage() {
  const router = useRouter(); const [ready, setReady] = useState(false);
  const [posts, setPosts] = useState<any[]>([]); const [campaigns, setCampaigns] = useState<any[]>([]);
  const [audiences, setAudiences] = useState<any[]>([]); const [analytics, setAnalytics] = useState<any>(null);
  const [form, setForm] = useState<any>({ title: "", body: "", target_type: "email", recipient_group_id: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const load = async () => {
    const [b, c, a, stats] = await Promise.all([fetch("/api/marketing/blog"), fetch("/api/marketing/campaigns"), fetch("/api/marketing/audiences"), fetch("/api/marketing/analytics")]);
    if (b.status === 403) { router.replace("/feed"); return; }
    setPosts((await b.json()).posts || []); setCampaigns((await c.json()).campaigns || []);
    setAudiences((await a.json()).audiences || []); setAnalytics((await stats.json()).blog); setReady(true);
  };
  useEffect(() => { void load(); }, []);
  const blogRequest = async (method: string, body?: any, id?: string) => {
    const res = await fetch(`/api/marketing/blog${id ? `?id=${id}` : ""}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const out = await res.json(); if (!res.ok) throw new Error(out.error); await load();
  };
  const saveCampaign = async () => {
    const audience = audiences.find(x => x.id === form.recipient_group_id); if (!audience) return toast.error("Select an audience");
    const res = await fetch("/api/marketing/campaigns", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editingId, recipient_group_name: audience.name }) });
    const out = await res.json(); if (!res.ok) return toast.error(out.error); setForm({ title: "", body: "", target_type: "email", recipient_group_id: "" }); setEditingId(null); toast.success(editingId ? "Campaign updated" : "Campaign draft created"); await load();
  };
  const editCampaign = (campaign: any) => { setEditingId(campaign.id); setForm({ title: campaign.title, body: campaign.body, target_type: campaign.target_type, recipient_group_id: campaign.recipient_group_id }); };
  const action = async (id: string, actionName: string) => {
    const res = await fetch("/api/marketing/campaigns/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: actionName }) });
    const out = await res.json(); if (!res.ok) toast.error(out.error); else toast.success(out.warning || "Campaign updated"); await load();
  };
  const removeCampaign = async (id: string) => { if (!confirm("Delete this campaign record? Delivered messages cannot be recalled.")) return; await fetch(`/api/marketing/campaigns?id=${id}`, { method: "DELETE" }); await load(); };
  if (!ready) return <div className="p-10 text-center">Loading marketing workspace…</div>;
  return <><Navigation/><main className="mx-auto max-w-6xl p-4 md:p-8"><h1 className="mb-6 text-3xl font-bold">Marketing workspace</h1>
    <Tabs defaultValue="blog"><TabsList><TabsTrigger value="blog">My Blog Posts</TabsTrigger><TabsTrigger value="analytics">My Blog Analytics</TabsTrigger><TabsTrigger value="campaigns">My Campaigns</TabsTrigger></TabsList>
      <TabsContent value="blog"><BlogTab posts={posts} onCreate={(p) => blogRequest("POST", p)} onUpdate={(id,p) => blogRequest("PATCH", { ...p, id })} onDelete={(id) => blogRequest("DELETE", undefined, id)}/></TabsContent>
      <TabsContent value="analytics"><div className="grid gap-4 md:grid-cols-4">{[["30-day views",analytics?.summary?.views30d],["Readers",analytics?.summary?.readers30d],["Engagement",`${analytics?.summary?.engagementRate || 0}%`],["Completion",`${analytics?.summary?.completionRate || 0}%`]].map(([k,v])=><Card key={k as string}><CardHeader><CardTitle className="text-sm">{k}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{v || 0}</CardContent></Card>)}</div></TabsContent>
      <TabsContent value="campaigns"><div className="grid gap-6 md:grid-cols-[1fr_1.4fr]"><Card><CardHeader><CardTitle>{editingId ? "Edit campaign draft" : "Create campaign draft"}</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><Textarea placeholder="Message (HTML supported for email)" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><Select value={form.target_type} onValueChange={v=>setForm({...form,target_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="notification">Notification</SelectItem></SelectContent></Select><Select value={form.recipient_group_id} onValueChange={v=>setForm({...form,recipient_group_id:v})}><SelectTrigger><SelectValue placeholder="Audience"/></SelectTrigger><SelectContent>{audiences.map(a=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select><div className="flex gap-2"><Button onClick={saveCampaign}>{editingId ? "Save changes" : "Save draft"}</Button>{editingId&&<Button variant="outline" onClick={()=>{setEditingId(null);setForm({title:"",body:"",target_type:"email",recipient_group_id:""});}}>Cancel</Button>}</div></CardContent></Card>
      <div className="space-y-3">{campaigns.map(c=><Card key={c.id}><CardContent className="flex items-start justify-between gap-3 p-4"><div><div className="font-bold">{c.title}</div><div className="text-sm text-neutral-500">{c.recipient_group_name} · {c.target_type} · {c.status}</div>{c.rejection_reason&&<p className="text-sm text-red-600">Rejected: {c.rejection_reason}</p>}{c.approval_email_error&&<p className="text-sm text-amber-600">Approval email failed: {c.approval_email_error}</p>}</div><div className="flex flex-wrap gap-2">{["draft","rejected"].includes(c.status)&&<><Button size="sm" variant="outline" onClick={()=>editCampaign(c)}>Edit</Button><Button size="sm" onClick={()=>action(c.id,"submit")}>Submit</Button></>}{c.status==="pending_approval"&&<Button size="sm" variant="outline" onClick={()=>action(c.id,"withdraw")}>Withdraw</Button>}{c.status!=="sending"&&<Button size="sm" variant="destructive" onClick={()=>removeCampaign(c.id)}>Delete</Button>}</div></CardContent></Card>)}</div></div></TabsContent>
    </Tabs></main></>;
}
