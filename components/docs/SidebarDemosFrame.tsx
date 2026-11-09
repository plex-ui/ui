'use client';

import type { ReactNode } from 'react';
import { NavigationButton } from '@plexui/ui/components/Button';
import { Page } from '@plexui/ui/components/Page';
import {
  Sidebar,
  SidebarInset,
  SidebarMobile,
  SidebarMobileMenuButton,
  SidebarProvider,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from '@plexui/ui/components/Sidebar';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import s from './SidebarDemos.module.css';
import { isSidebarNavigationSelection } from './SidebarDemos.utils';

export function ResponsiveSidebarProvider({ className, open, variant, ...props }: SidebarProviderProps) {
  const wide = useBreakpoint('md');
  return <SidebarProvider {...props} className={[s.Frame, className].filter(Boolean).join(' ')} open={wide ? open : true} variant={wide ? variant : 'sidebar'} />;
}

/** Reuses one navigation tree in the desktop rail and the mobile drawer. */
export function ResponsiveSidebar({ children, ...props }: SidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  if (!isMobile) return <Sidebar {...props}>{children}</Sidebar>;
  return (
    <SidebarMobile contained className={s.Drawer} aria-label="Navigation">
      <Page surface="grouped">
        <Toolbar titleStyle="large">
          <Toolbar.Title>Navigation</Toolbar.Title>
          <Toolbar.Trailing>
            <NavigationButton action="close" aria-label="Close menu" onClick={() => setOpenMobile(false)} />
          </Toolbar.Trailing>
        </Toolbar>
        <Page.Content className={s.NavigationContent} onClick={(event) => {
          if (!event.defaultPrevented && isSidebarNavigationSelection(event.target)) setOpenMobile(false);
        }}>
          {children}
        </Page.Content>
      </Page>
    </SidebarMobile>
  );
}

export function SidebarDemoPage({ title, children }: { title: ReactNode; children: ReactNode }) {
  const { isMobile } = useSidebar();
  return (
    <SidebarInset className={s.Inset}>
      {isMobile ? (
        <Page>
          <Page.Header>
            <Page.Bar>
              <Page.Leading><SidebarMobileMenuButton /></Page.Leading>
              <Page.Title>{title}</Page.Title>
            </Page.Bar>
          </Page.Header>
          <Page.Content>{children}</Page.Content>
        </Page>
      ) : (
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-4">{title}</h1>
          {children}
        </div>
      )}
    </SidebarInset>
  );
}
