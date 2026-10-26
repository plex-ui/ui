'use client';

import dynamic from 'next/dynamic';
import type { VuePreviewProps } from './VuePreviewRuntime';

// Vue apps mount in the browser only: no SSR, so nothing to hydrate.
const VuePreviewRuntime = dynamic(() => import('./VuePreviewRuntime'), { ssr: false });

/** Renders a Vue template with @plexui/vue inside a React docs page. */
export function VuePreview(props: VuePreviewProps) {
  return <VuePreviewRuntime {...props} />;
}
