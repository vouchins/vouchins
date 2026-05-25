"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HomepageNavbar } from "@/components/homepage-navbar";
import { Footer } from "@/components/footer";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Mail,
  Users,
  MessageSquare,
  Lock,
  Plus,
  Minus,
  Briefcase,
  ShoppingCart,
  Home as HomeIcon,
  Star
} from "lucide-react";

export default function HowItWorks() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = [
    {
      number: "01",
      title: "Verify Your Identity",
      description: "Verify your profile securely using your corporate/professional email address. We verify your employer instantly without storing your password or credentials.",
      icon: Mail,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100"
    },
    {
      number: "02",
      title: "Join Your Circles",
      description: "Get automatically added to your private company circle and relevant industry channels. Connect with colleagues and trusted tech professionals.",
      icon: Users,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100"
    },
    {
      number: "03",
      title: "Transact & Collaborate",
      description: "Discover verified job referrals, buy & sell items safely, find flatmates you can trust, and share authentic recommendations in a spam-free network.",
      icon: MessageSquare,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100"
    }
  ];

  const coreBenefits = [
    {
      title: "100% Employer Verified",
      description: "Every member is verified through their professional domain, eliminating fake accounts and bots entirely.",
      icon: Shield
    },
    {
      title: "Privacy First",
      description: "We never sell your data, expose your work email, or disclose private company discussions to the public.",
      icon: Lock
    },
    {
      title: "Accountable Network",
      description: "By connecting real professional identities, we maintain a constructive, respectful, and safe community.",
      icon: CheckCircle2
    }
  ];

  const useCases = [
    {
      title: "Jobs & Referrals",
      description: "Request or share warm job referrals directly with verified employees at your target companies.",
      icon: Briefcase,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Buy & Sell Safely",
      description: "Buy/sell laptops, phones, or furniture to other verified professionals with safe in-person exchanges.",
      icon: ShoppingCart,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      title: "Find Trusted Flatmates",
      description: "Rent rooms or find co-living spaces with verified peers from top corporate organizations.",
      icon: HomeIcon,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Authentic Vouching",
      description: "Share recommendations for service providers, restaurants, or tech stacks backed by real profiles.",
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  const faqs = [
    {
      question: "How do you verify my account?",
      answer: "We verify users through their professional/corporate email domains. A verification code is sent to your work email. Once verified, your account is authenticated with that employer, and your work email remains private and hidden from other users."
    },
    {
      question: "Do you share my work email or details with my employer?",
      answer: "No. Vouchins is an independent platform. We do not share your account activity, posts, or messages with your employer, and your work email is never displayed on your public profile."
    },
    {
      question: "Can I use Vouchins if my company isn't supported yet?",
      answer: "Yes, you can register with any professional email domain. If your company circle doesn't exist yet, we will automatically set it up once your email is successfully verified."
    },
    {
      question: "Is there any cost to join Vouchins?",
      answer: "Vouchins is currently completely free for early tech professionals. Our goal is to foster a high-trust community built for careers, housing, and safe transactions."
    },
    {
      question: "How do you prevent spam and fake profiles?",
      answer: "By requiring active professional email verification and prohibiting generic public domains (like gmail.com or yahoo.com) for onboarding, we completely eliminate fake accounts, bots, and anonymous trolls."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans antialiased overflow-x-hidden">
      <HomepageNavbar />

      <main className="pt-28 pb-16">
        {/* ==================================================
            HERO SECTION
            ================================================== */}
        <section className="py-20 bg-slate-50/70 border-b border-neutral-100">
          <div className="container mx-auto px-6 max-w-4xl text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-bold uppercase tracking-wider">
              How Vouchins Works
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#020617] tracking-tight leading-tight">
              Building a <span className="bg-gradient-to-r from-[#0A1B5C] to-[#4FD1C5] bg-clip-text text-transparent font-black">verified</span> network
            </h1>
            <p className="text-neutral-500 max-w-2xl mx-auto leading-relaxed font-light text-base md:text-lg">
              Vouchins replaces noisy, anonymous forums with a high-trust professional ecosystem where every member has been verified through their work domain.
            </p>
          </div>
        </section>

        {/* ==================================================
            3-STEP PROCESS
            ================================================== */}
        <section className="py-20 border-b border-neutral-100">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-3xl font-extrabold text-center text-[#020617] mb-16">
              Three Steps to Trust
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step, idx) => (
                <div key={idx} className="relative bg-white border border-neutral-100 p-8 rounded-2xl shadow-sm flex flex-col space-y-6 hover:shadow-md transition-shadow">
                  <div className="absolute top-4 right-6 text-4xl font-black text-neutral-100 select-none">
                    {step.number}
                  </div>
                  <div className={`h-12 w-12 rounded-full ${step.iconBg} ${step.iconColor} flex items-center justify-center shrink-0 shadow-inner`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-[#0F172A]">{step.title}</h3>
                    <p className="text-neutral-500 text-sm font-light leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            WHY VOUCHINS LAYS THE FOUNDATION
            ================================================== */}
        <section className="py-20 bg-slate-50/40 border-b border-neutral-100">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* Left Column */}
              <div className="lg:col-span-5 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#0A1B5C]/5 text-[#0A1B5C] text-xs font-bold uppercase tracking-wider">
                  Core Foundations
                </div>
                <h2 className="text-3xl font-extrabold text-[#020617] tracking-tight leading-tight">
                  Why Vouchins<br />is different.
                </h2>
                <p className="text-neutral-500 leading-relaxed font-light text-sm md:text-base">
                  By anchoring digital profiles to corporate email domains, we build a level of professional safety and accountability that public social networks cannot achieve.
                </p>
              </div>

              {/* Right Column - Benefits list */}
              <div className="lg:col-span-7 space-y-6">
                {coreBenefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-4 p-5 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-[#0A1B5C]/5 text-[#0A1B5C] flex items-center justify-center shrink-0">
                      <benefit.icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <h4 className="text-sm font-bold text-[#0F172A]">{benefit.title}</h4>
                      <p className="text-neutral-500 text-xs font-light leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================
            USE CASES / CAPABILITIES
            ================================================== */}
        <section className="py-20 border-b border-neutral-100">
          <div className="container mx-auto px-6 max-w-5xl text-center space-y-16">
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold text-[#020617]">
                What You Can Accomplish
              </h2>
              <p className="text-neutral-500 font-light max-w-xl mx-auto text-sm leading-relaxed">
                Connect and exchange resources within a community verified to support your professional life.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((uc, idx) => (
                <div key={idx} className="bg-white border border-neutral-200/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`h-12 w-12 rounded-full ${uc.bg} ${uc.color} flex items-center justify-center shrink-0`}>
                    <uc.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-[#0F172A]">{uc.title}</h3>
                    <p className="text-neutral-500 text-xs font-light leading-relaxed">
                      {uc.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            FAQ SECTION
            ================================================== */}
        <section className="py-20 bg-slate-50/20 border-b border-neutral-100" id="faq">
          <div className="container mx-auto px-6 max-w-3xl space-y-12">
            <h2 className="text-3xl font-extrabold text-center text-[#020617]">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border border-neutral-200 bg-white rounded-2xl overflow-hidden transition-all shadow-sm">
                    <button
                      className="w-full flex items-center justify-between p-5 text-left font-bold text-sm md:text-base text-[#0F172A] hover:bg-neutral-50/50 focus:outline-none"
                      onClick={() => toggleFaq(idx)}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <Minus className="h-4.5 w-4.5 text-neutral-400 shrink-0" />
                      ) : (
                        <Plus className="h-4.5 w-4.5 text-neutral-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 border-t border-neutral-100 text-xs md:text-sm text-neutral-500 font-light leading-relaxed text-left">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================================================
            FINAL CTA
            ================================================== */}
        <section className="pt-16">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <div className="bg-gradient-to-b from-[#0A1B5C] to-[#020617] rounded-3xl p-8 md:p-12 text-white shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-0 right-1/2 translate-x-1/2 w-[300px] h-[300px] bg-[#4FD1C5]/5 rounded-full blur-[100px]" />
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Ready to verify your professional network?
              </h2>
              <p className="text-neutral-300 font-light max-w-xl mx-auto text-sm leading-relaxed">
                Join thousands of tech and corporate professionals connecting securely on Vouchins.
              </p>
              <div className="pt-4">
                <Link href="/signup">
                  <Button className="bg-[#4FD1C5] hover:bg-[#4FD1C5]/90 text-[#020617] font-bold rounded-xl px-8 py-3.5 shadow-lg active:scale-95 border-none transition-all">
                    Verify & Join Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
