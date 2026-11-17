'use client';

import type { AnchorHTMLAttributes } from 'react';
import HoverPrefetchLink from './HoverPrefetchLink';

/**
 * The MDX `a`: an external URL opens in a new tab as fumadocs' link does; a page
 * link prefetches only on hover, focus or touch (see HoverPrefetchLink).
 */
export function MdxLink({ href = '#', children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (/^\w+:/.test(href) || href.startsWith('//')) {
    return (
      <a href={href} rel="noreferrer noopener" target="_blank" {...props}>
        {children}
      </a>
    );
  }
  return (
    <HoverPrefetchLink href={href} {...props}>
      {children}
    </HoverPrefetchLink>
  );
}
