'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { PreviewViewportProvider } from './PreviewViewport';
import type { TOCItemType } from 'fumadocs-core/toc';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Match the installed Fumadocs PageTOCPopover layout before its interactive
// content mounts. Its max-xl layout variable reserves the same grid track on SSR.
const tocPopoverPlaceholder = (
  <div
    aria-hidden="true"
    className="sticky top-(--fd-docs-row-2) z-10 [grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]"
  >
    <div className="h-10 border-b bg-fd-background/80" />
  </div>
);

/** Keep the TOC layout stable while deferring its Radix IDs until after hydration. */
export function DocsPageWithMobileTOC({
  toc,
  showRightToc,
  full,
  className,
  footer,
  children,
}: {
  toc: TOCItemType[];
  showRightToc: boolean;
  full?: boolean;
  className?: string;
  footer?: { enabled: boolean };
  children: ReactNode;
}) {
  const popoverEnabled = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);

  return (
    <PreviewViewportProvider>
    <DocsPage
      toc={showRightToc ? toc : []}
      tableOfContent={{ enabled: showRightToc }}
      tableOfContentPopover={{
        enabled: showRightToc,
        component: popoverEnabled ? undefined : tocPopoverPlaceholder,
      }}
      full={full}
      className={className}
      footer={footer ?? { enabled: false }}
    >
      {children}
    </DocsPage>
    </PreviewViewportProvider>
  );
}

export { DocsBody, DocsDescription, DocsTitle };
