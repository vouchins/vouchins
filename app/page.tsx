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
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Image
                  src="/images/logo.png"
                  alt="Vouchins"
                  width={140}
                  height={40}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" className="text-primary font-bold">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary hover:bg-primary/90">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 flex items-center justify-center overflow-hidden">
          <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff6600]/10 border border-[#ff6600]/20 text-[#ff6600] text-[10px] md:text-xs font-bold transition-all hover:bg-[#ff6600]/20">
              
              <div className="h-3.5 w-3.5 bg-[#ff6600] text-white flex items-center justify-center text-[9px] font-black rounded-sm leading-none shrink-0">
                Y
              </div>
              <span>Backed by Y Combinator</span>
            </div> */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-primary/10 text-primary text-xs font-bold mb-6">
              <CheckCircle2 className="h-3 w-3 text-accent" /> Exclusively for
              Verified Professionals
            </div>
            <h2 className="text-5xl md:text-7xl font-extrabold text-primary mb-8 leading-tight tracking-tight drop-shadow-xl">
              The{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                trusted
              </span>{" "}
              platform
              <br />
              for corporate communities
            </h2>
            <p className="text-xl md:text-2xl text-neutral-700 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Find housing, buy & sell, and get real recommendations from
              verified colleagues.{" "}
              <strong className="text-primary">
                No noise. No spam. Just trust.
              </strong>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-lg px-10 py-5 shadow-xl shadow-primary/10 hover:scale-105 transition-transform bg-primary"
                >
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto text-lg px-10 py-5 border-primary text-primary hover:bg-secondary transition-transform"
                >
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Social Proof: Favicon API Banner */}
        <section className="py-12 border-y border-neutral-200 bg-white/50 backdrop-blur-sm">
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

        {/* Step 2: Modernized Journey with Privacy focus */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 max-w-6xl relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-20">
              <h3 className="text-4xl font-extrabold text-primary mb-6 tracking-tight">
                A walled garden for <br />
                <span className="text-accent">verified professionals</span>
              </h3>
              <p className="text-lg text-neutral-600 font-medium">
                Our one-time verification process ensures that Vouchins remains
                a safe, high-intent space for real corporate employees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-neutral-100 -z-10" />

              {[
                {
                  step: "01",
                  title: "One-Time Verification",
                  desc: "Enter your corporate email. This is a one-time process used exclusively to confirm your workplace.",
                  icon: <Mail className="h-7 w-7" />,
                  color: "bg-primary",
                },
                {
                  step: "02",
                  title: "Instant Handshake",
                  desc: "A secure OTP is sent to your work inbox. We never store or use this email for any other purpose.",
                  icon: <Key className="h-7 w-7" />,
                  color: "bg-primary/90",
                },
                {
                  step: "03",
                  title: "Access the Circle",
                  desc: "Once verified, you're in. You can switch to your personal email for all future logins and notifications.",
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

            {/* Security Assurance Bar */}
            <div className="mt-20 flex flex-wrap justify-center items-center gap-8 py-6 px-10 rounded-2xl bg-secondary border border-primary/5">
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                No Employer Access
              </div>
              <div className="w-px h-4 bg-primary/10 hidden md:block" />
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                Privacy First: No Spam
              </div>
              <div className="w-px h-4 bg-primary/10 hidden md:block" />
              <div className="flex items-center gap-2 text-sm font-bold text-primary/70">
                <Shield className="h-4 w-4 text-accent" />
                Verified & Location Specific
              </div>
            </div>
          </div>
        </section>

        {/* Product Mockup Section */}
        <section className="py-24 bg-neutral-50/50">
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

      {/* <footer className="border-t border-neutral-200 py-12 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Image
              src="/images/logo.png"
              alt="Vouchins"
              width={100}
              height={30}
              className="grayscale opacity-50"
            />
            <div className="text-xs text-neutral-400 font-medium">
              &copy; {new Date().getFullYear()} Vouchins. All rights reserved.
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
