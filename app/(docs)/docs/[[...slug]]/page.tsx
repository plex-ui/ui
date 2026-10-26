import { source } from '@/lib/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { PageNav } from '@/components/docs/PageNav';
import { DocsViewportState } from '@/components/layout/DocsViewportState';
import { getDocsSectionRedirect } from '@/lib/docs-redirects';
import {
  DocsPageWithMobileTOC,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from '@/components/docs/DocsPageWithMobileTOC';
import {
  getSectionFromSlug,
  shouldShowLeftSidebar,
  shouldShowPageNav,
  shouldShowRightToc,
} from '@/lib/docs-layout-rules';

function getCustomToc(slug?: string[]): TOCItemType[] {
  if (!slug || slug.length === 0) return [];

  if (slug[0] === 'foundations' && slug[1] === 'design-tokens') {
    return [
      { title: 'Text colors', url: '#text-colors', depth: 2 },
      { title: 'Semantic colors', url: '#semantic-colors', depth: 2 },
      { title: 'Fonts', url: '#fonts', depth: 2 },
      { title: 'Radius', url: '#radius', depth: 2 },
      { title: 'Shadows', url: '#shadows', depth: 2 },
      { title: 'Breakpoints', url: '#breakpoints', depth: 2 },
      { title: 'Motion', url: '#motion', depth: 2 },
    ];
  }

  if (slug[0] === 'foundations' && slug[1] === 'colors') {
    return [
      { title: 'Grayscale', url: '#grayscale', depth: 2 },
      { title: 'Alphas', url: '#alphas', depth: 2 },
      { title: 'Primary colors', url: '#primary-colors', depth: 2 },
    ];
  }

  return [];
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const sectionRedirect = getDocsSectionRedirect(params.slug);
  if (sectionRedirect) {
    redirect(sectionRedirect);
  }

  const page = source.getPage(params.slug);
  if (!page) notFound();

  const section = getSectionFromSlug(params.slug);
  const customToc = getCustomToc(params.slug);
  const sourceToc =
    customToc.length > 0 ? customToc : (page.data.toc ?? []);
  const tocItems: TOCItemType[] | undefined = shouldShowRightToc(section, sourceToc)
    ? sourceToc
    : undefined;

  const showLeftSidebar = shouldShowLeftSidebar(section);
  const showRightToc = Boolean(tocItems && tocItems.length > 0);
  const showPageNav = shouldShowPageNav(section);
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

  const toc = showRightToc ? (tocItems ?? []) : [];

  const techArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.data.title,
    description: page.data.description,
    url: pageUrl,
    ...(dateModified && { dateModified }),
    publisher: { '@type': 'Organization', name: 'Plex UI', url: 'https://plexui.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  // BreadcrumbList: walk the slug and emit one ListItem per path level
  // so Google can render `Plex UI › Docs › Foundations › Colors` in
  // the SERP entry. Intermediate segments are kebab-case URL parts —
  // title-case them for display.
  const slugParts = params.slug ?? [];
  const breadcrumbItems: Array<{ name: string; url: string }> = [
    { name: 'Plex UI', url: 'https://plexui.com' },
    { name: 'Docs', url: 'https://plexui.com/docs' },
  ];
  for (let i = 0; i < slugParts.length - 1; i++) {
    const seg = slugParts[i];
    breadcrumbItems.push({
      name: seg
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' '),
      url: `https://plexui.com/docs/${slugParts.slice(0, i + 1).join('/')}`,
    });
  }
  if (slugParts.length > 0) {
    breadcrumbItems.push({ name: page.data.title, url: pageUrl });
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

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
      <DocsBody className="plex-docs-body">
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {showPageNav && <PageNav className="plex-docs-nav plex-docs-nav-bottom" />}
    </DocsPageWithMobileTOC>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<import('next').Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const slug = params.slug;
  const canonicalPath = slug ? `/docs/${slug.join('/')}` : '/docs';
  const fullUrl = `https://plexui.com${canonicalPath}`;
  // OG titles bypass the layout's `%s — Plex UI` template, so brand
  // the title manually for shared links.
  const brandedTitle = `${page.data.title} — Plex UI`;
  const ogImageUrl = `https://plexui.com/api/og?type=docs${slug ? `&slug=${slug.join('/')}` : ''}`;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: fullUrl },
    openGraph: {
      title: brandedTitle,
      description: page.data.description,
      url: fullUrl,
      siteName: 'Plex UI',
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@ui_plex',
      title: brandedTitle,
      description: page.data.description,
      images: [ogImageUrl],
    },
  };
}
