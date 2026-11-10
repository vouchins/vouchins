'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Bot,
  GraduationCap,
  Video,
  Wand2,
  Bell,
  HelpCircle,
  Settings,
  Send,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useUser } from '@/components/user-provider';
import { cn } from '@/lib/utils';

export type JobsNavTab =
  | 'dashboard'
  | 'jobs'
  | 'resume'
  | 'profile'
  | 'agent'
  | 'coaching'
  | 'interview'
  | 'autofill'
  | 'messages'
  | 'feedback'
  | 'settings';

export type JobPassNavTab = JobsNavTab;

interface JobsSidebarProps {
  activeTab: JobsNavTab;
  hideLogo?: boolean;
  hideMobileNav?: boolean;
}

export type JobPassSidebarProps = JobsSidebarProps;

export function JobsSidebar({
  activeTab,
  hideLogo = false,
  hideMobileNav = false,
}: JobsSidebarProps) {
  const { user } = useUser();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const mainNavItems = [
    {
      id: 'dashboard' as const,
      label: 'Overview',
      tooltip: 'Dashboard & Analytics',
      href: '/jobs',
      icon: LayoutDashboard,
    },
    {
      id: 'jobs' as const,
      label: 'Jobs',
      tooltip: 'AI Job Recommendations',
      href: '/jobs/list',
      icon: Briefcase,
    },
    {
      id: 'resume' as const,
      label: 'Resume',
      href: '/jobs/resume',
      icon: FileText,
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      href: '/jobs/profile',
      icon: User,
    },
    {
      id: 'agent' as const,
      label: 'Agent',
      href: '/jobs/agent',
      icon: Bot,
    },
    {
      id: 'coaching' as const,
      label: 'Coaching',
      tooltip: 'Skills development',
      href: '/jobs/skills-development',
      icon: GraduationCap,
    },
    {
      id: 'interview' as const,
      label: 'Interview',
      tooltip: 'Mock Interviews',
      href: '/jobs/mock-interviews',
      icon: Video,
      badge: 'NEW',
    },
  ];

  const handleAutofillClick = () => {
    toast.success('Smart Job Autofill is ready and active for job applications.');
  };

  const handleMessagesClick = () => {
    toast.info('No unread candidate messages.');
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = feedbackText.trim();
    if (!trimmed || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user?.full_name || 'Jobs User',
          email: user?.email || 'jobs-user@vouchins.com',
          type: 'Jobs Platform',
          message: trimmed,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setFeedbackSent(true);
      toast.success('Thank you for your feedback! It has been shared with the admin team.');
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSent(false);
        setFeedbackText('');
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex w-[74px] sm:w-[80px] shrink-0 bg-white border-r border-neutral-200/80 flex-col items-center py-4 select-none shadow-[1px_0_0_0_rgba(0,0,0,0.03)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          hideLogo ? "sticky top-16 h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] z-30" : "sticky top-0 h-screen max-h-screen z-30"
        )}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col items-center gap-6 w-full shrink-0">
          {/* Brand Icon / Logo */}
          {!hideLogo && (
            <Link
              href="/feed"
              className="group relative flex flex-col items-center justify-center p-1.5 rounded-2xl hover:bg-neutral-100/80 transition-all"
              title="Vouchins Jobs"
            >
              <div className="relative flex items-center justify-center">
                <Image
                  src="/favicon.png"
                  alt="Vouchins"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
                  priority
                />
              </div>
              <span className="sr-only">Vouchins Jobs</span>
            </Link>
          )}

          {/* Primary Navigation Links */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {mainNavItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    if (isActive) {
                      e.preventDefault();
                    }
                  }}
                  title={item.tooltip || item.label}
                  className={`relative flex flex-col items-center justify-center w-full py-2.5 px-1 rounded-2xl transition-all group ${isActive
                    ? 'bg-[#0A1B5C]/10 text-[#0A1B5C] font-black shadow-xs ring-1 ring-[#0A1B5C]/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/80'
                    }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#0A1B5C]' : 'text-neutral-500 group-hover:text-neutral-900'
                        }`}
                    />

                    {/* Pill Badge (e.g. NEW for Mock Interviews) */}
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-3.5 px-1 py-0.2 bg-rose-500 text-white text-[8px] font-black rounded uppercase tracking-wider shadow-xs leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] sm:text-[11px] tracking-tight mt-1 transition-colors leading-none ${isActive ? 'text-[#0A1B5C] font-extrabold' : 'text-neutral-500 font-medium'
                      }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation Utilities */}
        <div className="flex flex-col items-center gap-2.5 w-full px-2 pt-4 pb-2 border-t border-neutral-100 mt-auto shrink-0">
          {/* 1. Smart Job Autofill */}
          <button
            type="button"
            onClick={handleAutofillClick}
            title="Smart Job autofill"
            className="flex flex-col items-center justify-center w-full p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors group"
          >
            <Wand2 className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">Smart Job autofill</span>
          </button>

          {/* 2. Messages */}
          <button
            type="button"
            onClick={handleMessagesClick}
            title="Messages"
            className="flex flex-col items-center justify-center w-full p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors group relative"
          >
            <Bell className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">Messages</span>
          </button>

          {/* 3. Feedback */}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            title="Feedback"
            className="flex flex-col items-center justify-center w-full p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors group"
          >
            <HelpCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="sr-only">Feedback</span>
          </button>

          {/* 4. Settings */}
          <Link
            href="/settings"
            title="Settings"
            className="flex flex-col items-center justify-center w-full p-2 rounded-xl text-neutral-400 hover:text-[#0A1B5C] hover:bg-neutral-100 transition-colors group"
          >
            <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
            <span className="sr-only">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      {!hideMobileNav && (
        <nav
          aria-label="Jobs mobile navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 py-1 px-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
        >
          {[
            mainNavItems[0], // Overview
            mainNavItems[1], // Jobs
            mainNavItems[2], // Resume
            mainNavItems[3], // Profile
            mainNavItems[4], // Agent
            mainNavItems[6], // Interview
          ].map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                  }
                }}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all min-w-[50px]",
                  isActive
                    ? "text-[#0A1B5C] font-black"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-[#0A1B5C]" : "text-neutral-500"
                    )}
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-rose-500 text-white text-[7px] font-black rounded uppercase tracking-wider leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-tight mt-0.5 leading-none",
                    isActive ? "text-[#0A1B5C] font-extrabold" : "text-neutral-500 font-medium"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Interactive Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-neutral-200 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-neutral-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#4FD1C5]" />
              Share Your Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Tell us how we can make your Vouchins Jobs experience even faster and more impactful.
            </DialogDescription>
          </DialogHeader>

          {feedbackSent ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900">Feedback Received</h4>
              <p className="text-xs text-neutral-500">We appreciate your input!</p>
            </div>
          ) : (
            <form onSubmit={handleSendFeedback} className="space-y-4 pt-2">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What feature would you like to see next? Or report any suggestion..."
                rows={4}
                required
                className="w-full text-xs font-medium p-3.5 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]/20 focus:border-[#0A1B5C] resize-none"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0A1B5C] hover:bg-[#11287e] disabled:opacity-50 text-white flex items-center gap-2 transition-all active:scale-95 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const JobPassSidebar = JobsSidebar;
