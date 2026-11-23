import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type * as PageTree from 'fumadocs-core/page-tree';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { source, iconsSource } from '@/lib/source';
import { DocsGlobalNav } from '@/components/layout/DocsGlobalNav';
import { SidebarItemWithBadge } from '@/components/layout/SidebarItemWithBadge';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { KeepLinkedSectionInView } from '@/components/layout/KeepLinkedSectionInView';
import { buildDocsTreeNavigation, type DocsSection } from '@/lib/docs-navigation';

/**
 * The docs' frame: the global nav, the sidebar and the page. The sidebar lists the pages of the top nav's `section`:
 * the components, the docs or the icons. `components` is the tree of the component pages: the React pages (which the
 * Vue pages share, links mapped in SidebarItemWithBadge) or the React Native pages, which are a set of their own.
 */
export function DocsShell({
  section,
  components,
  children,
}: {
  section: DocsSection;
  components: PageTree.Root;
  children: ReactNode;
}) {
  const options = baseOptions();
  const docsNavigation = buildDocsTreeNavigation(
    {
      docs: source.pageTree,
      components,
      icons: iconsSource.pageTree,
    },
    section,
  );

  return (
    <DocsLayout
      tree={docsNavigation.tree}
      {...options}
      links={[]}
      githubUrl={undefined}
      searchToggle={{ enabled: false }}
      themeSwitch={{ enabled: false }}
      sidebar={{
        collapsible: false,
        prefetch: false,
        tabs: false,
        className: 'plex-docs-sidebar',
        components: { Item: SidebarItemWithBadge },
        banner: <SidebarNav sections={docsNavigation.sections} />,
      }}
      containerProps={{
        className: 'plex-docs-shell',
        style: {
          gridTemplate: `"header header header"
          "sidebar toc-popover toc"
          "sidebar main toc" 1fr / var(--fd-sidebar-width) minmax(0, 1fr) var(--fd-toc-width)`,
          transition: 'none',
        },
      }}
      nav={{
        ...options.nav,
        transparentMode: 'none',
        // fumadocs' own title link sits empty in the hidden sidebar header and
        // prefetched the home page on every docs view; the global nav has the brand link
        title: () => null,
        component: <DocsGlobalNav sections={docsNavigation.sections} />,
      }}
    >
      {children}
      <KeepLinkedSectionInView />
    </DocsLayout>
  );
}
