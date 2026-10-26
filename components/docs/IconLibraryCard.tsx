import Link from 'fumadocs-core/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Visual grid wrapper for the /icons index page — two columns from
 * `sm` up (four libraries make a 2x2 grid), single column on small
 * screens. Each cell renders an `<IconLibraryCard>`.
 */
export function IconLibraryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

interface IconLibraryCardProps {
  /** URL slug — links to `/icons/{slug}`. */
  slug: string;
  /** Display name shown beneath the preview. */
  title: string;
  /** Short one-liner describing the library. */
  description: string;
  /** Path to the brand logo (PNG/SVG) under `/public/icon-libraries/`. */
  logo: string;
  /** Optional icon count shown right of the title (e.g. 1914). */
  count?: number;
  /** Optional pill rendered next to the title (e.g. "Built-in"). */
  badge?: string;
}

/**
 * Card matching the shadcndesign /icons gallery: a soft gray hatched
 * canvas on top, a round white "puck" centered inside it holding the real
 * library logo, then the title and one-line description below.
 */
export function IconLibraryCard({
  slug,
  title,
  description,
  logo,
  count,
  badge,
}: IconLibraryCardProps) {
  return (
    <Link
      href={`/icons/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border transition-colors hover:border-fd-foreground/30"
    >
      <div className="relative flex aspect-[2/1] w-full items-center justify-center bg-fd-accent">
        <div className="flex size-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <Image
            src={logo}
            alt=""
            width={56}
            height={56}
            className="size-14 object-contain"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="not-prose text-sm font-semibold truncate">{title}</h3>
            {badge && (
              <span className="rounded-full bg-fd-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fd-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {count != null && (
            <span className="shrink-0 text-xs text-fd-muted-foreground tabular-nums">
              {count.toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-sm text-fd-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
