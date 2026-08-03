"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Source = { id: string; name: string; url: string; enabled: boolean; cursor: { page?: number } | null; last_success_at: string | null; last_error: string | null };
type Item = { id: string; title: string; summary: string; location: string | null; city: string | null; price_min: number | null; price_max: number | null; currency: string | null; media_urls: string[]; accommodation_type: string | null; furnishing: string | null; bhk: string | null; source_published_at: string | null; imported_at: string; source_listing_url: string; original_url: string | null; publish_error: string | null; source: { id: string; name: string } };

function label(value: string | null) {
  return value?.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? null;
}

function rentText(item: Item) {
  const location = [item.location, item.city].filter(Boolean).join(", ") || "Location unavailable";
  const rent = item.price_min
    ? `${item.currency || ""} ${item.price_min}${item.price_max && item.price_max !== item.price_min ? ` - ${item.price_max}` : ""}`.trim()
    : "Rent unavailable";
  return `${item.title}\n\n${item.summary}\n\n${location} · ${rent}`;
}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function ContentImporterTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadSources = useCallback(async () => setSources((await api("/api/admin/content-importer/sources")).sources), []);
  const loadItems = useCallback(async () => {
    const query = new URLSearchParams({ status });
    if (sourceFilter) query.set("source", sourceFilter);
    const next: Item[] = (await api(`/api/admin/content-importer/items?${query}`)).items;
    setItems(next);
    setEdits((current) => Object.fromEntries(next.map((item) => [item.id, current[item.id] ?? rentText(item)])));
  }, [sourceFilter, status]);

  useEffect(() => { void Promise.all([loadSources(), loadItems()]).catch((error) => toast.error(error.message)); }, [loadItems, loadSources]);

  const act = async (key: string, work: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try { await work(); toast.success(message); await Promise.all([loadSources(), loadItems()]); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); }
    finally { setBusy(null); }
  };

  return <div className="space-y-6">
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-[#0A1B5C]">Content sources</h2>
      <p className="mb-4 text-sm text-neutral-500">Sources are contacted only when you choose a fetch action.</p>
      <form className="grid gap-2 md:grid-cols-[1fr_2fr_auto]" onSubmit={(event) => { event.preventDefault(); void act("add", () => api("/api/admin/content-importer/sources", { method: "POST", body: JSON.stringify({ name, url }) }), "Source added").then(() => { setName(""); setUrl(""); }); }}>
        <Input aria-label="Source name" placeholder="Source name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input aria-label="Source URL" placeholder="https://rentd.biswanath.me/?city=Hyderabad" value={url} onChange={(event) => setUrl(event.target.value)} required />
        <Button disabled={busy === "add"} className="bg-[#0A1B5C] text-white"><Plus className="mr-2 h-4 w-4" />Add source</Button>
      </form>
      <div className="mt-4 space-y-3">{sources.map((source) => <div key={source.id} className="rounded-lg border p-3">
        <div className="flex flex-wrap items-center gap-3"><Switch checked={source.enabled} aria-label={`Enable ${source.name}`} onCheckedChange={(enabled) => void act(`toggle-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }), "Source updated")} /><div className="min-w-0 flex-1"><p className="font-semibold">{source.name}</p><p className="truncate text-xs text-neutral-500">{source.url}</p></div>
          {([source.cursor ? "latest" : "initial", "more"] as const).map((mode) => <Button key={mode} variant="outline" disabled={!source.enabled || busy !== null} onClick={() => void act(`${mode}-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}/fetch`, { method: "POST", body: JSON.stringify({ mode }) }), mode === "more" ? "More content fetched" : "Latest content fetched")}><RefreshCw className="mr-2 h-4 w-4" />{mode === "initial" ? "Get content" : mode === "latest" ? "Fetch latest" : "Fetch more"}</Button>)}
          <Button variant="ghost" aria-label={`Remove ${source.name}`} onClick={() => { if (confirm("Remove this source and its imported items?")) void act(`delete-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}`, { method: "DELETE" }), "Source removed"); }}><Trash2 className="h-4 w-4" /></Button>
        </div>{source.last_error && <p className="mt-2 text-xs text-rose-700">{source.last_error}</p>}</div>)}</div>
    </section>

    <section className="space-y-4"><div className="flex flex-wrap gap-2"><select aria-label="Queue status" className="rounded-md border bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>{["pending", "accepted", "rejected", "publish_failed"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select><select aria-label="Source filter" className="rounded-md border bg-white px-3 py-2 text-sm" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="">All sources</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></div>
      {busy && <p className="flex items-center text-sm text-neutral-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working...</p>}
      {!items.length && <div className="rounded-xl border bg-white p-10 text-center text-neutral-500">No {status.replace("_", " ")} items.</div>}
      <div className="space-y-3">{items.map((item) => <article key={item.id} onClick={() => setSelectedItemId(item.id)} className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${selectedItemId === item.id ? "border-[#0A1B5C] ring-2 ring-[#4FD1C5]/40" : "border-neutral-200"}`}>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-100 md:h-32 md:w-48">
            {item.media_urls[0] ? <img src={item.media_urls[0]} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="flex h-full items-center justify-center text-xs text-neutral-400">No media</div>}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div><p className="text-xs font-semibold text-[#0A1B5C]">{item.source.name}</p><h3 className="font-bold">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{item.summary}</p></div>
            <p className="text-sm">{[item.location, item.city].filter(Boolean).join(", ") || "Location unavailable"} · {item.price_min ? `${item.currency || ""} ${item.price_min}${item.price_max && item.price_max !== item.price_min ? ` - ${item.price_max}` : ""}` : "Rent unavailable"}</p>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-600">{item.bhk && <span className="rounded-full bg-neutral-100 px-2.5 py-1">{item.bhk} BHK</span>}{item.furnishing && <span className="rounded-full bg-neutral-100 px-2.5 py-1">{label(item.furnishing)}</span>}{item.accommodation_type && <span className="rounded-full bg-neutral-100 px-2.5 py-1">{label(item.accommodation_type)}</span>}</div>
            <p className="text-xs text-neutral-400">Source date: {item.source_published_at ? new Date(item.source_published_at).toLocaleString() : "Unavailable"} · Imported: {new Date(item.imported_at).toLocaleString()}</p>
            <div className="flex flex-wrap gap-3 text-sm"><a className="text-[#0A1B5C] underline" href={item.source_listing_url} target="_blank" rel="noopener noreferrer">Aggregator <ExternalLink className="inline h-3 w-3" /></a>{item.original_url ? <a className="text-[#0A1B5C] underline" href={item.original_url} target="_blank" rel="noopener noreferrer">Open original listing <ExternalLink className="inline h-3 w-3" /></a> : <span className="text-neutral-400">Original link unavailable</span>}</div>
            {item.publish_error && <p className="text-sm text-rose-700">{item.publish_error}</p>}
          </div>
        </div>
        {["pending", "publish_failed"].includes(status) && <div className="mt-4 space-y-3 border-t pt-4"><Textarea aria-label={`Post text for ${item.title}`} rows={4} value={edits[item.id] ?? ""} onChange={(event) => setEdits({ ...edits, [item.id]: event.target.value })} /><div className="flex flex-wrap gap-2"><Button className="bg-[#0A1B5C] text-white" disabled={busy !== null} onClick={() => void act(`accept-${item.id}`, () => api(`/api/admin/content-importer/items/${item.id}/accept`, { method: "POST", body: JSON.stringify({ text: edits[item.id] }) }), "Published to the feed")}>{status === "publish_failed" ? "Retry publish" : "Accept and publish"}</Button><Button variant="outline" disabled={busy !== null} onClick={() => { const reason = prompt("Optional rejection reason") ?? ""; void act(`reject-${item.id}`, () => api(`/api/admin/content-importer/items/${item.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }), "Item rejected"); }}>Reject</Button></div></div>}
      </article>)}</div>
    </section>
  </div>;
}
