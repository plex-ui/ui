'use client';

import { useEffect, useId, useRef } from 'react';
import { createApp, reactive, watch } from 'vue';
import { vueComponents } from './vue/registry';

export type VuePreviewProps = {
  /** Vue template, compiled in the browser. Pass the same string to ComponentPreview's `code`. */
  template: string;
  /** Values the template can read, e.g. driven by demo controls. */
  props?: Record<string, unknown>;
  /** Called when the template changes one of `props` (a trigger toggles `open`), so controls can follow. */
  onPropChange?: (name: string, value: unknown) => void;
};

export default function VuePreviewRuntime({ template, props, onPropChange }: VuePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Every preview is its own Vue app, so ids from Vue's useId() would repeat
  // across the demos of a page (v-0, v-1, ...) and ARIA references could
  // point into another demo. A per-preview prefix keeps them unique.
  const idPrefix = `v${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stateRef = useRef(reactive<Record<string, unknown>>({ ...props }));

  // Only push keys whose value changed: the template may own others
  // (e.g. `v-model:value="value"` on demo state)
  const previousRef = useRef(props);
  useEffect(() => {
    const previous = previousRef.current ?? {};
    for (const [key, value] of Object.entries(props ?? {})) {
      if (previous[key] !== value) stateRef.current[key] = value;
    }
    previousRef.current = props;
  }, [props]);

  const onPropChangeRef = useRef(onPropChange);
  useEffect(() => {
    onPropChangeRef.current = onPropChange;
  }, [onPropChange]);
  useEffect(() => {
    const state = stateRef.current;
    const stops = Object.keys(state).map((key) =>
      watch(
        () => state[key],
        (value) => {
          if (value !== previousRef.current?.[key]) onPropChangeRef.current?.(key, value);
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const state = stateRef.current;
    const app = createApp({ components: vueComponents, setup: () => state, template });
    app.config.idPrefix = idPrefix;
    app.mount(host);
    return () => app.unmount();
  }, [template, idPrefix]);

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
