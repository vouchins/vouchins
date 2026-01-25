'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Users, Code2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-8 -ml-2 text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Hero Section */}
      <section className="mb-12">
        <h1 className="text-4xl font-extrabold text-neutral-900 mb-4 tracking-tight">
          About Vouchins
        </h1>
        <p className="text-xl text-neutral-600 leading-relaxed max-w-2xl font-medium">
          The verified professional network for trusted local recommendations and peer-to-peer transactions.
        </p>
      </section>

      <div className="space-y-12 text-neutral-700 leading-relaxed">
        {/* Origin Section */}
        <section className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Rocket className="h-32 w-32" />
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Code2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">Our Story</h2>
              <p className="mb-4">
                Vouchins was born out of frustration. As developers, we faced the same issues many professionals do when moving to a new city or looking for reliable services: endless scams, intrusive brokers, and anonymous marketplaces where trust is a luxury.
              </p>
              <div className="border-l-4 border-indigo-500 pl-4 py-1 bg-white/50 rounded-r-lg">
                <p className="font-medium text-neutral-900 italic">
                  &quot;We are developers who have faced this issue firsthand. We created Vouchins to solve this problem for ourselves and our colleagues.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values / Concept */}
        <section className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold uppercase tracking-wider text-xs">
              <Users className="h-4 w-4" />
              <span>The Insight</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">Why Corporate Identity?</h2>
            <p>
              We realized that the most reliable recommendations don&apos;t come from star ratings—they come from people we work with. Whether you are finding a flatmate in Gachibowli or hiring a driver, a colleague&apos;s &quot;vouch&quot; is worth more than a thousand anonymous reviews.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold uppercase tracking-wider text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>The Mission</span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">Eliminating the Noise</h2>
            <p>
              Our mission is to eliminate broker interference and marketplace scams by creating a <strong>Circle of Trust</strong>. By verifying every user via their professional credentials, we ensure every interaction is anchored in accountability.
            </p>
          </div>
        </section>

        {/* Pillars Section */}
        <section className="pt-8 border-t border-neutral-100">
          <h2 className="text-2xl font-bold text-neutral-900 mb-8">Built on Three Pillars</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="h-1 bg-indigo-600 w-12 rounded-full mb-4" />
              <h3 className="font-bold text-neutral-900 text-lg">Verification</h3>
              <p className="text-sm text-neutral-600">
                Access is restricted to professionals from verified companies, ensuring a high-intent, high-accountability community.
              </p>
            </div>
            <div className="space-y-3">
              <div className="h-1 bg-indigo-600 w-12 rounded-full mb-4" />
              <h3 className="font-bold text-neutral-900 text-lg">Privacy</h3>
              <p className="text-sm text-neutral-600">
                You control your visibility. Post exclusively for your verified colleagues or share with the wider professional circle.
              </p>
            </div>
            <div className="space-y-3">
              <div className="h-1 bg-indigo-600 w-12 rounded-full mb-4" />
              <h3 className="font-bold text-neutral-900 text-lg">Accountability</h3>
              <p className="text-sm text-neutral-600">
                Transactions are peer-to-peer. No brokers, no hidden fees, and zero fake listings from anonymous accounts.
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-20 pt-8 border-t border-neutral-100 text-center">
        <p className="text-neutral-500 text-sm italic">
          ❤️ Built for professionals. Designed for trust.
        </p>
      </footer>
    </div>
  );
}