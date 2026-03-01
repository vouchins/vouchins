"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  Building2,
  CheckCircle2,
  MapPin,
  Mail,
  Key,
  Unlock,
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  const companyDomains = [
    "deloitte.com",
    "oracle.com",
    "servicenow.com",
    "amazon.com",
    "google.com",
    "meta.com",
    "ey.com",
    "genpact.com",
    "amgen.com",
    "highradius.com",
    "salesforce.com",
    "microsoft.com",
    "uber.com",
    "jpmorgan.com",
    "goldmansachs.com",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e0e7ef]">
      <header className="fixed top-4 left-0 right-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 max-w-6xl">
          <nav className="bg-white/70 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] rounded-2xl px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Logo Section */}
              <div className="flex items-center">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                  <Image
                    src="/images/logo.png"
                    alt="Vouchins"
                    width={130}
                    height={36}
                    className="object-contain"
                    priority
                  />
                </Link>
              </div>

              {/* Navigation Links - Optional but adds "Modern" feel */}
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  href="#how-it-works"
                  className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
                >
                  How it works
                </Link>
                <Link
                  href="privacy"
                  className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="#community"
                  className="text-sm font-semibold text-neutral-600 hover:text-primary transition-colors"
                >
                  Communities
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-primary font-bold hover:bg-primary/5 rounded-xl px-5"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
                    Join Now
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-28 pb-16 md:pt-28 md:pb-32 flex items-center justify-center overflow-hidden">
          {/* Modern Background Decor */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[100px]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
          </div>

          <div className="container mx-auto px-4 max-w-5xl text-center relative z-10">
            {/* Floating Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2  border border-neutral-100 text-primary text-xs md:text-sm font-bold mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex -space-x-2 mr-1">
                <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm px-4 py-3 text-center">
                  ⚠️ Notice: Some users on certain Indian networks may
                  experience login issues due to temporary ISP restrictions
                  affecting our authentication provider. We are monitoring the
                  situation.
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-neutral-100 text-primary text-xs md:text-sm font-bold mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="flex -space-x-2 mr-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border-2 border-white bg-neutral-200 overflow-hidden"
                  >
                    <img
                      src={`https://i.pravatar.cc/100?img=${i + 10}`}
                      alt="user"
                    />
                  </div>
                ))}
              </div>
              <span className="text-neutral-500">
                Joined by 2,000+ tech pros this month
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl font-black text-primary mb-8 leading-[1.1] tracking-tighter italic-not-really">
              Work life, <br />
              <span className="relative">
                <span className="relative z-10 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  Verified.
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-accent/30 -z-10"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 25 0 50 5 T 100 5"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-neutral-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              The private marketplace for corporate professionals to
              <span className="text-primary font-bold">
                {" "}
                buy, sell, and settle{" "}
              </span>
              within a circle of trust. No anonymous noise—just verified
              colleagues.
            </p>

            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group w-full sm:w-auto text-lg px-12 py-7 rounded-2xl shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all bg-primary hover:-translate-y-1"
                >
                  Join the Circle
                  <Shield className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                </Button>
              </Link>

              <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/50 backdrop-blur-sm border border-neutral-200/60 shadow-sm">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">
                    Launching in
                  </span>
                  <span className="text-sm font-bold text-primary flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent" /> Hyderabad &
                    Bangalore
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Mockup Section */}
        <section className="py-16 bg-neutral-50/50">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl blur-2xl" />
                <div className="relative bg-white border border-neutral-200 rounded-2xl shadow-2xl p-6 md:p-8 transform -rotate-1 hover:rotate-0 transition-all duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                        ST
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          Shiv Taran{" "}
                          <CheckCircle2 className="h-4 w-4 fill-[#0095f6] text-white stroke-[3px] drop-shadow-sm" />
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Amazon • Hyderabad
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-secondary px-2 py-1 rounded text-primary/60">
                      Recommendation
                    </span>
                  </div>
                  <p className="text-neutral-800 text-lg mb-6 leading-relaxed font-medium">
                    "Looking for a verified CA who specializes in RSU/ESOP
                    taxation for tech employees in Hyderabad. Any leads?"
                  </p>
                  <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-6 w-6 rounded-full border-2 border-white bg-neutral-200"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-primary font-bold">
                      8 colleagues replied
                    </span>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-8">
                <h3 className="text-4xl font-bold text-primary leading-tight">
                  A marketplace built on{" "}
                  <span className="text-accent border-b-4 border-accent/20">
                    verified identity.
                  </span>
                </h3>
                <div className="space-y-6">
                  {[
                    {
                      title: "Hyper-Local Housing",
                      desc: "Find flatmates, rentals, or PGs in your specific city within a closed circle of verified professionals.",
                      icon: <MapPin className="h-6 w-6 text-accent" />,
                    },
                    {
                      title: "Secure Buy & Sell",
                      desc: "Trade electronics, furniture, or vehicles directly with colleagues. No lowballers, no strangers, no scams.",
                      icon: <Shield className="h-6 w-6 text-accent" />,
                    },
                    {
                      title: "Trusted Recommendations",
                      desc: "Get suggestions for services that meet corporate standards from people who actually use them.",
                      icon: <Users className="h-6 w-6 text-accent" />,
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-primary">
                          {item.title}
                        </h4>
                        <p className="text-neutral-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Step 2: Modernized Journey with Privacy focus */}
        <section
          className="py-32 bg-white relative overflow-hidden"
          id="how-it-works"
        >
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h3 className="text-4xl font-extrabold text-primary mb-6 tracking-tight">
                A walled garden for <br />
                <span className="text-accent">verified professionals</span>
              </h3>
              <p className="text-lg text-neutral-600 font-medium">
                We value your privacy. Our verification is a one-time "proof of
                work" that ensures Vouchins remains a safe, high-intent space.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-neutral-100 -z-10" />

              {[
                {
                  step: "01",
                  title: "One-Time Check",
                  desc: "Enter your work email. We use this strictly to confirm your company domain—never for marketing or tracking.",
                  icon: <Mail className="h-7 w-7" />,
                  color: "bg-primary",
                },
                {
                  step: "02",
                  title: "Verify & Forget",
                  desc: "Receive a secure code in your work inbox. Once entered, we hash your email for privacy and never contact it again.",
                  icon: <Key className="h-7 w-7" />,
                  color: "bg-primary/90",
                },
                {
                  step: "03",
                  title: "Personal Access",
                  desc: "Link your personal email for notifications and account recovery. Your activity on Vouchins stays completely private from your employer.",
                  icon: <Unlock className="h-7 w-7" />,
                  color: "bg-accent",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group relative bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                >
                  <div
                    className={`h-16 w-16 rounded-2xl ${item.color} text-white flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    {item.icon}
                  </div>
                  <div className="absolute top-8 right-8 text-4xl font-black text-neutral-50">
                    {item.step}
                  </div>
                  <h4 className="text-xl font-bold text-primary mb-3">
                    {item.title}
                  </h4>
                  <p className="text-neutral-500 leading-relaxed text-sm font-medium">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Security Assurance Bar - Enhanced for Trust */}
            <div className="mt-20 flex flex-wrap justify-center items-center gap-8 py-6 px-10 rounded-2xl bg-secondary border border-primary/5">
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                100% Employer Private
              </div>
              <div className="w-px h-4 bg-primary/10 hidden md:block" />
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                Zero Data Sharing
              </div>
              <div className="w-px h-4 bg-primary/10 hidden md:block" />
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                Personal Mail Logins
              </div>
              <div className="w-px h-4 bg-primary/10 hidden md:block" />
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                Bank-Grade Encryption
              </div>
            </div>
          </div>
        </section>
        {/* Social Proof: Favicon API Banner */}
        <section
          className="py-12 border-y border-neutral-200 bg-white/50 backdrop-blur-sm"
          id="community"
        >
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-10">
              Professionals from world-class companies are already on Vouchins
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80">
              {companyDomains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <div className="h-8 w-8 rounded-lg bg-white shadow-sm border border-neutral-100 flex items-center justify-center overflow-hidden p-1.5">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                      alt={domain}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-neutral-400 capitalize">
                    {domain.split(".")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-secondary to-white border-t border-neutral-200">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h3 className="text-4xl font-bold text-primary mb-6">
              Join your local community
            </h3>
            <p className="text-lg text-neutral-600 mb-10 font-medium">
              Vouchins is currently helping professionals to find trusted
              connections. Ready to join?
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="px-12 py-6 text-lg shadow-xl bg-primary hover:bg-primary/90"
              >
                Create your account
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
