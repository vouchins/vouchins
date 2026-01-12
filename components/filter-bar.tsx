'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

interface FilterBarProps {
  onFilterChange: (filters: {
    category?: string;
    visibility?: string;
  }) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('');

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    onFilterChange({
      category: value || undefined,
      visibility: visibility || undefined,
    });
  };

  const handleVisibilityChange = (value: string) => {
    setVisibility(value);
    onFilterChange({
      category: category || undefined,
      visibility: value || undefined,
    });
  };

  const clearFilters = () => {
    setCategory('');
    setVisibility('');
    onFilterChange({});
  };

  const hasActiveFilters = category || visibility;

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
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-neutral-900 text-white rounded-full">
                {[category, visibility].filter(Boolean).length}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
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
            <div className="w-full sm:w-48">
              <Select value={category} onValueChange={handleCategoryChange}>
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

            <div className="w-full sm:w-48">
              <Select value={visibility} onValueChange={handleVisibilityChange}>
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
