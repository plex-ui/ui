import { componentsSource, reactNativeComponentsSource, vueComponentsSource } from '@/lib/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { FrameworkSwitch, type Framework } from '@/components/docs/FrameworkSwitch';
import { PageNav } from '@/components/docs/PageNav';
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

// React Native component pages share the React pages' layout rules under /react-native/components/<slug>. Every
// example is live: @plexui/react-native drawn by react-native-web, as iOS or Android, light or dark.
const SECTION = 'components';

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = reactNativeComponentsSource.getPage(params.slug);
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
  // The switch offers the React and Vue pages of the same component where they exist
  const available: Framework[] = params.slug
    ? [
        ...(componentsSource.getPage(params.slug) ? (['react'] as const) : []),
        ...(vueComponentsSource.getPage(params.slug) ? (['vue'] as const) : []),
        'react-native',
      ]
    : ['react-native'];

  return (
    <DocsPageWithMobileTOC
      toc={showRightToc ? (tocItems ?? []) : []}
      showRightToc={showRightToc}
      full={page.data.full}
      className={pageClassName}
      footer={{ enabled: false }}
    >
      <DocsViewportState showLeftSidebar={showLeftSidebar} showRightSidebar={showRightToc} />
      <div className="plex-docs-title-row">
        <DocsTitle className="plex-docs-title">{page.data.title}</DocsTitle>
        {showPageNav && <PageNav compact className="plex-docs-nav plex-docs-nav-top" />}
      </div>
      {/* The switch above the description, so it stays in place when you change framework */}
      <FrameworkSwitch framework="react-native" slug={params.slug?.join('/') ?? ''} available={available} />
      <DocsDescription className="plex-docs-description">{page.data.description}</DocsDescription>
      <DocsBody className="plex-docs-body">
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {showPageNav && <PageNav className="plex-docs-nav plex-docs-nav-bottom" />}
    </DocsPageWithMobileTOC>
  );
}

export function generateStaticParams() {
  return reactNativeComponentsSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<import('next').Metadata> {
  const params = await props.params;
  const page = reactNativeComponentsSource.getPage(params.slug);
  if (!page) notFound();
  const slug = params.slug;
  const canonicalPath = slug ? `/react-native/components/${slug.join('/')}` : '/react-native/components';
  return {
    title: `${page.data.title} (React Native)`,
    description: page.data.metaDescription ?? page.data.description,
    alternates: { canonical: `https://plexui.com${canonicalPath}` },
    // Unreleased: kept out of search engines until @plexui/react-native ships
    robots: { index: false, follow: false },
  };
}
