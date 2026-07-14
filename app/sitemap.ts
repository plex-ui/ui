import type { MetadataRoute } from 'next';
import { source, componentsSource, iconsSource, blog } from '@/lib/source';

// Build-time stamp for routes that don't have a per-page lastModified
// (the homepage, /compare/*, /blog index — these
// are all hand-built React pages without an MDX `lastModified`
// frontmatter, so they get the deploy date instead of the old
// hardcoded fallback). Crawlers use this to prioritise re-crawl
// frequency, so it's important it actually moves with the build.
const STATIC_UPDATED = new Date().toISOString().split('T')[0];

function toISODate(d: Date | string | undefined): string {
  if (!d) return STATIC_UPDATED;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return d;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://plexui.com';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: STATIC_UPDATED, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/compare/shadcn-ui`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/untitled-ui`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/radix-ui`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/mui`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/compare/ant-design`, lastModified: STATIC_UPDATED, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const fromSource = (
    src: typeof source | typeof componentsSource | typeof iconsSource,
  ): MetadataRoute.Sitemap =>
    src.getPages().map((page) => ({
      url: `${baseUrl}${page.url}`,
      lastModified: toISODate((page.data as { lastModified?: Date }).lastModified),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const docsPages = [
    ...fromSource(source),
    ...fromSource(componentsSource),
    ...fromSource(iconsSource),
  ];

  const blogIndex: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/blog`, lastModified: STATIC_UPDATED, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const blogPages: MetadataRoute.Sitemap = blog.getPages().map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: toISODate(
      (page.data as { lastModified?: Date }).lastModified ?? page.data.date,
    ),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogIndex, ...blogPages, ...docsPages];
}
