'use client';

import { use, useEffect, useId, useRef } from 'react';
import { createApp, createSSRApp, reactive, watch } from 'vue';
import { vueComponents } from './vue/registry';

// The server renders each example's markup into the static page, so the first paint shows it as a
// React example's would, instead of an empty stage that grows when the browser mounts Vue. An example
// that cannot render without a browser falls back to the empty stage it had before.
// One promise per preview: a suspended render retries with the same props object, so its promise is
// found again, and the entries go with the props once the page is rendered (a preview route renders per
// request). Keys of their own would not do: refs and computeds carry Vue's counters, which change.
const serverMarkup = new WeakMap<object, Map<string, Promise<string>>>();
const NO_PROPS = {};
// React 19 rewrites innerHTML whenever this prop is a new object, which would wipe the mounted Vue DOM:
// the browser always passes this one object.
const NO_MARKUP = { __html: '' };
function renderOnServer(template: string, props: Record<string, unknown> | undefined, idPrefix: string): Promise<string> {
  let previews = serverMarkup.get(props ?? NO_PROPS);
  if (!previews) {
    previews = new Map();
    serverMarkup.set(props ?? NO_PROPS, previews);
  }
  const key = `${idPrefix}\u0000${template}`;
  let markup = previews.get(key);
  if (!markup) {
    markup = (async () => {
      try {
        const { renderToString } = await import('vue/server-renderer');
        const app = createSSRApp({ components: vueComponents, setup: () => reactive({ ...props }), template });
        app.config.idPrefix = idPrefix;
        app.config.warnHandler = () => {};
        // A production build only logs an error inside a component and leaves its part of the example
        // out; failing the whole render keeps the empty stage instead of a partial example.
        app.config.throwUnhandledErrorInProduction = true;
        return await renderToString(app);
      } catch {
        return '';
      }
    })();
    previews.set(key, markup);
  }
  return markup;
}

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
    // The browser renders the example itself: Vue's mount clears the server markup and renders in the
    // same task, so the page never shows an empty stage. No hydration, as the browser's state may differ
    // from the server's (a phone, a stored control) and Vue would keep the server's attributes then.
    const app = createApp({ components: vueComponents, setup: () => state, template });
    app.config.idPrefix = idPrefix;
    host.removeAttribute('inert');
    app.mount(host);
    return () => app.unmount();
  }, [template, idPrefix]);

  const markup = typeof window === 'undefined' ? use(renderOnServer(template, props, idPrefix)) : '';

  // `contents` keeps the mount node out of the preview stage's layout; `data-vue-root` lets the
  // preview's phone rules reach the example's own root, as they reach a React example's.
  // Placeholder `href="#"` links in examples must not jump the page.
  return (
    <div
      ref={hostRef}
      data-vue-root=""
      className="contents"
      // The server markup only looks like the example: until Vue mounts, a field or a submit button there
      // would send its form and reload the page, and typed text would be lost. The browser never sets it.
      inert={markup ? true : undefined}
      // React keeps the server markup while hydrating and never writes this empty string over it.
      suppressHydrationWarning
      dangerouslySetInnerHTML={markup ? { __html: markup } : NO_MARKUP}
      onClickCapture={(event) => {
        if ((event.target as Element).closest?.('a[href="#"]')) event.preventDefault();
      }}
    />
  );
}
