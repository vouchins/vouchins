"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { CATEGORIES, SUB_CATEGORIES } from "@/lib/constants";

interface FilterBarProps {
  onFilterChange: (filters: {
    category?: string;
    subCategory?: string;
    visibility?: string;
  }) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("");

  const applyFilters = (
    nextCategory = category,
    nextSubCategory = subCategory,
    nextVisibility = visibility,
  ) => {
    onFilterChange({
      category: nextCategory || undefined,
      subCategory: nextSubCategory || undefined,
      visibility: nextVisibility || undefined,
    });
  };

  const handleCategoryChange = (value: string) => {
    const normalized = value === "all" ? "" : value;
    setCategory(normalized);

    setSubCategory("");
    applyFilters(normalized, undefined, visibility);
  };

  const handleSubCategoryChange = (value: string) => {
    const normalized = value === "all" ? "" : value;
    setSubCategory(normalized);
    applyFilters(category, normalized, visibility);
  };

  const handleVisibilityChange = (value: string) => {
    const normalized = value === "all" ? "" : value;
    setVisibility(normalized);
    applyFilters(category, subCategory, normalized);
  };

  const clearFilters = () => {
    setCategory("");
    setSubCategory("");
    setVisibility("");
    onFilterChange({});
  };

  const activeFilterCount = [category, subCategory, visibility].filter(
    Boolean,
  ).length;

  const availableSubCategories = SUB_CATEGORIES[category] || [];

  return (
    <div className="bg-white border-b border-neutral-200 py-3">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-neutral-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-neutral-900 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-neutral-600"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-3">
            {/* Category */}
            <div className="w-full sm:w-48">
              <Select
                value={category || "all"}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-category */}
            {availableSubCategories.length > 0 && (
              <div className="w-full sm:w-48">
                <Select
                  value={subCategory || "all"}
                  onValueChange={handleSubCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All options" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All options</SelectItem>
                    {availableSubCategories.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Visibility */}
            <div className="w-full sm:w-48">
              <Select
                value={visibility || "all"}
                onValueChange={handleVisibilityChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All posts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posts</SelectItem>
                  <SelectItem value="company">My company only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
