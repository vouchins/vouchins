import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Flag,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { HomepageNavbar } from "@/components/homepage-navbar";

const dos = [
  "Review the member's verified employer, profile history, and community vouches.",
  "Keep initial conversations inside Vouchins so there is a clear record.",
  "Meet in a busy public place during daylight and tell someone where you are going.",
  "Inspect and test an item fully before making a payment.",
  "Use a traceable payment method only after you are satisfied with the person and item.",
];

const donts = [
  "Do not treat corporate-email verification as a background or financial check.",
  "Do not share passwords, OTPs, banking PINs, identity documents, or remote-access codes.",
  "Do not pay deposits merely to reserve an item, rental, referral, or service.",
  "Do not scan unfamiliar payment QR codes or approve collect requests under pressure.",
  "Do not continue when details change suddenly or the other person avoids basic verification.",
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-neutral-950">
      <HomepageNavbar />

      <main className="pb-20 pt-24">
        <section className="border-b border-neutral-200/70 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to feed
            </Link>
            <div className="mt-8 max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                Community safety
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Meet, exchange, and transact with care.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
                Verification creates accountability, but it does not remove
                risk. Use these checks whenever you meet someone, exchange an
                item, discuss housing, or make a payment.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-5 py-12 sm:px-8 lg:grid-cols-2">
          <article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Do
                </p>
                <h2 className="text-xl font-semibold">Build evidence first</h2>
              </div>
            </div>
            <ul className="mt-7 space-y-4">
              {dos.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <XCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Don&apos;t
                </p>
                <h2 className="text-xl font-semibold">Ignore pressure or gaps</h2>
              </div>
            </div>
            <ul className="mt-7 space-y-4">
              {donts.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-700">
                  <XCircle className="mt-1 h-4 w-4 shrink-0 text-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:grid-cols-3">
            <div className="p-6">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-sm font-semibold">Choose the meeting</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Prefer staffed, public locations. Avoid isolated addresses and
                last-minute venue changes.
              </p>
            </div>
            <div className="border-y border-neutral-200 p-6 md:border-x md:border-y-0">
              <CircleAlert className="h-5 w-5 text-amber-600" />
              <h3 className="mt-4 text-sm font-semibold">Pause under pressure</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Urgency, secrecy, unusual payment methods, and changing stories
                are reasons to stop and verify again.
              </p>
            </div>
            <div className="p-6">
              <Flag className="h-5 w-5 text-red-600" />
              <h3 className="mt-4 text-sm font-semibold">Report concerns</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Use the report option on a post or profile and preserve relevant
                messages, receipts, and transaction details.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
