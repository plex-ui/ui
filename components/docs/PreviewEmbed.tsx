'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import s from './PreviewEmbed.module.css';
import { installPreviewScrollBridge } from './previewScroll';
import { createPreviewKeyboardController, isPreviewKeyboardCommand } from './previewKeyboardInput';
import { previewFocusGuard } from './previewFocus';

// Before the example hydrates: a dialog that opens with it must not take focus from the docs page.
previewFocusGuard();

// The phone view of a preview: the page renders again in an iframe 402 wide,
// so media queries see a phone. Only the preview with the `target` key shows,
// without its controls: they stay on the parent page, above the phone, and
// sync their values with the iframe in both directions. Compact previews keep
// a fixed layout viewport and crop unused space. Screen previews reserve space
// for the optional docs keyboard.

const PreviewEmbedContext = createContext<string | null>(null);

/** The key of the one preview this page shows, or null on a normal page */
export function usePreviewEmbed() {
  return useContext(PreviewEmbedContext);
}

/* ------------------------------------------------------------------ */
/*  Control values shared by the parent page and phone view           */
/* ------------------------------------------------------------------ */

type DemoControlChannel = {
  key: string;
  connect: (send: (name: string, value: unknown) => void) => () => void;
  publish: (name: string, value: unknown, initial: boolean) => void;
  receive: (name: string, value: unknown) => void;
  subscribe: (name: string, listener: (value: unknown) => void) => () => void;
  replay: () => void;
};

/** One preview owns its values and listeners; equal received values never echo. */
export function createDemoControlChannel(key: string, authority: 'host' | 'embed'): DemoControlChannel {
  let send: ((name: string, value: unknown) => void) | undefined;
  const values = new Map<string, unknown>();
  const listeners = new Map<string, Set<(value: unknown) => void>>();
  return {
    key,
    connect(transport) {
      send = transport;
      return () => { if (send === transport) send = undefined; };
    },
    publish(name, value, initial) {
      // The host's current controls win over an iframe's initial demo defaults.
      if (initial && values.has(name)) return;
      if (values.has(name) && Object.is(values.get(name), value)) return;
      values.set(name, value);
      if (!initial || authority === 'host') send?.(name, value);
    },
    receive(name, value) {
      // A phone may update only controls actually registered by its own host.
      if (authority === 'host' && !listeners.has(name)) return;
      if (values.has(name) && Object.is(values.get(name), value)) return;
      values.set(name, value);
      listeners.get(name)?.forEach((listener) => listener(value));
    },
    subscribe(name, listener) {
      const subscribers = listeners.get(name) ?? new Set();
      subscribers.add(listener);
      listeners.set(name, subscribers);
      if (values.has(name)) listener(values.get(name));
      return () => {
        subscribers.delete(listener);
        if (subscribers.size === 0) listeners.delete(name);
      };
    },
    replay() {
      values.forEach((value, name) => send?.(name, value));
    },
  };
}

/** Set by the parent page's preview while it shows the phone view. */
export const DemoControlHostContext = createContext<DemoControlChannel | null>(null);

/* ------------------------------------------------------------------ */
/*  Control values the preview's code follows                         */
/* ------------------------------------------------------------------ */

export type DemoControlValues = {
  /** `owner` is the control that sets it: of two controls with one name (a phone row and a desktop row), the last to
   * set it holds it, and only the one that holds it removes it */
  set: (name: string, value: unknown, owner: object) => void;
  remove: (name: string, owner: object) => void;
  subscribe: (listener: () => void) => () => void;
  /** The current values: a new object after each change, for useSyncExternalStore */
  snapshot: () => Readonly<Record<string, unknown>>;
};

/** The values of a preview's controls, so its Code view shows the example as it is set (demoCode.mjs). */
export function createDemoControlValues(): DemoControlValues {
  let values: Readonly<Record<string, unknown>> = {};
  const owners = new Map<string, object>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    set(name, value, owner) {
      owners.set(name, owner);
      if (Object.prototype.hasOwnProperty.call(values, name) && Object.is(values[name], value)) return;
      values = { ...values, [name]: value };
      notify();
    },
    remove(name, owner) {
      if (owners.get(name) !== owner) return;
      owners.delete(name);
      if (!Object.prototype.hasOwnProperty.call(values, name)) return;
      const { [name]: _removed, ...rest } = values;
      values = rest;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    snapshot: () => values,
  };
}

/** Set by every preview on the docs page: its controls report their values there. */
export const DemoControlValuesContext = createContext<DemoControlValues | null>(null);

/** Set by the parent page's preview in the phone view: where controls for the bottom of the screen go, after the phone. */
export const DemoControlsBottomSlotContext = createContext<HTMLElement | null>(null);

/**
 * A group of controls for what sits at the bottom of the screen (owner 09.11): it follows the stage, under the
 * preview, and in the phone view it moves after the phone, so the reading and Tab order match what is seen.
 */
export function DemoControlsBottom({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const slot = useContext(DemoControlsBottomSlotContext);
  const group = <div data-demo-controls="bottom" style={style}>{children}</div>;
  return slot ? createPortal(group, slot) : group;
}
const DemoControlEmbedContext = createContext<DemoControlChannel | null>(null);

/** Whether this demo is displayed in Phone mode, including its controls outside the iframe. */
export function usePhoneViewport() {
  const host = useContext(DemoControlHostContext);
  const embed = usePreviewEmbed();
  return host !== null || embed !== null;
}

/** Keep the visible control bar and the mounted Phone demo in sync both ways. */
/** `channelValue` is what the page and its Phone view trade, when it is not the value shown (a choice the phone does not
 * offer, shown as another, stays the page's choice); `channel: false` keeps the control off the trade (a desktop-only
 * row, which the Phone view does not show and must not set on the page). */
export function useDemoControlSync(
  name: string,
  value: unknown,
  onChange: ((value: never) => void) | undefined,
  { channelValue = value, channel: traded = true }: { channelValue?: unknown; channel?: boolean } = {},
) {
  const host = useContext(DemoControlHostContext);
  const embed = useContext(DemoControlEmbedContext);
  const channel = traded ? embed ?? host : null;
  const values = useContext(DemoControlValuesContext);
  const owner = useMemo(() => ({}), []);
  const onChangeRef = useRef(onChange);
  const published = useRef<{ channel: DemoControlChannel; name: string; value: unknown } | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const synced = onChange !== undefined;

  // The preview's code follows the control; a control that is not shown (one that applies to another variant) gives
  // its default back to the code
  useEffect(() => {
    if (values && synced) values.set(name, value, owner);
  }, [values, name, value, synced, owner]);
  useEffect(() => {
    if (values && synced) return () => values.remove(name, owner);
  }, [values, name, synced, owner]);

  useEffect(() => {
    if (!channel || !synced) return;
    const value = channelValue;
    const initial = published.current?.channel !== channel || published.current?.name !== name;
    // What this control last published it does not publish again: StrictMode runs the effect twice, and the second
    // run, no longer initial, sent a row shown only under another setting (accentColor) its default back to the page,
    // over the value the page had just replayed to it
    if (!initial && Object.is(published.current?.value, value)) return;
    published.current = { channel, name, value };
    channel.publish(name, value, initial);
  }, [channel, name, channelValue, synced]);

  useEffect(() => {
    if (!channel || !synced) return;
    return channel.subscribe(name, (next) => onChangeRef.current?.(next as never));
  }, [channel, name, synced]);
}

/** Bound the visible slice without resizing the iframe's layout viewport. */
export function compactPreviewHeight(contentHeight: number, minimum = 168): number {
  const safeMinimum = Number.isFinite(minimum) ? Math.max(0, Math.min(812, minimum)) : 168;
  return Math.ceil(Math.max(safeMinimum, Math.min(812, Number.isFinite(contentHeight) ? contentHeight : safeMinimum)));
}

const PORTAL_VIEWPORTS = '[data-radix-popper-content-wrapper], [data-reka-popper-content-wrapper], [data-sonner-toast]';

/** Include open portals, which live outside the demo's normal-flow stage. */
export function measureCompactPreviewHeight(stage: HTMLElement): number {
  const stageRect = stage.getBoundingClientRect();
  let bottom = Math.max(stageRect.height, stageRect.bottom);
  for (const portal of stage.ownerDocument.querySelectorAll<HTMLElement>(PORTAL_VIEWPORTS)) {
    const rect = portal.getBoundingClientRect();
    const style = getComputedStyle(portal);
    if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
      // Sonner's fixed list has no height: its absolutely positioned children
      // carry the geometry. Reserve their resting bounds during the entry slide.
      const toaster = portal.closest<HTMLElement>('[data-sonner-toaster]');
      const restingBottom = toaster ? toaster.getBoundingClientRect().top + portal.offsetTop + portal.offsetHeight : rect.bottom;
      bottom = Math.max(bottom, rect.bottom + 16, restingBottom + 16);
    }
  }
  return compactPreviewHeight(bottom, 0);
}

/* ------------------------------------------------------------------ */
/*  The phone view's page                                             */
/* ------------------------------------------------------------------ */

export function PreviewEmbed({ target, children }: { target: string; children: ReactNode }) {
  const controls = useMemo(() => createDemoControlChannel(target, 'embed'), [target]);
  useLayoutEffect(() => controls.connect((name, value) => {
    if (window.parent === window) return;
    window.parent.postMessage({ previewKey: controls.key, demoControlChange: { name, value } }, window.location.origin);
  }), [controls]);
  useEffect(() => {
    if (window.parent === window) return;
    return installPreviewScrollBridge(document, (delta) => {
      window.parent.postMessage({ previewKey: target, previewScroll: delta }, window.location.origin);
    });
  }, [target]);

  // Opened on its own in a phone's browser (to set it beside the native control), not in the docs' phone frame: the
  // browser keeps its status bar out of the page, so the page takes the device's real safe areas
  // (PreviewEmbed.module.css) instead of the frame's 62px status bar and 34px home indicator.
  useEffect(() => {
    if (window.parent !== window) return;
    const root = document.documentElement;
    root.setAttribute('data-preview-standalone', '');
    return () => root.removeAttribute('data-preview-standalone');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-input');
    root.setAttribute('data-input', 'touch');
    return () => {
      if (previous === null) root.removeAttribute('data-input');
      else root.setAttribute('data-input', previous);
    };
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const origin = window.location.origin;
    const keyboard = createPreviewKeyboardController(document, (state) => {
      window.parent.postMessage({ previewKey: target, previewKeyboard: state }, origin);
    });
    const onCommand = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== window.parent) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || !('previewKey' in data) || data.previewKey !== target || !('previewKeyboardCommand' in data)) return;
      if (!isPreviewKeyboardCommand(data.previewKeyboardCommand)) return;
      // The reader asked for this phone's keyboard: its field may take focus now.
      previewFocusGuard()?.engage();
      keyboard.command(data.previewKeyboardCommand);
    };
    window.addEventListener('message', onCommand);
    return () => { window.removeEventListener('message', onCommand); keyboard.destroy(); };
  }, [target]);

  useEffect(() => {
    if (window.parent === window) return;
    const origin = window.location.origin;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== window.parent) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || !('previewKey' in data) || data.previewKey !== target || !('demoControl' in data)) return;
      const control = data.demoControl;
      if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('value' in control)) return;
      const { name, value } = control;
      controls.receive(name, value);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ previewKey: target, demoReady: true }, origin);

    const el = document.querySelector<HTMLElement>('[data-preview-embed]');
    let lastPresentation = '';
    const post = () => {
      if (!el) return;
      const page = el.querySelector<HTMLElement>('[data-width][data-surface]');
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[data-plex-dialog][data-state="open"]'));
      const topDialog = dialogs[dialogs.length - 1];
      const fullscreenDialog = dialogs.slice().reverse().find((dialog) =>
        (dialog.dataset.mobilePlacement ?? dialog.dataset.placement) === 'fullscreen');
      // Dialog.Content owns a transparent positioning layer; its first child is
      // the painted panel. A fullscreen panel also covers the native status bar.
      const background = getComputedStyle(fullscreenDialog?.firstElementChild ?? page ?? el).backgroundColor;
      const presentation = {
        previewKey: target,
        previewHeight: el.dataset.previewPresentation === 'component' ? measureCompactPreviewHeight(el) : Math.ceil(el.getBoundingClientRect().height),
        previewDialogOpen: Boolean(topDialog),
        previewStatusBarScrim: Boolean(topDialog && topDialog !== fullscreenDialog),
        previewBackground: background,
      };
      const signature = JSON.stringify(presentation);
      if (signature === lastPresentation) return;
      lastPresentation = signature;
      window.parent.postMessage(presentation, origin);
    };
    let frame: number | undefined;
    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; post(); });
    };
    const ro = el ? new ResizeObserver(schedule) : null;
    const observed = new Set<Element>();
    const observeGeometry = () => {
      const current = new Set<Element>([...(el ? [el] : []), ...document.querySelectorAll(PORTAL_VIEWPORTS)]);
      for (const node of observed) if (!current.has(node)) { ro?.unobserve(node); observed.delete(node); }
      for (const node of current) if (!observed.has(node)) { ro?.observe(node); observed.add(node); }
    };
    observeGeometry();
    // Portal mounts, positioning and content changes can extend a compact preview.
    const overlays = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) observeGeometry();
      schedule();
    });
    overlays.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'data-surface', 'data-placement', 'data-mobile-placement', 'data-mounted', 'data-expanded', 'data-visible', 'data-removed', 'style', 'class'] });
    const theme = new MutationObserver(schedule);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    document.addEventListener('focusin', schedule);
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('transitionend', schedule, true);
    post();

    return () => {
      window.removeEventListener('message', onMessage);
      ro?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('scroll', schedule, true);
      document.removeEventListener('transitionend', schedule, true);
      overlays.disconnect();
      theme.disconnect();
    };
  }, [target, controls]);

  return (
    <PreviewEmbedContext.Provider value={target}>
      <DemoControlEmbedContext.Provider value={controls}>
        <div className={s.Root}>{children}</div>
      </DemoControlEmbedContext.Provider>
    </PreviewEmbedContext.Provider>
  );
}
