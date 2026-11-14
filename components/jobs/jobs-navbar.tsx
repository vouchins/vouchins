'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  FileText,
  CheckCircle2,
  ChevronDown,
  User as UserIcon,
  Share2,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavbarUserAvatar } from '@/components/navbar-user-avatar';
import { useUser } from '@/components/user-provider';
import { supabase } from '@/lib/supabase/browser';
import { triggerNativeShare, InviteDialog } from '@/components/invite-dialog';
import { fetchCachedResumes } from '@/lib/jobs/client-cache';
import posthog from 'posthog-js';

export interface JobsNavbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  atsScore?: number | null;
  children?: React.ReactNode;
}

export function JobsNavbar({
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  searchPlaceholder = 'Search job title, company, or skills (e.g. Kafka, ServiceNow, Go)...',
  showSearch = true,
  atsScore: externalAtsScore,
  children,
}: JobsNavbarProps) {
  const router = useRouter();
  const { user } = useUser();
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [dynamicAtsScore, setDynamicAtsScore] = useState<number | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Controlled or uncontrolled search query
  const isSearchControlled = typeof externalOnSearchChange === 'function';
  const currentSearchValue = isSearchControlled
    ? externalSearchQuery ?? ''
    : internalSearchQuery;

  // Resolve ATS score: use external if provided, otherwise fetch cached score
  useEffect(() => {
    if (externalAtsScore !== undefined) {
      setDynamicAtsScore(externalAtsScore);
      return;
    }

    let isMounted = true;
    async function loadAtsScore() {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('job_evaluations')
            .select('overall_score')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!error && data && typeof data.overall_score === 'number') {
            if (isMounted) setDynamicAtsScore(data.overall_score);
            return;
          }
        } catch {
          // Fallback to cached resumes
        }
      }

      try {
        const data = await fetchCachedResumes();
        if (isMounted && typeof data.latestScore === 'number') {
          setDynamicAtsScore(data.latestScore);
        }
      } catch {
        // Fallback / guest mode
      }
    }

    loadAtsScore();
    return () => {
      isMounted = false;
    };
  }, [externalAtsScore, user?.id]);

  const handleSearchChange = (value: string) => {
    if (isSearchControlled) {
      externalOnSearchChange(value);
    } else {
      setInternalSearchQuery(value);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSearchControlled && currentSearchValue.trim()) {
      router.push(`/jobs/list?q=${encodeURIComponent(currentSearchValue.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      posthog.capture('Logout');
    } catch {
      // Safe fallback if analytics blocked
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || '';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80 shadow-xs px-3 sm:px-6 py-2.5 sm:py-3 shrink-0">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/jobs" className="flex items-center gap-2 group">
              <Image
                src="/images/logo.png"
                alt="Vouchins Jobs"
                width={110}
                height={32}
                className="w-[84px] sm:w-[105px] object-contain transition-opacity group-hover:opacity-90"
                priority
              />
            </Link>
          </div>

          {/* Center: Search Bar */}
          {showSearch ? (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-1 sm:mx-2 relative">
              <div className="relative">
                <Search className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={currentSearchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-9 sm:h-10 pl-8 sm:pl-10 pr-8 sm:pr-9 rounded-xl border border-neutral-200 bg-neutral-50/80 focus:bg-white text-xs font-semibold text-neutral-800 placeholder:text-neutral-400 placeholder:truncate focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] transition-all"
                />
                {currentSearchValue && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex-1" />
          )}

          {/* Right: Candidate Profile Context & Dropdown */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 pl-2 border-l border-neutral-200 hover:opacity-90 transition-opacity group outline-none focus-visible:ring-2 focus-visible:ring-[#0A1B5C] rounded-lg py-1 pr-1.5"
                    aria-label="User profile menu"
                  >
                    <NavbarUserAvatar user={user} size="md" />

                    <div className="hidden sm:block text-left">
                      <span className="text-xs font-bold text-neutral-900 block leading-tight group-hover:text-[#0A1B5C] transition-colors max-w-[130px] truncate">
                        {displayName || user.email}
                      </span>
                      {dynamicAtsScore != null ? (
                        <span
                          className={`text-[10px] font-extrabold flex items-center gap-1 ${
                            dynamicAtsScore >= 80
                              ? 'text-emerald-600'
                              : dynamicAtsScore >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {dynamicAtsScore}% ATS Ready
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-neutral-500 block leading-tight truncate max-w-[130px]">
                          {user.company?.name || user.city || 'Verified Member'}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-3 w-3 text-neutral-400 group-hover:text-neutral-600 hidden sm:block shrink-0" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 mt-2 rounded-xl shadow-xl border-neutral-200"
                >
                  <Link href={user.id ? `/users/${user.id}` : '/jobs/profile'}>
                    <div className="px-3 py-3 hover:bg-neutral-50 rounded-t-xl transition-colors cursor-pointer">
                      <p className="text-sm font-bold text-neutral-900 truncate">
                        {user.full_name || displayName}
                      </p>
                      <p className="text-xs text-neutral-500 truncate mb-1">
                        {user.email}
                      </p>
                      {!user.is_profile_complete && (
                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-md mt-1 border border-amber-100">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">
                            {user.profile_completion_percentage}% Complete
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer py-2 font-medium text-sm text-neutral-700"
                  >
                    <Link href={user.id ? `/users/${user.id}` : '/jobs/profile'} className="flex items-center w-full">
                      <UserIcon className="h-4 w-4 mr-2 text-neutral-500" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer py-2 font-medium text-sm text-neutral-700"
                  >
                    <Link href="/jobs/resume" className="flex items-center w-full justify-between">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-neutral-500" />
                        Resume Studio
                      </div>
                      {dynamicAtsScore != null && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {dynamicAtsScore}%
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={async () => {
                      const shared = await triggerNativeShare(user.id);
                      if (!shared) {
                        setIsInviteOpen(true);
                      }
                    }}
                    className="cursor-pointer py-2.5 font-bold text-sm text-neutral-700"
                  >
                    <Share2 className="h-4 w-4 mr-2 text-neutral-500" />
                    Invite Colleagues
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 cursor-pointer py-2.5 font-bold text-sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/login"
                className="text-xs font-bold text-[#0A1B5C] hover:bg-neutral-100 px-3 py-1.5 rounded-lg border border-neutral-200 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Children (e.g. Quick Filter Chips on /jobs) */}
        {children}
      </header>

      {user && (
        <InviteDialog
          isOpen={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          userId={user.id}
        />
      )}
    </>
  );
}

export default JobsNavbar;

