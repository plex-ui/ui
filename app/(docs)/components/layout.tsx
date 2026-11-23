import type { ReactNode } from 'react';
import { componentsSource } from '@/lib/source';
import { DocsShell } from '@/components/layout/DocsShell';

// The React component pages: the sidebar lists the components, in their groups
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell section="components" components={componentsSource.pageTree}>
      {children}
    </DocsShell>
  );
}
