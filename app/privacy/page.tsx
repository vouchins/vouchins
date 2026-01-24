export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-neutral max-w-none">
        <p className="mb-4">Effective Date: January 2026</p>
        <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p>We collect professional details (Company Name, Domain) to verify your identity. We do not sell your personal data to third parties.</p>
        
        <h2 className="text-xl font-semibold mt-6 mb-2">2. Image Data</h2>
        <p>Images you upload to Vouchins are stored securely on Supabase. By uploading, you grant fellow verified members the right to view these images within the app context.</p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Contact Information</h2>
        <p>Your phone number or email is only visible if you explicitly include it in your posts. We encourage using the platform's reply system for initial contact.</p>
      </div>
    </div>
  );
}