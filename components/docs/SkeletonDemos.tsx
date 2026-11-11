'use client';

import { useState } from 'react';
import { Skeleton } from '@plexui/ui/components/Skeleton';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';

/** The Overview, with the one setting of a skeleton (owner 11.11): `circle` rounds the placeholder of an avatar;
 * without it the placeholder keeps the skeleton's radius, as for a square picture. */
export function SkeletonOverviewDemo() {
  const [circle, setCircle] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="circle" value={circle} onChange={setCircle} />
      </div>
      <div data-demo-stage className="flex-1 w-full py-12 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <Skeleton circle={circle} className="size-12" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      </div>
    </>
  );
}
