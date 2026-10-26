'use client';

import { lazy, type ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

// Loaded on first open, like Fumadocs' own default dialog
const DocsSearchDialog = lazy(() => import('./DocsSearchDialog'));

/** Fumadocs' RootProvider with the docs search dialog (see DocsSearchDialog). */
export function DocsRootProvider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog: DocsSearchDialog }}>{children}</RootProvider>;
}
