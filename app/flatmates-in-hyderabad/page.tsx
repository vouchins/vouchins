import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  MapPin,
  IndianRupee,
  Calendar,
  Building2,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Users,
  Compass
} from "lucide-react";
import { HomepageNavbar } from "@/components/homepage-navbar";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = {
  title: {
    absolute: "Flatmates in Hyderabad - Verified Roommates | Vouchins",
  },
  description: "Looking for male and female flatmates in Hyderabad? Connect with corporate-email-verified roommate matches on Vouchins. Browse verified flatmates now.",
  alternates: {
    canonical: "https://www.vouchins.com/flatmates-in-hyderabad",
  },
  openGraph: {
    title: "Flatmates in Hyderabad - Verified Roommates | Vouchins",
    description: "Looking for male and female flatmates in Hyderabad? Connect with corporate-email-verified roommate matches on Vouchins. Browse verified flatmates now.",
    url: "https://www.vouchins.com/flatmates-in-hyderabad",
    siteName: "Vouchins",
    images: [
      {
        url: "/images/vouchins-social-card.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flatmates in Hyderabad - Verified Roommates | Vouchins",
    description: "Looking for male and female flatmates in Hyderabad? Connect with corporate-email-verified roommate matches on Vouchins. Browse verified flatmates now.",
    images: ["/images/vouchins-social-card.png"],
  },
};

function parseListingDetails(text: string) {
  const localities = [
    "Gachibowli", "Madhapur", "HITEC City", "Hitech City", "Kondapur",
    "Banjara Hills", "Jubilee Hills", "Kokapet", "Patrika Nagar",
    "Miyapur", "Kukatpally", "Nanakramguda", "Financial District",
    "Manikonda", "Shaikpet", "Tolichowki", "Begumpet", "Somajiguda"
  ];

  let locality = "Hyderabad";
  for (const loc of localities) {
    const regex = new RegExp(`\\b${loc}\\b`, "i");
    if (regex.test(text)) {
      locality = loc;
      break;
    }
  }

  let rent = "Contact for Rent";
  const rentPatterns = [
    /rent\s*(?:\+\s*maintenance)?\s*(?:is|[-:]|share)?\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*(?:\s*k)?|\d+k|\d{4,6})/i,
    /(?:₹|rs\.?|inr)\s*(\d{1,3}(?:,\d{3})*(?:\s*k)?|\d+k|\d{4,6})\s*(?:\/month|pm|per month)/i
  ];

  for (const pattern of rentPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let val = match[1].trim().toLowerCase();
      if (val.endsWith('k')) {
        const num = parseFloat(val.slice(0, -1));
        rent = `₹${(num * 1000).toLocaleString('en-IN')}`;
      } else {
        const cleanNum = val.replace(/,/g, '');
        const num = parseInt(cleanNum, 10);
        if (!isNaN(num) && num > 1000) {
          rent = `₹${num.toLocaleString('en-IN')}`;
        } else {
          rent = `₹${match[1]}`;
        }
      }
      break;
    }
  }

  return { locality, rent };
}

function maskName(name: string) {
  if (!name) return "Verified Professional";
  return name
    .split(" ")
    .map((p) => {
      if (p.length <= 2) return p;
      return p[0] + "*".repeat(p.length - 2) + p.slice(-1);
    })
    .join(" ");
}

function redactAndClip(text: string) {
  const words = text.split(/\s+/);
  const clipped = words.slice(0, 20).join(" ");
  let redacted = clipped;

  // Redact 10-digit Indian phone numbers
  const phoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{9}|[6-9]\d{2}[\s-]\d{3}[\s-]\d{4}/g;
  redacted = redacted.replace(phoneRegex, "[Contact info redacted]");

  // Redact email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  redacted = redacted.replace(emailRegex, "[Email redacted]");

  if (words.length > 12) {
    redacted += "...";
  }
  return redacted;
}

export default async function FlatmatesHyderabadPage() {
  const supabase = await createServerSupabase();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  let isVerifiedUser = false;
  if (authUser) {
    const { data: userData } = await supabase
      .from("users")
      .select("is_verified")
      .eq("id", authUser.id)
      .maybeSingle();
    isVerifiedUser = userData?.is_verified ?? false;
  }

  // Use supabaseAdmin to bypass RLS so unauthenticated/unverified users see the total count and preview posts
  const { data: rawPosts } = await supabaseAdmin
    .from("posts")
    .select(`
      id,
      text,
      created_at,
      city,
      category,
      sub_category,
      status,
      is_removed,
      is_flagged,
      user:users!posts_user_id_fkey!inner(
        id,
        full_name,
        avatar_url,
        is_verified,
        company:companies(id, name, domain)
      )
    `)
    .eq("category", "housing")
    .eq("sub_category", "flatmates")
    .eq("is_removed", false)
    .eq("is_flagged", false)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Filter posts to ensure they relate to Hyderabad
  const posts = (rawPosts || []).filter(post => {
    const isHyderabad = post.city?.toLowerCase() === "hyderabad" ||
      !post.city ||
      post.city.toLowerCase() === "all cities";

    const lowercaseText = post.text.toLowerCase();
    const hyderabadKeywords = [
      "hyderabad", "gachibowli", "madhapur", "hitec", "hitech", "kondapur",
      "banjara", "jubilee", "kokapet", "patrika", "miyapur", "kukatpally",
      "nanakramguda", "financial district", "manikonda", "shaikpet", "tolichowki",
      "begumpet", "somajiguda", "prestige tranquil", "lawnz", "7 hills"
    ];
    const matchesKeywords = hyderabadKeywords.some(keyword => lowercaseText.includes(keyword));

    return isHyderabad && matchesKeywords;
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeekCount = posts.filter(post => new Date(post.created_at) >= oneWeekAgo).length;

  const canonical = "https://www.vouchins.com/flatmates-in-hyderabad";

  // Structured Data Schemas
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.vouchins.com" },
      { "@type": "ListItem", position: 2, name: "Flatmates in Hyderabad", item: canonical }
    ]
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Verified Flatmates in Hyderabad",
    "description": "Latest verified roommate and flatmate listings in Hyderabad.",
    "numberOfItems": posts.length,
    "itemListElement": posts.map((post, idx) => {
      const { locality, rent } = parseListingDetails(post.text);
      return {
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
          "@type": "Accommodation",
          "name": `Flatmate Room in ${locality}`,
          "description": post.text.substring(0, 150) + "...",
          "url": `https://www.vouchins.com/posts/${post.id}`
        }
      };
    })
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Vouchins",
    "url": "https://www.vouchins.com",
    "logo": "https://www.vouchins.com/images/logo.png",
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "Hyderabad"
    }
  };

  const faqs = [
    {
      question: "How is Vouchins different from other platforms?",
      answer: "Vouchins differs from traditional housing platforms by enforcing strict corporate-email verification. Instead of interacting with anonymous, unverified profiles, you connect with real working professionals who have validated workplace credentials. We also utilize peer vouches to ensure community accountability."
    },
    {
      question: "How does roommate verification work?",
      answer: "To gain a verified badge, members must verify access to a supported corporate email address by receiving a one-time code. This confirms they belong to a professional workplace. They can also earn vouch points when other verified members vouch for their integrity."
    },
    {
      question: "Is it free to browse and post flatmate listings?",
      answer: "Yes, it is completely free to post roommate listings and browse matches within the Vouchins community. We aim to help corporate employees find trusted housing without middleman charges or brokerage fees."
    },
    {
      question: "Which areas in Hyderabad are covered?",
      answer: "We cover all major residential neighborhoods popular with tech professionals, including Gachibowli, Madhapur, HITEC City, Kondapur, Banjara Hills, Jubilee Hills, Kokapet, Financial District, Miyapur, and Kukatpally."
    }
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const localities = [
    "Gachibowli",
    "Madhapur",
    "HITEC City",
    "Kondapur",
    "Banjara Hills",
    "Jubilee Hills",
    "Kokapet",
    "Financial District",
    "Miyapur",
    "Kukatpally",
    "Manikonda",
    "Nanakramguda"
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-[#0F172A]">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <HomepageNavbar />

      <main className="pt-24 md:pt-28">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-[#0A1B5C] to-[#12287c] text-white py-16 md:py-24 px-6 relative overflow-hidden">
          {/* Subtle design overlays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,209,197,0.15),rgba(255,255,255,0))]" />
          <div className="max-w-6xl mx-auto relative z-10">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 text-xs md:text-sm text-slate-300 flex items-center gap-2">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-slate-500">/</span>
              <span className="text-slate-100" aria-current="page">Flatmates in Hyderabad</span>
            </nav>

            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                Flatmates in Hyderabad
              </h1>
              <p className="text-lg md:text-xl text-slate-200 font-light leading-relaxed mb-8">
                Are you looking for male and female flatmates in Hyderabad? Vouchins helps you discover verified flatmate opportunities and shared living spaces in Hyderabad by connecting you directly with corporate-email-verified working professionals, eliminating the noise of anonymous listings.
              </p>

              {/* Dynamic Counters */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4FD1C5] animate-pulse" />
                  <span className="text-sm font-bold tracking-wide">
                    {posts.length} verified listings available
                  </span>
                </div>
                {newThisWeekCount > 0 && (
                  <div className="bg-white/15 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-slate-200 text-sm font-semibold">
                    🔥 {newThisWeekCount} new matches posted this week
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Why Vouchins Verified Flatmates */}
        <section className="py-16 md:py-24 px-6 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <ShieldCheck className="h-4.5 w-4.5" /> Accountability First
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
                Why Choose Verified Flatmates?
              </h2>
              <div className="space-y-6 text-slate-650 font-light leading-relaxed text-sm md:text-base">
                <p>
                  Finding a flatmate in Hyderabad has traditionally been a frustrating process of navigating anonymous online groups, classifieds like OLX, or generic websites. The main challenge with traditional roommate search engines is trust. When matching with an anonymous listing, you have zero verification of who the person is, where they work, or if they are even a real tenant. This lack of accountability often leads to housing scams, misleading descriptions, and safety concerns.
                </p>
                <p>
                  Vouchins changes this dynamics by introducing a strict corporate-email verification system. Every member posting or looking for a room on our platform must verify their identity using a valid professional or workplace email domain. This ensures that every potential flatmate you connect with is an accountable working professional at a known organization.
                </p>
                <p>
                  In addition to corporate email validation, Vouchins leverages peer-to-peer vouching. Members can receive &apos;vouches&apos; from colleagues or other verified users, creating a network of trust and professional context. By seeing a person&apos;s verified workplace, bio, and peer vouch details, you can make informed decisions before sharing a living space. While a corporate check is not a replacement for independent background verification or screening, it adds a powerful layer of accountability that traditional platforms cannot match.
                </p>
              </div>
            </div>

            <div className="bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-[#4FD1C5]/10 rounded-full blur-3xl -z-10" />
              <h3 className="text-xl font-bold text-[#0A1B5C] mb-4">Verification Comparison</h3>
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-250/50">
                  <span className="block text-xs font-bold text-[#4FD1C5] uppercase tracking-wider mb-1">Vouchins Standard</span>
                  <p className="text-sm text-slate-800 font-semibold mb-2">Corporate-Email Access Verified</p>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">
                    Access is restricted to individuals with valid professional email domains. Members have attributable profiles indicating real workplaces.
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-250/50">
                  <span className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">Traditional Classifieds</span>
                  <p className="text-sm text-slate-800 font-semibold mb-2">Anonymous Profiles & Broker Noise</p>
                  <p className="text-xs text-slate-500 font-light leading-relaxed">
                    Anonymous listings with no company context. High vulnerability to fake listings, bait-and-switch rents, and broker scams.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live listings section */}
        <section className="bg-slate-100/60 border-y border-slate-200/50 py-16 md:py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
                  Live Verified Roommate Postings
                </h2>
                <p className="text-slate-500 font-light text-sm md:text-base">
                  Latest active roommate listings from professionals in Hyderabad. Sorted by most recent.
                </p>
              </div>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0A1B5C] hover:text-[#4FD1C5] transition-colors"
              >
                Post your requirement <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {posts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
                <Compass className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No active listings found</h3>
                <p className="text-sm text-slate-500 font-light mb-6">
                  There are currently no active flatmate posts in Hyderabad. Be the first to post!
                </p>
                <Link
                  href="/signup"
                  className="inline-block bg-[#0A1B5C] hover:bg-[#12287c] text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md shadow-[#0A1B5C]/10"
                >
                  Create Listing
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(isVerifiedUser ? posts : posts.slice(0, 6)).map((post) => {
                  const { locality, rent } = parseListingDetails(post.text);
                  const rawUser = post.user;
                  const postUser = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as any;
                  const isUserVerified = postUser?.is_verified;
                  const relativeDate = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
                  const userCompany = Array.isArray(postUser?.company) ? postUser.company[0] : postUser?.company;

                  const displayName = isVerifiedUser ? postUser?.full_name : maskName(postUser?.full_name);
                  const displayBio = isVerifiedUser ? post.text : redactAndClip(post.text);

                  return (
                    <div
                      key={post.id}
                      className="bg-white border border-slate-200/80 rounded-3xl p-6 hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">
                              {displayName}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium truncate">
                              {userCompany?.name || "Verified Professional"}
                            </p>
                          </div>
                          {isUserVerified && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold tracking-wider shrink-0 uppercase">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>

                        {/* Card copy preview */}
                        <div className="relative">
                          <p className="text-xs md:text-sm text-slate-650 line-clamp-4 font-light leading-relaxed mb-6 whitespace-pre-line">
                            {displayBio}
                          </p>
                          {!isVerifiedUser && (
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                          )}
                        </div>
                      </div>

                      {/* Attributes footer */}
                      <div className="border-t border-slate-100 pt-4 mt-2 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-[#4FD1C5]" />
                            <span>{locality}</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-emerald-700 font-extrabold text-sm">
                            <IndianRupee className="h-3.5 w-3.5" />
                            <span>{rent.replace("₹", "")}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span suppressHydrationWarning>Posted {relativeDate}</span>
                          </div>
                          {isVerifiedUser ? (
                            <Link
                              href={`/posts/${post.id}`}
                              className="text-[#0A1B5C] font-bold hover:underline"
                            >
                              View Post
                            </Link>
                          ) : (
                            <Link
                              href="/signup"
                              className="text-[#4FD1C5] font-black hover:underline"
                            >
                              Signup to Contact
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Areas Covered Section */}
        <section className="py-16 md:py-24 px-6 max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 text-[#0A1B5C] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              <Compass className="h-4.5 w-4.5" /> Hyperlocal Presence
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
              Premium Areas Covered in Hyderabad
            </h2>
            <p className="text-slate-650 font-light leading-relaxed mb-8">
              We actively cover the major residential and commercial hubs in Hyderabad where tech companies and corporate professionals prefer to reside. Our listings cover locations such as:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mb-8">
            {localities.map((area) => (
              <div
                key={area}
                className="bg-white border border-slate-200 rounded-2xl p-2 font-bold text-slate-800 text-sm hover:border-slate-300 transition-colors flex items-center justify-center"
              >
                <span>{area}</span>
                {/* <span className="text-xs text-slate-400 font-medium">Sub-page coming soon</span> */}
              </div>
            ))}
          </div>

          {/* <p className="text-xs text-slate-400 font-light italic">
            * Note: Hyperlocal pages for Gachibowli, Madhapur, and Kondapur will be rolled out in the future scope.
          </p> */}
        </section>

        {/* FAQs Section */}
        <section className="bg-slate-100/60 border-t border-slate-200/50 md:py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0A1B5C]/5 border border-[#0A1B5C]/10 text-[#0A1B5C] rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                <HelpCircle className="h-4.5 w-4.5" /> Common Questions
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-500 font-light text-sm md:text-base">
                Everything you need to know about finding flatmates and shared accommodation in Hyderabad on Vouchins.
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3 flex items-start gap-2">
                    <span className="text-[#4FD1C5] font-extrabold">Q:</span>
                    <span>{faq.question}</span>
                  </h3>
                  <div className="text-slate-600 font-light leading-relaxed text-sm md:text-base pl-6">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Block */}
        <section className="bg-[#0A1B5C] text-white py-16 md:py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(79,209,197,0.1),transparent_50%)]" />
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4FD1C5]/10 border border-[#4FD1C5]/20 text-[#4FD1C5] rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <Users className="h-4.5 w-4.5" /> Exclusive Professional Community
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              Find Your Next Verified Flatmate in Hyderabad
            </h2>
            <p className="text-base md:text-lg text-slate-300 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Join Vouchins today to connect directly with corporate-verified professionals. Avoid unverified listings, brokers, and anonymous spam. It is free to post and browse listings.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto bg-[#4FD1C5] hover:bg-[#68ded3] text-[#0A1B5C] font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-[#4FD1C5]/15 hover:shadow-[#4FD1C5]/25 active:scale-95 text-center"
              >
                Join Now & Request Access
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto border border-white/25 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-2xl transition-all text-center"
              >
                How Verification Works
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
