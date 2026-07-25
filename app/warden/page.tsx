import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleDollarSign,
  Fingerprint,
  GitBranch,
  KeyRound,
  LockKeyhole,
  Menu,
  Network,
  OctagonX,
  Radar,
  ScrollText,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Warden | Identity and Authorization for AI Agents",
  description:
    "Warden is the identity and authorization control plane for autonomous AI agents. Issue agent identities, enforce scoped access, and preserve a complete audit trail.",
  alternates: { canonical: "https://warden.vouchins.com" },
  openGraph: {
    title: "Warden | Every agent accountable",
    description:
      "Identity, scoped authorization, and runtime accountability for autonomous AI agents.",
    url: "https://warden.vouchins.com",
    siteName: "Warden by Vouchins",
    type: "website",
  },
};

const principles = [
  [Fingerprint, "Identity", "Know which agent is acting and who owns it."],
  [KeyRound, "Scope", "Grant only the tools, data, and duration required."],
  [Radar, "Intent", "Evaluate every request against policy at runtime."],
  [ScrollText, "Evidence", "Keep a legible record of every decision."],
] as const;

const capabilities = [
  {
    icon: Fingerprint,
    title: "Agent passports",
    body: "Give every agent a persistent identity tied to its owner, purpose, environment, and approved capabilities.",
  },
  {
    icon: GitBranch,
    title: "Delegation chains",
    body: "Trace authority from a human or service through every agent and sub-agent involved in an action.",
  },
  {
    icon: ShieldCheck,
    title: "Runtime policy",
    body: "Evaluate actor, resource, action, context, and risk before a request reaches the target system.",
  },
  {
    icon: KeyRound,
    title: "Scoped credentials",
    body: "Replace broad, long-lived secrets with short-lived access constrained to the task at hand.",
  },
  {
    icon: OctagonX,
    title: "Instant revocation",
    body: "Suspend an agent, owner, policy, or delegation path from one control point when risk changes.",
  },
  {
    icon: ScrollText,
    title: "Decision ledger",
    body: "Understand what was requested, why it was allowed, which policy applied, and what happened next.",
  },
];

export default function WardenPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#0F172A] antialiased">
      <WardenNavbar />

      <main>
        <section className="relative overflow-hidden bg-[#020617] pb-20 pt-36 text-white md:pb-28 md:pt-44">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="absolute -left-40 top-20 h-[34rem] w-[34rem] rounded-full bg-[#0A1B5C]/60 blur-[150px]" />
          <div className="absolute -right-32 top-0 h-[36rem] w-[36rem] rounded-full bg-[#4FD1C5]/15 blur-[150px]" />

          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4FD1C5]/25 bg-[#4FD1C5]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8CE5DC] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Private preview
              </div>

              <h1 className="mt-8 font-[family-name:var(--font-playfair)] text-5xl font-bold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
                <span className="block">Every agent.</span>
                <span className="block bg-gradient-to-r from-[#4FD1C5] via-[#9FE9E2] to-[#A8B8FF] bg-clip-text pb-2 text-transparent">
                  Accountable.
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-slate-300 lg:mx-0 md:text-xl">
                Warden is the identity and authorization control plane for AI agents. Know who is acting, constrain what they can do, and preserve evidence of every decision.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4FD1C5] px-6 text-sm font-bold text-[#07111F] shadow-lg shadow-[#4FD1C5]/20 transition-all hover:-translate-y-0.5 hover:bg-[#65DDD3] hover:shadow-[#4FD1C5]/30"
                >
                  Apply for private preview
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 lg:justify-start">
                <LockKeyhole className="h-4 w-4" />
                Built for teams deploying consequential AI agents
              </div>
            </div>

            <RuntimeDecisionCard />
          </div>
        </section>

        <section className="relative z-20 -mt-7 px-6">
          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,0.28)] sm:grid-cols-2 lg:grid-cols-4">
            {principles.map(([Icon, title, body], index) => (
              <div key={title} className="border-b border-neutral-200 p-6 last:border-b-0 sm:border-r lg:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1B5C]/5 text-[#0A1B5C] ring-1 ring-inset ring-[#0A1B5C]/10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">0{index + 1}</span>
                </div>
                <h2 className="mt-5 text-lg font-bold text-neutral-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why-warden" className="px-6 py-24 md:py-32">
          <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <SectionLabel>The missing identity layer</SectionLabel>
              <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-playfair)] text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-[#0A1B5C] sm:text-5xl md:text-6xl">
                Credentials were built for software. Accountability was built for people.
              </h2>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-[#F8F9FB] p-7 shadow-sm md:p-9">
              <p className="text-lg leading-8 text-neutral-600">
                Agents sit between the two. They act at machine speed, cross application boundaries, and delegate work to other agents. A shared API key cannot explain who authorized an action or whether it stayed within intent.
              </p>
              <div className="mt-8 rounded-2xl border border-[#4FD1C5]/25 bg-[#4FD1C5]/10 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#26887F]">Warden&apos;s premise</p>
                <p className="mt-2 font-bold leading-7 text-[#0A1B5C]">
                  Access should be issued per agent, per task, per resource, for exactly as long as it is needed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#F8F9FB] px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel centered>One decision path</SectionLabel>
              <h2 className="mt-6 font-[family-name:var(--font-playfair)] text-4xl font-bold tracking-[-0.035em] text-[#0A1B5C] sm:text-5xl md:text-6xl">
                From intent to evidence.
              </h2>
              <p className="mt-5 text-lg leading-8 text-neutral-600">
                Warden is being designed to sit in the authorization path. Every request carries identity in and produces evidence out.
              </p>
            </div>

            <div className="relative mt-16 grid gap-5 lg:grid-cols-3">
              <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-transparent via-[#4FD1C5]/60 to-transparent lg:block" />
              <WorkflowCard
                number="01"
                icon={UserRoundCheck}
                title="Establish identity"
                body="Register the agent, bind an owner, and sign the context it carries into each request."
              />
              <WorkflowCard
                number="02"
                icon={Radar}
                title="Enforce intent"
                body="Resolve the delegation path and evaluate granular policy against live request context."
              />
              <WorkflowCard
                number="03"
                icon={ScrollText}
                title="Preserve evidence"
                body="Issue constrained access and record the decision, policy, actor, and resulting action."
              />
            </div>
          </div>
        </section>

        <section id="capabilities" className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <SectionLabel>Control without drag</SectionLabel>
                <h2 className="mt-6 font-[family-name:var(--font-playfair)] text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-[#0A1B5C] sm:text-5xl">
                  The guardrails agents need to do real work.
                </h2>
              </div>
              <p className="max-w-md text-base leading-7 text-neutral-600">
                Security teams get a coherent control surface. Builders get authorization that understands agents, tools, delegation, and runtime context.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, body }) => (
                <article key={title} className="group rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-[#4FD1C5]/50 hover:shadow-xl hover:shadow-[#0A1B5C]/[0.06]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1B5C]/10 to-[#4FD1C5]/10 text-[#0A1B5C] ring-1 ring-inset ring-[#0A1B5C]/10 transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-8 text-xl font-bold tracking-[-0.025em] text-neutral-900">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-500">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#020617] px-6 py-24 text-white md:py-32">
          <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-[#4FD1C5]/10 blur-[120px]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <SectionLabel dark>Policy as a product primitive</SectionLabel>
              <h2 className="mt-6 font-[family-name:var(--font-playfair)] text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
                Human intent, made enforceable.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                Describe the boundary once. Warden evaluates it whenever an agent requests access, including delegated requests from sub-agents.
              </p>
            </div>
            <PolicyCode />
          </div>
        </section>

        <section className="bg-[#F8F9FB] px-6 py-24 md:py-28">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <article id="docs" className="scroll-mt-28 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm md:p-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A1B5C]/5 text-[#0A1B5C] ring-1 ring-inset ring-[#0A1B5C]/10">
                <BookOpen className="h-5 w-5" />
              </span>
              <SectionLabel>Documentation</SectionLabel>
              <h2 className="mt-5 font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-[-0.03em] text-[#0A1B5C] sm:text-4xl">
                Build with Warden.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-neutral-600">
                Integration guides, policy references, and SDK documentation will be released with the private preview.
              </p>
              <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0A1B5C] transition-colors hover:text-[#287F78]">
                Request documentation access
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </article>

            <article id="pricing" className="scroll-mt-28 rounded-3xl border border-[#4FD1C5]/30 bg-gradient-to-br from-[#E8FFFC] to-white p-8 shadow-sm md:p-10">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4FD1C5]/20 text-[#0A1B5C] ring-1 ring-inset ring-[#4FD1C5]/30">
                <CircleDollarSign className="h-5 w-5" />
              </span>
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-5 font-[family-name:var(--font-playfair)] text-3xl font-bold tracking-[-0.03em] text-[#0A1B5C] sm:text-4xl">
                Private preview access.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-neutral-600">
                Public pricing is not available yet. Preview scope and commercial terms are being shaped with design partners.
              </p>
              <Link href="/contact" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#0A1B5C] transition-colors hover:text-[#287F78]">
                Discuss preview access
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8FFFC] via-white to-[#EEF1FF] px-6 py-24 text-center md:py-32">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0A1B5C08_1px,transparent_1px),linear-gradient(to_bottom,#0A1B5C08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          <div className="relative mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4FD1C5]/30 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#287F78] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#4FD1C5]" />
              Private preview · Launching soon
            </div>
            <h2 className="mt-7 font-[family-name:var(--font-playfair)] text-5xl font-bold leading-[1.04] tracking-[-0.04em] text-[#0A1B5C] sm:text-6xl md:text-7xl">
              Deploy agents that earn trust.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-neutral-600">
              We are working with a small group of teams building consequential agent workflows. Tell us what your agents need to access.
            </p>
            <Link
              href="/contact"
              className="mt-9 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0A1B5C] px-7 text-sm font-bold text-white shadow-xl shadow-[#0A1B5C]/15 transition-all hover:-translate-y-0.5 hover:bg-[#111D62]"
            >
              Become a design partner
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-white px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/images/logo.png" alt="Vouchins" width={112} height={32} className="object-contain" />
              <span className="h-6 w-px bg-neutral-200" />
              <span className="font-bold text-[#0A1B5C]">Warden</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-neutral-500">
              Identity and authorization infrastructure for autonomous AI agents.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
            <FooterGroup title="Product" links={[["Why Warden", "#why-warden"], ["Capabilities", "#capabilities"], ["Pricing", "#pricing"]]} />
            <FooterGroup title="Resources" links={[["Documentation", "#docs"], ["How it works", "#how-it-works"], ["Blog", "/blog"]]} />
            <FooterGroup title="Company" links={[["About", "/about"], ["Contact", "/contact"], ["Vouchins", "/"]]} />
            <FooterGroup title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"]]} />
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-neutral-200 pt-6 text-xs text-neutral-400">
          © {new Date().getFullYear()} Vouchins. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function WardenNavbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl border border-neutral-200/70 bg-white/95 px-5 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl md:px-6">
        <Link href="#top" className="flex items-center gap-3" aria-label="Warden home">
          <Image src="/images/logo.png" alt="Vouchins" width={112} height={32} className="object-contain" priority />
          <span className="h-6 w-px bg-neutral-200" />
          <span className="text-sm font-black tracking-[-0.02em] text-[#0A1B5C]">WARDEN</span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <a href="#why-warden" className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0A1B5C]">Why Warden</a>
          <a href="#how-it-works" className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0A1B5C]">How it works</a>
          <a href="#capabilities" className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0A1B5C]">Capabilities</a>
          <a href="#docs" className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0A1B5C]">Docs</a>
          <a href="#pricing" className="text-sm font-semibold text-neutral-600 transition-colors hover:text-[#0A1B5C]">Pricing</a>
        </div>

        <div className="flex items-center gap-2">
          <details className="group relative lg:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-neutral-200 text-[#0A1B5C] marker:content-none" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
              <MobileNavLink href="#why-warden">Why Warden</MobileNavLink>
              <MobileNavLink href="#how-it-works">How it works</MobileNavLink>
              <MobileNavLink href="#capabilities">Capabilities</MobileNavLink>
              <MobileNavLink href="#docs">Documentation</MobileNavLink>
              <MobileNavLink href="#pricing">Pricing</MobileNavLink>
              <MobileNavLink href="/about">About Vouchins</MobileNavLink>
              <MobileNavLink href="/blog">Blog</MobileNavLink>
            </div>
          </details>
          <Link href="/contact" className="hidden h-10 items-center gap-2 rounded-xl bg-[#0A1B5C] px-4 text-xs font-bold text-white shadow-md shadow-[#0A1B5C]/15 transition-all hover:bg-[#111D62] sm:inline-flex sm:px-5 sm:text-sm">
            Join private preview
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function MobileNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="block rounded-xl px-4 py-3 text-sm font-semibold text-neutral-600 transition-colors hover:bg-[#0A1B5C]/5 hover:text-[#0A1B5C]">{children}</a>;
}

function FooterGroup({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <div>
      <p className="font-bold text-[#0A1B5C]">{title}</p>
      <div className="mt-4 space-y-3 text-neutral-500">
        {links.map(([label, href]) => (
          <a key={label} href={href} className="block transition-colors hover:text-[#0A1B5C]">{label}</a>
        ))}
      </div>
    </div>
  );
}

function RuntimeDecisionCard() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-8 rounded-full bg-[#4FD1C5]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5">
        <div className="flex items-center justify-between px-2 pb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#4FD1C5]" />
            Runtime decision
          </span>
          <span>REQ_84FA21</span>
        </div>

        <div className="space-y-2.5">
          <DecisionRow label="Actor" title="research-agent.prod" detail="Owner: growth-ops@acme" icon={Fingerprint} />
          <div className="ml-8 h-4 w-px bg-gradient-to-b from-[#4FD1C5] to-white/10" />
          <DecisionRow label="Request" title="crm.contacts.export" detail="Resource: /accounts/apac/*" icon={Network} />
          <div className="ml-8 h-4 w-px bg-gradient-to-b from-[#4FD1C5] to-white/10" />
          <DecisionRow label="Decision" title="ALLOW / SCOPED" detail="Expires in 04m 59s · max_rows: 50" icon={Check} approved />
        </div>

        <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-[#020617]/50 text-center">
          <DecisionMetric label="Latency" value="18ms" />
          <DecisionMetric label="Risk" value="Low" />
          <DecisionMetric label="Evidence" value="Stored" />
        </div>
      </div>
    </div>
  );
}

function DecisionRow({ label, title, detail, icon: Icon, approved = false }: { label: string; title: string; detail: string; icon: typeof Fingerprint; approved?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-4 rounded-2xl border p-4 ${approved ? "border-[#4FD1C5]/35 bg-[#4FD1C5]/10" : "border-white/10 bg-[#020617]/50"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${approved ? "bg-[#4FD1C5] text-[#07111F]" : "bg-white/5 text-[#8CE5DC]"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className={`mt-1 break-all text-sm font-bold sm:text-base ${approved ? "text-[#8CE5DC]" : "text-white"}`}>{title}</p>
        <p className="mt-1 truncate text-[10px] text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function DecisionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-2 py-3 last:border-r-0">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="mt-1 text-[10px] font-black uppercase text-[#4FD1C5] sm:text-xs">{value}</p>
    </div>
  );
}

function SectionLabel({ children, centered = false, dark = false }: { children: React.ReactNode; centered?: boolean; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${centered ? "justify-center" : ""}`}>
      <span className="h-2 w-2 rounded-full bg-[#4FD1C5]" />
      <span className={`text-[10px] font-black uppercase tracking-[0.16em] ${dark ? "text-[#8CE5DC]" : "text-[#287F78]"}`}>{children}</span>
    </div>
  );
}

function WorkflowCard({ number, icon: Icon, title, body }: { number: string; icon: typeof Radar; title: string; body: string }) {
  return (
    <article className="relative rounded-2xl border border-neutral-200 bg-white p-7 text-center shadow-sm">
      <span className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[#4FD1C5]/20 bg-gradient-to-br from-[#0A1B5C] to-[#16256D] text-[#4FD1C5] shadow-lg shadow-[#0A1B5C]/15">
        <Icon className="h-7 w-7" />
      </span>
      <span className="mt-7 block text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400">Step {number}</span>
      <h3 className="mt-3 text-xl font-bold text-neutral-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-neutral-500">{body}</p>
    </article>
  );
}

function PolicyCode() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#080D20] shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#4FD1C5]" /> policy/finance-agent</span>
        <span className="text-[#4FD1C5]">Valid</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[11px] leading-7 text-slate-300 sm:p-8 sm:text-[13px]">
        <code>
          <span className="text-[#8CE5DC]">permit</span>{` agent.finance_reconciler {\n`}
          {`  action   = `}<span className="text-[#A8B8FF]">&quot;invoice.read&quot;</span>{`\n`}
          {`  resource = `}<span className="text-[#A8B8FF]">&quot;ledger/apac/*&quot;</span>{`\n`}
          {`  max_rows = `}<span className="text-[#4FD1C5]">50</span>{`\n`}
          {`  expires  = `}<span className="text-[#A8B8FF]">&quot;5m&quot;</span>{`\n`}
          {`  delegate = `}<span className="text-[#4FD1C5]">false</span>{`\n`}
          {`}`}
        </code>
      </pre>
    </div>
  );
}
