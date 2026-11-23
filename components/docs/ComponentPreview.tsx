'use client';

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, useId, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Button } from '@plexui/ui/components/Button';
import { Eye, Code, InfoCircle, Desktop, Mobile, Reload } from '@plexui/ui/components/Icon';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoControlHostContext, DemoControlValuesContext, DemoControlsBottomSlotContext, compactPreviewHeight, createDemoControlChannel, createDemoControlValues, usePreviewEmbed, usePreviewEmbedPlatform, type DemoControlValues } from './PreviewEmbed';
import { NativePlatformContext, NativeScreenTitleContext, isNativePath, type NativePlatform } from './react-native/platform';
import { renderDemoCode } from './demoCode.mjs';
import s from './ComponentPreview.module.css';
import { usePreviewViewport } from './PreviewViewport';
import { goToPreviousExample } from './previewNavigation';
import { isPreviewScrollDelta, scrollPreviewParent } from './previewScroll';
import { Switch } from '@plexui/ui/components/Switch';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
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
  codeValues,
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
  /** The example's code. With `codeValues` it is a template the controls fill in (demoCode.mjs). */
  code?: string;
  /** The default value of each control the code follows. The demo starts with these values. */
  codeValues?: Record<string, unknown>;
  /** Further examples of the code for the MCP manifest: a name and the values that differ from `codeValues`. */
  codeExamples?: readonly { name: string; values: Record<string, unknown>; details?: string }[];
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
  const pathname = usePathname();
  // A React Native page: its examples are always phone screens, of iOS or Android, in place of Desktop and Phone
  const native = isNativePath(pathname);
  const phonePresentation = !pageViewport.phoneViews && !phoneOnly && !native ? 'none' : requestedPhonePresentation ?? 'screen';
  // An example that does not draw its own screen stands on a phone page (ComponentPreview.module.css)
  const phonePage = requestedPhonePresentation === undefined && !phoneDialog && !phoneOnly;
  const [mode, setMode] = useState<Mode>('preview');
  const [resetRevision, setResetRevision] = useState(0);
  // The controls' values: the demo stays mounted under the Code and Details views, so its settings stay too
  const [controlValues] = useState(createDemoControlValues);
  const [phoneActivation, setPhoneActivation] = useState(0);
  const [override, setOverride] = useState<{ viewport: Viewport; revision: number } | null>(null);
  const viewport = phoneOnly || native ? 'phone' : override?.revision === pageViewport.revision ? override.viewport : pageViewport.viewport;
  const setViewport = (next: Viewport) => setOverride({ viewport: next, revision: pageViewport.revision });
  // The example's platform follows the page's switch until its own picks another, as the viewport does
  const embedPlatform = usePreviewEmbedPlatform();
  const [platformOverride, setPlatformOverride] = useState<{ platform: NativePlatform; revision: number } | null>(null);
  const platform: NativePlatform = embedPlatform
    ?? (platformOverride?.revision === pageViewport.platformRevision ? platformOverride.platform : pageViewport.platform);
  // Under md the page is a phone already: no switch and no iframe
  const wide = useBreakpoint('md');
  const embedTarget = usePreviewEmbed();
  const hasCode = Boolean(code);
  const hasDetails = Boolean(details);

  const { registerPhoneExample, registerNativeExample, registerPhoneOnlyExample } = pageViewport;
  useEffect(() => {
    if (embedTarget !== null || phonePresentation === 'none' || phoneOnly || native) return;
    return registerPhoneExample();
  }, [embedTarget, phoneOnly, native, phonePresentation, registerPhoneExample]);
  useEffect(() => {
    if (embedTarget !== null || !phoneOnly || native || phonePresentation !== 'screen') return;
    return registerPhoneOnlyExample();
  }, [embedTarget, phoneOnly, native, phonePresentation, registerPhoneOnlyExample]);
  useEffect(() => {
    if (embedTarget !== null || !native) return;
    return registerNativeExample();
  }, [embedTarget, native, registerNativeExample]);

  type ElementProps = Record<string, unknown>;
  const childArray = React.Children.toArray(children);
  const hasControls = childArray.some(
    (child) => React.isValidElement(child) && (child as React.ReactElement<ElementProps>).props['data-demo-controls'] !== undefined
  );
  const normalizedChildren = hasControls
    ? (() => {
        const controls: ReactNode[] = [];
        const bottomControls: ReactNode[] = [];
        const stageChildren: ReactNode[] = [];

        for (const child of childArray) {
          if (
            React.isValidElement(child) &&
            (child as React.ReactElement<ElementProps>).props['data-demo-controls'] !== undefined
          ) {
            // Controls for the bottom of the screen follow the stage, as they show under it
            ((child as React.ReactElement<ElementProps>).props['data-demo-controls'] === 'bottom' ? bottomControls : controls).push(child);
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
            {bottomControls}
          </>
        );
      })()
    : children;

  // The phone view of one preview: only that preview, at the iframe's width
  if (embedTarget !== null) {
    if (embedTarget !== previewId) return null;
    if (native) {
      // A React Native screen draws its own top bar, in its platform's look (RNScreen)
      return (
        <div className={`${s.PreviewContainer} not-prose`} data-preview-embed data-preview-native data-preview-presentation="screen">
          <NativePlatformContext.Provider value={platform}>
            <NativeScreenTitleContext.Provider value={{ page: phonePage, title: previewTitle }}>
              <div className={`${s.PreviewInner} ${className ?? ''}`.trim()}>{normalizedChildren}</div>
            </NativeScreenTitleContext.Provider>
          </NativePlatformContext.Provider>
        </div>
      );
    }
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
      <div className={s.TabBar} data-preview-bar onClickCapture={(event) => {
        // Re-selecting the active Phone tab is still an explicit activation.
        // Page-wide Phone mode deliberately does not focus every mounted iframe.
        if (viewport === 'phone' && event.target instanceof Element && event.target.closest('button[aria-label="Phone"]')) {
          setPhoneActivation((value) => value + 1);
        }
      }}>
        {/* A React Native example's look; a React or Vue example's phone: an iPhone or an Android phone, the web
            components inside the same on both, as a phone's browser draws them */}
        {(native || (viewport === 'phone' && phonePresentation === 'screen')) && <SegmentedControl
          value={platform}
          onChange={(next) => {
            setPlatformOverride({ platform: next as NativePlatform, revision: pageViewport.platformRevision });
            setPhoneActivation((value) => value + 1);
            setMode('preview');
          }}
          size="xs"
          pill
          aria-label="Platform"
          className={native ? undefined : s.ScreenSwitch}
        >
          <SegmentedControl.Option value="ios">iOS</SegmentedControl.Option>
          <SegmentedControl.Option value="android">Android</SegmentedControl.Option>
        </SegmentedControl>}
        {phonePresentation !== 'none' && !phoneOnly && !native && <SegmentedControl
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
        <DemoControlValuesContext.Provider value={controlValues}>
          <PreviewPane
            key={resetRevision}
            hidden={mode !== 'preview'}
            className={className}
            previewMinHeight={previewMinHeight}
            resizable={resizable}
            phone={viewport === 'phone' && wide && phonePresentation !== 'none'
              ? native
                ? { src: `/preview${pathname}?key=${previewId}&platform=${platform}`, previewKey: previewId, dialog: false, presentation: 'screen', activation: phoneActivation, platform }
                // A screen stands in the device picked; a bare slice has no frame
                : phonePresentation === 'screen' && platform === 'android'
                  ? { src: `/preview${pathname}?key=${previewId}&platform=android`, previewKey: previewId, dialog: phoneDialog, presentation: phonePresentation, activation: phoneActivation, platform }
                  : { src: `/preview${pathname}?key=${previewId}`, previewKey: previewId, dialog: phoneDialog, presentation: phonePresentation, activation: phoneActivation }
              : null}
          >
            {native ? <NativePlatformContext.Provider value={platform}>{normalizedChildren}</NativePlatformContext.Provider> : normalizedChildren}
          </PreviewPane>
        </DemoControlValuesContext.Provider>
        {mode === 'code' ? (
          <div className={s.CodeBlockWrap}>
            <PreviewCode code={code!} codeValues={codeValues} controlValues={controlValues} language={language} />
          </div>
        ) : mode === 'details' ? (
          <div className={s.DetailsWrap}>
            <div className={s.DetailsContent}>{details}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The example's code, as its controls set it when the code is a template (`codeValues`). */
function PreviewCode({ code, codeValues, controlValues, language }: { code: string; codeValues?: Record<string, unknown>; controlValues: DemoControlValues; language: string }) {
  const current = useSyncExternalStore(controlValues.subscribe, controlValues.snapshot, controlValues.snapshot);
  const shown = useMemo(() => {
    if (!codeValues) return code;
    // Only the values the code follows: another control of the demo keeps out of it
    const values = { ...codeValues, ...Object.fromEntries(Object.entries(current).filter(([name]) => name in codeValues)) };
    try {
      return renderDemoCode(code, values);
    } catch (error) {
      console.error(error);
      return code;
    }
  }, [code, codeValues, current]);
  return <DynamicCodeBlock lang={language} code={shown} codeblock={{ allowCopy: true }} />;
}

/* ------------------------------------------------------------------ */
/*  Phone view: a live viewport in an iPhone or an Android phone       */
/* ------------------------------------------------------------------ */

/**
 * The demo stays mounted on this page, its controls above the phone (or under it, for a DemoControlsBottom
 * group) and its stage
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
  platform,
}: {
  src: string;
  previewKey: string;
  previewMinHeight?: number | string;
  startsWithDialog: boolean;
  presentation: Exclude<PhonePresentation, 'none'>;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: () => void;
  activation: number;
  /** The device of the screen, an iPhone or an Android phone: a React Native example's platform, or the one picked
   * for a React or Vue example */
  platform?: NativePlatform;
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
      style={screen && keyboard.open ? { height: (platform === 'android' ? ANDROID_SCREEN.height : 874) - (keyboard.kind === 'text' ? TEXT_KEYBOARD_HEIGHT : NUMERIC_KEYBOARD_HEIGHT) } : undefined}
    />
  );

  // Until the example reports it has mounted, the screen says it is loading: a first visit compiles the phone page
  // in development, and a blank phone read as broken (owner 14.11: «контролов нет на экране около минуты БАГ»).
  const loading = !loaded && (
    <span className={s.PhoneLoading} role="status" aria-label="Loading the phone preview">
      <LoadingIndicator size={20} />
    </span>
  );

  if (!screen) {
    return (
      <div className={s.ComponentPhoneContainer}>
        <div ref={deviceRef} className={s.ComponentPhoneViewport} style={{ height: contentHeight }} aria-busy={!loaded || undefined}>
          {frame}
          {loading}
        </div>
      </div>
    );
  }

  if (platform === 'android') {
    return (
      <>
      {keyboard.available && <div className={s.KeyboardControl}>
        <label htmlFor={keyboardControlId}>keyboard</label>
        <Switch id={keyboardControlId} checked={keyboard.open} onCheckedChange={(open) => sendKeyboard(open ? 'show' : 'hide')} />
      </div>}
      <div className={s.PhoneContainer} data-dialog-open={(dialogOpen || !ready) || undefined} data-status-bar-scrim={(statusBarScrim || !ready) || undefined} style={{ minHeight: previewMinHeight ?? 168 }}>
        <div ref={deviceRef} className={s.AndroidDevice}>
          <div className={s.AndroidScreen} style={{ '--phone-screen-background': screenBackground } as React.CSSProperties} aria-busy={!loaded || undefined}>
            <AndroidStatusBar />
            {frame}
            {loading}
            {keyboard.open && keyboard.kind && <PreviewKeyboard kind={keyboard.kind} onKey={sendKeyboard} />}
            <span className={s.AndroidGestureHandle} aria-hidden="true" />
          </div>
          <span className={s.AndroidBezel} aria-hidden="true" />
        </div>
      </div>
      </>
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
          <div className={s.PhoneScreen} style={{ '--phone-screen-background': screenBackground } as React.CSSProperties} aria-busy={!loaded || undefined}>
            <div className={s.PhoneStatusBar} aria-hidden="true">
              <span className={s.PhoneTime}>9:41</span>
              <span className={s.PhoneStatusIcons}>
                <Image src="/images/devices/iphone-17-pro/cellular.svg" alt="" width={19.2} height={12.2264} unoptimized />
                <Image src="/images/devices/iphone-17-pro/wifi.svg" alt="" width={17.1417} height={12.3283} unoptimized />
                <Image src="/images/devices/iphone-17-pro/battery.svg" alt="" width={27.328} height={13} unoptimized />
              </span>
            </div>
            {frame}
            {loading}
            {keyboard.open && keyboard.kind && <PreviewKeyboard kind={keyboard.kind} onKey={sendKeyboard} />}
          </div>
          <Image className={s.PhoneBezel} src="/images/devices/iphone-17-pro/silver-portrait.png" alt="" width={450} height={920} unoptimized loading="eager" aria-hidden="true" />
        </div>
      </div>
    </div>
    </>
  );
}

/** The screen of the Android phone frame: a Pixel 9's 412 by 923 dp, as Google draws its own apps on it. */
const ANDROID_SCREEN = { width: 412, height: 923 };

/**
 * Android's status bar over the screen, drawn as the system draws it: the time at the start, the camera cut in the
 * middle, Wi-Fi, signal and battery at the end (Material Symbols' wifi, signal_cellular_4_bar, battery_full).
 */
function AndroidStatusBar() {
  return (
    <div className={s.AndroidStatusBar} aria-hidden="true">
      <span className={s.AndroidTime}>9:41</span>
      <span className={s.AndroidCamera} />
      <span className={s.AndroidStatusIcons}>
        <svg viewBox="0 -960 960 960" width="17" height="17" fill="currentColor"><path d="M480-120 0-600q95-97 219.5-148.5T480-800q137 0 261 51.5T960-600L480-120Z" /></svg>
        <svg viewBox="0 -960 960 960" width="17" height="17" fill="currentColor"><path d="M80-80 880-880v800H80Z" /></svg>
        <svg viewBox="0 -960 960 960" width="17" height="17" fill="currentColor"><path d="M320-80q-17 0-28.5-11.5T280-120v-640q0-17 11.5-28.5T320-800h80v-80h160v80h80q17 0 28.5 11.5T680-760v640q0 17-11.5 28.5T640-80H320Z" /></svg>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Resizable preview pane                                            */
/* ------------------------------------------------------------------ */

// Hydration has no event to subscribe to: the server snapshot is false, every client snapshot is true.
const subscribeToNothing = () => () => {};

function PreviewPane({
  children,
  hidden,
  className,
  previewMinHeight,
  resizable,
  phone,
}: {
  children: ReactNode;
  /** Under the Code and Details views: still mounted, so the demo keeps its state */
  hidden: boolean;
  className?: string;
  previewMinHeight?: number | string;
  resizable: boolean;
  phone: { src: string; previewKey: string; dialog: boolean; presentation: Exclude<PhonePresentation, 'none'>; activation: number; platform?: NativePlatform } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [bottomControls, setBottomControls] = useState<HTMLDivElement | null>(null);
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
      // Hidden under the Code view the pane has no width: the chosen width waits for it to show again
      if (el.clientWidth === 0) return;
      setWidth((prev) => {
        if (prev === null) return null;
        return Math.min(prev, el.clientWidth);
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resizable]);

  return (
    <div className={s.PreviewContainer} data-preview-zone ref={containerRef} hidden={hidden} style={hidden ? { display: 'none' } : undefined}>
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
          <DemoControlsBottomSlotContext.Provider value={phone ? bottomControls : null}>
            <div className={s.PreviewInner} data-preview-hydrating={hydrated ? undefined : ''}>{children}</div>
          </DemoControlsBottomSlotContext.Provider>
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
          // Another device is another phone: its frame loads, and reports its dialog and keyboard, afresh
          key={phone.platform ?? 'ios'}
          src={phone.src}
          previewKey={phone.previewKey}
          startsWithDialog={phone.dialog}
          presentation={phone.presentation}
          previewMinHeight={previewMinHeight}
          frameRef={frameRef}
          onReady={sendAll}
          activation={phone.activation}
          platform={phone.platform}
        />
      )}
      {/* Controls for the bottom of the screen follow the phone, on screen and in the reading order */}
      {phone && <div ref={setBottomControls} className={s.PhoneControls} />}
    </div>
  );
}
