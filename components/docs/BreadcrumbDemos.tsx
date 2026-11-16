'use client';

import { useState } from 'react';
import { Breadcrumb } from '@plexui/ui/components/Breadcrumb';
import { Segments, controlsTableStyle } from './ButtonDemos';

const SIZES = ['sm', 'md'] as const;
const SEPARATORS = ['chevron', 'slash'] as const;

/**
 * The Overview, one trail with every setting: what the page once showed one by one (Sizes, Separator) are its
 * settings (owner 11.11). `size` is desktop only: on a phone both sizes take the 15/20 text of iOS.
 */
export function BreadcrumbOverviewDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [separator, setSeparator] = useState<(typeof SEPARATORS)[number]>('chevron');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="size" options={SIZES} value={size} onChange={setSize} desktopOnly />
        <Segments name="separator" options={SEPARATORS} value={separator} onChange={setSeparator} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
        <Breadcrumb size={size} separator={separator === 'slash' ? '/' : undefined}>
          <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="#">Settings</Breadcrumb.Item>
          <Breadcrumb.Item current>Members</Breadcrumb.Item>
        </Breadcrumb>
      </div>
    </>
  );
}

export function BreadcrumbWrapDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="w-[260px]">
        <Breadcrumb>
          <Breadcrumb.Item href="#">Workspace</Breadcrumb.Item>
          <Breadcrumb.Item href="#">Customer accounts</Breadcrumb.Item>
          <Breadcrumb.Item href="#">Northwind Traders</Breadcrumb.Item>
          <Breadcrumb.Item>Archived</Breadcrumb.Item>
          <Breadcrumb.Item current>Invoice 2024-0193</Breadcrumb.Item>
        </Breadcrumb>
      </div>
    </div>
  );
}
