"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 -ml-2 text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <h1 className="text-4xl font-extrabold text-neutral-900 mb-2">
        Terms and Conditions
      </h1>
      <p className="text-sm text-neutral-500 mb-8 border-b pb-4">
        Last Updated: February 2026
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            1. Use of Service
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            Vouchins is a verified professional marketplace. By accessing our
            platform, you agree to provide truthful information regarding your
            professional identity. Misrepresentation of your employer or
            professional status is grounds for immediate account suspension.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">
            2. Marketplace Guidelines
          </h2>
          <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-100">
            <ul className="list-disc pl-5 space-y-3 text-neutral-600">
              <li>
                <strong>Verification:</strong> Access to "Company Only" feeds
                requires a successful OTP or manual verification of a
                professional ID.
              </li>
              <li>
                <strong>Content Safety:</strong> Users are prohibited from
                posting illegal, offensive, or fraudulent content.
              </li>
              <li>
                <strong>Direct Transactions:</strong> Vouchins facilitates the
                introduction between buyer and seller. We do not process
                payments and are not liable for the quality, safety, or legality
                of items exchanged.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">
            3. Intellectual Property
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            You retain the rights to the content you post on Vouchins. However,
            by posting, you grant Vouchins a non-exclusive license to display
            your content within the platform to facilitate the intended
            marketplace services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">
            4. Limitation of Liability
          </h2>
          <p className="text-neutral-600 leading-relaxed">
            Vouchins provides a platform for verified professionals to interact.
            We are not responsible for any losses, damages, or disputes that
            arise from personal transactions between users met through the
            platform.
          </p>
        </section>

        <section className="p-8 rounded-2xl border border-neutral-800">
          Questions? Contact -{" "}
          <span className="font-semibold">connect@vouchins.com</span>
        </section>
      </div>
    </div>
  );
}
