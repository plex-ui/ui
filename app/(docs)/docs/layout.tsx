import type { ReactNode } from 'react';
import { componentsSource } from '@/lib/source';
import { DocsShell } from '@/components/layout/DocsShell';

// The docs: Get Started, Foundations and AI & Distribution in the sidebar
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell section="docs" components={componentsSource.pageTree}>
      {children}
    </DocsShell>
  );
}
