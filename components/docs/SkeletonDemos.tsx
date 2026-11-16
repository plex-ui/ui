'use client';

import { useState } from 'react';
import { Skeleton } from '@plexui/ui/components/Skeleton';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

const CONTENTS = ['profile', 'card', 'text', 'form', 'table'] as const;

/**
 * The Overview, with every setting of a skeleton (owner 11.11; row 33, one example per content): the placeholders of a
 * profile, a card, a paragraph, a form and a table were five examples of skeletons set in the shape of what they stand
 * in for. `circle` rounds the placeholder of an avatar; without it the placeholder keeps the skeleton's radius, as for
 * a square picture, so it is offered for the profile, the one content with an avatar.
 */
export function SkeletonOverviewDemo() {
  const [content, setContent] = useState<(typeof CONTENTS)[number]>('profile');
  const [circle, setCircle] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="content" options={CONTENTS} value={content} onChange={setContent} />
        {content === 'profile' && <DemoControlBoolean name="circle" value={circle} onChange={setCircle} />}
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 px-4 flex items-center justify-center">
        {content === 'profile' && (
          <div className="flex items-center gap-4">
            <Skeleton circle={circle} className="size-12" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        )}
        {content === 'card' && (
          <div className="flex flex-col gap-3 w-[300px] p-4 border border-default rounded-xl">
            <Skeleton className="h-[150px] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {content === 'text' && (
          <div className="flex flex-col gap-2 w-[300px]">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        {content === 'form' && (
          <div className="flex flex-col gap-4 w-[300px]">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
            <Skeleton className="h-8 w-[120px] rounded-lg" />
          </div>
        )}
        {content === 'table' && (
          <div className="flex flex-col gap-2 w-full min-w-0 max-w-[400px]">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={i === 0 ? 'flex gap-4 pb-2 border-b border-default' : 'flex gap-4 py-2'}>
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
