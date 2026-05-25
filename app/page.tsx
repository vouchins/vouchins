"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomepageNavbar } from "@/components/homepage-navbar";
import { Footer } from "@/components/footer";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Building2,
  Users,
  MapPin,
  MessageSquare,
  Sparkles,
  XCircle,
  ThumbsUp,
  Briefcase,
  Play,
  ArrowRightCircle,
  TrendingUp,
  ShoppingCart,
  Home as HomeIcon,
  Star,
  User,
  AlertTriangle,
  EyeOff,
  ShieldAlert,
  UserCheck,
  Handshake,
  ShieldCheck,
  Scale,
  X,
  Check
} from "lucide-react";

export default function Home() {
  // Mock live community activities matching screenshot
  const activities = [
    {
      avatar: "https://i.pravatar.cc/100?img=11",
      name: "Rahul Verma",
      action: "referred",
      target: "Ananya Iyer",
      subtext: "Fitness & Sports",
      icon: Briefcase,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10",
    },
    {
      avatar: "https://i.pravatar.cc/100?img=32",
      name: "Priya Mehta",
      action: "posted a flatmate",
      target: "requirement",
      subtext: "Flatmate match",
      icon: HomeIcon,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      avatar: "https://i.pravatar.cc/100?img=15",
      name: "Arjun Nair",
      action: "listed iPhone 15",
      target: "for sale",
      subtext: "Gadgets & Gear",
      icon: ShoppingCart,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      avatar: "https://i.pravatar.cc/100?img=26",
      name: "Neha Sharma",
      action: "shared a",
      target: "recommendation",
      subtext: "12m ago • Mumbai",
      icon: Star,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans antialiased overflow-x-hidden">
      <HomepageNavbar />

      <main>
        {/* ==================================================
            SECTION 1 — HERO (DARK NAVY THEME)
            ================================================== */}
        <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 flex items-center bg-[#020617] text-white overflow-hidden">
          {/* Ambient Lighting Glows */}
          <div className="absolute top-0 right-[-10%] w-[55%] h-[55%] bg-[#4FD1C5]/10 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute bottom-[10%] left-[-10%] w-[45%] h-[45%] bg-[#0A1B5C]/40 rounded-full blur-[150px] pointer-events-none" />

          {/* Tech Gridlines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

          <div className="container mx-auto px-6 max-w-6xl relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

              {/* Left Column */}
              <div className="lg:col-span-6 space-y-8 text-center lg:text-left flex flex-col items-center lg:items-start">

                {/* Highlighted Tagline Capsule Badge */}


                {/* Joined Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs md:text-sm font-semibold backdrop-blur-sm shadow-inner">
                  <div className="flex -space-x-2 mr-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full border-2 border-[#020617] bg-neutral-800 overflow-hidden"
                      >
                        <img
                          src={`https://i.pravatar.cc/100?img=${i + 32}`}
                          alt="avatar"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <span className="text-neutral-400 font-medium">
                    Joined by <span className="text-white font-bold">2,000+</span> tech pros this month
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-white">
                  Work life,<br />
                  <span className="bg-gradient-to-r from-[#4FD1C5] to-[#26c6da] bg-clip-text text-transparent font-black">
                    Verified.
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="text-base md:text-lg text-neutral-400 max-w-lg font-light leading-relaxed">
                  A verified professional network to <span className="text-white font-normal">transact</span>, <span className="text-white font-normal">grow careers</span>, <span className="text-white font-normal">share knowledge</span>, and build <span className="text-white font-normal">trusted connections</span> — without spam, fake profiles, or anonymous noise.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white font-bold text-sm uppercase tracking-wider px-8 py-6 rounded-2xl transition-all shadow-xl shadow-[#0A1B5C]/15 hover:-translate-y-0.5 border-none"
                    >
                      Join the Circle <Shield className="ml-2 h-4.5 w-4.5 text-[#4FD1C5]" />
                    </Button>
                  </Link>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white font-bold text-sm uppercase tracking-wider px-8 py-6 rounded-2xl backdrop-blur-sm hover:border-white/20 transition-all hover:-translate-y-0.5 bg-transparent"
                  >
                    <a
                      href="https://www.youtube.com/shorts/OtzgRHFfBNo"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="mr-2 h-4 w-4 fill-white" /> Watch Demo
                    </a>
                  </Button>
                </div>

                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] text-xs font-semibold tracking-wide backdrop-blur-sm w-fit shadow-[0_0_15px_rgba(79,209,197,0.15)]">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4FD1C5] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4FD1C5]"></span>
                  </span>
                  World&apos;s first verified professional network
                </div>
              </div>

              {/* Right Column - Trust Graph & Floating Mockups */}
              <div className="lg:col-span-6 relative w-full h-[450px] flex items-center justify-center">

                {/* SVG connection structure */}
                <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="250" cy="250" r="200" stroke="#4FD1C5" strokeWidth="0.5" strokeDasharray="4 8" className="opacity-15 animate-rotate-orbit-slow origin-center" />
                    <circle cx="250" cy="250" r="140" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-10 animate-rotate-orbit-fast origin-center" />
                    <circle cx="250" cy="250" r="80" stroke="#4FD1C5" strokeWidth="1" strokeDasharray="2 4" className="opacity-25" />

                    <circle cx="250" cy="250" r="24" fill="#FFFFFF" stroke="#4FD1C5" strokeWidth="1.5" className="drop-shadow-[0_0_20px_rgba(79,209,197,0.4)]" />
                    <image href="/favicon.png" x="238" y="238" height="24" width="24" />

                    <line x1="250" y1="250" x2="110" y2="150" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-20" />
                    <line x1="250" y1="250" x2="380" y2="130" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-20" />
                    <line x1="250" y1="250" x2="190" y2="390" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-20" />
                    <line x1="250" y1="250" x2="330" y2="360" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-20" />
                    <line x1="250" y1="250" x2="410" y2="290" stroke="#4FD1C5" strokeWidth="0.5" className="opacity-20" />
                  </svg>
                </div>

                {/* Floating Elements */}
                {/* Neha Sharma Profile */}
                <div className="absolute top-8 right-16 z-20 animate-float-slow bg-[#020617]/80 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden border border-[#4FD1C5] shrink-0">
                    <img src="https://i.pravatar.cc/100?img=26" alt="Neha Sharma" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white flex items-center gap-1">
                      Neha Sharma
                      <CheckCircle2 className="h-3 w-3 fill-[#4FD1C5] text-[#020617] stroke-2" />
                    </div>
                    <div className="text-[9px] text-neutral-400">Verified Professional</div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#4FD1C5] text-[#020617] rounded-full p-0.5 border border-[#020617] flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                </div>

                {/* Card 1: Microsoft */}
                <div className="absolute top-24 left-6 z-10 animate-float-medium bg-[#020617]/80 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center p-1 shrink-0">
                    <svg className="w-full h-full text-white" viewBox="0 0 23 23" fill="currentColor">
                      <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022" />
                      <rect x="12.5" y="0" width="10.5" height="10.5" fill="#7FBA00" />
                      <rect x="0" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Microsoft</div>
                    <div className="text-[9px] text-[#4FD1C5] flex items-center gap-0.5">
                      Employee Verified <span className="h-1.5 w-1.5 bg-[#4FD1C5] rounded-full inline-block"></span>
                    </div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#4FD1C5] text-[#020617] rounded-full p-0.5 border border-[#020617] flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                </div>

                {/* Card 2: Flatmate Match */}
                <div className="absolute top-[52%] left-16 z-10 animate-float-slow bg-[#020617]/80 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 flex items-center justify-center text-[#4FD1C5] shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Flatmate match</div>
                    <div className="text-[9px] text-[#4FD1C5] font-semibold">found nearby <span className="h-1.5 w-1.5 bg-[#4FD1C5] rounded-full inline-block"></span></div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#4FD1C5] text-[#020617] rounded-full p-0.5 border border-[#020617] flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                </div>

                {/* Card 3: Recommendation */}
                <div className="absolute bottom-[32%] right-6 z-10 animate-float-medium bg-[#020617]/80 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  <div className="flex -space-x-2 shrink-0">
                    <img src="https://i.pravatar.cc/100?img=20" alt="avatar" className="h-8 w-8 rounded-full border-2 border-[#020617] shrink-0 object-cover" />
                    <img src="https://i.pravatar.cc/100?img=21" alt="avatar" className="h-8 w-8 rounded-full border-2 border-[#020617] shrink-0 object-cover" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white flex items-center gap-1">
                      Recommendation
                    </div>
                    <div className="text-[9px] text-[#4FD1C5] font-semibold">shared <span className="h-1.5 w-1.5 bg-[#4FD1C5] rounded-full inline-block"></span></div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#4FD1C5] text-[#020617] rounded-full p-0.5 border border-[#020617] flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                </div>

                {/* Card 4: Referral */}
                <div className="absolute bottom-10 left-[35%] z-10 animate-float-slow bg-[#020617]/80 border border-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                    <img src="https://i.pravatar.cc/100?img=12" alt="avatar" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white">Referral</div>
                    <div className="text-[9px] text-[#4FD1C5] font-semibold">connection made <span className="h-1.5 w-1.5 bg-[#4FD1C5] rounded-full inline-block"></span></div>
                  </div>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#4FD1C5] text-[#020617] rounded-full p-0.5 border border-[#020617] flex items-center justify-center shadow-lg">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 2 — TRUSTED BY (MARQUEE)
            ================================================== */}
        <section className="py-14 bg-[#020617] border-y border-white/5 overflow-hidden relative">
          <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
              Trusted by professionals from
            </span>

            {/* Horizontal Marquee Scrolling */}
            <div className="flex-1 overflow-hidden relative flex items-center">
              <div className="flex animate-marquee space-x-12 select-none items-center">

                {/* Brand Logos */}
                {[
                  { name: "Microsoft", domain: "microsoft.com" },
                  { name: "Google", domain: "google.com" },
                  { name: "Amazon", domain: "amazon.com" },
                  { name: "TCS", domain: "www.tcs.com" },
                  { name: "Infosys", domain: "infosys.com" },
                  { name: "Deloitte", domain: "deloitte.com" }
                ].map((logo, index) => (
                  <div key={`logo-1-${index}`} className="flex items-center gap-2 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition duration-300">
                    <div className="h-7 w-7 rounded bg-white flex items-center justify-center p-1">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${logo.domain}&sz=64`}
                        alt={logo.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-base font-bold text-white tracking-tight">{logo.name}</span>
                  </div>
                ))}

                {/* Duplicated for Loop */}
                {[
                  { name: "Microsoft", domain: "microsoft.com" },
                  { name: "Google", domain: "google.com" },
                  { name: "Amazon", domain: "amazon.com" },
                  { name: "TCS", domain: "tcs.com" },
                  { name: "Infosys", domain: "infosys.com" },
                  { name: "Deloitte", domain: "deloitte.com" }
                ].map((logo, index) => (
                  <div key={`logo-2-${index}`} className="flex items-center gap-2 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 transition duration-300">
                    <div className="h-7 w-7 rounded bg-white flex items-center justify-center p-1">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${logo.domain}&sz=64`}
                        alt={logo.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-base font-bold text-white tracking-tight">{logo.name}</span>
                  </div>
                ))}

              </div>
            </div>

          </div>
        </section>

        {/* ==================================================
            SECTION 3 — WHY NOW (LIGHT BACKGROUND COMPARISON)
            ================================================== */}
        <section className="py-24 bg-gradient-to-b from-[#020617] via-[#09112E] to-slate-50 relative">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

              {/* Left Side */}
              <div className="lg:col-span-5 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  Why Now
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  AI is breaking<br />
                  digital <span className="bg-gradient-to-r from-[#4FD1C5] to-[#26c6da] bg-clip-text text-transparent font-black">trust.</span>
                </h2>

                <p className="text-neutral-300 leading-relaxed font-light text-sm md:text-base">
                  Fake profiles, AI-generated identities, and anonymous platforms are making it harder to trust anyone online.
                </p>
                <p className="text-neutral-300 leading-relaxed font-light text-sm md:text-base">
                  Vouchins brings verification, reputation, and accountability back to the internet.
                </p>
              </div>

              {/* Right Side - Comparison Grid */}
              <div className="lg:col-span-7 flex flex-col md:flex-row items-stretch justify-center gap-6 relative">

                {/* Problems Card */}
                <div className="w-full bg-[#FFF5F5] border border-red-100 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/20 space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="text-red-600 font-extrabold text-xs uppercase tracking-wider mb-4">
                      Problem today
                    </div>
                    <ul className="space-y-5">
                      {[
                        { name: "Fake Profiles", icon: User },
                        { name: "Scams & Fraud", icon: AlertTriangle },
                        { name: "Anonymous Listings", icon: EyeOff },
                        { name: "No Accountability", icon: ShieldAlert }
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-full bg-red-100/80 text-red-600 flex items-center justify-center shrink-0">
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span className="text-[13px] font-bold text-red-950">{item.name}</span>
                          </div>
                          <X className="h-4 w-4 text-red-500 font-bold" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="hidden md:flex shrink-0 h-10 w-10 items-center justify-center bg-white border border-neutral-200 shadow-lg rounded-full z-10 text-neutral-400 self-center">
                  <ArrowRight className="h-5 w-5" />
                </div>

                {/* Solutions Card */}
                <div className="w-full bg-[#F0FDF4] border border-emerald-100 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/20 space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="text-emerald-700 font-extrabold text-xs uppercase tracking-wider mb-4">
                      With Vouchins
                    </div>
                    <ul className="space-y-5">
                      {[
                        { name: "Verified People", icon: UserCheck },
                        { name: "Trusted Interactions", icon: Handshake },
                        { name: "Safe Transactions", icon: ShieldCheck },
                        { name: "Real Accountability", icon: Scale }
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-3">
                            <span className="h-8 w-8 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                              <item.icon className="h-4 w-4" />
                            </span>
                            <span className="text-[13px] font-bold text-emerald-950">{item.name}</span>
                          </div>
                          <Check className="h-4 w-4 text-emerald-600 font-bold" />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 4 — FEATURE BENTO GRID (LIGHT BG)
            ================================================== */}
        <section className="py-16 bg-[#F8FAF9] border-t border-neutral-200/50" id="how-it-works">
          <div className="container mx-auto px-6 max-w-6xl">

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">

              {/* Left Column - Header info */}
              <div className="xl:col-span-3 space-y-4 text-center xl:text-left flex flex-col items-center xl:items-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-bold uppercase tracking-wider">
                  What you can do
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#020617] leading-tight">
                  Everything you need.<br />
                  In a <span className="text-[#0A1B5C] font-black">verified</span> network.
                </h2>
              </div>

              {/* Right Column - Responsive grid instead of scroll */}
              <div className="xl:col-span-9 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* Card 1: Jobs & Referrals */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Jobs & Referrals</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Discover verified opportunities.
                    </p>
                  </div>
                </div>

                {/* Card 2: Buy & Sell Safely */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Buy & Sell Safely</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Transact with verified pros.
                    </p>
                  </div>
                </div>

                {/* Card 3: Find Flatmates You Can Trust */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <HomeIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Find Flatmates You Can Trust</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Find or join spaces with confidence.
                    </p>
                  </div>
                </div>

                {/* Card 4: Recommendations That Matter */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Recommendations That Matter</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Get trusted reviews from real people.
                    </p>
                  </div>
                </div>

                {/* Card 5: Real People, Real Profiles */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Real People, Real Profiles</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Connect with verified professionals.
                    </p>
                  </div>
                </div>

                {/* Card 6: Professional Messaging */}
                <div className="w-full bg-white border border-neutral-200/60 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center text-center space-y-3.5">
                  <div className="h-10 w-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs md:text-sm font-extrabold text-[#0F172A] leading-snug">Professional Messaging</h3>
                    <p className="text-[10.5px] md:text-xs text-neutral-500 font-light leading-relaxed">
                      Communicate securely.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 5 — LIVE IN THE COMMUNITY
            ================================================== */}
        <section className="py-24 bg-[#020617] text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4FD1C5]/5 rounded-full blur-[110px] pointer-events-none" />

          <div className="container mx-auto px-6 max-w-6xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">

            {/* Left Content */}
            <div className="space-y-4 text-center md:text-left max-w-sm shrink-0 flex flex-col items-center md:items-start mx-auto md:mx-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 text-[#4FD1C5] text-xs font-bold uppercase tracking-wider">
                Live in the community
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Real people.<br />
                Real interactions.
              </h2>
            </div>

            {/* Carousel horizontal scrolling activities */}
            <div className="flex-1 w-full flex items-center gap-6 overflow-hidden">
              <div className="flex gap-4 animate-marquee select-none hover:[animation-play-state:paused] cursor-pointer">

                {activities.map((act, index) => (
                  <div key={`live-card-1-${index}`} className="bg-[#0b132b]/80 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shrink-0 w-[300px] hover:border-white/20 transition-all hover:bg-[#0b132b]/95">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-[#4FD1C5]/20 shrink-0">
                      <img src={act.avatar} alt={act.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="text-left space-y-1">
                      <div className="text-[13px] font-semibold text-white leading-snug">
                        {act.name} <span className="font-normal text-neutral-400">{act.action}</span> <span className="font-semibold text-white">{act.target}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span className={`inline-flex items-center justify-center p-1 rounded-md ${act.iconBg} ${act.iconColor}`}>
                          <act.icon className="h-3.5 w-3.5" />
                        </span>
                        <span>{act.subtext}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Duplicated for smooth loop */}
                {activities.map((act, index) => (
                  <div key={`live-card-2-${index}`} className="bg-[#0b132b]/80 border border-white/10 p-5 rounded-2xl flex items-center gap-4 shrink-0 w-[300px] hover:border-white/20 transition-all hover:bg-[#0b132b]/95">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-[#4FD1C5]/20 shrink-0">
                      <img src={act.avatar} alt={act.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="text-left space-y-1">
                      <div className="text-[13px] font-semibold text-white leading-snug">
                        {act.name} <span className="font-normal text-neutral-400">{act.action}</span> <span className="font-semibold text-white">{act.target}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span className={`inline-flex items-center justify-center p-1 rounded-md ${act.iconBg} ${act.iconColor}`}>
                          <act.icon className="h-3.5 w-3.5" />
                        </span>
                        <span>{act.subtext}</span>
                      </div>
                    </div>
                  </div>
                ))}

              </div>

              {/* Inline navigation next arrow matching mockup */}
              <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 rounded-full hover:bg-white/5 transition cursor-pointer text-white">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>

          </div>
        </section>

        {/* ==================================================
            SECTION 6 — STATS
            ================================================== */}
        {/* <section className="py-20 bg-slate-50/90 border-y border-neutral-200/40 text-center">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

              <div className="space-y-2 md:border-r border-neutral-200/80 last:border-r-0 py-2">
                <div className="text-4xl md:text-5xl font-black text-[#0A1B5C] tracking-tight">170+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Verified early users</div>
              </div>

              <div className="space-y-2 md:border-r border-neutral-200/80 last:border-r-0 py-2">
                <div className="text-4xl md:text-5xl font-black text-[#0A1B5C] tracking-tight">2,000+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Community interest validations</div>
              </div>

              <div className="space-y-2 md:border-r border-neutral-200/80 last:border-r-0 py-2">
                <div className="text-4xl md:text-5xl font-black text-[#0A1B5C] tracking-tight">100%</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Organic growth</div>
              </div>

              <div className="space-y-2 md:border-r border-neutral-200/80 last:border-r-0 py-2">
                <div className="text-4xl md:text-5xl font-black text-[#0A1B5C] tracking-tight">0</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Anonymous profiles Tolerated</div>
              </div>

            </div>
          </div>
        </section> */}

        {/* ==================================================
            SECTION 7 — FINAL CTA
            ================================================== */}
        <section className="py-28 bg-gradient-to-b from-[#0A1B5C] to-[#020617] text-white relative overflow-hidden border-b border-white/5">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-full -z-10 pointer-events-none">
            <div className="absolute top-0 right-1/2 translate-x-1/2 w-[350px] h-[350px] bg-[#4FD1C5]/5 rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto px-6 max-w-6xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">

            {/* Left Content info */}
            <div className="space-y-4 max-w-xl">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Join the <span className="text-[#4FD1C5]">verified</span><br />
                professional network.
              </h2>
              <p className="text-neutral-300 font-light text-sm md:text-base leading-relaxed">
                Be part of a trusted community built for careers, opportunities, and real connections.
              </p>
            </div>

            {/* Right button column */}
            <div className="space-y-4 shrink-0 flex flex-col items-center md:items-end">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider px-10 py-6.5 rounded-2xl transition-all shadow-xl shadow-blue-500/10 flex items-center gap-2 border-none"
                >
                  Get Early Access <ArrowRight className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <div className="flex justify-center md:justify-end w-full">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] text-xs font-semibold tracking-wide backdrop-blur-sm shadow-[0_0_15px_rgba(79,209,197,0.15)]">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4FD1C5] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4FD1C5]"></span>
                  </span>
                  World&apos;s first verified professional network
                </div>
              </div>
            </div>

            {/* Shield vector graphic decoration */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[300px] w-[300px] opacity-10 pointer-events-none hidden lg:block">
              <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke="#4FD1C5" strokeWidth="1.5">
                <path d="M50 15 L80 25 L80 55 C80 75, 65 85, 50 90 C35 85, 20 75, 20 55 L20 25 Z" />
                <image href="/favicon.png" x="38" y="40" height="24" width="24" />
              </svg>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
