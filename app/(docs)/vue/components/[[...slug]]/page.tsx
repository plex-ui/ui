import { vueComponentsSource } from '@/lib/source';
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

// Vue component pages share the React pages' layout rules, structured data
// and metadata, under /vue/components/<slug>.
const SECTION = 'components';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = vueComponentsSource.getPage(params.slug);
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
  const pageUrl = `https://plexui.com${page.url}`;
  const dateModified = (page.data as { lastModified?: Date }).lastModified?.toISOString();

  const techArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${page.data.title} (Vue)`,
    description: page.data.metaDescription ?? page.data.description,
    url: pageUrl,
    ...(dateModified && { dateModified }),
    publisher: { '@type': 'Organization', name: 'Plex UI', url: 'https://plexui.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Plex UI', item: 'https://plexui.com' },
      { '@type': 'ListItem', position: 2, name: 'Vue components', item: 'https://plexui.com/vue/components' },
      ...(params.slug ? [{ '@type': 'ListItem', position: 3, name: page.data.title, item: pageUrl }] : []),
    ],
  };

  const itemListJsonLd = !params.slug
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Plex UI Vue Components',
        description: page.data.description,
        url: pageUrl,
        itemListElement: vueComponentsSource
          .getPages()
          .filter((p) => p.url !== '/vue/components')
          .map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://plexui.com${p.url}`,
            name: p.data.title,
          })),
      }
    : null;

  return (
    <DocsPageWithMobileTOC
      toc={showRightToc ? (tocItems ?? []) : []}
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
      <DocsViewportState showLeftSidebar={showLeftSidebar} showRightSidebar={showRightToc} />
      <div className="plex-docs-title-row">
        <DocsTitle className="plex-docs-title">{page.data.title}</DocsTitle>
        {showPageNav && <PageNav compact className="plex-docs-nav plex-docs-nav-top" />}
      </div>
      <DocsDescription className="plex-docs-description">{page.data.description}</DocsDescription>
      {params.slug && <FrameworkSwitch framework="vue" slug={params.slug.join('/')} />}
      <DocsBody className="plex-docs-body">
        <MDX components={getMDXComponents()} />
        {params.slug?.[0] && <RelatedComponents slug={params.slug[0]} framework="vue" />}
      </DocsBody>
      {showPageNav && <PageNav className="plex-docs-nav plex-docs-nav-bottom" />}
    </DocsPageWithMobileTOC>
  );
}

export function generateStaticParams() {
  return vueComponentsSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<import('next').Metadata> {
  const params = await props.params;
  const page = vueComponentsSource.getPage(params.slug);
  if (!page) notFound();

  const slug = params.slug;
  const canonicalPath = slug ? `/vue/components/${slug.join('/')}` : '/vue/components';
  const fullUrl = `https://plexui.com${canonicalPath}`;
  const title = `${page.data.title} (Vue)`;
  // OG titles bypass the layout's `%s — Plex UI` template
  const brandedTitle = `${title} — Plex UI`;
  const description = page.data.metaDescription ?? page.data.description;
  const ogImageUrl = `https://plexui.com/api/og?type=vue-components${slug ? `&slug=${slug.join('/')}` : ''}`;

  return {
    title,
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
