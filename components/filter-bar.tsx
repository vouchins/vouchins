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
    housingType?: string;
    visibility?: string;
  }) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [housingType, setHousingType] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('');

  const applyFilters = (
    nextCategory = category,
    nextHousingType = housingType,
    nextVisibility = visibility
  ) => {
    onFilterChange({
      category: nextCategory || undefined,
      housingType:
        nextCategory === 'housing' && nextHousingType
          ? nextHousingType
          : undefined,
      visibility: nextVisibility || undefined,
    });
  };

  const handleCategoryChange = (value: string) => {
    const normalized = value === 'all' ? '' : value;
    setCategory(normalized);

    // Reset housing sub-type if category changes
    if (normalized !== 'housing') {
      setHousingType('');
    }

    applyFilters(normalized, '', visibility);
  };

  const handleHousingTypeChange = (value: string) => {
    const normalized = value === 'all' ? '' : value;
    setHousingType(normalized);
    applyFilters(category, normalized, visibility);
  };

  const handleVisibilityChange = (value: string) => {
    const normalized = value === 'all' ? '' : value;
    setVisibility(normalized);
    applyFilters(category, housingType, normalized);
  };

  const clearFilters = () => {
    setCategory('');
    setHousingType('');
    setVisibility('');
    onFilterChange({});
  };

  const activeFilterCount = [category, housingType, visibility].filter(
    Boolean
  ).length;

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
              <Select value={category || 'all'} onValueChange={handleCategoryChange}>
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

            {/* Housing sub-type */}
            {category === 'housing' && (
              <div className="w-full sm:w-48">
                <Select
                  value={housingType || 'all'}
                  onValueChange={handleHousingTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All housing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All housing</SelectItem>
                    <SelectItem value="flatmates">Flatmates</SelectItem>
                    <SelectItem value="rentals">Rentals</SelectItem>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="pg">PG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Visibility */}
            <div className="w-full sm:w-48">
              <Select
                value={visibility || 'all'}
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
