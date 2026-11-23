import type { ReactNode } from 'react';
import { componentsSource } from '@/lib/source';
import { DocsShell } from '@/components/layout/DocsShell';

// The icon libraries in the sidebar
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell section="icons" components={componentsSource.pageTree}>
      {children}
    </DocsShell>
  );
}
