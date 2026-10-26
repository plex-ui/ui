'use client';

import Link from 'next/link';
import { ButtonLink } from '@plexui/ui/components/Button';

const FRAMEWORKS = [
  { id: 'react', label: 'React', base: '/components' },
  { id: 'vue', label: 'Vue (preview)', base: '/vue/components' },
] as const;

/** React / Vue links between the two pages of the same component. */
export function FrameworkSwitch({
  framework,
  slug,
}: {
  framework: (typeof FRAMEWORKS)[number]['id'];
  slug: string;
}) {
  return (
    <nav aria-label="Framework" className="flex gap-1">
      {FRAMEWORKS.map(({ id, label, base }) => (
        <ButtonLink
          key={id}
          as={Link}
          href={`${base}/${slug}`}
          color="secondary"
          variant={id === framework ? 'soft' : 'ghost'}
          size="sm"
          aria-current={id === framework ? 'page' : undefined}
        >
          {label}
        </ButtonLink>
      ))}
    </nav>
  );
}
