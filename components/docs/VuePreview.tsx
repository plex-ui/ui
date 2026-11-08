'use client';

import dynamic from 'next/dynamic';
import type { VuePreviewProps } from './VuePreviewRuntime';

// SSR renders the example's markup with Vue's server renderer and lets Next preload the lazy runtime;
// the browser then mounts the Vue app in an effect inside VuePreviewRuntime, replacing that markup.
const VuePreviewRuntime = dynamic(() => import('./VuePreviewRuntime'), { ssr: true });

/** Renders a Vue template with @plexui/vue inside a React docs page. */
export function VuePreview(props: VuePreviewProps) {
  return <VuePreviewRuntime {...props} />;
}
