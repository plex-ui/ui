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

/**
 * Wraps DocsPage and enables tableOfContentPopover only after mount.
 * Avoids Radix useId() hydration mismatch (different IDs on server vs client).
 */
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
      tableOfContentPopover={{ enabled: popoverEnabled && showRightToc }}
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
