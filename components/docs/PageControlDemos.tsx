'use client';

import { useId, useRef, useState } from 'react';
import { PageControl } from '@plexui/ui/components/PageControl';

const pages = [1, 2, 3, 4, 5];

export function PageControlOverviewDemo() {
  const pagesId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  return (
    <div className="flex w-full max-w-[320px] flex-col items-center gap-3">
      <div
        id={pagesId}
        ref={scroller}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto rounded-2xl bg-[var(--color-surface-secondary)] [scrollbar-width:none]"
        onScroll={(event) => setPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
      >
        {pages.map((number) => (
          <div key={number} className="flex h-40 w-full shrink-0 snap-center items-center justify-center text-2xl font-semibold tabular-nums">
            {number}
          </div>
        ))}
      </div>
      <PageControl
        count={pages.length}
        value={page}
        aria-controls={pagesId}
        onChange={(index, { scrubbing }) => {
          setPage(index);
          const element = scroller.current;
          element?.scrollTo({ left: index * element.clientWidth, behavior: scrubbing ? 'instant' : 'auto' });
        }}
      />
    </div>
  );
}

export function PageControlManyDemo() {
  const [page, setPage] = useState(0);
  return (
    <div className="flex flex-col items-center gap-2">
      <PageControl count={12} value={page} onChange={setPage} />
      <span className="text-sm text-secondary tabular-nums" aria-hidden="true">Page {page + 1} of 12</span>
    </div>
  );
}

export function PageControlBackgroundDemo() {
  return (
    <div className="grid grid-cols-[auto_auto] items-center gap-x-6 gap-y-4">
      <span className="text-sm text-secondary">Automatic</span>
      <PageControl count={4} aria-label="Automatic background" />
      <span className="text-sm text-secondary">Prominent</span>
      <PageControl count={4} aria-label="Prominent background" background="prominent" />
      <span className="text-sm text-secondary">Minimal</span>
      <PageControl count={4} aria-label="Minimal background" background="minimal" />
    </div>
  );
}
