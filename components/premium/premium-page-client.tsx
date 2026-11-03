'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Users,
  Flame,
  Zap,
  Award,
  MessageSquare,
  Search,
  FileText,
  Check,
  HelpCircle,
  Send,
  SlidersHorizontal,
  Layers,
  Globe2,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Shield,
  Briefcase,
  Star,
  Compass,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EnterpriseBuildingIcon } from '@/components/icons/enterprise-building-icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Navigation } from '@/components/navigation';
import { useUser } from '@/components/user-provider';

export function PremiumPageClient() {
  const router = useRouter();
  const { user } = useUser();

  // Active Audience Tab: 'individuals' | 'enterprise'
  const [activeTab, setActiveTab] = useState<'individuals' | 'enterprise'>('individuals');

  // Billing Cycle for Individuals: 'monthly' | 'yearly'
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Enterprise Interactive Configurator State
  const [selectedModules, setSelectedModules] = useState<{
    sourcing: boolean;
    sponsoredJobs: boolean;
    multiSeat: boolean;
    branding: boolean;
  }>({
    sourcing: true,
    sponsoredJobs: true,
    multiSeat: false,
    branding: false,
  });

  const [enterpriseSlots, setEnterpriseSlots] = useState<'1-5' | '5-20' | '20+'>('1-5');

  // Enterprise Contact Modal State
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [isSubmittingEnterprise, setIsSubmittingEnterprise] = useState(false);
  const [enterpriseFormData, setEnterpriseFormData] = useState({
    companyName: user?.company?.name || '',
    workEmail: user?.email || '',
    contactName: user?.full_name || '',
    phone: '',
    notes: '',
  });

  // Individual Plan Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<'pro' | 'elite' | null>(null);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const toggleModule = (key: keyof typeof selectedModules) => {
    setSelectedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleOpenUpgradeModal = (plan: 'pro' | 'elite') => {
    setSelectedPlanForUpgrade(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlanForUpgrade) return;
    setIsSubmittingUpgrade(true);

    try {
      const planName = selectedPlanForUpgrade === 'pro' ? 'Pro / Career Plus' : 'Elite / Mentor Access';
      const cycleText = billingCycle === 'yearly' ? 'Annual Plan' : 'Monthly Plan';
      const priceText =
        selectedPlanForUpgrade === 'pro'
          ? billingCycle === 'yearly'
            ? '₹3,999/yr'
            : '₹499/mo'
          : billingCycle === 'yearly'
            ? '₹7,999/yr'
            : '₹999/mo';

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user?.full_name || 'Member',
          email: user?.email || 'user@vouchins.com',
          type: 'Premium Plan Upgrade',
          message: `User requested upgrade to ${planName} (${cycleText} - ${priceText}). User ID: ${user?.id || 'guest'}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to record upgrade request');
      }

      toast.success(`Your request for ${planName} has been received! Our membership team will activate your access.`);
      setIsUpgradeModalOpen(false);
    } catch {
      toast.error('Could not complete request. Please try again or contact support.');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseFormData.companyName.trim() || !enterpriseFormData.workEmail.trim()) {
      toast.error('Please provide your company name and corporate email.');
      return;
    }

    setIsSubmittingEnterprise(true);
    try {
      const modulesList = Object.entries(selectedModules)
        .filter(([, val]) => val)
        .map(([key]) => key)
        .join(', ');

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enterpriseFormData.contactName || enterpriseFormData.companyName,
          email: enterpriseFormData.workEmail,
          type: 'Enterprise Inquiry',
          message: `Enterprise Plan Quote Request:
Company: ${enterpriseFormData.companyName}
Hiring Volume: ${enterpriseSlots} roles
Selected Modules: ${modulesList || 'None'}
Phone: ${enterpriseFormData.phone || 'Not provided'}
Requirements: ${enterpriseFormData.notes || 'None provided'}`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit enterprise quote request');
      }

      toast.success('Enterprise quote request submitted! Our corporate partnership team will contact you within 24 hours.');
      setIsEnterpriseModalOpen(false);
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmittingEnterprise(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 font-sans selection:bg-[#0A1B5C]/20 selection:text-[#0A1B5C] flex flex-col">
      {/* 1. Intelligent Global Navbar (Authenticated for logged-in users, clean HomepageNavbar for visitors) */}
      <Navigation />

      <main className="flex-1 pb-24 pt-8 sm:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Breadcrumb / Back Link */}
          {/* <div className="flex items-center justify-between">
            <Link
              href={user ? '/feed' : '/'}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#0A1B5C] transition-colors"
            >
              <span>←</span>
              <span>{user ? 'Back to network feed' : 'Back to home'}</span>
            </Link>

            {user && (
              <span className="text-xs font-semibold text-neutral-400">
                Logged in as <strong className="text-neutral-800">{user.email}</strong>
              </span>
            )}
          </div> */}

          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            {/* <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A1B5C]/5 border border-[#0A1B5C]/15 text-[#0A1B5C] text-xs font-bold shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#0A1B5C]" />
              <span>Vouchins Membership & Enterprise Solutions</span>
            </div> */}

            {/* <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 tracking-tight leading-tight">
              Invest in your career. <br className="hidden sm:inline" />
              Scale your hiring with verified trust.
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 font-medium leading-relaxed">
              Transparent, high-value plans tailored for corporate professionals accelerating their careers,
              and fast-growing tech teams building verified engineering teams.
            </p> */}

            {/* Apple-Style Segmented Tab Switcher */}
            <div className="pt-4 flex justify-center">
              <div className="bg-neutral-200/70 p-1 rounded-2xl flex items-center shadow-xs border border-neutral-300/60 max-w-md w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('individuals')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'individuals'
                    ? 'bg-white text-[#0A1B5C] shadow-xs scale-[1.01]'
                    : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                  <Users className="h-4 w-4" />
                  <span>For Individuals</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('enterprise')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'enterprise'
                    ? 'bg-white text-[#0A1B5C] shadow-xs scale-[1.01]'
                    : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                >
                  <EnterpriseBuildingIcon className="h-4 w-4" />
                  <span>For Enterprise</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: FOR INDIVIDUALS (Corporate Professionals & Job Seekers) */}
          {/* ================================================================= */}
          {activeTab === 'individuals' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`text-xs sm:text-sm font-bold cursor-pointer transition-colors ${billingCycle === 'monthly' ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly billing
                </span>

                <button
                  type="button"
                  onClick={() => setBillingCycle((prev) => (prev === 'monthly' ? 'yearly' : 'monthly'))}
                  className="w-12 h-6 rounded-full bg-neutral-200 p-0.5 transition-colors focus:outline-none relative"
                  aria-label="Toggle billing cycle"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-[#0A1B5C] shadow-xs transition-transform transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                  />
                </button>

                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setBillingCycle('yearly')}
                >
                  <span
                    className={`text-xs sm:text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-neutral-900' : 'text-neutral-400'
                      }`}
                  >
                    Annual billing
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0A1B5C] text-white">
                    Save 33%
                  </span>
                </div>
              </div>

              {/* 3-Tier Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
                {/* 1. Community Tier (Free) */}
                <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
                  <div className="space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-extrabold uppercase tracking-wider mb-3">
                        <Users className="h-3 w-3" />
                        Community Tier
                      </div>
                      <h3 className="text-xl font-black text-neutral-900">Free</h3>
                      <p className="text-xs text-neutral-500 font-medium mt-1">
                        For casual users and verified network members.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-neutral-900">₹0</span>
                        <span className="text-xs text-neutral-500 font-bold">/ forever</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Free access with your corporate email verification.
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-neutral-100">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                        What's Included:
                      </p>
                      <ul className="space-y-2.5 text-xs text-neutral-700 font-medium">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Corporate email verification (`@company.com`)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Full access to corporate-verified network feed</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Peer recommendations & verified vouch points</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Basic marketplace posting (flatmates, used items, local networking)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Standard community discussions & company channels</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>1 Free AI resume evaluation credit</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-11 rounded-xl border-neutral-300 text-neutral-800 font-bold hover:bg-neutral-50"
                    >
                      <Link href={user ? '/feed' : '/signup'}>
                        {user ? 'Current Active Plan' : 'Get Started Free'}
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* 2. Pro / Career Plus (Featured / Most Popular) */}
                <div className="bg-white rounded-3xl border-2 border-[#0A1B5C] p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden ring-4 ring-[#0A1B5C]/5">
                  {/* Popular Highlight Badge */}
                  <div className="absolute top-0 right-0 bg-[#0A1B5C] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-xs flex items-center gap-1">
                    {/* <Sparkles className="h-3 w-3" /> */}
                    <span>Most Popular</span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1B5C]/10 text-[#0A1B5C] text-[11px] font-extrabold uppercase tracking-wider mb-3">
                        <Flame className="h-3 w-3 text-[#0A1B5C]" />
                        Career Acceleration
                      </div>
                      <h3 className="text-xl font-black text-neutral-900">Pro / Career Plus</h3>
                      <p className="text-xs text-neutral-500 font-medium mt-1">
                        For active job seekers wanting automated, intelligent career tools.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-[#0A1B5C]">
                          {billingCycle === 'yearly' ? '₹333' : '₹499'}
                        </span>
                        <span className="text-xs text-neutral-500 font-bold">/ month</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                        {billingCycle === 'yearly'
                          ? 'Billed as ₹3,999 / year - approx. ₹333/mo (Save 33%)'
                          : 'Billed monthly at ₹499. Cancel anytime.'}
                      </p>

                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10.5px] text-emerald-800 font-semibold leading-tight">
                        💡 Far cheaper than LinkedIn Premium or bootcamps, priced similarly to your everyday productivity subscriptions.
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-neutral-100">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                        Everything in Free, plus:
                      </p>
                      <ul className="space-y-2.5 text-xs text-neutral-800 font-semibold">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span><strong>Unlimited AI Resume Studio</strong> & live ATS optimization</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span><strong>Vector-based job matching</strong> against verified company openings</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span>Full access to <strong>technical mock test suites</strong> & curated learning repositories</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span><strong>Priority request queue</strong> for verified insider employee referrals</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span>Google XYZ impact metric rewrites benchmarked against Tier-1 bars</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0A1B5C] shrink-0 mt-0.5" />
                          <span>Export pixel-perfect ATS-compliant vector PDF resumes</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button
                      onClick={() => handleOpenUpgradeModal('pro')}
                      className="w-full h-11 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-black shadow-md shadow-[#0A1B5C]/20 transition-all active:scale-98 flex items-center justify-center gap-2"
                    >
                      <span>Upgrade to Career Plus</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 3. Elite / Mentor Access */}
                <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
                  <div className="space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold uppercase tracking-wider mb-3 border border-amber-200/60">
                        <Award className="h-3 w-3 text-amber-600" />
                        Human Mentorship
                      </div>
                      <h3 className="text-xl font-black text-neutral-900">Elite / Mentor Access</h3>
                      <p className="text-xs text-neutral-500 font-medium mt-1">
                        For power users & job switchers wanting direct, high-touch human coaching.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-neutral-900">
                          {billingCycle === 'yearly' ? '₹666' : '₹999'}
                        </span>
                        <span className="text-xs text-neutral-500 font-bold">/ month</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                        {billingCycle === 'yearly'
                          ? 'Billed as ₹7,999 / year (Save 33%)'
                          : 'Billed monthly at ₹999. Cancel anytime.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-neutral-100">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                        Everything in Pro, plus:
                      </p>
                      <ul className="space-y-2.5 text-xs text-neutral-700 font-medium">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>2 free 1:1 live mock interview credits</strong> per month with verified tech insiders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>3 free marketplace listing boosts</strong> per month (for urgent flat hunting or item sales)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>Verified Elite badge</strong> & priority placement in network search results</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Direct mentor advisory queue for salary negotiation & offer evaluations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>Concierge recruiter introduction for senior roles</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button
                      onClick={() => handleOpenUpgradeModal('elite')}
                      className="w-full h-11 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-bold shadow-xs transition-all active:scale-98"
                    >
                      Get Elite Access
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: FOR ENTERPRISE (Companies & Hiring Teams) */}
          {/* ================================================================= */}
          {activeTab === 'enterprise' && (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* Enterprise Hero Card */}
              <div className="bg-gradient-to-br from-[#0A1B5C] via-[#0E2476] to-[#122b8f] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-3xl space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/10">
                    <EnterpriseBuildingIcon className="h-3.5 w-3.5" />
                    <span>Customizable Enterprise Hiring Infrastructure</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                    Hire corporate-verified talent with precision. <br />
                    No recruiter spam. No fake resumes.
                  </h2>

                  <p className="text-sm sm:text-base text-neutral-200 font-medium leading-relaxed">
                    Designed for startups, tech organizations, and hiring teams. Rather than rigid self-serve paywalls,
                    configure a bespoke package aligned directly with your quarterly hiring velocity.
                  </p>
                </div>
              </div>

              {/* "Why Custom Works for Enterprise in India" Context Banner */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A1B5C] flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5" /> Why Custom Works for Enterprise in India
                  </span>
                  <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                    Indian founders and HR leaders prefer tailored quotes over inflexible SaaS subscriptions.
                    Whether you need 2 critical senior engineering slots or company-wide verified database sourcing,
                    we build a transparent engagement model that scales with your roadmap.
                  </p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-5 py-3 shrink-0 text-center md:text-right">
                  <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                    Starting Package
                  </span>
                  <span className="text-lg font-black text-[#0A1B5C]">
                    ₹15,000 - ₹35,000
                  </span>
                  <span className="text-xs text-neutral-500 font-semibold block">/ quarter for startups</span>
                </div>
              </div>

              {/* Interactive Modular Configurator ("Build Your Plan") */}
              <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-10 shadow-xs space-y-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-[#0A1B5C]" />
                    <span>Build Your Plan: Select Your Enterprise Modules</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 font-medium mt-1">
                    Select the capabilities required for your current hiring velocity. We will prepare an itemized quote within 24 hours.
                  </p>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Module 1: Direct Talent Sourcing */}
                  <div
                    onClick={() => toggleModule('sourcing')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${selectedModules.sourcing
                      ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedModules.sourcing ? 'bg-[#0A1B5C] text-white' : 'border border-neutral-300 bg-white'
                        }`}
                    >
                      {selectedModules.sourcing && <Check className="h-4 w-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">Direct Talent Sourcing</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          Sourcing Credits
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                        Filter and search candidate pools strictly by corporate-verified email domains (`@google.com`, `@meta.com`, etc.) and verified tech stacks. Pay-per-unlock or bulk search access.
                      </p>
                    </div>
                  </div>

                  {/* Module 2: Sponsored Job Slots */}
                  <div
                    onClick={() => toggleModule('sponsoredJobs')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${selectedModules.sponsoredJobs
                      ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedModules.sponsoredJobs ? 'bg-[#0A1B5C] text-white' : 'border border-neutral-300 bg-white'
                        }`}
                    >
                      {selectedModules.sponsoredJobs && <Check className="h-4 w-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">Sponsored Job Slots</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          Top-of-Feed
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                        Top-of-feed featured placements for urgent engineering or product roles. Guaranteed prime visibility in daily community digest emails and matched candidate dashboards.
                      </p>
                    </div>
                  </div>

                  {/* Module 3: Multi-Seat Recruiter Access & ATS Integrations */}
                  <div
                    onClick={() => toggleModule('multiSeat')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${selectedModules.multiSeat
                      ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedModules.multiSeat ? 'bg-[#0A1B5C] text-white' : 'border border-neutral-300 bg-white'
                        }`}
                    >
                      {selectedModules.multiSeat && <Check className="h-4 w-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">Recruiter Seats & ATS Integrations</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          Team Collaboration
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                        Multi-seat team access with candidate pipeline management, shared applicant notes, and automated export syncing to Greenhouse, Lever, Ashby, and internal HRIS.
                      </p>
                    </div>
                  </div>

                  {/* Module 4: Employer Branding */}
                  <div
                    onClick={() => toggleModule('branding')}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${selectedModules.branding
                      ? 'border-[#0A1B5C] bg-[#0A1B5C]/5 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${selectedModules.branding ? 'bg-[#0A1B5C] text-white' : 'border border-neutral-300 bg-white'
                        }`}
                    >
                      {selectedModules.branding && <Check className="h-4 w-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900">Employer Branding</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">
                          Targeted Reach
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                        Highlight your company culture, engineering achievements, and leadership team directly inside targeted corporate cohorts (e.g. Hyderabad / Bengaluru tech hubs).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hiring Volume Selector */}
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 block">
                    Quarterly Hiring Velocity:
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: '1-5', label: '1 - 5 Openings (Early-Stage)' },
                      { id: '5-20', label: '5 - 20 Openings (Growth Stage)' },
                      { id: '20+', label: '20+ Openings (Enterprise Scale)' },
                    ].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setEnterpriseSlots(slot.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${enterpriseSlots === slot.id
                          ? 'bg-[#0A1B5C] text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary & Call to Action */}
                <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">
                      Ready to configure your bespoke hiring agreement?
                    </span>
                    <span className="text-xs text-neutral-500">
                      We respond with custom quotes and candidate previews within 24 hours.
                    </span>
                  </div>

                  <Button
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="h-11 px-6 rounded-xl bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-bold shadow-md shadow-[#0A1B5C]/20 transition-all active:scale-98 flex items-center gap-2 shrink-0"
                  >
                    <span>Contact Sales / Build Your Plan</span>
                    <ArrowRight className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* FAQ Section */}
          {/* ================================================================= */}
          <div className="bg-white rounded-3xl border border-neutral-200/90 p-8 sm:p-12 shadow-xs space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0A1B5C]">
                Questions & Answers
              </span>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight">
                Frequently Asked Questions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <h4 className="text-sm font-bold text-neutral-900">
                  How does corporate email verification work?
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  We confirm your active access to a supported company email domain via an encrypted one-time passcode. Personal emails are never published, preserving your confidentiality.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <h4 className="text-sm font-bold text-neutral-900">
                  Can I switch between monthly and annual billing?
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  Yes, you can switch or cancel your subscription at any time. When switching to annual billing, your 33% discount is applied immediately.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <h4 className="text-sm font-bold text-neutral-900">
                  What happens to my AI Resume Studio access if my plan expires?
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  Your generated versions and exported PDF resumes remain accessible in your account. Active AI re-evaluations and new ATS scans require an active Career Plus or Elite plan.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <h4 className="text-sm font-bold text-neutral-900">
                  How are 1:1 live mock interviews scheduled in the Elite tier?
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  Elite members receive 2 interview credits each month. You can select your target company and domain (Coding, System Design, or Behavioral) to book directly with verified insiders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ================================================================= */}
      {/* Individual Plan Upgrade Confirmation Modal */}
      {/* ================================================================= */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          <div className="bg-[#0A1B5C] px-6 py-6 text-white relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Confirm Membership Upgrade</span>
            </div>

            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              {selectedPlanForUpgrade === 'pro' ? 'Pro / Career Plus' : 'Elite / Mentor Access'}
            </DialogTitle>

            <DialogDescription className="text-neutral-200 text-xs mt-1">
              {selectedPlanForUpgrade === 'pro'
                ? billingCycle === 'yearly'
                  ? '₹3,999 / year - approx. ₹333/month (Save 33%)'
                  : '₹499 / month'
                : billingCycle === 'yearly'
                  ? '₹7,999 / year - approx. ₹666/month (Save 33%)'
                  : '₹999 / month'}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Selected Benefits:
              </span>
              <ul className="space-y-2 text-xs text-neutral-700 font-medium">
                {selectedPlanForUpgrade === 'pro' ? (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Unlimited AI Resume Studio & ATS optimization</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Vector-based candidate matching against verified openings</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Priority request queue for employee referrals</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Everything in Career Plus included</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>2 free 1:1 live mock interview credits per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>3 free marketplace listing boosts per month</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
              Account: <strong className="text-neutral-900">{user?.email || 'Current Candidate'}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmUpgrade}
                disabled={isSubmittingUpgrade}
                className="bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-bold px-5 rounded-xl shadow-xs"
              >
                {isSubmittingUpgrade ? 'Processing...' : 'Confirm & Activate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Enterprise Inquiry Modal */}
      {/* ================================================================= */}
      <Dialog open={isEnterpriseModalOpen} onOpenChange={setIsEnterpriseModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-neutral-200 bg-white">
          <div className="bg-[#0A1B5C] px-6 py-6 text-white relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-2">
              <EnterpriseBuildingIcon className="h-3.5 w-3.5" />
              <span>Enterprise Custom Quote</span>
            </div>

            <DialogTitle className="text-2xl font-bold tracking-tight text-white">
              Request Your Custom Hiring Package
            </DialogTitle>

            <DialogDescription className="text-neutral-200 text-xs mt-1">
              Provide your organization details. Our corporate team will prepare candidate previews and itemized terms.
            </DialogDescription>
          </div>

          <form onSubmit={handleEnterpriseSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={enterpriseFormData.companyName}
                  onChange={(e) => setEnterpriseFormData({ ...enterpriseFormData, companyName: e.target.value })}
                  placeholder="e.g. Acme Tech"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Corporate Work Email *</label>
                <input
                  type="email"
                  required
                  value={enterpriseFormData.workEmail}
                  onChange={(e) => setEnterpriseFormData({ ...enterpriseFormData, workEmail: e.target.value })}
                  placeholder="hr@acme.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={enterpriseFormData.contactName}
                  onChange={(e) => setEnterpriseFormData({ ...enterpriseFormData, contactName: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={enterpriseFormData.phone}
                  onChange={(e) => setEnterpriseFormData({ ...enterpriseFormData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">Hiring Needs & Specific Roles</label>
              <textarea
                rows={3}
                value={enterpriseFormData.notes}
                onChange={(e) => setEnterpriseFormData({ ...enterpriseFormData, notes: e.target.value })}
                placeholder="Tell us about the roles you are hiring for (e.g. Senior Backend Go/Kafka, Staff React)..."
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0A1B5C]"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600">
              Selected Modules: <strong className="text-neutral-900">
                {Object.entries(selectedModules).filter(([, v]) => v).map(([k]) => k).join(', ') || 'Standard package'}
              </strong> ({enterpriseSlots} openings)
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEnterpriseModalOpen(false)}
                className="text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEnterprise}
                className="bg-[#0A1B5C] hover:bg-[#0c2277] text-white font-bold px-6 rounded-xl shadow-xs"
              >
                {isSubmittingEnterprise ? 'Submitting...' : 'Submit Quote Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

