'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { JobsSidebar } from '@/components/jobs/jobs-sidebar';
import { JobsNavbar } from '@/components/jobs/jobs-navbar';
import { useUser } from '@/components/user-provider';
import { fetchCachedResumes } from '@/lib/jobs/client-cache';
import { EnterpriseBuildingIcon } from '@/components/icons/enterprise-building-icon';
import {
  User,
  ShieldCheck,
  Mail,
  MapPin,
  Sparkles,
  FileText,
  ExternalLink,
  ArrowRight,
  Shield,
  Briefcase,
} from 'lucide-react';

export default function JobsProfilePage() {
  const { user, loading: userLoading } = useUser();
  const [latestResume, setLatestResume] = useState<any | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadResume() {
      try {
        const data = await fetchCachedResumes();
        if (isMounted && data.resumes && Array.isArray(data.resumes) && data.resumes.length > 0) {
          setLatestResume(data.resumes[0]);
          if (typeof data.latestScore === 'number') {
            setLatestScore(data.latestScore);
          } else if (data.resumes[0]?.evaluation?.overallScore) {
            setLatestScore(data.resumes[0].evaluation.overallScore);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile resume:', err);
      } finally {
        if (isMounted) setIsLoadingResume(false);
      }
    }

    loadResume();
    return () => {
      isMounted = false;
    };
  }, []);

  const fullName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Candidate';
  const userInitials = React.useMemo(() => {
    if (user?.full_name?.trim()) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  }, [user?.full_name, user?.email]);

  const targetRole =
    latestResume?.targetJobTitle ||
    latestResume?.evaluation?.targetRole ||
    'Software Engineer';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans">
      <JobsSidebar activeTab="profile" />

      <main className="flex-1 flex flex-col min-w-0">
        <JobsNavbar atsScore={latestScore} />

        <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto space-y-6">
          {userLoading ? (
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs animate-pulse space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-neutral-200" />
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-neutral-200 rounded" />
                  <div className="h-4 w-32 bg-neutral-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-neutral-100">
                <div className="h-20 bg-neutral-100 rounded-2xl" />
                <div className="h-20 bg-neutral-100 rounded-2xl" />
                <div className="h-20 bg-neutral-100 rounded-2xl" />
              </div>
            </div>
          ) : !user ? (
            <div className="bg-white rounded-3xl border border-neutral-200/80 p-12 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 mx-auto flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900">Sign in to view your profile</h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Sign in to access your verified career credentials, ATS readiness score, and corporate referrals.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0A1B5C] text-white text-xs font-bold hover:bg-[#0c2277] transition-colors"
              >
                Log In
              </Link>
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0A1B5C] to-[#122b8f] text-white text-2xl font-black flex items-center justify-center shadow-inner overflow-hidden shrink-0">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={fullName}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span>{userInitials}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-neutral-900">{fullName}</h2>
                        {user.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Verified Professional
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-medium">
                            <User className="h-3.5 w-3.5" />
                            Member
                          </span>
                        )}
                        {user.is_admin && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-xs font-black">
                            Admin
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 flex-wrap">
                        {user.company?.name && (
                          <span className="flex items-center gap-1 font-medium text-neutral-700">
                            <EnterpriseBuildingIcon className="h-3.5 w-3.5 text-neutral-400" />
                            {user.company.name}
                          </span>
                        )}
                        {user.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                            {user.city}
                          </span>
                        )}
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-neutral-400" />
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/users/${user.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:text-[#0A1B5C] hover:bg-neutral-50 transition-colors"
                  >
                    <span>View Vouchins Profile</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-neutral-100">
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">ATS Readiness</span>
                    <p className="text-xl font-black text-[#0A1B5C] mt-1">
                      {latestScore != null ? `${latestScore}%` : 'Not Evaluated'}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                      {latestScore != null && latestScore >= 80
                        ? 'Ready for Tier-1 Tech screening'
                        : latestScore != null
                          ? 'Optimizations available'
                          : 'Upload resume to calculate score'}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Target Role</span>
                    <p className="text-xl font-black text-neutral-900 mt-1 overflow">
                      {targetRole}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5 truncate">
                      {latestResume ? latestResume.name : 'Master Resume Draft'}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Vouch Status</span>
                    <p className="text-xl font-black text-emerald-600 mt-1 flex items-center gap-1">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      {user.vouch_points > 0 ? `${user.vouch_points} Points` : 'Verified Member'}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                      {user.is_verified ? 'Fast-Tracked Referral Routing' : 'Community Profile Active'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-neutral-900 mb-3">Resume & Application Tools</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/jobs/resume"
                    className="p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0A1B5C]/10 text-[#0A1B5C] flex items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 group-hover:text-[#0A1B5C] transition-colors">
                          Manage Master Resumes
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          {latestResume ? 'Edit or download your audited resume' : 'Upload your first resume'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-[#0A1B5C] group-hover:translate-x-0.5 transition-all" />
                  </Link>

                  <Link
                    href="/jobs/resume/studio"
                    className="p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 group-hover:text-emerald-700 transition-colors">
                          Resume Studio
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          Interactive Google XYZ rewrite canvas
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

