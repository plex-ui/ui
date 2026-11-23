import type { ReactNode } from 'react';
import { reactNativeComponentsSource } from '@/lib/source';
import { DocsShell } from '@/components/layout/DocsShell';

// The React Native pages list their own components in the sidebar: most React components have no React Native page
// yet, and a few React Native ones (the sheets, Chip, List, Text) have no React page
export default function Layout({ children }: { children: ReactNode }) {
  return <DocsShell section="components" components={reactNativeComponentsSource.pageTree}>{children}</DocsShell>;
}
