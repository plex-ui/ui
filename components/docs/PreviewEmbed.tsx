'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import s from './PreviewEmbed.module.css';

// The phone view of a preview: the page renders again in an iframe 375 wide,
// so media queries see a phone. Only the preview with the `target` key shows,
// without its controls: they stay on the parent page, above the phone, and
// send their values in. The preview's height goes back to the parent page,
// which sizes the iframe to it.

const PreviewEmbedContext = createContext<string | null>(null);

/** The key of the one preview this page shows, or null on a normal page */
export function usePreviewEmbed() {
  return useContext(PreviewEmbedContext);
}

/* ------------------------------------------------------------------ */
/*  Control values, from the parent page into the phone view          */
/* ------------------------------------------------------------------ */

/** Set by the parent page's preview while it shows the phone view */
export const DemoControlHostContext = createContext<{ publish: (name: string, value: unknown) => void } | null>(null);

const receivedValues = new Map<string, unknown>();
const valueListeners = new Map<string, Set<(value: unknown) => void>>();

function listenForValue(name: string, listener: (value: unknown) => void) {
  const listeners = valueListeners.get(name) ?? new Set();
  listeners.add(listener);
  valueListeners.set(name, listeners);
  if (receivedValues.has(name)) listener(receivedValues.get(name));
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Keeps a demo control in step with the phone view. On the parent page it sends
 * the control's value into the iframe; in the iframe it takes the value sent.
 */
export function useDemoControlSync(name: string, value: unknown, onChange: ((value: never) => void) | undefined) {
  const host = useContext(DemoControlHostContext);
  const embedTarget = usePreviewEmbed();
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const synced = onChange !== undefined;

  useEffect(() => {
    if (synced) host?.publish(name, value);
  }, [host, name, value, synced]);

  useEffect(() => {
    if (embedTarget === null || !synced) return;
    return listenForValue(name, (next) => onChangeRef.current?.(next as never));
  }, [embedTarget, name, synced]);
}

/* ------------------------------------------------------------------ */
/*  The phone view's page                                             */
/* ------------------------------------------------------------------ */

export function PreviewEmbed({ target, children }: { target: string; children: ReactNode }) {
  useEffect(() => {
    if (window.parent === window) return;
    const origin = window.location.origin;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== window.parent) return;
      const data = event.data as { previewKey?: string; demoControl?: { name: string; value: unknown } };
      if (data?.previewKey !== target || !data.demoControl) return;
      const { name, value } = data.demoControl;
      receivedValues.set(name, value);
      valueListeners.get(name)?.forEach((listener) => listener(value));
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ previewKey: target, demoReady: true }, origin);

    const el = document.querySelector<HTMLElement>('[data-preview-embed]');
    const post = () =>
      el && window.parent.postMessage({ previewKey: target, previewHeight: Math.ceil(el.getBoundingClientRect().height) }, origin);
    const ro = el ? new ResizeObserver(post) : null;
    if (el) ro?.observe(el);
    post();

    return () => {
      window.removeEventListener('message', onMessage);
      ro?.disconnect();
    };
  }, [target]);

  return (
    <PreviewEmbedContext.Provider value={target}>
      <div className={s.Root}>{children}</div>
    </PreviewEmbedContext.Provider>
  );
}

/** A stable key for a preview: the same on the docs page and on its phone view */
export function previewKey(code: string | undefined, children: ReactNode[]) {
  const parts = children.map((child) => {
    if (!child || typeof child !== 'object' || !('type' in child)) return '';
    const type = child.type as string | { displayName?: string; name?: string };
    const name = typeof type === 'string' ? type : type.displayName || type.name || '';
    const template = (child.props as { template?: unknown }).template;
    return typeof template === 'string' ? `${name}:${template}` : name;
  });
  const text = `${code ?? ''}|${parts.join('|')}`;
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
