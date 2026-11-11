"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Briefcase, Building2, CheckCircle2, Download, ExternalLink, FileSpreadsheet, Globe, Loader2, MapPin, Play, Plus, RefreshCw, SlidersHorizontal, Square, Trash2, UploadCloud, X, Zap } from "lucide-react";
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

  const [isCrawlingJobs, setIsCrawlingJobs] = useState(false);
  const [isChainedCrawling, setIsChainedCrawling] = useState(false);
  const [activeJobInProgress, setActiveJobInProgress] = useState<string>('');
  const [allCompanyNames, setAllCompanyNames] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [selectedLimit, setSelectedLimit] = useState<number>(25);
  const [batchInfo, setBatchInfo] = useState<{ totalCompanies: number; totalBatches: number; batchSize: number }>({
    totalCompanies: 457,
    totalBatches: 19,
    batchSize: 25,
  });
  const [chainedProgress, setChainedProgress] = useState<{
    currentBatchIndex: number;
    completedBatches: number;
    totalCrawled: number;
    totalInserted: number;
    totalSkipped: number;
    recentJobs: { title: string; company: string; location: string }[];
  }>({
    currentBatchIndex: 0,
    completedBatches: 0,
    totalCrawled: 0,
    totalInserted: 0,
    totalSkipped: 0,
    recentJobs: [],
  });

  const abortCrawlRef = useRef<boolean>(false);

  const [crawlResult, setCrawlResult] = useState<{
    batchIndex?: number;
    totalBatches?: number;
    nextBatchIndex?: number | null;
    totalCompanies?: number;
    companiesProcessed?: string[];
    crawled: number;
    inserted: number;
    skippedDuplicates: number;
    importedJobs?: { title: string; company: string; location: string }[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/jobs/crawl')
      .then((r) => r.json())
      .then((data) => {
        if (data.totalCompanies && data.totalBatches) {
          setBatchInfo({
            totalCompanies: data.totalCompanies,
            totalBatches: data.totalBatches,
            batchSize: data.batchSize || 25,
          });
        }
        if (Array.isArray(data.companies)) {
          setAllCompanyNames(data.companies);
        }
      })
      .catch(() => {});
  }, []);

  const handleRunJobCrawl = async (batchIdx = selectedBatchIndex) => {
    setIsCrawlingJobs(true);
    setCrawlResult(null);
    const startCompIdx = batchIdx * batchInfo.batchSize;
    const currentBatchCompanies = allCompanyNames.slice(startCompIdx, startCompIdx + batchInfo.batchSize);
    const compNamesSummary = currentBatchCompanies.length > 0
      ? currentBatchCompanies.slice(0, 3).join(', ') + (currentBatchCompanies.length > 3 ? ` +${currentBatchCompanies.length - 3} more` : '')
      : `Batch ${batchIdx + 1}`;

    const geoLabel = selectedCity
      ? `${selectedCity} (${selectedCountry !== 'all' ? selectedCountry.toUpperCase() : 'Global'})`
      : selectedCountry !== 'all'
      ? `Country: ${selectedCountry.toUpperCase()}`
      : 'Global';

    setActiveJobInProgress(`Querying ATS requisitions for ${compNamesSummary} [${geoLabel}]...`);

    try {
      const res = await fetch("/api/admin/jobs/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIndex: batchIdx,
          batchSize: batchInfo.batchSize,
          limit: selectedLimit,
          country: selectedCountry,
          city: selectedCity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to crawl jobs");
      setCrawlResult(data);
      if (typeof data.nextBatchIndex === 'number') {
        setSelectedBatchIndex(data.nextBatchIndex);
      }
      if (data.importedJobs && data.importedJobs.length > 0) {
        setActiveJobInProgress(`Ingested: ${data.importedJobs[0].title} at ${data.importedJobs[0].company}`);
      } else {
        setActiveJobInProgress(`Completed Batch ${batchIdx + 1} (${data.skippedDuplicates} duplicates already recorded)`);
      }
      toast.success(`Batch ${batchIdx + 1} completed: ${data.inserted} new jobs added!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error running job crawler");
      setActiveJobInProgress('Crawl encountered an error');
    } finally {
      setIsCrawlingJobs(false);
    }
  };

  const handleStartChainedCrawl = async () => {
    setIsChainedCrawling(true);
    abortCrawlRef.current = false;
    setCrawlResult(null);

    let currentIdx = selectedBatchIndex >= batchInfo.totalBatches ? 0 : selectedBatchIndex;
    let accumulatedCrawled = 0;
    let accumulatedInserted = 0;
    let accumulatedSkipped = 0;
    let accumulatedRecentJobs: { title: string; company: string; location: string }[] = [];
    let completedCount = 0;

    setChainedProgress({
      currentBatchIndex: currentIdx,
      completedBatches: 0,
      totalCrawled: 0,
      totalInserted: 0,
      totalSkipped: 0,
      recentJobs: [],
    });

    const geoLabel = selectedCity
      ? `${selectedCity} (${selectedCountry !== 'all' ? selectedCountry.toUpperCase() : 'Global'})`
      : selectedCountry !== 'all'
      ? `Country: ${selectedCountry.toUpperCase()}`
      : 'Global';

    try {
      while (currentIdx < batchInfo.totalBatches) {
        if (abortCrawlRef.current) {
          toast.info(`Chained crawl paused at Batch ${currentIdx + 1}`);
          break;
        }

        const startCompIdx = currentIdx * batchInfo.batchSize;
        const currentBatchCompanies = allCompanyNames.slice(startCompIdx, startCompIdx + batchInfo.batchSize);
        const compNamesSummary = currentBatchCompanies.length > 0
          ? `${currentBatchCompanies.slice(0, 3).join(', ')}${currentBatchCompanies.length > 3 ? ` +${currentBatchCompanies.length - 3} more` : ''}`
          : `Batch ${currentIdx + 1}`;

        setActiveJobInProgress(`Batch ${currentIdx + 1}/${batchInfo.totalBatches}: Scanning ${compNamesSummary} [${geoLabel}]...`);
        setChainedProgress((prev) => ({
          ...prev,
          currentBatchIndex: currentIdx,
        }));

        const res = await fetch("/api/admin/jobs/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchIndex: currentIdx,
            batchSize: batchInfo.batchSize,
            limit: selectedLimit,
            country: selectedCountry,
            city: selectedCity,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to crawl Batch ${currentIdx + 1}`);
        }

        completedCount++;
        accumulatedCrawled += data.crawled || 0;
        accumulatedInserted += data.inserted || 0;
        accumulatedSkipped += data.skippedDuplicates || 0;
        const newBatchJobs: { title: string; company: string; location: string }[] = data.importedJobs || [];
        accumulatedRecentJobs = [...newBatchJobs, ...accumulatedRecentJobs].slice(0, 30);

        if (newBatchJobs.length > 0) {
          const firstJob = newBatchJobs[0];
          setActiveJobInProgress(`Ingested: ${firstJob.title} at ${firstJob.company}`);
        } else {
          setActiveJobInProgress(`Batch ${currentIdx + 1} completed (${data.skippedDuplicates} duplicates up to date)`);
        }

        setChainedProgress({
          currentBatchIndex: currentIdx,
          completedBatches: completedCount,
          totalCrawled: accumulatedCrawled,
          totalInserted: accumulatedInserted,
          totalSkipped: accumulatedSkipped,
          recentJobs: accumulatedRecentJobs,
        });

        setCrawlResult(data);

        if (typeof data.nextBatchIndex === 'number') {
          setSelectedBatchIndex(data.nextBatchIndex);
          currentIdx = data.nextBatchIndex;
        } else {
          break;
        }
      }

      if (!abortCrawlRef.current) {
        toast.success(
          `Chained crawl finished! Added ${accumulatedInserted} new jobs across all batches.`
        );
        setActiveJobInProgress(`All ${batchInfo.totalBatches} batches synced successfully.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error during chained crawl");
    } finally {
      setIsChainedCrawling(false);
    }
  };

  const handleStopChainedCrawl = () => {
    abortCrawlRef.current = true;
    setIsChainedCrawling(false);
    setActiveJobInProgress('Crawl paused by administrator');
  };

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

  return <div className="space-y-8">
    {/* Tech Jobs Live Crawler Section */}
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header & Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-[#0A1B5C]/10 flex items-center justify-center text-[#0A1B5C]">
              <Briefcase className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-[#0A1B5C]">Tech Jobs Crawler & Importer</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#4FD1C5]/20 text-[#0A1B5C] border border-[#4FD1C5]/40">
              Freehire API · {batchInfo.totalCompanies} Companies
            </span>
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-3xl">
            Fetch and sync live job openings across registered companies using the Freehire direct search API. Features geographic targeting by city or country, canonical URL sanitization, and 1-click batch chaining with zero timeouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-neutral-100/90 border border-neutral-200 text-neutral-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-neutral-500" />
            {batchInfo.batchSize} per batch
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-neutral-100/90 border border-neutral-200 text-neutral-700 font-semibold text-xs shadow-2xs">
            {batchInfo.totalBatches} total batches
          </span>
        </div>
      </div>

      {/* Dedicated Targeting & Controls Panel */}
      <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/70 p-5 sm:p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <SlidersHorizontal className="h-4 w-4 text-[#0A1B5C]" />
            Crawl Parameters & Geo-Targeting
          </div>
          <div className="text-[11px] font-medium text-neutral-500 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Scope: <span className="font-bold text-neutral-700">{selectedCountry === 'all' ? 'All Countries (Global)' : selectedCountry.toUpperCase()}</span>
            {selectedCity ? (
              <> · City: <span className="font-bold text-neutral-700">{selectedCity}</span></>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Country Selector */}
          <div className="space-y-1.5">
            <label htmlFor="countrySelect" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[#0A1B5C]" />
              Country:
            </label>
            <select
              id="countrySelect"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              disabled={isCrawlingJobs || isChainedCrawling}
              className="w-full text-xs font-semibold rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] transition-all disabled:opacity-50"
            >
              <option value="all">All Countries (Global)</option>
              <option value="in">India (IN)</option>
              <option value="us">United States (US)</option>
              <option value="gb">United Kingdom (GB)</option>
              <option value="de">Germany (DE)</option>
              <option value="ca">Canada (CA)</option>
              <option value="sg">Singapore (SG)</option>
              <option value="ae">United Arab Emirates (AE)</option>
              <option value="au">Australia (AU)</option>
            </select>
          </div>

          {/* City / Tech Hub Selector & Input */}
          <div className="space-y-1.5">
            <label htmlFor="cityInput" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#0A1B5C]" />
              City / Tech Hub:
            </label>
            <div className="relative">
              <Input
                id="cityInput"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="e.g. Hyderabad, Bengaluru, SF"
                disabled={isCrawlingJobs || isChainedCrawling}
                className="h-[39px] text-xs font-semibold rounded-xl border border-neutral-300 bg-white px-3.5 pr-8 text-neutral-800 shadow-2xs focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C]"
              />
              {selectedCity && (
                <button
                  type="button"
                  onClick={() => setSelectedCity('')}
                  disabled={isCrawlingJobs || isChainedCrawling}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Batch Selector */}
          <div className="space-y-1.5">
            <label htmlFor="batchSelect" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#0A1B5C]" />
              Select Batch:
            </label>
            <select
              id="batchSelect"
              value={selectedBatchIndex}
              onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
              disabled={isCrawlingJobs || isChainedCrawling}
              className="w-full text-xs font-semibold rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] transition-all disabled:opacity-50"
            >
              {Array.from({ length: batchInfo.totalBatches }).map((_, idx) => {
                const startNum = idx * batchInfo.batchSize + 1;
                const endNum = Math.min((idx + 1) * batchInfo.batchSize, batchInfo.totalCompanies);
                const firstComp = allCompanyNames[idx * batchInfo.batchSize];
                const lastComp = allCompanyNames[Math.min((idx + 1) * batchInfo.batchSize - 1, allCompanyNames.length - 1)];
                const preview = firstComp && lastComp ? ` (${firstComp} - ${lastComp})` : '';
                return (
                  <option key={idx} value={idx}>
                    Batch {idx + 1} [{startNum} - {endNum}]{preview}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Per Company Limit */}
          <div className="space-y-1.5">
            <label htmlFor="limitSelect" className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#0A1B5C]" />
              Jobs Per Company:
            </label>
            <select
              id="limitSelect"
              value={selectedLimit}
              onChange={(e) => setSelectedLimit(Number(e.target.value))}
              disabled={isCrawlingJobs || isChainedCrawling}
              className="w-full text-xs font-semibold rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] transition-all disabled:opacity-50"
            >
              <option value={10}>10 jobs per company</option>
              <option value={25}>25 jobs per company</option>
              <option value={50}>50 jobs per company</option>
              <option value={100}>100 jobs per company</option>
            </select>
          </div>
        </div>

        {/* Quick City Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
            Quick Cities:
          </span>
          {[
            { label: 'All Cities', value: '' },
            { label: 'Hyderabad', value: 'Hyderabad' },
            { label: 'Bengaluru', value: 'Bengaluru' },
            { label: 'Pune', value: 'Pune' },
            { label: 'Mumbai', value: 'Mumbai' },
            { label: 'Delhi / NCR', value: 'Delhi' },
            { label: 'San Francisco', value: 'San Francisco' },
            { label: 'London', value: 'London' },
            { label: 'Singapore', value: 'Singapore' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isCrawlingJobs || isChainedCrawling}
              onClick={() => {
                setSelectedCity(preset.value);
                if (preset.value && ['Hyderabad', 'Bengaluru', 'Pune', 'Mumbai', 'Delhi'].includes(preset.value) && selectedCountry === 'all') {
                  setSelectedCountry('in');
                } else if (preset.value === 'San Francisco' && selectedCountry === 'all') {
                  setSelectedCountry('us');
                } else if (preset.value === 'London' && selectedCountry === 'all') {
                  setSelectedCountry('gb');
                } else if (preset.value === 'Singapore' && selectedCountry === 'all') {
                  setSelectedCountry('sg');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                selectedCity.toLowerCase() === preset.value.toLowerCase()
                  ? 'bg-[#0A1B5C] text-white shadow-2xs font-bold'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-200/80">
          <div className="text-xs text-neutral-500 leading-normal">
            Clicking <span className="font-semibold text-neutral-700">Crawl All Batches</span> will process all remaining batches sequentially with automatic deduplication.
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isChainedCrawling ? (
              <Button
                onClick={handleStopChainedCrawl}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 h-10 rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop Crawl
              </Button>
            ) : (
              <Button
                onClick={handleStartChainedCrawl}
                disabled={isCrawlingJobs}
                className="bg-[#0A1B5C] hover:bg-[#11287e] text-white text-xs font-bold px-5 py-2.5 h-10 rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current text-[#4FD1C5]" />
                Crawl All Batches (1-Click)
              </Button>
            )}

            <Button
              onClick={() => handleRunJobCrawl(selectedBatchIndex)}
              disabled={isCrawlingJobs || isChainedCrawling}
              variant="outline"
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold px-4 py-2.5 h-10 rounded-xl shadow-2xs flex items-center gap-2 transition-all"
            >
              {isCrawlingJobs ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Batch {selectedBatchIndex + 1} Only
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Live Chained Crawl Progress Monitor */}
      {(isChainedCrawling || chainedProgress.completedBatches > 0) && (
        <div className="rounded-2xl border border-[#4FD1C5]/40 bg-[#0A1B5C]/[0.02] p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`h-3 w-3 rounded-full ${isChainedCrawling ? "bg-[#4FD1C5] animate-ping" : "bg-emerald-500"}`} />
              <span className="font-bold text-sm sm:text-base text-[#0A1B5C]">
                {isChainedCrawling ? "Chained Crawl In Progress" : "Chained Crawl Summary"}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#0A1B5C]/10 text-[#0A1B5C]">
                Batch {Math.min(chainedProgress.currentBatchIndex + 1, batchInfo.totalBatches)} of {batchInfo.totalBatches}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-[#0A1B5C] bg-[#0A1B5C]/5 px-3 py-1 rounded-lg">
                {Math.round((chainedProgress.completedBatches / batchInfo.totalBatches) * 100)}% Complete
              </span>
              {isChainedCrawling && (
                <Button
                  onClick={handleStopChainedCrawl}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 px-3 rounded-lg"
                >
                  <Square className="h-3 w-3 fill-current" /> Stop
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-neutral-200/90 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#0A1B5C] h-3 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(5, Math.min(100, Math.round((chainedProgress.completedBatches / batchInfo.totalBatches) * 100)))}%`,
              }}
            />
          </div>

          {/* In-Progress Job / Activity Banner */}
          {activeJobInProgress && (
            <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-700 bg-white p-3.5 rounded-xl border border-neutral-200 shadow-2xs">
              {isChainedCrawling ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#0A1B5C] shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
              <span className="font-bold text-[#0A1B5C] shrink-0">Current Activity:</span>
              <span className="truncate text-neutral-800">{activeJobInProgress}</span>
            </div>
          )}

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1 text-center">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
                Jobs Ingested
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                +{chainedProgress.totalInserted}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
                Total Scanned
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#0A1B5C]">
                {chainedProgress.totalCrawled}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
              <span className="text-[11px] uppercase font-bold tracking-wider text-neutral-400 block mb-1">
                Duplicates Filtered
              </span>
              <span className="text-xl sm:text-2xl font-black text-neutral-500">
                {chainedProgress.totalSkipped}
              </span>
            </div>
          </div>

          {/* Live Stream of Newly Discovered Jobs */}
          {chainedProgress.recentJobs.length > 0 && (
            <div className="pt-3 border-t border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Live Ingested Requisitions Stream ({chainedProgress.recentJobs.length})
                </span>
                <span className="text-[11px] text-neutral-400 font-medium">Auto-updating</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-52 overflow-y-auto pr-1">
                {chainedProgress.recentJobs.slice(0, 15).map((job, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs hover:border-[#4FD1C5]/50 transition-colors">
                    <p className="font-bold text-neutral-900 text-xs truncate">{job.title}</p>
                    <p className="text-[11px] text-neutral-500 truncate mt-1 flex items-center gap-1">
                      <span className="font-semibold text-neutral-700 truncate">{job.company}</span>
                      <span>·</span>
                      <span className="truncate">{job.location}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single Batch Summary (when single batch is executed outside chained mode) */}
      {!isChainedCrawling && chainedProgress.completedBatches === 0 && crawlResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-950 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Batch {((crawlResult.batchIndex ?? selectedBatchIndex) + 1)} of {crawlResult.totalBatches || batchInfo.totalBatches} completed! {crawlResult.inserted} new jobs imported ({crawlResult.skippedDuplicates} duplicates skipped).
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-700">
              Total scanned: {crawlResult.crawled}
            </span>
          </div>

          {crawlResult.companiesProcessed && crawlResult.companiesProcessed.length > 0 && (
            <div className="pt-2 border-t border-emerald-200/60">
              <span className="font-bold text-emerald-900 block mb-1.5">
                Companies Scanned in this Batch ({crawlResult.companiesProcessed.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {crawlResult.companiesProcessed.map((comp, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-white/90 border border-emerald-200 text-emerald-900 text-[11px] font-medium shadow-2xs"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {crawlResult.importedJobs && crawlResult.importedJobs.length > 0 && (
            <div className="pt-2 border-t border-emerald-200/60">
              <span className="font-bold text-emerald-900 block mb-1.5">Recent Discoveries:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {crawlResult.importedJobs.slice(0, 6).map((job, idx) => (
                  <div key={idx} className="bg-white/95 rounded-xl p-3 border border-emerald-200/50 shadow-2xs">
                    <p className="font-bold text-neutral-900 truncate">{job.title}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{job.company} · {job.location}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>

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
