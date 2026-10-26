import { vueComponentsSource } from '@/lib/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import { FrameworkSwitch } from '@/components/docs/FrameworkSwitch';
import { DocsViewportState } from '@/components/layout/DocsViewportState';
import {
  DocsPageWithMobileTOC,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from '@/components/docs/DocsPageWithMobileTOC';
import { shouldShowLeftSidebar, shouldShowRightToc } from '@/lib/docs-layout-rules';

// Vue component pages share the React pages' layout rules. They are a
// proof of concept: noindex and absent from the sitemap and main nav.
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
  const pageClassName = [
    'plex-docs-page',
    showLeftSidebar ? '' : 'plex-docs-page--no-left-sidebar',
    showRightToc ? '' : 'plex-docs-page--no-right-sidebar',
  ]
    .filter(Boolean)
    .join(' ');

  const MDX = page.data.body;

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
      </div>
      <DocsDescription className="plex-docs-description">{page.data.description}</DocsDescription>
      {params.slug && <FrameworkSwitch framework="vue" slug={params.slug.join('/')} />}
      <DocsBody className="plex-docs-body">
        <MDX components={getMDXComponents()} />
      </DocsBody>
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

  return {
    title: `${page.data.title} (Vue)`,
    description: page.data.metaDescription ?? page.data.description,
    alternates: { canonical: `https://plexui.com${canonicalPath}` },
    robots: { index: false, follow: true },
  };
}
