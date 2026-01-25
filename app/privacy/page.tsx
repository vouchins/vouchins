'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const currentYear = new Date().getFullYear();
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 -ml-2 text-neutral-500 hover:text-neutral-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <h1 className="text-4xl font-extrabold text-neutral-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-8 border-b pb-4">
        Last Updated: January 2026
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-neutral-800">1. Commitment to Trust</h2>
          <p className="text-neutral-600 leading-relaxed">
            Vouchins is built on a "Circle of Trust." Our mission is to facilitate trusted local transactions among verified professionals. We prioritize the security of your professional identity and do not sell, rent, or trade your personal data to third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">2. Information We Collect</h2>
          <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-100">
            <ul className="list-disc pl-5 space-y-3 text-neutral-600">
              <li>
                <strong>Verification Data:</strong> We collect your corporate email address to verify your employment status. This information is used solely for authentication and is never displayed publicly.
              </li>
              <li>
                <strong>Profile Information:</strong> Your first name, city, and company name are visible to other verified members to foster a transparent marketplace.
              </li>
              <li>
                <strong>User-Generated Content:</strong> We store posts, comments, and up to three images per post. These are hosted securely on our cloud infrastructure (Supabase/AWS).
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">3. Data Visibility & Safety</h2>
          <p className="text-neutral-600 leading-relaxed">
            By design, Vouchins offers granular visibility controls. You may choose to restrict posts to <strong>"Company Only"</strong> (visible only to verified colleagues) or <strong>"All Companies."</strong>
          </p>
          <p className="text-neutral-600 mt-4 italic">
            Note: Your contact details (phone/email) are only visible if you explicitly include them in the body of your post.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">4. Image Storage & Compression</h2>
          <p className="text-neutral-600 leading-relaxed">
            Images uploaded to Vouchins undergo client-side compression to ensure platform speed and data efficiency. These images are stored in encrypted buckets and are intended for viewing within the Vouchins application context only.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-800">5. Data Retention & Deletion</h2>
          <p className="text-neutral-600 leading-relaxed">
            You maintain full ownership of your data. You may edit or delete your posts at any time. Upon deletion, related images are removed from our active storage buckets, though metadata may persist in encrypted backups for a limited period to comply with legal obligations.
          </p>
        </section>

        <section className="bg-indigo-50 p-8 rounded-2xl border border-indigo-100">
          <h2 className="text-xl font-bold text-indigo-900 mb-2">Contact Us</h2>
          <p className="text-indigo-800 text-sm">
            If you have questions regarding this policy or wish to request a permanent account deletion, please contact our privacy team at:
            <br />
            <span className="font-semibold">connect@vouchins.com</span>
          </p>
        </section>
      </div>
    </div>
  );
}