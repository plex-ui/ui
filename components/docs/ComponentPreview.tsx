'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Eye, Code, InfoCircle, Desktop, Mobile } from '@plexui/ui/components/Icon';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { DemoControlHostContext, previewKey, usePreviewEmbed } from './PreviewEmbed';
import s from './ComponentPreview.module.css';

type Mode = 'preview' | 'code' | 'details';
type Viewport = 'desktop' | 'phone';

/** Original Figma iPhone 17 Pro bezel geometry: 450×920 around a 402×874 screen. */
const PHONE_DEVICE_WIDTH = 450;

export function ComponentPreview({
  children,
  code,
  details,
  description,
  language = 'tsx',
  className,
  previewMinHeight,
  phoneDialog = false,
  resizable = false,
}: {
  children: ReactNode;
  code?: string;
  details?: ReactNode;
  description?: string;
  language?: string;
  className?: string;
  previewMinHeight?: number | string;
  /** Reserve a scrim and reveal the phone only after its initial dialog has mounted. */
  phoneDialog?: boolean;
  resizable?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('preview');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  // Under md the page is a phone already: no switch and no iframe
  const wide = useBreakpoint('md');
  const pathname = usePathname();
  const embedTarget = usePreviewEmbed();
  const hasCode = Boolean(code);
  const hasDetails = Boolean(details);

  type ElementProps = Record<string, unknown>;
  const childArray = React.Children.toArray(children);
  const key = previewKey(code, childArray);
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
    if (embedTarget !== key) return null;
    return (
      <div className={`${s.PreviewContainer} not-prose`} data-preview-embed>
        <div className={`${s.PreviewInner} ${className ?? ''}`.trim()}>{normalizedChildren}</div>
      </div>
    );
  }

  return (
    <div className={`${s.Wrapper} not-prose`}>
      {/* Tab bar — outside the bordered block */}
      <div className={s.TabBar}>
        <SegmentedControl
          value={viewport}
          onChange={(v) => {
            setViewport(v as Viewport);
            setMode('preview');
          }}
          size="xs"
          pill
          aria-label="Screen"
          className={s.ScreenSwitch}
        >
          <SegmentedControl.Option value="desktop" icon={<Desktop />} aria-label="Desktop" />
          <SegmentedControl.Option value="phone" icon={<Mobile />} aria-label="Phone" />
        </SegmentedControl>
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
      </div>

      {description && <p className={s.PreviewDescription}>{description}</p>}

      {/* Content block */}
      <div className={s.PreviewBlock}>
        {mode === 'preview' ? (
          <PreviewPane
            className={className}
            previewMinHeight={previewMinHeight}
            resizable={resizable}
            phone={viewport === 'phone' && wide ? { src: `/preview${pathname}?key=${key}`, previewKey: key, dialog: phoneDialog } : null}
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
 * hidden; the controls' values go into the iframe, so they carry across both views.
 */
function PhoneFrame({
  src,
  previewKey,
  previewMinHeight,
  startsWithDialog,
  frameRef,
  onReady,
}: {
  src: string;
  previewKey: string;
  previewMinHeight?: number | string;
  startsWithDialog: boolean;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onReady: () => void;
}) {
  const deviceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ready, setReady] = useState(!startsWithDialog);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const device = deviceRef.current;
    if (!device) return;
    const update = () => setScale(device.getBoundingClientRect().width / PHONE_DEVICE_WIDTH);
    const observer = new ResizeObserver(update);
    observer.observe(device);
    update();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { previewKey?: string; previewDialogOpen?: boolean; demoReady?: boolean };
      if (data?.previewKey !== previewKey) return;
      if (typeof data.previewDialogOpen === 'boolean') {
        setDialogOpen(data.previewDialogOpen);
        if (data.previewDialogOpen) setReady(true);
      }
      if (data.demoReady) onReadyRef.current();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [previewKey, frameRef]);

  return (
    <div className={s.PhoneContainer} data-dialog-open={(dialogOpen || !ready) || undefined} style={{ minHeight: previewMinHeight ?? 168 }}>
      <div ref={deviceRef} className={s.PhoneDevice}>
        <div className={s.PhoneCanvas} style={{ transform: `scale(${scale})` }}>
          <div className={s.PhoneScreen}>
            <div className={s.PhoneStatusBar} aria-hidden="true">
              <span className={s.PhoneTime}>9:41</span>
              <span className={s.PhoneStatusIcons}>
                <Image src="/images/devices/iphone-17-pro/cellular.svg" alt="" width={19.2} height={12.2264} unoptimized />
                <Image src="/images/devices/iphone-17-pro/wifi.svg" alt="" width={17.1417} height={12.3283} unoptimized />
                <Image src="/images/devices/iphone-17-pro/battery.svg" alt="" width={27.328} height={13} unoptimized />
              </span>
            </div>
            <iframe
              ref={frameRef}
              src={src}
              title="Phone preview"
              className={s.PhoneFrame}
              data-pending={!ready || undefined}
            />
          </div>
          <Image className={s.PhoneBezel} src="/images/devices/iphone-17-pro/silver-portrait.png" alt="" width={450} height={920} unoptimized loading="eager" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Resizable preview pane                                            */
/* ------------------------------------------------------------------ */

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
  phone: { src: string; previewKey: string; dialog: boolean } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const dragging = useRef(false);

  // The controls' latest values, sent into the phone view and again once it loads
  const frameRef = useRef<HTMLIFrameElement>(null);
  const controlValues = useRef(new Map<string, unknown>());
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
    () =>
      phoneKey
        ? {
            publish: (name: string, value: unknown) => {
              controlValues.current.set(name, value);
              send(name, value);
            },
          }
        : null,
    [phoneKey, send]
  );
  const sendAll = useCallback(() => controlValues.current.forEach((value, name) => send(name, value)), [send]);

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
          <div className={s.PreviewInner}>{children}</div>
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
        <PhoneFrame
          src={phone.src}
          previewKey={phone.previewKey}
          startsWithDialog={phone.dialog}
          previewMinHeight={previewMinHeight}
          frameRef={frameRef}
          onReady={sendAll}
        />
      )}
    </div>
  );
}
