'use client';

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, useId, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Button } from '@plexui/ui/components/Button';
import { Eye, Code, InfoCircle, Desktop, Mobile, Reload } from '@plexui/ui/components/Icon';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoControlHostContext, compactPreviewHeight, createDemoControlChannel, usePreviewEmbed } from './PreviewEmbed';
import s from './ComponentPreview.module.css';
import { usePreviewViewport } from './PreviewViewport';
import { goToPreviousExample } from './previewNavigation';
import { isPreviewScrollDelta, scrollPreviewParent } from './previewScroll';
import { Switch } from '@plexui/ui/components/Switch';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { PreviewKeyboard, NUMERIC_KEYBOARD_HEIGHT, TEXT_KEYBOARD_HEIGHT } from './PreviewKeyboard';
import { canSimulatePreviewKeyboard, type PreviewKeyboardCommand, type PreviewKeyboardState } from './previewKeyboardInput';

type Mode = 'preview' | 'code' | 'details';
type Viewport = 'desktop' | 'phone';
type PhonePresentation = 'component' | 'screen' | 'none';

export function ComponentPreview({
  previewId,
  previewTitle,
  children,
  code,
  details,
  description,
  language = 'tsx',
  className,
  previewMinHeight,
  phoneDialog = false,
  phonePresentation: requestedPhonePresentation,
  phoneOnly = false,
  resizable = false,
}: {
  /** Assigned by remarkPreviewId, shared by the docs page and its Phone iframe. */
  previewId: string;
  /** The heading of the example's section (remarkPreviewId): the title of the top bar of its phone page. */
  previewTitle?: string;
  children: ReactNode;
  code?: string;
  details?: ReactNode;
  description?: string;
  language?: string;
  className?: string;
  previewMinHeight?: number | string;
  /** Reserve a scrim and reveal the phone only after its initial dialog has mounted. */
  phoneDialog?: boolean;
  /** How the Phone view shows the example. By default a phone screen in a phone frame: an example that is not a
   * screen itself (a Dialog, a Page, a phone-only component) stands on a plain phone page under the status bar,
   * within the layout margins, so its scale and place on a phone show. `screen` when the example draws its own
   * screen, `component` for a bare slice at the phone's width, or none: a pointer/keyboard-only example, or a
   * component that looks the same on a phone, whose page then offers no Phone view. */
  phonePresentation?: PhonePresentation;
  /** A phone-only component, such as Toolbar: the preview always shows the Phone view, without the Desktop switch. */
  phoneOnly?: boolean;
  resizable?: boolean;
}) {
  const pageViewport = usePreviewViewport();
  // A page whose phone view is not ready shows no Phone switch on a desktop (frontmatter `phoneDraft`); its own
  // phone iframe still renders the example, as a phone-only example does.
  const phonePresentation = !pageViewport.phoneViews && !phoneOnly ? 'none' : requestedPhonePresentation ?? 'screen';
  // An example that does not draw its own screen stands on a phone page (ComponentPreview.module.css)
  const phonePage = requestedPhonePresentation === undefined && !phoneDialog && !phoneOnly;
  const [mode, setMode] = useState<Mode>('preview');
  const [resetRevision, setResetRevision] = useState(0);
  const [phoneActivation, setPhoneActivation] = useState(0);
  const [override, setOverride] = useState<{ viewport: Viewport; revision: number } | null>(null);
  const viewport = phoneOnly ? 'phone' : override?.revision === pageViewport.revision ? override.viewport : pageViewport.viewport;
  const setViewport = (next: Viewport) => setOverride({ viewport: next, revision: pageViewport.revision });
  // Under md the page is a phone already: no switch and no iframe
  const wide = useBreakpoint('md');
  const pathname = usePathname();
  const embedTarget = usePreviewEmbed();
  const hasCode = Boolean(code);
  const hasDetails = Boolean(details);

  const { registerPhoneExample } = pageViewport;
  useEffect(() => {
    if (embedTarget !== null || phonePresentation === 'none' || phoneOnly) return;
    return registerPhoneExample();
  }, [embedTarget, phoneOnly, phonePresentation, registerPhoneExample]);

  type ElementProps = Record<string, unknown>;
  const childArray = React.Children.toArray(children);
  const hasControls = childArray.some(
    (child) => React.isValidElement(child) && (child as React.ReactElement<ElementProps>).props['data-demo-controls'] !== undefined
  );
  const normalizedChildren = hasControls
    ? (() => {
        const controls: ReactNode[] = [];
        const stageChildren: ReactNode[] = [];

        for (const child of childArray) {
          if (
            React.isValidElement(child) &&
            (child as React.ReactElement<ElementProps>).props['data-demo-controls'] !== undefined
          ) {
            controls.push(child);
            continue;
          }

          stageChildren.push(child);
        }

        const hasExplicitStage = stageChildren.some(
          (child) =>
            React.isValidElement(child) && (child as React.ReactElement<ElementProps>).props['data-demo-stage'] !== undefined
        );

        return (
          <>
            {controls}
            {hasExplicitStage ? stageChildren : stageChildren.length > 0 ? <div data-demo-stage>{stageChildren}</div> : null}
          </>
        );
      })()
    : children;

  // The phone view of one preview: only that preview, at the iframe's width
  if (embedTarget !== null) {
    if (embedTarget !== previewId) return null;
    return (
      <div className={`${s.PreviewContainer} not-prose`} data-preview-embed data-preview-presentation={phonePresentation} data-preview-phone-page={phonePage || undefined} data-preview-initial-dialog={phoneDialog || undefined}>
        {/* A phone page is a screen of an app: the top bar under the status bar always takes its place, and names the
            example. It repeats the heading of the docs page, so assistive technology skips it. */}
        {phonePage && (
          <Toolbar className={s.PhonePageBar} aria-hidden="true">
            {previewTitle && <Toolbar.Title>{previewTitle}</Toolbar.Title>}
          </Toolbar>
        )}
        <div className={`${s.PreviewInner} ${className ?? ''}`.trim()}>{normalizedChildren}</div>
      </div>
    );
  }

  return (
    <div className={`${s.Wrapper} not-prose`} data-component-preview data-preview-viewport={viewport}>
      {/* Tab bar — outside the bordered block */}
      <div className={s.TabBar} onClickCapture={(event) => {
        // Re-selecting the active Phone tab is still an explicit activation.
        // Page-wide Phone mode deliberately does not focus every mounted iframe.
        if (viewport === 'phone' && event.target instanceof Element && event.target.closest('button[aria-label="Phone"]')) {
          setPhoneActivation((value) => value + 1);
        }
      }}>
        {phonePresentation !== 'none' && !phoneOnly && <SegmentedControl
          value={viewport}
          onChange={(v) => {
            setViewport(v as Viewport);
            if (v === 'phone') setPhoneActivation((value) => value + 1);
            setMode('preview');
          }}
          size="xs"
          pill
          aria-label="Screen"
          className={s.ScreenSwitch}
        >
          <SegmentedControl.Option value="desktop" icon={<Desktop />} aria-label="Desktop" />
          <SegmentedControl.Option value="phone" icon={<Mobile />} aria-label="Phone" />
        </SegmentedControl>}
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          size="xs"
          pill
          aria-label="View mode"
        >
          <SegmentedControl.Option value="preview" icon={<Eye />} aria-label="Preview" />
          {hasCode && (
            <SegmentedControl.Option value="code" icon={<Code />} aria-label="Code" />
          )}
          {hasDetails && (
            <SegmentedControl.Option value="details" icon={<InfoCircle />} aria-label="Details" />
          )}
        </SegmentedControl>
        <Button type="button" color="secondary" variant="ghost" size="xs" uniform pill className={s.ResetPreview}
          aria-label="Reset preview" title="Reset preview"
          onClick={() => { setResetRevision((revision) => revision + 1); setMode('preview'); }}>
          <Reload />
        </Button>
      </div>

      {description && <p className={s.PreviewDescription}>{description}</p>}

      {/* Content block */}
      <div className={s.PreviewBlock}>
        {mode === 'preview' ? (
          <PreviewPane
            key={resetRevision}
            className={className}
            previewMinHeight={previewMinHeight}
            resizable={resizable}
            phone={viewport === 'phone' && wide && phonePresentation !== 'none' ? { src: `/preview${pathname}?key=${previewId}`, previewKey: previewId, dialog: phoneDialog, presentation: phonePresentation, activation: phoneActivation } : null}
          >
            {normalizedChildren}
          </PreviewPane>
        ) : mode === 'code' ? (
          <div className={s.CodeBlockWrap}>
            <DynamicCodeBlock
              lang={language}
              code={code!}
              codeblock={{ allowCopy: true }}
            />
          </div>
        ) : (
          <div className={s.DetailsWrap}>
            <div className={s.DetailsContent}>{details}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Phone view: a live viewport inside the original iPhone bezel       */
/* ------------------------------------------------------------------ */

/**
 * The demo stays mounted on this page, its controls above the phone and its stage
 * hidden. Values sync both ways, keeping the control bar and iframe in step.
 */
function PhonePreview({
  src,
  previewKey,
  previewMinHeight,
  startsWithDialog,
  presentation,
  frameRef,
  onReady,
  activation,
}: {
  src: string;
  previewKey: string;
  previewMinHeight?: number | string;
  startsWithDialog: boolean;
  presentation: Exclude<PhonePresentation, 'none'>;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: () => void;
  activation: number;
}) {
  const screen = presentation === 'screen';
  const minimumHeight = typeof previewMinHeight === 'number' ? previewMinHeight : 168;
  const [contentHeight, setContentHeight] = useState(() => compactPreviewHeight(minimumHeight));
  const deviceRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusBarScrim, setStatusBarScrim] = useState(startsWithDialog);
  const [screenBackground, setScreenBackground] = useState<string>();
  const [ready, setReady] = useState(!startsWithDialog);
  const [keyboard, setKeyboard] = useState<PreviewKeyboardState>({ available: false, open: false, kind: null });
  const keyboardControlId = useId();
  const [loaded, setLoaded] = useState(false);
  const lastActivation = useRef(0);
  const sendKeyboard = useCallback((command: PreviewKeyboardCommand) => {
    if (!screen || !canSimulatePreviewKeyboard(document)) return;
    frameRef.current?.contentWindow?.postMessage({ previewKey, previewKeyboardCommand: command }, window.location.origin);
  }, [screen, frameRef, previewKey]);
  useEffect(() => {
    // Wait for the input and the host's keyboard-sized viewport, not just the
    // iframe bridge. A streamed or Vue-mounted field can arrive after demoReady.
    if (activation > lastActivation.current && loaded && keyboard.available) {
      lastActivation.current = activation;
      sendKeyboard('activate');
    }
  }, [activation, loaded, keyboard.available, sendKeyboard]);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || !('previewKey' in data) || data.previewKey !== previewKey) return;
      if ('previewScroll' in data && isPreviewScrollDelta(data.previewScroll) && frameRef.current) {
        scrollPreviewParent(frameRef.current, data.previewScroll);
      }
      if ('previewHeight' in data && typeof data.previewHeight === 'number' && Number.isFinite(data.previewHeight)) {
        // Once measured, compact content owns its height; the desktop minimum is only a loading placeholder.
        setContentHeight(compactPreviewHeight(data.previewHeight, 0));
      }
      if ('previewBackground' in data && typeof data.previewBackground === 'string' && CSS.supports('color', data.previewBackground)) {
        setScreenBackground(data.previewBackground);
      }
      if ('previewDialogOpen' in data && typeof data.previewDialogOpen === 'boolean') {
        setDialogOpen(data.previewDialogOpen);
        if (data.previewDialogOpen) setReady(true);
      }
      if ('previewStatusBarScrim' in data && typeof data.previewStatusBarScrim === 'boolean') {
        setStatusBarScrim(data.previewStatusBarScrim);
      }
      if (screen && canSimulatePreviewKeyboard(document) && 'previewKeyboard' in data && data.previewKeyboard && typeof data.previewKeyboard === 'object') {
        const state = data.previewKeyboard;
        if ('available' in state && typeof state.available === 'boolean' && 'open' in state && typeof state.open === 'boolean'
          && 'kind' in state && (state.kind === 'numeric' || state.kind === 'text' || state.kind === null)) {
          const available = state.available && state.kind !== null;
          setKeyboard({ available, open: available && state.open, kind: available ? state.kind : null });
        }
      }
      if ('demoReady' in data && data.demoReady === true) {
        setLoaded(true);
        onReadyRef.current();
      }
      if ('previewBack' in data && data.previewBack === true) {
        goToPreviousExample(deviceRef.current);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [previewKey, frameRef, screen, sendKeyboard]);

  const frame = (
    <iframe
      ref={frameRef}
      src={src}
      title={screen ? "Phone preview" : "Phone component preview"}
      loading="lazy"
      className={screen ? s.PhoneFrame : s.ComponentPhoneFrame}
      data-pending={screen && !ready || undefined}
      style={screen && keyboard.open ? { height: 874 - (keyboard.kind === 'text' ? TEXT_KEYBOARD_HEIGHT : NUMERIC_KEYBOARD_HEIGHT) } : undefined}
    />
  );

  if (!screen) {
    return (
      <div className={s.ComponentPhoneContainer}>
        <div ref={deviceRef} className={s.ComponentPhoneViewport} style={{ height: contentHeight }}>
          {frame}
        </div>
      </div>
    );
  }

  return (
    <>
    {keyboard.available && <div className={s.KeyboardControl}>
      <label htmlFor={keyboardControlId}>keyboard</label>
      <Switch id={keyboardControlId} checked={keyboard.open} onCheckedChange={(open) => sendKeyboard(open ? 'show' : 'hide')} />
    </div>}
    <div className={s.PhoneContainer} data-dialog-open={(dialogOpen || !ready) || undefined} data-status-bar-scrim={(statusBarScrim || !ready) || undefined} style={{ minHeight: previewMinHeight ?? 168 }}>
      <div ref={deviceRef} className={s.PhoneDevice}>
        <div className={s.PhoneCanvas}>
          <div className={s.PhoneScreen} style={{ '--phone-screen-background': screenBackground } as React.CSSProperties}>
            <div className={s.PhoneStatusBar} aria-hidden="true">
              <span className={s.PhoneTime}>9:41</span>
              <span className={s.PhoneStatusIcons}>
                <Image src="/images/devices/iphone-17-pro/cellular.svg" alt="" width={19.2} height={12.2264} unoptimized />
                <Image src="/images/devices/iphone-17-pro/wifi.svg" alt="" width={17.1417} height={12.3283} unoptimized />
                <Image src="/images/devices/iphone-17-pro/battery.svg" alt="" width={27.328} height={13} unoptimized />
              </span>
            </div>
            {frame}
            {keyboard.open && keyboard.kind && <PreviewKeyboard kind={keyboard.kind} onKey={sendKeyboard} />}
          </div>
          <Image className={s.PhoneBezel} src="/images/devices/iphone-17-pro/silver-portrait.png" alt="" width={450} height={920} unoptimized loading="eager" aria-hidden="true" />
        </div>
      </div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Resizable preview pane                                            */
/* ------------------------------------------------------------------ */

// Hydration has no event to subscribe to: the server snapshot is false, every client snapshot is true.
const subscribeToNothing = () => () => {};

function PreviewPane({
  children,
  className,
  previewMinHeight,
  resizable,
  phone,
}: {
  children: ReactNode;
  className?: string;
  previewMinHeight?: number | string;
  resizable: boolean;
  phone: { src: string; previewKey: string; dialog: boolean; presentation: Exclude<PhonePresentation, 'none'>; activation: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const dragging = useRef(false);
  // An example picks its phone or desktop composition after hydration (useBreakpoint is false on the
  // first render), so the server markup is the phone one. On a wide page it stays out of sight until then.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  // Shared control values sync both ways and replay into the phone once it loads.
  const frameRef = useRef<HTMLIFrameElement>(null);
  const phoneKey = phone?.previewKey;
  const send = useCallback(
    (name: string, value: unknown) => {
      frameRef.current?.contentWindow?.postMessage(
        { previewKey: phoneKey, demoControl: { name, value } },
        window.location.origin
      );
    },
    [phoneKey]
  );
  const host = useMemo(
    () => phoneKey ? createDemoControlChannel(phoneKey, 'host') : null,
    [phoneKey]
  );
  useLayoutEffect(() => host?.connect(send), [host, send]);
  const sendAll = useCallback(() => host?.replay(), [host]);

  useEffect(() => {
    if (!host) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data: unknown = event.data;
      if (!data || typeof data !== 'object' || !('previewKey' in data) || data.previewKey !== phoneKey || !('demoControlChange' in data)) return;
      const control = data.demoControlChange;
      if (!control || typeof control !== 'object' || !('name' in control) || typeof control.name !== 'string' || !('value' in control)) return;
      host.receive(control.name, control.value);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [host, phoneKey]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const next = Math.max(320, Math.min(rect.width, e.clientX - rect.left));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Reset width when container resizes (e.g. window resize)
  useEffect(() => {
    if (!resizable) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth((prev) => {
        if (prev === null) return null;
        return Math.min(prev, el.clientWidth);
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resizable]);

  return (
    <div className={s.PreviewContainer} data-preview-zone ref={containerRef}>
      <div
        className={`${s.PreviewContent} ${className ?? ''}`.trim()}
        style={
          phone
            ? undefined
            : {
                minHeight: previewMinHeight ?? 168,
                ...(resizable && width !== null ? { maxWidth: width } : {}),
              }
        }
        data-resizable={(resizable && !phone) || undefined}
        data-phone={phone ? '' : undefined}
      >
        <DemoControlHostContext.Provider value={host}>
          <div className={s.PreviewInner} data-preview-hydrating={hydrated ? undefined : ''}>{children}</div>
        </DemoControlHostContext.Provider>
        {resizable && !phone && (
          <div
            className={s.ResizeHandle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div className={s.ResizeHandleGrip} />
          </div>
        )}
      </div>
      {phone && (
        <PhonePreview
          src={phone.src}
          previewKey={phone.previewKey}
          startsWithDialog={phone.dialog}
          presentation={phone.presentation}
          previewMinHeight={previewMinHeight}
          frameRef={frameRef}
          onReady={sendAll}
          activation={phone.activation}
        />
      )}
    </div>
  );
}
