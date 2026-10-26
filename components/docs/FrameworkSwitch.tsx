'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tabs } from '@plexui/ui/components/Tabs';

const FRAMEWORKS = [
  { id: 'react', label: 'React', base: '/components' },
  { id: 'vue', label: 'Vue', base: '/vue/components' },
] as const;

type Framework = (typeof FRAMEWORKS)[number]['id'];

const hrefFor = (framework: Framework, slug: string) =>
  `${FRAMEWORKS.find(({ id }) => id === framework)!.base}/${slug}`;

/** React / Vue tabs between the two pages of the same component. */
export function FrameworkSwitch({ framework, slug }: { framework: Framework; slug: string }) {
  const router = useRouter();

  useEffect(() => {
    for (const { id } of FRAMEWORKS) {
      if (id !== framework) router.prefetch(hrefFor(id, slug));
    }
  }, [framework, slug, router]);

  return (
    <div className="mb-6">
      <Tabs<Framework>
        value={framework}
        onChange={(next) => router.push(hrefFor(next, slug))}
        aria-label="Framework"
        variant="underline"
        flush
      >
        {FRAMEWORKS.map(({ id, label }) => (
          <Tabs.Tab key={id} value={id}>
            {label}
          </Tabs.Tab>
        ))}
      </Tabs>
    </div>
  );
}
