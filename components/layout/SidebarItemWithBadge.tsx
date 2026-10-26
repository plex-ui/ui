'use client';

import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import type { FC } from 'react';
import type * as PageTree from 'fumadocs-core/page-tree';
import { Badge } from '@plexui/ui/components/Badge';
import { SidebarMenuBadge } from '@plexui/ui/components/Sidebar';
import { NEW_COMPONENT_SLUGS } from '@/lib/docs-new-badges';
import { frameworkUrl } from '@/lib/framework-urls';

/* Minimal base — all visual states are handled by globals.css sidebar rules */
const SIDEBAR_ITEM_BASE =
  'relative flex flex-row items-center gap-2 text-start wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0';

function slugFromUrl(url: string): string {
  return url.replace(/^\/docs\/components\//, '').replace(/\/$/, '');
}

function normalizePath(p: string): string {
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/**
 * Sections entries that render their sub-pages as a separate list elsewhere
 * in the sidebar (the alphabetical Components group). For these, the parent
 * link should activate ONLY on its own index page — the leaf entry handles
 * sub-page highlighting.
 *
 * Same applies to `/docs` (Introduction) — otherwise it would light up on
 * every page in docs because every URL is a prefix of `/docs`.
 */
const EXACT_MATCH_URLS = new Set(['/docs', '/components', '/vue/components']);

/**
 * Active when the current pathname IS the link's URL or sits under it
 * (`/icons/plex` activates the `/icons` Sections entry).
 *
 * For URLs in `EXACT_MATCH_URLS`, only an exact match counts — see comment
 * above for the reasoning.
 *
 * Replaces fumadocs' default `SidebarItem` strict-equality match — that one
 * leaves "Icons" inactive whenever the user drills into a sub-page.
 */
function isActivePath(pathname: string, url: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(url);
  if (EXACT_MATCH_URLS.has(target)) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export const SidebarItemWithBadge: FC<{ item: PageTree.Item }> = ({ item }) => {
  const pathname = usePathname();
  const slug = slugFromUrl(item.url);
  const isNew = (NEW_COMPONENT_SLUGS as readonly string[]).includes(slug);
  const href = frameworkUrl(pathname, item.url);
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      data-active={active ? 'true' : 'false'}
      className={SIDEBAR_ITEM_BASE}
    >
      {item.name}
      {isNew && (
        <SidebarMenuBadge className="ps-1.5">
          <Badge size="sm" color="info">
            New
          </Badge>
        </SidebarMenuBadge>
      )}
    </Link>
  );
};
