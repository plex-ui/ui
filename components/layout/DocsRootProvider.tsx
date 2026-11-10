'use client';

import { lazy, type ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

// Loaded on first open, like Fumadocs' own default dialog
const DocsSearchDialog = lazy(() => import('./DocsSearchDialog'));

/* The theme goes to html as the class the docs read and as the data-theme the Plex UI tokens read
   (:where([data-theme]) and light-dark()). next-themes sets both in its script before the first paint, so a
   preview loaded in the dark paints dark at once (Safari picks its status bar color as the page loads). */
const THEME = { attribute: ['class', 'data-theme'] as ('class' | 'data-theme')[] };

/** Fumadocs' RootProvider with the docs search dialog (see DocsSearchDialog). */
export function DocsRootProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider search={{ SearchDialog: DocsSearchDialog }} theme={THEME}>
      {children}
    </RootProvider>
  );
}
