"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Download, ExternalLink, FileSpreadsheet, Loader2, Plus, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
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
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
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
  const [sourceUrls, setSourceUrls] = useState<Record<string, string>>({});

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    duplicates: number;
    totalRows: number;
    validationErrors?: string[];
  } | null>(null);

  const loadSources = useCallback(async () => {
    const next: Source[] = (await api("/api/admin/content-importer/sources")).sources;
    setSources(next);
    setSourceUrls((current) => Object.fromEntries(next.map((source) => [source.id, current[source.id] ?? source.url])));
  }, []);
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
    try {
      await work();
      toast.success(message);
      await Promise.all([loadSources(), loadItems()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
      await Promise.allSettled([loadSources(), loadItems()]);
    } finally {
      setBusy(null);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;
    setUploadProgress(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/admin/content-importer/bulk-import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process bulk import file");
      }
      setImportResult({
        imported: data.imported,
        duplicates: data.duplicates,
        totalRows: data.totalRows,
        validationErrors: data.validationErrors,
      });
      toast.success(`Successfully imported ${data.imported} listings`);
      setSelectedFile(null);
      await Promise.all([loadSources(), loadItems()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadProgress(false);
    }
  };

  return <div className="space-y-6">
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0A1B5C]">Bulk Excel Import</h2>
          <p className="text-sm text-neutral-500">
            Download our reference Excel template, update it with your listings, and re-upload here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/content-importer/template"
            download="vouchins-bulk-import-template.xlsx"
            className="inline-flex items-center justify-center rounded-md border border-[#0A1B5C] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A1B5C] shadow-sm hover:bg-neutral-50 transition-colors"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download reference template (.xlsx)
          </a>
        </div>
      </div>

      <div className="mt-4 rounded-lg border-2 border-dashed border-neutral-200 p-4 transition-colors hover:border-[#0A1B5C]/40 bg-neutral-50/50">
        {!selectedFile ? (
          <label className="flex flex-col items-center justify-center cursor-pointer py-4">
            <FileSpreadsheet className="h-10 w-10 text-[#0A1B5C]/60 mb-2" />
            <span className="text-sm font-semibold text-neutral-800">
              Click to select or drag and drop Excel / CSV file
            </span>
            <span className="text-xs text-neutral-500 mt-1">
              Supports .xlsx, .xls, and .csv formats
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setImportResult(null);
                }
              }}
            />
          </label>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-[#0A1B5C]" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">{selectedFile.name}</p>
                <p className="text-xs text-neutral-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={uploadProgress}
                className="text-xs"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Change file
              </Button>
              <Button
                size="sm"
                onClick={handleBulkUpload}
                disabled={uploadProgress}
                className="bg-[#0A1B5C] text-white hover:bg-[#0A1B5C]/90 text-xs"
              >
                {uploadProgress ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Importing listings...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                    Upload & Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {importResult && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Successfully imported {importResult.imported} listings into the pending queue.
            </span>
          </div>
          {importResult.duplicates > 0 && (
            <p className="mt-1 text-xs text-emerald-700">
              {importResult.duplicates} duplicate listing{importResult.duplicates > 1 ? "s were" : " was"} skipped.
            </p>
          )}
          {importResult.validationErrors && importResult.validationErrors.length > 0 && (
            <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
              <p className="font-semibold flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" /> Validation warnings ({importResult.validationErrors.length} skipped):
              </p>
              <ul className="mt-1 list-disc list-inside space-y-0.5">
                {importResult.validationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {importResult.validationErrors.length > 5 && (
                  <li>...and {importResult.validationErrors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0A1B5C]">Content sources</h2>
          <p className="mb-4 text-sm text-neutral-500">Sources are contacted only when you choose a fetch action.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-neutral-200 text-[#0A1B5C] hover:bg-neutral-50"
          onClick={() => void act("refresh", () => Promise.all([loadSources(), loadItems()]), "Sources refreshed")}
          disabled={busy !== null}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <form
        className="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          const targetUrl = url;
          const targetName = name;
          await act("add", () => api("/api/admin/content-importer/sources", { method: "POST", body: JSON.stringify({ name: targetName, url: targetUrl }) }), "Source added");
          setName("");
          setUrl("");
        }}
      >
        <Input aria-label="Source name" placeholder="Source name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input aria-label="Source URL" placeholder="Rentd, Flatnest, or https://www.reddit.com/r/HyderabadFlatmates/" value={url} onChange={(event) => setUrl(event.target.value)} required />
        <Button disabled={busy === "add"} className="bg-[#0A1B5C] text-white"><Plus className="mr-2 h-4 w-4" />Add source</Button>
      </form>
      <div className="mt-4 space-y-3">{sources.map((source) => {
        const isExcelSource = source.url.includes("bulk-excel-import");
        return (
          <div key={source.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <Switch checked={source.enabled} aria-label={`Enable ${source.name}`} onCheckedChange={(enabled) => void act(`toggle-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }), "Source updated")} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{source.name}</p>
                <p className="text-xs text-neutral-500">
                  {isExcelSource
                    ? "Uploaded spreadsheet source. Upload Excel or CSV files in the section above to add listings."
                    : "Edit the query parameters below to filter this source."}
                </p>
              </div>
              {!isExcelSource && ([source.cursor ? "latest" : "initial", "more"] as const).map((mode) => (
                <Button key={mode} variant="outline" disabled={!source.enabled || busy !== null} onClick={() => void act(`${mode}-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}/fetch`, { method: "POST", body: JSON.stringify({ mode }) }), mode === "more" ? "More content fetched" : "Latest content fetched")}>
                  <RefreshCw className="mr-2 h-4 w-4" />{mode === "initial" ? "Get content" : mode === "latest" ? "Fetch latest" : "Fetch more"}
                </Button>
              ))}
              <Button variant="ghost" aria-label={`Remove ${source.name}`} onClick={() => { if (confirm("Remove this source and its imported items?")) void act(`delete-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}`, { method: "DELETE" }), "Source removed"); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {!isExcelSource && (
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <Input aria-label={`Filtered URL for ${source.name}`} value={sourceUrls[source.id] ?? source.url} onChange={(event) => setSourceUrls({ ...sourceUrls, [source.id]: event.target.value })} />
                <Button variant="outline" disabled={busy !== null || (sourceUrls[source.id] ?? source.url) === source.url} onClick={() => void act(`url-${source.id}`, () => api(`/api/admin/content-importer/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ url: sourceUrls[source.id] }) }), "Source filters saved")}>
                  Save filters
                </Button>
              </div>
            )}
            {source.last_error && <p className="mt-2 text-xs text-rose-700">{source.last_error}</p>}
          </div>
        );
      })}</div>
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
            <div className="flex flex-wrap gap-3 text-sm"><a className="text-[#0A1B5C] underline" href={item.source_listing_url} target="_blank" rel="noopener noreferrer">Open listing <ExternalLink className="inline h-3 w-3" /></a>{item.original_url && item.original_url !== item.source_listing_url ? <a className="text-[#0A1B5C] underline" href={item.original_url} target="_blank" rel="noopener noreferrer">Open original listing <ExternalLink className="inline h-3 w-3" /></a> : !item.original_url ? <span className="text-neutral-400">Original link unavailable</span> : null}</div>
            {item.publish_error && <p className="text-sm text-rose-700">{item.publish_error}</p>}
          </div>
        </div>
        {["pending", "publish_failed"].includes(status) && <div className="mt-4 space-y-3 border-t pt-4"><Textarea aria-label={`Post text for ${item.title}`} rows={4} value={edits[item.id] ?? ""} onChange={(event) => setEdits({ ...edits, [item.id]: event.target.value })} /><div className="flex flex-wrap gap-2"><Button className="bg-[#0A1B5C] text-white" disabled={busy !== null} onClick={() => void act(`accept-${item.id}`, () => api(`/api/admin/content-importer/items/${item.id}/accept`, { method: "POST", body: JSON.stringify({ text: edits[item.id] }) }), "Published to the feed")}>{status === "publish_failed" ? "Retry publish" : "Accept and publish"}</Button><Button variant="outline" disabled={busy !== null} onClick={() => { const reason = prompt("Rejection reason", "Not a Professional") ?? ""; void act(`reject-${item.id}`, () => api(`/api/admin/content-importer/items/${item.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }), "Item rejected"); }}>Reject</Button></div></div>}
      </article>)}</div>
    </section>
  </div>;
}
