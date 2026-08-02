"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
export default function CampaignApprovalPage() {
  const { id } = useParams<{id:string}>(); const router=useRouter(); const [campaign,setCampaign]=useState<any>(); const [reason,setReason]=useState("");
  const load=async()=>{const r=await fetch(`/api/admin/campaign-approvals/${id}`); if(r.status===403){router.replace("/feed");return;} setCampaign((await r.json()).campaign);}; useEffect(()=>{void load();},[id]);
  const decide=async(action:string)=>{const r=await fetch(`/api/admin/campaign-approvals/${id}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,reason})});const out=await r.json();if(!r.ok)toast.error(out.error);else toast.success(out.warning||`Campaign ${action}d`);await load();};
  if(!campaign)return <div className="p-10 text-center">Loading approval…</div>;
  return <main className="mx-auto max-w-3xl p-6"><Card><CardHeader><CardTitle>Campaign approval</CardTitle></CardHeader><CardContent className="space-y-5"><div><h1 className="text-2xl font-bold">{campaign.title}</h1><p className="text-sm text-neutral-500">By {campaign.creator?.full_name||campaign.creator?.email} · {campaign.target_type} · {campaign.recipient_group_name}</p></div><div className="whitespace-pre-wrap rounded border bg-neutral-50 p-4">{campaign.body}</div><div>Status: <strong>{campaign.status}</strong></div>{campaign.status==="pending_approval"&&<><Textarea placeholder="Rejection reason (required when rejecting)" value={reason} onChange={e=>setReason(e.target.value)}/><div className="flex gap-3"><Button onClick={()=>decide("approve")}>Approve and send</Button><Button variant="destructive" onClick={()=>decide("reject")}>Reject</Button></div></>}</CardContent></Card></main>;
}
