'use client';

import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavbarUserAvatarProps {
  user?: {
    avatar_url?: string | null;
    full_name?: string | null;
    is_profile_complete?: boolean;
    company?: {
      name?: string | null;
      domain?: string | null;
    } | null;
  } | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIncompleteBadge?: boolean;
}

export function NavbarUserAvatar({
  user,
  className,
  size = 'md',
  showIncompleteBadge = true,
}: NavbarUserAvatarProps) {
  const sizeClasses = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  const iconSizeClasses = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-4.5 w-4.5' : 'h-4 w-4';

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          sizeClasses,
          "rounded-full bg-white flex items-center justify-center text-neutral-400 overflow-hidden shadow-xs border border-neutral-200/80"
        )}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name || "Profile"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : user?.company?.domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${user.company.domain}&sz=64`}
            alt={user.company.name || "Company"}
            className="h-full w-full object-contain p-1"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User className={iconSizeClasses} />
        )}
      </div>
      {showIncompleteBadge && user && !user.is_profile_complete && (
        <div
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-amber-500 border-2 border-white rounded-full shadow-xs"
          title="Profile Incomplete"
        />
      )}
    </div>
  );
}

