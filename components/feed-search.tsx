"use client";

import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FeedSearchProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
}

export function FeedSearch({ onSearch, isSearching }: FeedSearchProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <form
      onSubmit={handleSearch}
      className="relative w-full flex items-center gap-2"
    >
      <div className="relative flex-1 group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <Input
          type="text"
          placeholder="Search housing, recommendations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 py-5 bg-white border-neutral-200 focus-visible:ring-primary rounded-xl shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSearching}
        className="bg-primary hover:bg-primary/90 h-10 px-4 rounded-xl shadow-sm shrink-0"
      >
        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
      </Button>
    </form>
  );
}
