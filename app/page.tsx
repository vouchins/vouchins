import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Shield, Users, MessageCircle } from "lucide-react";
import Image from "next/image";

export default function Home() {
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
              <h1 className="sr-only">Vouchins</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign up</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-32 md:py-44 flex items-center justify-center overflow-hidden">
          {/* Layered gradients for depth */}
          <div className="absolute inset-0 pointer-events-none select-none z-0">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-tr from-primary/30 via-blue-200/40 to-transparent rounded-full blur-3xl opacity-70" />
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-to-br from-accent/30 to-transparent rounded-full blur-2xl opacity-40" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl opacity-30" />
          </div>
          <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
            <h2 className="text-6xl md:text-7xl font-extrabold text-primary mb-8 leading-tight tracking-tight drop-shadow-xl">
              The <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">trusted</span> platform<br />
              for corporate communities
            </h2>
            <p className="text-2xl md:text-3xl text-neutral-700 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              Find housing, buy & sell, and get real recommendations from verified colleagues.<br className="hidden md:block" />
              No noise. No spam. Just trust.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-5 shadow-xl shadow-primary/10 hover:scale-105 transition-transform">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 py-5 hover:scale-105 transition-transform">
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-24 bg-white/80 border-y border-neutral-200">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-neutral-700" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Verified Only
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  Corporate emails only. Real names, real companies. No
                  anonymity.
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Users className="h-7 w-7 text-neutral-700" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Trust First
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  Connect with verified colleagues. Share with your company or
                  everyone.
                </p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center">
                    <MessageCircle className="h-7 w-7 text-neutral-700" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  Simple & Clean
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  Text-first, Slack-like interface. No marketplace clutter. No
                  noise.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-semibold text-neutral-900 mb-4">
                What you can do
              </h3>
              <p className="text-neutral-600">
                Everything you need from your corporate community
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                  Housing
                </h4>
                <p className="text-neutral-600">
                  Find flatmates, PGs, rental apartments from verified
                  colleagues in your city.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                  Buy / Sell
                </h4>
                <p className="text-neutral-600">
                  Buy or sell cars, bikes, electronics, furniture directly with
                  colleagues.
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-neutral-900 mb-2">
                  Recommendations
                </h4>
                <p className="text-neutral-600">
                  Get trusted suggestions for doctors, CAs, services, and more
                  from real people.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-[#f1f5f9] to-[#e0e7ef] border-t border-neutral-200">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h3 className="text-3xl font-semibold text-neutral-900 mb-6">
              Ready to join?
            </h3>
            <p className="text-neutral-600 mb-8">
              Sign up with your corporate email to get started
            </p>
            <Link href="/signup">
              <Button size="lg">Create your account</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* <footer className="border-t border-neutral-200 py-10 bg-white/80">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-2 text-sm text-neutral-600">
            <Image src="/images/logo.png" alt="" width={28} height={28} className="h-6 w-auto" />
            <span className="font-medium">Vouchins &mdash; A trusted community for corporate employees</span>
            <span className="text-xs text-neutral-400">&copy; {new Date().getFullYear()} Vouchins. All rights reserved.</span>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
