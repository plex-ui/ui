import Link from 'next/link';
import type { Metadata } from 'next';
import { blog } from '@/lib/source';

export const metadata: Metadata = {
  title: 'Blog — Plex UI',
  description:
    'Engineering notes on design systems, component architecture, and building consistent UI with Plex UI.',
  alternates: {
    canonical: 'https://plexui.com/blog',
  },
  openGraph: {
    title: 'Blog — Plex UI',
    description:
      'Engineering notes on design systems, component architecture, and building consistent UI with Plex UI.',
    url: 'https://plexui.com/blog',
    images: [{ url: '/opengraph-image.png' }],
  },
  twitter: {
    title: 'Blog — Plex UI',
    description:
      'Engineering notes on design systems, component architecture, and building consistent UI with Plex UI.',
  },
};

function parseDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parseDate(value));
}

export default function BlogIndexPage() {
  const posts = blog
    .getPages()
    .sort((a, b) => parseDate(b.data.date).getTime() - parseDate(a.data.date).getTime());

  return (
    <main className="flex flex-1 flex-col bg-fd-background px-6 py-16 md:py-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-fd-muted-foreground uppercase">Plex UI Blog</p>
          <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl">Notes from the system layer</h1>
          <p className="max-w-3xl text-base leading-relaxed text-fd-muted-foreground">
            Practical writing on design systems, component APIs, and the details that keep product UI consistent.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2" aria-label="Blog posts">
          {posts.map((post) => (
            <Link key={post.url} href={post.url} className="group block rounded-xl border border-fd-border p-6 transition-colors hover:bg-fd-accent/30">
              <div className="mb-4 text-xs text-fd-muted-foreground">
                <time dateTime={parseDate(post.data.date).toISOString()}>{formatDate(post.data.date)}</time>
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-fd-foreground">
                {post.data.title}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">{post.data.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
