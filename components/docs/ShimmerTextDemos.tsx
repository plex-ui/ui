'use client';

import { useState } from 'react';
import { ShimmerableText } from '@plexui/ui/components/ShimmerText';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';

export function ShimmerableTextDemo() {
  const [shimmer, setShimmer] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="shimmer" value={shimmer} onChange={setShimmer} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <ShimmerableText shimmer={shimmer} className="text-lg font-semibold">
          Generating response...
        </ShimmerableText>
      </div>
    </>
  );
}
