"use client";

import { HomepageNavbar } from "@/components/homepage-navbar";
import { ShieldCheck, Users, Lock, ChevronRight, Fingerprint, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <HomepageNavbar />
      <div className="min-h-screen bg-neutral-50 selection:bg-[#4FD1C5]/30 flex flex-col">

        {/* ==================================================
            HERO SECTION
            ================================================== */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-full pointer-events-none opacity-40">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#4FD1C5]/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0A1B5C]/5 blur-[100px]" />
          </div>

          <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 text-[#0A1B5C] text-xs font-bold uppercase tracking-widest mb-8">
              The Vouchins Story
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-normal leading-tight text-neutral-900 font-[family-name:var(--font-playfair)] mb-6 max-w-4xl mx-auto">
              Identity is our <span className="text-[#0A1B5C]">infrastructure.</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto font-medium leading-relaxed">
              We are building the definitive private network where the world's most talented professionals connect, transact, and collaborate with total confidence.
            </p>
          </div>
        </section>

        {/* ==================================================
            THE ORIGIN STORY (SPLIT LAYOUT)
            ================================================== */}
        <section className="py-24 bg-[#0A1B5C] text-white relative">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left: Narrative */}
              <div className="space-y-8">
                <h2 className="text-3xl md:text-5xl font-extrabold leading-tight font-[family-name:var(--font-playfair)]">
                  Built to solve the <span className="text-[#4FD1C5]">trust deficit.</span>
                </h2>
                <div className="space-y-6 text-neutral-300 text-lg leading-relaxed font-light">
                  <p>
                    Vouchins was born out of profound frustration. As corporate professionals ourselves, we continuously faced the same challenges when navigating professional services, housing, and high-value transactions.
                  </p>
                  <p>
                    We were tired of anonymous marketplaces, intrusive brokers, and endless scams where trust is treated as a luxury rather than a baseline.
                  </p>
                  <p>
                    We realized the most powerful safety mechanism isn't a star rating - it's your professional reputation. We built Vouchins as an elite identity layer where your corporate credentials guarantee a secure, scam-free ecosystem.
                  </p>
                </div>
              </div>

              {/* Right: Abstract Graphic */}
              <div className="relative h-full min-h-[400px] w-full bg-white/5 rounded-[2rem] border border-white/10 p-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#4FD1C5]/10 to-transparent"></div>
                <div className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-sm">
                  {/* Glass cards */}
                  <div className="aspect-square rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 flex flex-col items-start justify-between shadow-2xl hover:scale-105 transition-transform duration-500">
                    <ShieldCheck className="h-8 w-8 text-[#4FD1C5]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Verified</span>
                  </div>
                  <div className="aspect-square rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 flex flex-col items-start justify-between translate-y-8 shadow-2xl hover:scale-105 transition-transform duration-500">
                    <Fingerprint className="h-8 w-8 text-white/70" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">Identity</span>
                  </div>
                  <div className="col-span-2 h-24 rounded-2xl bg-gradient-to-r from-[#4FD1C5] to-[#26c6da] p-6 flex items-center justify-between shadow-lg shadow-[#4FD1C5]/20 hover:scale-105 transition-transform duration-500">
                    <div className="font-bold text-[#0A1B5C] text-sm uppercase tracking-widest">Zero Scams</div>
                    <Lock className="h-6 w-6 text-[#0A1B5C]" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            VISION & MISSION
            ================================================== */}
        <section className="py-24 bg-white relative">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-[#4FD1C5] font-semibold uppercase tracking-wider text-xs">
                  <Network className="h-4 w-4" />
                  <span>Our Vision</span>
                </div>
                <h2 className="text-3xl font-extrabold text-neutral-900 font-[family-name:var(--font-playfair)]">
                  The Universal Identity Layer
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  To become the global standard for identity and authorization - not just for humans, but for the next generation of autonomous AI agents. We envision a future where trust is embedded directly into the infrastructure of the web.
                </p>
              </div>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 text-[#0A1B5C] font-semibold uppercase tracking-wider text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Our Mission</span>
                </div>
                <h2 className="text-3xl font-extrabold text-neutral-900 font-[family-name:var(--font-playfair)]">
                  Empowering Secure Transactions
                </h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  To build the foundational trust infrastructure that empowers professionals and AI agents to facilitate high-value transactions, collaborate seamlessly, and navigate the internet with total security and cryptographic accountability.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            THE PILLARS (BENTO GRID)
            ================================================== */}
        <section className="py-24 bg-neutral-50 relative">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-neutral-900 font-[family-name:var(--font-playfair)] mb-4">
                The Foundation
              </h2>
              <p className="text-neutral-500 font-medium max-w-xl mx-auto">
                Everything we build is anchored in three core principles designed to protect your time, privacy, and capital.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Pillar 1: Verification */}
              <div className="group rounded-[2rem] bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-2xl bg-[#0A1B5C]/5 text-[#0A1B5C] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Fingerprint className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Absolute Verification</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  Access is strictly limited to professionals with verified corporate credentials. We ensure a high-intent, high-accountability network where fake profiles cannot exist.
                </p>
              </div>

              {/* Pillar 2: Privacy */}
              <div className="group rounded-[2rem] bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 rounded-2xl bg-[#4FD1C5]/10 text-[#2C9A90] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-3">Total Privacy</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  You are always in control of your visibility. Transact anonymously, share exclusively with trusted peers, or open your requests to the wider verified community.
                </p>
              </div>

              {/* Pillar 3: Accountability */}
              <div className="group rounded-[2rem] bg-[#0A1B5C] p-10 shadow-xl shadow-[#0A1B5C]/10 border border-[#0A1B5C] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4FD1C5]/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Peer Accountability</h3>
                  <p className="text-neutral-300 text-sm leading-relaxed">
                    By anchoring transactions to real professional identities, we permanently eliminate brokers, hidden fees, and fraudulent listings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            CTA FOOTER
            ================================================== */}
        <section className="py-24 bg-white border-t border-neutral-100 text-center">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 font-[family-name:var(--font-playfair)] mb-6">
              Ready to join the enclave?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-[#0A1B5C] hover:bg-[#0A1B5C]/90 text-white font-bold px-10 py-6 rounded-2xl shadow-lg shadow-[#0A1B5C]/15 transition-all hover:-translate-y-0.5">
                  Request Access <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
