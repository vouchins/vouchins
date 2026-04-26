import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
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

  const { data: post } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      author:users!blog_posts_author_id_fkey(first_name)
    `,
    )
    .eq("slug", resolvedParams.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Vouchins"
                width={140}
                height={40}
                className="object-contain"
                priority
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-3xl py-12">
        <Link
          href="/blog"
          className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-8 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to blog
        </Link>

        <article>
          <header className="mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight mb-6">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-neutral-500 text-sm border-y border-neutral-100 py-4">
              <span className="font-bold text-neutral-900">
                {post.author?.first_name || "Vouchins Team"}
              </span>
              <span>•</span>
              <time>
                {format(
                  new Date(post.published_at || post.created_at),
                  "MMMM d, yyyy",
                )}
              </time>
            </div>
          </header>

          {post.cover_image_url && (
            <div className="mb-10 rounded-2xl overflow-hidden bg-neutral-100">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-auto object-cover max-h-[400px]"
              />
            </div>
          )}

          <div
            className="prose prose-lg prose-indigo max-w-none text-neutral-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          ></div>
        </article>
      </main>
    </div>
  );
}
