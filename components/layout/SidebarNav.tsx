'use client';

import Link from 'next/link';
import { usePathname } from 'fumadocs-core/framework';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { useEffect, useMemo } from 'react';
import type { DocsSectionNavItem } from '@/lib/docs-navigation';

function normalizePath(pathname: string) {
  if (!pathname) return '/';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function isActivePath(currentPath: string, href: string) {
  const current = normalizePath(currentPath);
  const target = normalizePath(href);
  return current === target || current.startsWith(`${target}/`);
}

function getSectionSlug(pathname: string) {
  const normalized = normalizePath(pathname);
  const parts = normalized.split('/').filter(Boolean);
  const docsIndex = parts.indexOf('docs');
  return docsIndex === -1 ? null : parts[docsIndex + 1] ?? null;
}

export function SidebarNav({ sections }: { sections: DocsSectionNavItem[] }) {
  const pathname = usePathname();
  const { setOpen, closeOnRedirect: closeOnRedirectRef } = useSidebar();

  // Auto-open sidebar when navigated from another layout with the flag set
  useEffect(() => {
    const flag = sessionStorage.getItem('plex-keep-sidebar');
    if (flag) {
      sessionStorage.removeItem('plex-keep-sidebar');
      setOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSection = useMemo(() => getSectionSlug(pathname), [pathname]);

  const navLinks = useMemo(
    () =>
      [
        { slug: 'home', label: 'Home', href: '/', matchSlugs: undefined as string[] | undefined, active: pathname === '/' },
        {
          slug: 'blog',
          label: 'Blog',
          href: '/blog',
          matchSlugs: undefined as string[] | undefined,
          active: isActivePath(pathname, '/blog'),
        },
        ...sections.map((item) => ({
          ...item,
          active:
            (currentSection != null &&
              (item.matchSlugs?.includes(currentSection) ?? currentSection === item.slug)) ||
            isActivePath(pathname, item.href),
        })),
      ],
    [currentSection, pathname, sections]
  );

  const closeSidebar = () => setOpen(false);

  const keepSidebarOpen = () => {
    // Within the same layout, just prevent auto-close
    closeOnRedirectRef.current = false;
    // Across layouts (home → docs), set a sessionStorage flag
    sessionStorage.setItem('plex-keep-sidebar', '1');
  };

  return (
    <nav className="sidebar-nav" aria-label="Site navigation">
      <div className="sidebar-nav-links">
        {navLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-link${item.active ? ' sidebar-nav-link-active' : ''}`}
            onClick={item.href.startsWith('/docs') ? keepSidebarOpen : closeSidebar}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
