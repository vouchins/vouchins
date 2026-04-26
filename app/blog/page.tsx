import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { format } from "date-fns";
import { ArrowRight, BookOpen } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";

export const revalidate = 60; // Revalidate cache every 60 seconds

export default async function BlogIndexPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { data: posts } = await supabase
    .from("blog_posts")
    .select(
      `
      id, slug, title, excerpt, cover_image_url, published_at, created_at,
      author:users!blog_posts_author_id_fkey(first_name)
    `,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <PublicNavbar />

      <main className="container mx-auto px-4 max-w-5xl mt-12">
        <div className="mb-12">
          {/* <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">
              Vouchins Blog
            </h1>
          </div> */}
          <p className="text-lg text-neutral-600 max-w-2xl">
            Insights on trust, safety, and professional networking from the
            Vouchins team.
          </p>
        </div>

        {!posts || posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200">
            <h3 className="text-xl font-bold text-neutral-900">
              Check back soon!
            </h3>
            <p className="text-neutral-500 mt-2">
              We're working on our first few articles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                href={`/blog/${post.slug}`}
                key={post.id}
                className="group flex flex-col bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="h-48 bg-neutral-100 relative overflow-hidden">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <img
                      src="/images/logobgwhite.png"
                      alt="Vouchins"
                      className="w-full h-full object-contain p-8 bg-white group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wider">
                    {format(
                      new Date(post.published_at || post.created_at),
                      "MMM d, yyyy",
                    )}
                  </p>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-neutral-600 line-clamp-3 mb-4 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm font-bold text-indigo-600 mt-auto">
                    Read article <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
