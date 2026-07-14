"use client";

import { HomepageNavbar } from "@/components/homepage-navbar";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <>
      <HomepageNavbar />
      <div className="min-h-screen bg-neutral-50 selection:bg-[#4FD1C5]/30 flex flex-col">

        {/* Header Section */}
        <section className="relative pt-32 pb-12 overflow-hidden bg-white border-b border-neutral-100">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-full pointer-events-none opacity-40">
            <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#4FD1C5]/10 blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 text-[#0A1B5C] text-xs font-bold uppercase tracking-widest mb-6">
              Legal
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-normal leading-tight text-neutral-900 font-[family-name:var(--font-playfair)] mb-6">
              Terms of Service
            </h1>
            <p className="text-sm text-neutral-500 font-medium tracking-wide">
              Effective Date: July 2026
            </p>
          </div>
        </section>

        {/* Terms Content */}
        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="prose prose-neutral prose-headings:font-bold prose-headings:text-neutral-900 prose-a:text-[#4FD1C5] prose-a:no-underline hover:prose-a:underline max-w-none space-y-12 text-neutral-600 leading-relaxed">

              <div>
                <p className="font-semibold text-neutral-800">
                  PLEASE READ THESE TERMS CAREFULLY. BY ACCESSING OR USING VOUCHINS, YOU AGREE TO BE BOUND BY THESE TERMS AND ALL POLICIES INCORPORATED BY REFERENCE. IF YOU DO NOT AGREE TO ALL OF THESE TERMS, DO NOT USE OUR PLATFORM.
                </p>
              </div>

              <section>
                <h2 className="text-2xl flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-[#0A1B5C]" />
                  1. Acceptance & Nature of Service
                </h2>
                <p>
                  Vouchins ("Company", "we", "us", or "our") provides a verified professional network and infrastructure layer designed to facilitate peer-to-peer communication, recommendations, and transactions, as well as an identity authorization layer for autonomous AI agents (the "Service"). Vouchins acts solely as a technological conduit and marketplace infrastructure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">2. User Identity & Verification Disclaimer</h2>
                <p>
                  While Vouchins requires corporate email verification and peer vouches to access certain features, <strong>this verification does not constitute a comprehensive background check</strong>. We do not independently verify the criminal history, financial standing, or moral character of any user.
                </p>
                <p>
                  You acknowledge that misrepresentation of your employer or professional identity is a material breach of these terms. You agree to use common sense and exercise caution when interacting with other users. You assume all risks associated with dealing with other users on the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">3. Peer-to-Peer Marketplace Liability Waiver</h2>
                <p>
                  Vouchins allows users to post listings, seek flatmates, offer referrals, and conduct transactions.
                </p>
                <ul className="list-disc pl-5 space-y-2 mt-4 text-neutral-700">
                  <li>
                    <strong>No Involvement in Transactions:</strong> We are not a party to any contract, payment, or agreement between users. We do not process payments for peer-to-peer transactions.
                  </li>
                  <li>
                    <strong>No Warranty on Goods/Services:</strong> We make no guarantees regarding the quality, safety, legality, or existence of the items, housing, or job opportunities advertised.
                  </li>
                  <li>
                    <strong>Physical Meetings:</strong> Vouchins is completely absolved of any liability for physical harm, property damage, or financial loss that may occur during in-person meetings arranged via the platform.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl">4. AI Agents & Warden Identity Layer</h2>
                <p>
                  Vouchins provides infrastructure (Warden) that allows users to authorize autonomous AI agents to act on their behalf.
                </p>
                <p>
                  <strong>Total Release of Agent Liability:</strong> You acknowledge that AI agents are experimental and autonomous. By granting an AI agent access to your Vouchins identity or data, you assume full responsibility for all actions taken by that agent. Vouchins explicitly disclaims any and all liability for damages, financial loss, data corruption, or contractual obligations incurred by AI agents operating through our infrastructure.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">5. Content & Moderation</h2>
                <p>
                  You retain ownership of the content you post. However, by posting, you grant Vouchins a worldwide, royalty-free, non-exclusive license to use, display, and distribute your content. We reserve the right to remove any content and to suspend or terminate any account immediately, without prior notice or liability, for any reason whatsoever, including breach of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">6. Indemnification</h2>
                <p>
                  You agree to defend, indemnify, and hold harmless Vouchins, its affiliates, officers, and employees from any claims, damages, obligations, losses, liabilities, costs, and expenses (including attorney's fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your interaction with any other user or AI agent; or (d) any transaction or dispute between you and a third party.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">7. Limitation of Liability</h2>
                <p className="font-semibold text-neutral-800 uppercase text-sm tracking-wide">
                  To the maximum extent permitted by applicable law, in no event shall Vouchins be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including damages for loss of profits, goodwill, use, or data. In no event shall Vouchin's aggregate liability exceed the greater of one hundred U.S. dollars ($100.00) or the amount you paid Vouchins in the past six months.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">8. Dispute Resolution & Class Action Waiver</h2>
                <p>
                  Any dispute arising from these Terms shall be resolved through binding, individual arbitration. <strong>You and Vouchins waive the right to a trial by jury or to participate in a class action.</strong>
                </p>
              </section>

              <div className="mt-12 pt-8 border-t border-neutral-200">
                <p className="text-sm font-semibold">
                  If you have any questions regarding these Terms, please contact our legal team at <a href="mailto:connect@vouchins.com">connect@vouchins.com</a>.
                </p>
              </div>

            </div>
          </div>
        </section>

      </div>
    </>
  );
}
