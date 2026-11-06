'use client';

import dynamic from 'next/dynamic';
import type { VuePreviewProps } from './VuePreviewRuntime';

// SSR renders only the empty React host and lets Next preload the lazy runtime.
// The Vue app still mounts in the browser effect inside VuePreviewRuntime.
const VuePreviewRuntime = dynamic(() => import('./VuePreviewRuntime'), { ssr: true });

/** Renders a Vue template with @plexui/vue inside a React docs page. */
export function VuePreview(props: VuePreviewProps) {
  return <VuePreviewRuntime {...props} />;
}
