import type { Metadata } from "next";
import { Fingerprint, LockKeyhole, Sparkles } from "lucide-react";
import { HomepageNavbar } from "@/components/homepage-navbar";

export const metadata: Metadata = {
  title: "Warden - Agentic Identity Management",
  description: "Warden is launching soon.",
};

export default function WardenPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-white">
      <HomepageNavbar />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      <div className="absolute left-[-12rem] top-1/3 h-96 w-96 rounded-full bg-teal-400/15 blur-[130px]" />
      <div className="absolute right-[-10rem] top-20 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-[150px]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-6 pb-16 pt-32">
        <section className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-teal-400/10 backdrop-blur">
            <Fingerprint className="h-10 w-10 text-teal-300" />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
            <Sparkles className="h-3.5 w-3.5" />
            A new Vouchins product
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
            Warden
          </h1>
          <p className="mt-4 text-lg font-semibold tracking-wide text-slate-300 sm:text-2xl">
            Agentic Identity Management
          </p>

          <div className="mx-auto my-10 h-px max-w-md bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />

          <p className="bg-gradient-to-r from-white via-teal-100 to-indigo-200 bg-clip-text text-3xl font-black text-transparent sm:text-5xl">
            Launching soon
          </p>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Secure identity and access foundations designed for the next generation of autonomous agents.
          </p>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <LockKeyhole className="h-4 w-4" />
            Built around trust, control, and accountability
          </div>
        </section>
      </main>
    </div>
  );
}
