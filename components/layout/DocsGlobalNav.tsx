'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { usePathname } from 'fumadocs-core/framework';
import { SidebarTrigger, useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { PanelLeft, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import type { DocsSectionNavItem } from '@/lib/docs-navigation';
import s from './DocsGlobalNav.module.css';

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

export function DocsGlobalNav({ sections }: { sections: DocsSectionNavItem[] }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { open } = useSidebar();

  useEffect(() => {
    document.documentElement.setAttribute('data-docs-width', 'wide');
    window.localStorage.setItem('plex-docs-width', 'wide');
  }, []);

  const isDark = resolvedTheme === 'dark';

  const currentSection = useMemo(() => getSectionSlug(pathname), [pathname]);
  const navLinks = useMemo(
    () =>
      sections.map((item) => ({
        ...item,
        active:
          (currentSection != null &&
            (item.matchSlugs?.includes(currentSection) ?? currentSection === item.slug)) ||
          isActivePath(pathname, item.href),
      })),
    [currentSection, pathname, sections]
  );

  const { setOpenSearch } = useSearchContext();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <header className={s.Header} id="plex-global-nav">
      <div className={s.Inner}>
        {/* Left column: brand */}
        <div className={s.Left}>
          <Link href="/" className={s.Brand}>
            <Image
              src="/favicon.svg"
              alt=""
              aria-hidden
              width={24}
              height={24}
              className={s.BrandIcon}
              priority
            />
            <span className={s.BrandText}>Plex UI</span>
          </Link>
        </div>

        {/* Center column: nav links (desktop only) */}
        {/* Order: Components → Icons → Docs → Blog. */}
        <nav className={s.NavLinks} aria-label="Primary">
          {(() => {
            const componentsLink = navLinks.find((item) => item.slug === 'components');
            const docsLink = navLinks.find((item) => item.slug === 'docs');
            const componentsActive = isActivePath(pathname, '/components');
            const iconsActive = isActivePath(pathname, '/icons');
            // Docs is active for everything under /docs/* EXCEPT routes
            // owned by their own top-nav entry (Components, Icons).
            const docsActive =
              docsLink != null &&
              isActivePath(pathname, '/docs') &&
              !componentsActive &&
              !iconsActive;
            return (
              <>
                {componentsLink && (
                  <Link
                    key={componentsLink.href}
                    href={componentsLink.href}
                    className={`${s.NavLink} ${componentsActive ? s.NavLinkActive : ''}`.trim()}
                  >
                    {componentsLink.label}
                  </Link>
                )}
                <Link
                  href="/icons"
                  className={`${s.NavLink} ${iconsActive ? s.NavLinkActive : ''}`.trim()}
                >
                  Icons
                </Link>
                {docsLink && (
                  <Link
                    key={docsLink.href}
                    href={docsLink.href}
                    className={`${s.NavLink} ${docsActive ? s.NavLinkActive : ''}`.trim()}
                  >
                    {docsLink.label}
                  </Link>
                )}
                <Link
                  href="/blog"
                  className={`${s.NavLink} ${isActivePath(pathname, '/blog') ? s.NavLinkActive : ''}`.trim()}
                >
                  Blog
                </Link>
              </>
            );
          })()}
        </nav>

        {/* Right column: search + GitHub + theme toggle + menu */}
        <div className={s.Right}>
          <button
            type="button"
            className={s.SearchButton}
            onClick={() => setOpenSearch(true)}
            aria-label="Search documentation"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={s.Icon} aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>

          <a
            href="https://github.com/plex-ui/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={s.GitHubLink}
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>

          <button
            type="button"
            className={s.ThemeToggle}
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
          >
            <svg className={s.ThemeIconLight} width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M11 0C11.5523 0 12 0.447715 12 1V3C12 3.55228 11.5523 4 11 4C10.4477 4 10 3.55228 10 3V1C10 0.447715 10.4477 0 11 0ZM3.22183 3.22183C3.61235 2.8313 4.24551 2.8313 4.63604 3.22183L6.05025 4.63604C6.44078 5.02656 6.44078 5.65973 6.05025 6.05025C5.65973 6.44078 5.02656 6.44078 4.63604 6.05025L3.22183 4.63604C2.8313 4.24551 2.8313 3.61235 3.22183 3.22183ZM18.7782 3.22183C19.1687 3.61235 19.1687 4.24551 18.7782 4.63604L17.364 6.05025C16.9734 6.44078 16.3403 6.44078 15.9497 6.05025C15.5592 5.65973 15.5592 5.02656 15.9497 4.63604L17.364 3.22183C17.7545 2.8313 18.3876 2.8313 18.7782 3.22183ZM11 8C9.34315 8 8 9.34315 8 11C8 12.6569 9.34315 14 11 14C12.6569 14 14 12.6569 14 11C14 9.34315 12.6569 8 11 8ZM6 11C6 8.23858 8.23858 6 11 6C13.7614 6 16 8.23858 16 11C16 13.7614 13.7614 16 11 16C8.23858 16 6 13.7614 6 11ZM0 11C0 10.4477 0.447715 10 1 10H3C3.55228 10 4 10.4477 4 11C4 11.5523 3.55228 12 3 12H1C0.447715 12 0 11.5523 0 11ZM18 11C18 10.4477 18.4477 10 19 10H21C21.5523 10 22 10.4477 22 11C22 11.5523 21.5523 12 21 12H19C18.4477 12 18 11.5523 18 11ZM6.05025 15.9497C6.44078 16.3403 6.44078 16.9734 6.05025 17.364L4.63604 18.7782C4.24551 19.1687 3.61235 19.1687 3.22183 18.7782C2.8313 18.3876 2.8313 17.7545 3.22183 17.364L4.63604 15.9497C5.02656 15.5592 5.65973 15.5592 6.05025 15.9497ZM15.9497 15.9497C16.3403 15.5592 16.9734 15.5592 17.364 15.9497L18.7782 17.364C19.1687 17.7545 19.1687 18.3876 18.7782 18.7782C18.3877 19.1687 17.7545 19.1687 17.364 18.7782L15.9497 17.364C15.5592 16.9734 15.5592 16.3403 15.9497 15.9497ZM11 18C11.5523 18 12 18.4477 12 19V21C12 21.5523 11.5523 22 11 22C10.4477 22 10 21.5523 10 21V19C10 18.4477 10.4477 18 11 18Z" fill="currentColor" />
            </svg>
            <svg className={s.ThemeIconDark} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.7836 0.470481C10.9676 0.765118 10.9855 1.13415 10.8309 1.44525C10.2994 2.51497 10 3.7211 10 5.00001C10 9.41829 13.5817 13 18 13L18.0575 12.9998C18.4049 12.9974 18.7287 13.1754 18.9127 13.47C19.0968 13.7647 19.1147 14.1337 18.9601 14.4448C17.325 17.7352 13.9279 20 10 20C4.47715 20 0 15.5229 0 10C0 4.50107 4.43841 0.038857 9.92838 0.000268937C10.2758 -0.00217271 10.5995 0.175844 10.7836 0.470481ZM8.40989 2.15803C4.75344 2.8954 2 6.12619 2 10C2 14.4183 5.58172 18 10 18C12.587 18 14.8886 16.7721 16.3516 14.8648C11.6131 14.0789 8 9.96139 8 5.00001C8 4.01361 8.1431 3.05953 8.40989 2.15803Z" fill="currentColor" />
            </svg>
          </button>

          {/* Mobile menu trigger — toggles between PanelLeft and X */}
          <SidebarTrigger className={s.MenuButton} aria-label={open ? 'Close menu' : 'Open menu'} data-plex-nav-trigger="">
            {open ? <X className={s.Icon} /> : <PanelLeft className={s.Icon} />}
          </SidebarTrigger>
        </div>
      </div>
    </header>
  );
}
