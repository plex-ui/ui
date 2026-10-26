'use client';

import { ButtonLink } from '@plexui/ui/components/Button';
import { ArrowLeftSm, ArrowRightSm } from '@plexui/ui/components/Icon';
import { usePathname } from 'fumadocs-core/framework';
import { useFooterItems } from 'fumadocs-ui/utils/use-footer-items';
import { frameworkUrl, reactPath } from '@/lib/framework-urls';
import s from './PageNav.module.css';

function normalizePath(path: string) {
  if (!path) return '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export function PageNav({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const pathname = normalizePath(usePathname());
  // Vue pages navigate through the same (React) tree, with links mapped to
  // the Vue pages that exist
  const items = useFooterItems()
    .filter((item) => typeof item.url === 'string')
    .map((item) => ({ ...item, url: frameworkUrl(pathname, item.url!) }));
  const currentIndex = items.findIndex(
    (item) => reactPath(normalizePath(item.url ?? '')) === reactPath(pathname)
  );

  if (currentIndex === -1) return null;

  const previous = items[currentIndex - 1];
  const next = items[currentIndex + 1];

  if (!previous && !next) return null;

  if (compact) {
    return (
      <nav
        aria-label="Page navigation (top)"
        className={`${s.NavRoot} ${s.Compact} ${className ?? ''}`.trim()}
      >
        <div className={s.Row}>
          <div className={s.CompactGroup}>
            {previous && (
              <ButtonLink
                href={previous.url!}
                variant="outline"
                color="secondary"
                pill={false}
                size="sm"
                gutterSize="2xs"
                className={s.IconButton}
                aria-label={`Previous page: ${String(previous.name)}`}
                title={String(previous.name)}
              >
                <ArrowLeftSm className={s.Icon} aria-hidden />
              </ButtonLink>
            )}
            {next && (
              <ButtonLink
                href={next.url!}
                variant="outline"
                color="secondary"
                pill={false}
                size="sm"
                gutterSize="2xs"
                className={s.IconButton}
                aria-label={`Next page: ${String(next.name)}`}
                title={String(next.name)}
              >
                <ArrowRightSm className={s.Icon} aria-hidden />
              </ButtonLink>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Page navigation"
      className={`${s.NavRoot} ${className ?? ''}`.trim()}
    >
      <div className={s.Row}>
        {previous ? (
          <ButtonLink
            href={previous.url!}
            variant="outline"
            color="secondary"
            pill={false}
            size="sm"
            className={s.Button}
            aria-label={`Previous page: ${previous.name}`}
          >
            <ArrowLeftSm className={s.Icon} aria-hidden />
            <span className={s.Title}>{previous.name}</span>
          </ButtonLink>
        ) : (
          <span />
        )}

        {next ? (
          <ButtonLink
            href={next.url!}
            variant="outline"
            color="secondary"
            pill={false}
            size="sm"
            className={`${s.Button} ${s.Next}`.trim()}
            aria-label={`Next page: ${next.name}`}
          >
            <span className={s.Title}>{next.name}</span>
            <ArrowRightSm className={s.Icon} aria-hidden />
          </ButtonLink>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
