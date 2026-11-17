'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, type ComponentProps } from 'react';

/**
 * A next/link that prefetches its page only when pointed at, focused or
 * touched, never because it scrolled into view. On Vercel every prefetch of
 * a prerendered page is an ISR read, and the docs sidebar alone has dozens of
 * links in view, so viewport prefetching spent ~50 reads per page view.
 */
const HoverPrefetchLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof NextLink>>(
  function HoverPrefetchLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }, ref) {
    const router = useRouter();
    const prefetch = () => {
      if (typeof href === 'string' && href.startsWith('/')) router.prefetch(href);
    };
    return (
      <NextLink
        ref={ref}
        href={href}
        prefetch={false}
        onMouseEnter={(event) => {
          prefetch();
          onMouseEnter?.(event);
        }}
        onFocus={(event) => {
          prefetch();
          onFocus?.(event);
        }}
        onTouchStart={(event) => {
          prefetch();
          onTouchStart?.(event);
        }}
        {...props}
      />
    );
  },
);

export default HoverPrefetchLink;
