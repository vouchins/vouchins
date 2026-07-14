"use client";

import { HomepageNavbar } from "@/components/homepage-navbar";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-neutral-500 font-medium tracking-wide">
              Effective Date: July 2026
            </p>
          </div>
        </section>

        {/* Policy Content */}
        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-6 max-w-3xl">
            <div className="prose prose-neutral prose-headings:font-bold prose-headings:text-neutral-900 prose-a:text-[#4FD1C5] prose-a:no-underline hover:prose-a:underline max-w-none space-y-12 text-neutral-600 leading-relaxed">

              <div>
                <p className="font-semibold text-neutral-800">
                  Vouchins is built on a foundational "Circle of Trust." Our mission is to facilitate trusted local transactions among verified professionals and provide a secure identity layer for the web. We prioritize the security of your professional identity and we do not sell, rent, or trade your personal data to third parties for marketing purposes.
                </p>
              </div>

              <section>
                <h2 className="text-2xl flex items-center gap-2">
                  <Lock className="h-6 w-6 text-[#0A1B5C]" />
                  1. Information We Collect
                </h2>
                <ul className="list-disc pl-5 space-y-3 text-neutral-600 mt-4">
                  <li>
                    <strong>Verification Data:</strong> We collect your corporate email address strictly to verify your employment status. This email address is used solely for initial authentication and backend communication; it is never displayed publicly.
                  </li>
                  <li>
                    <strong>Profile Information:</strong> Your first name, city, and company name are visible to other verified members to foster a transparent and accountable marketplace.
                  </li>
                  <li>
                    <strong>User Generated Content:</strong> We store the text and images of your posts and comments. These are hosted securely on our encrypted cloud infrastructure.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl">2. AI Agents & Warden Identity Infrastructure</h2>
                <p>
                  Vouchins provides an identity authorization layer (Warden) that allows you to securely grant autonomous AI agents access to your professional identity.
                </p>
                <ul className="list-disc pl-5 space-y-3 text-neutral-600 mt-4">
                  <li>
                    <strong>Granular Scopes:</strong> You have absolute control over what data an AI agent can access. Data is only shared with authorized agents when you explicitly grant them permission via OAuth or cryptographic signing.
                  </li>
                  <li>
                    <strong>Agent Accountability:</strong> While we secure the authorization layer, we do not monitor or control how third party AI agents utilize the data you authorize them to access. We strongly recommend only authorizing agents from trusted developers.
                  </li>
                  <li>
                    <strong>Revocation:</strong> You may revoke an AI agent's access to your Vouchins identity at any time through your security settings.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl">3. Data Visibility & Safety</h2>
                <p>
                  By design, Vouchins offers granular visibility controls to protect your privacy. You may choose to restrict posts to <strong>"Company Only"</strong> (visible solely to verified colleagues within your organization) or open them to <strong>"All Companies."</strong>
                </p>
                <p className="italic text-neutral-500 mt-4 border-l-4 border-[#4FD1C5] pl-4">
                  Note: Your direct contact details (such as personal phone numbers or secondary emails) are only visible if you explicitly type them into the body of your post.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">4. Image Storage & Security</h2>
                <p>
                  Images uploaded to Vouchins undergo client-side compression to ensure platform speed and data efficiency. These images are stored in encrypted cloud buckets and are intended exclusively for viewing within the secure Vouchins application context.
                </p>
              </section>

              <section>
                <h2 className="text-2xl">5. Data Retention & Deletion</h2>
                <p>
                  You maintain full sovereign ownership of your data. You may edit or delete your posts at any time. Upon deletion, related images and text are immediately removed from our active databases and storage buckets. Minimal metadata may persist in encrypted backups for a limited period solely to comply with legal and regulatory obligations.
                </p>
              </section>

              <div className="mt-12 p-8 bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 rounded-[2rem]">
                <h2 className="text-xl font-bold text-[#0A1B5C] mb-2 mt-0">
                  Contact the Privacy Team
                </h2>
                <p className="text-neutral-700 text-sm m-0">
                  If you have questions regarding this policy, require data export, or wish to request a permanent account deletion, please contact us at: <a href="mailto:connect@vouchins.com" className="font-semibold text-[#0A1B5C]">connect@vouchins.com</a>.
                </p>
              </div>

            </div>
          </div>
        </section>

      </div>
    </>
  );
}