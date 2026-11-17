'use client';

import Link from '@/components/layout/HoverPrefetchLink';
import { Badge } from '@plexui/ui/components/Badge';
import { cn } from 'fumadocs-ui/utils/cn';

export function ComponentCard({
  title,
  href,
  isNew = false,
}: {
  title: string;
  href: string;
  isNew?: boolean;
}) {
  return (
    <Link
      href={href}
      data-card
      className={cn(
        'block rounded-xl border bg-fd-card p-4 text-fd-card-foreground transition-colors',
        'hover:bg-fd-accent/80',
        '@max-lg:col-span-full'
      )}
    >
      <h3 className="not-prose mb-0 flex min-w-0 flex-1 items-center text-sm font-medium">
        {title}
      </h3>
      {isNew && (
        <span className="ms-auto ps-2">
          <Badge size="sm" color="info">
            New
          </Badge>
        </span>
      )}
    </Link>
  );
}
