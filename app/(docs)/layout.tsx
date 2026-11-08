import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/layout.shared';
import { source, componentsSource, iconsSource } from '@/lib/source';
import { DocsGlobalNav } from '@/components/layout/DocsGlobalNav';
import { SidebarItemWithBadge } from '@/components/layout/SidebarItemWithBadge';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { KeepLinkedSectionInView } from '@/components/layout/KeepLinkedSectionInView';
import { buildDocsTreeNavigation } from '@/lib/docs-navigation';

export default function Layout({ children }: { children: ReactNode }) {
  const options = baseOptions();
  const docsNavigation = buildDocsTreeNavigation({
    docs: source.pageTree,
    components: componentsSource.pageTree,
    icons: iconsSource.pageTree,
  });

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
        component: <DocsGlobalNav sections={docsNavigation.sections} />,
      }}
    >
      {children}
      <KeepLinkedSectionInView />
    </DocsLayout>
  );
}
