import type { ProductPageContent } from "@/components/product-landing-page";

const commonSteps = [
  { title: "Verify your work email", description: "Receive a one-time code at a supported professional email domain." },
  { title: "Review member context", description: "Use profiles, vouches, conversation history, and relevant details before deciding." },
  { title: "Proceed with safeguards", description: "Keep records, verify important claims independently, and follow the safety guidance." },
];
const commonSafety = [
  "Never share passwords, OTPs, banking PINs, or remote-access codes.",
  "Verify material claims independently and avoid paying under pressure.",
  "For in-person exchanges, meet in a busy public place and inspect before paying.",
  "Report suspicious conduct and stop when details change unexpectedly.",
];
const commonLimitations = "A successful corporate-email check confirms access to a supported mailbox at verification time. It is not proof of legal identity, current employment, qualifications, criminal history, financial standing, or future conduct. Peer vouches are member opinions, not guarantees.";

export const PRODUCT_PAGES: Record<string, ProductPageContent> = {
  "verified-professional-community": {
    slug: "verified-professional-community", eyebrow: "Professional community", title: "A professional community built around accountable access",
    definition: "Vouchins is a professional community where access is confirmed through supported corporate email domains, giving members more context than an unrestricted anonymous network while preserving clear verification limitations.",
    audience: ["Corporate professionals seeking peer connections", "Members who value work-context and reputation signals", "People looking for jobs, housing, exchanges, and recommendations in one community"],
    benefits: ["Connect through professional context", "Use vouches and activity as additional reputation signals", "Access jobs, housing, marketplace, and recommendation discussions"],
    steps: commonSteps, limitations: commonLimitations, safety: commonSafety,
    faqs: [
      { question: "What makes the community verified?", answer: "Access requires a one-time code delivered to a supported corporate or professional email domain." },
      { question: "Does verification prove someone’s identity?", answer: "No. It confirms mailbox access at verification time and should not be treated as an identity or background check." },
      { question: "Can verification prevent misconduct?", answer: "No system can guarantee conduct. Verification and vouches add accountability signals; members must still use judgment and safety precautions." },
    ],
    relatedArticles: [{ title: "Why workplace connections can strengthen local communities", href: "/blog/workplace-connections-stronger-local-communities" }, { title: "Professional actions and the reputation economy", href: "/blog/reputation-economy-professional-actions-over-followers" }],
  },
  "employee-referrals": {
    slug: "employee-referrals", eyebrow: "Career connections", title: "Employee referrals with professional context",
    definition: "Vouchins helps professionals discover and discuss employee-referral opportunities with members whose access was confirmed through a supported work email, without presenting that signal as proof of qualifications or employment history.",
    audience: ["Job seekers looking for informed referral conversations", "Employees willing to share legitimate openings", "Recruiters seeking higher-context professional introductions"],
    benefits: ["Discuss role fit before requesting a referral", "Build reputation through useful professional participation", "Keep referral expectations and limitations clear"],
    steps: commonSteps, limitations: commonLimitations, safety: commonSafety,
    faqs: [
      { question: "Does Vouchins guarantee a referral?", answer: "No. Referral decisions remain entirely with the employee, employer, or recruiter." },
      { question: "Are qualifications verified?", answer: "No. Members and recruiters must independently verify resumes, experience, identity, and qualifications." },
      { question: "Should anyone pay for a referral?", answer: "Avoid requests for improper payments or confidential information and report suspicious conduct." },
    ],
    relatedArticles: [{ title: "Verified professional identity in the AI era", href: "/blog/verified-professional-identity-ai-era" }, { title: "How Vouchins approaches trust", href: "/blog/how-vouchins-ensures-trust" }],
  },
  "verified-flatmates": {
    slug: "verified-flatmates", eyebrow: "Housing connections", title: "Find flatmates with more professional context",
    definition: "Vouchins helps professionals discover flatmate and housing conversations with members who have completed work-email verification, while requiring everyone to verify identity, property, terms, and payments independently.",
    audience: ["Professionals looking for compatible flatmates", "Existing tenants filling a legitimate vacancy", "People relocating for work and seeking local context"],
    benefits: ["Start conversations with work-domain context", "Discuss lifestyle, locality, commute, and expectations", "Use community reputation signals alongside independent checks"],
    steps: commonSteps, limitations: commonLimitations, safety: commonSafety,
    faqs: [
      { question: "Does Vouchins verify properties or ownership?", answer: "No. Members must verify the property, owner or tenant authority, documents, condition, and applicable terms independently." },
      { question: "Should I pay a deposit before visiting?", answer: "Avoid deposits made only to reserve a listing before you verify the person, property, and written terms." },
      { question: "Is a verified member automatically a safe flatmate?", answer: "No. Work-email verification is an accountability signal, not a personal, identity, tenancy, or safety guarantee." },
    ],
    relatedArticles: [{ title: "Flat brokers in Hyderabad: a practical guide", href: "/blog/flat-brokers-hyderabad-guide" }, { title: "Avoiding marketplace scams in India", href: "/blog/avoid-scams-online-marketplace-india" }],
  },
  "corporate-marketplace": {
    slug: "corporate-marketplace", eyebrow: "Member marketplace", title: "A corporate-community marketplace with clearer accountability",
    definition: "The Vouchins corporate marketplace lets professionals list and discover items within a work-email-verified community, adding reputation context without guaranteeing an item, seller, buyer, payment, or transaction.",
    audience: ["Professionals buying or selling pre-owned items", "Members who prefer accountable community exchanges", "People seeking local listings with professional context"],
    benefits: ["Review member context before responding", "Keep marketplace conversations attributable", "Use local community signals alongside inspection and payment safeguards"],
    steps: commonSteps, limitations: commonLimitations, safety: commonSafety,
    faqs: [
      { question: "Does Vouchins inspect listed items?", answer: "No. Buyers must inspect, test, and verify ownership and condition before paying." },
      { question: "Does Vouchins guarantee payment or delivery?", answer: "No. Members remain responsible for choosing traceable payment and safe exchange arrangements." },
      { question: "What should I do if a listing seems suspicious?", answer: "Stop the exchange, preserve the conversation, avoid payment, and report the listing or member." },
    ],
    relatedArticles: [{ title: "The future of trusted communities in Indian marketplaces", href: "/blog/trusted-communities-future-online-marketplace-india" }, { title: "Avoiding marketplace scams in India", href: "/blog/avoid-scams-online-marketplace-india" }],
  },
  "trusted-recommendations": {
    slug: "trusted-recommendations", eyebrow: "Peer recommendations", title: "Professional recommendations with visible context",
    definition: "Vouchins lets professionals share recommendations for services and local needs with attributable member context, helping readers evaluate who made a recommendation without turning a vouch into a guarantee.",
    audience: ["Members looking for locally relevant service suggestions", "Professionals sharing first-hand experiences", "People who want recommendation context beyond anonymous ratings"],
    benefits: ["See professional and community context behind a recommendation", "Ask follow-up questions about first-hand experience", "Compare multiple recommendations before deciding"],
    steps: commonSteps, limitations: commonLimitations, safety: commonSafety,
    faqs: [
      { question: "Does a vouch guarantee a provider?", answer: "No. A vouch reflects a member’s opinion or experience and is not a financial, quality, identity, or safety guarantee." },
      { question: "Are providers independently checked?", answer: "Not unless a page explicitly states a particular completed check. Users should verify credentials, pricing, insurance, and terms themselves." },
      { question: "Can recommendations be reported?", answer: "Yes. Members should report misleading, undisclosed, abusive, or suspicious recommendations for moderation." },
    ],
    relatedArticles: [{ title: "Professional actions and the reputation economy", href: "/blog/reputation-economy-professional-actions-over-followers" }, { title: "How Vouchins approaches trust", href: "/blog/how-vouchins-ensures-trust" }],
  },
};
