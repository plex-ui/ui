import type { ReactNode } from 'react';
import { componentsSource } from '@/lib/source';
import { DocsShell } from '@/components/layout/DocsShell';

// The Vue component pages share the React ones' sidebar, its links mapped to the Vue pages
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell section="components" components={componentsSource.pageTree}>
      {children}
    </DocsShell>
  );
}
