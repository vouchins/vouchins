import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, Shield, Users, MessageCircle } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200">
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
              {/* Keep an accessible page title for SEO */}
              <h1 className="sr-only">Vouchins</h1>
            </div>
            {/* <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-neutral-700" />
              <h1 className="text-xl font-semibold text-neutral-900">
                Vouchins
              </h1>
            </div> */}
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
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-4xl md:text-5xl font-semibold text-neutral-900 mb-6 leading-tight">
              A trusted community for
              <br />
              corporate employees
            </h2>
            <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Find housing, buy and sell items, get recommendations from
              verified colleagues at your company and beyond.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-neutral-50 border-y border-neutral-200">
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

        <section className="py-20">
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

        <section className="py-20 bg-neutral-50 border-t border-neutral-200">
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

      <footer className="border-t border-neutral-200 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-neutral-600">
            <Image src="/images/logo.png" alt="" width={20} height={20} className="h-4 w-auto" />
            <span>Vouchins - A trusted community for corporate employees</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
