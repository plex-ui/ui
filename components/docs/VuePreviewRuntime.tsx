'use client';

import { useEffect, useRef } from 'react';
import { createApp, reactive } from 'vue';
import { vueComponents } from './vue/registry';

export type VuePreviewProps = {
  /** Vue template, compiled in the browser. Pass the same string to ComponentPreview's `code`. */
  template: string;
  /** Values the template can read, e.g. driven by demo controls. */
  props?: Record<string, unknown>;
};

export default function VuePreviewRuntime({ template, props }: VuePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(reactive<Record<string, unknown>>({ ...props }));

  useEffect(() => {
    Object.assign(stateRef.current, props);
  }, [props]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const state = stateRef.current;
    const app = createApp({ components: vueComponents, setup: () => state, template });
    app.mount(host);
    return () => app.unmount();
  }, [template]);

  // `contents` keeps the mount node out of the preview stage's layout.
  // Placeholder `href="#"` links in examples must not jump the page.
  return (
    <div
      ref={hostRef}
      className="contents"
      onClickCapture={(event) => {
        if ((event.target as Element).closest?.('a[href="#"]')) event.preventDefault();
      }}
    />
  );
}
