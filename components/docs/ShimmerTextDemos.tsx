'use client';

import { useState } from 'react';
import { ShimmerableText } from '@plexui/ui/components/ShimmerText';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';

const ELEMENTS = ['div', 'h2', 'p', 'span'] as const;
// A text style per element, as a page sets it
const ELEMENT_CLASS: Record<(typeof ELEMENTS)[number], string> = {
  div: 'text-lg font-semibold',
  h2: 'text-2xl font-bold',
  p: 'text-base',
  span: 'text-sm text-secondary',
};

/**
 * The Overview, with every setting of the shimmer (row 33: one example per content, owner 11.11): the element it
 * renders and the shimmer turned on and off were three examples of one line of text. `ShimmerText` always shimmers;
 * `ShimmerableText` with `shimmer` on is the same, and off it finishes its sweep and stops.
 */
export function ShimmerTextOverviewDemo() {
  const [as, setAs] = useState<(typeof ELEMENTS)[number]>('div');
  const [shimmer, setShimmer] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="as" options={ELEMENTS} value={as} onChange={setAs} />
        <DemoControlBoolean name="shimmer" value={shimmer} onChange={setShimmer} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <ShimmerableText as={as} shimmer={shimmer} className={ELEMENT_CLASS[as]}>
          Generating response...
        </ShimmerableText>
      </div>
    </>
  );
}
