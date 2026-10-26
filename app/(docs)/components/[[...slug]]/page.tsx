import { componentsSource, vueComponentsSource } from '@/lib/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { FrameworkSwitch } from '@/components/docs/FrameworkSwitch';
import { PageNav } from '@/components/docs/PageNav';
import { RelatedComponents } from '@/components/docs/RelatedComponents';
import { DocsViewportState } from '@/components/layout/DocsViewportState';
import {
  DocsPageWithMobileTOC,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from '@/components/docs/DocsPageWithMobileTOC';
import {
  shouldShowLeftSidebar,
  shouldShowPageNav,
  shouldShowRightToc,
} from '@/lib/docs-layout-rules';

const SECTION = 'components';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = componentsSource.getPage(params.slug);
  if (!page) notFound();

  const sourceToc = page.data.toc ?? [];
  const tocItems: TOCItemType[] | undefined = shouldShowRightToc(SECTION, sourceToc)
    ? sourceToc
    : undefined;

  const showLeftSidebar = shouldShowLeftSidebar(SECTION);
  const showRightToc = Boolean(tocItems && tocItems.length > 0);
  const showPageNav = shouldShowPageNav(SECTION);
  const pageClassName = [
    'plex-docs-page',
    showLeftSidebar ? '' : 'plex-docs-page--no-left-sidebar',
    showRightToc ? '' : 'plex-docs-page--no-right-sidebar',
  ]
    .filter(Boolean)
    .join(' ');

  const MDX = page.data.body;
  // React / Vue switch, only for components that have a Vue page
  const vueSlug =
    params.slug && vueComponentsSource.getPage(params.slug) ? params.slug.join('/') : null;
  const pageUrl = `https://plexui.com${page.url}`;
  const dateModified = (page.data as { lastModified?: Date }).lastModified?.toISOString();

  const toc = showRightToc ? (tocItems ?? []) : [];

  const techArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.data.title,
    description: page.data.metaDescription ?? page.data.description,
    url: pageUrl,
    ...(dateModified && { dateModified }),
    publisher: { '@type': 'Organization', name: 'Plex UI', url: 'https://plexui.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  // BreadcrumbList lets Google render `Plex UI › Components › Button`
  // in the SERP entry instead of just the URL slug.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Plex UI', item: 'https://plexui.com' },
      ...(params.slug
        ? [
            { '@type': 'ListItem', position: 2, name: 'Components', item: 'https://plexui.com/components' },
            { '@type': 'ListItem', position: 3, name: page.data.title, item: pageUrl },
          ]
        : [{ '@type': 'ListItem', position: 2, name: 'Components', item: 'https://plexui.com/components' }]),
    ],
  };

  // ItemList on the section index helps Google understand /components
  // as a catalog and surface individual entries as sitelinks. Only
  // emitted on the index (no slug) — per-page TechArticle handles the
  // single-component view.
  const itemListJsonLd = !params.slug
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Plex UI Components',
        description: page.data.description,
        url: pageUrl,
        itemListElement: componentsSource.getPages().map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://plexui.com${p.url}`,
          name: p.data.title,
        })),
      }
    : null;

  return (
    <DocsPageWithMobileTOC
      toc={toc}
      showRightToc={showRightToc}
      full={page.data.full}
      className={pageClassName}
      footer={{ enabled: false }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <DocsViewportState
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightToc}
      />
      <div className="plex-docs-title-row">
        <DocsTitle className="plex-docs-title">{page.data.title}</DocsTitle>
        {showPageNav && <PageNav compact className="plex-docs-nav plex-docs-nav-top" />}
      </div>
      <DocsDescription className="plex-docs-description">
        {page.data.description}
      </DocsDescription>
      {vueSlug && <FrameworkSwitch framework="react" slug={vueSlug} />}
      <DocsBody className="plex-docs-body">
        <MDX components={getMDXComponents()} />
        {/* `Related components` card row at the bottom of every
         * /components/<slug> page — distributes link equity, helps
         * users discover the catalog from any single page they land
         * on. Skipped for the section index (`/components`) where
         * `params.slug` is undefined. */}
        {params.slug?.[0] && <RelatedComponents slug={params.slug[0]} />}
      </DocsBody>
      {showPageNav && <PageNav className="plex-docs-nav plex-docs-nav-bottom" />}
    </DocsPageWithMobileTOC>
  );
}

export function generateStaticParams() {
  return componentsSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<import('next').Metadata> {
  const params = await props.params;
  const page = componentsSource.getPage(params.slug);
  if (!page) notFound();

  const slug = params.slug;
  const canonicalPath = slug ? `/components/${slug.join('/')}` : '/components';
  const fullUrl = `https://plexui.com${canonicalPath}`;
  // OG titles bypass the layout's `%s — Plex UI` template, so brand
  // the title manually for shared links.
  const brandedTitle = `${page.data.title} — Plex UI`;
  const description = page.data.metaDescription ?? page.data.description;
  // Per-page OG image rendered by /api/og — the route reads the same
  // page title + description we pass via `slug` and produces a branded
  // PNG instead of every shared link reusing the homepage card.
  const ogImageUrl = `https://plexui.com/api/og?type=components${slug ? `&slug=${slug.join('/')}` : ''}`;

  return {
    title: page.data.title,
    description,
    alternates: { canonical: fullUrl },
    openGraph: {
      title: brandedTitle,
      description,
      url: fullUrl,
      siteName: 'Plex UI',
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@ui_plex',
      title: brandedTitle,
      description,
      images: [ogImageUrl],
    },
  };
}
