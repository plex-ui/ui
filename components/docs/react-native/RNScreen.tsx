'use client';

/**
 * The screen of a React Native example: @plexui/react-native drawn by react-native-web, in the platform the reader
 * picked and the site's light or dark theme. In the phone preview (an iframe in the iPhone or Android frame) it fills
 * the frame's screen, under its status bar; on a narrow page, which is a phone already, it stands on the page.
 * Loaded only in the browser (RNExample imports the demos with `ssr: false`).
 */
import { Component, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { useTheme as useSiteTheme } from 'next-themes';
import { SystemKeyboard, ThemeProvider, Toaster, Toolbar, useKeyboardInset, useTheme } from '@plexui/react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoControlHostContext, usePreviewEmbed } from '../PreviewEmbed';
import { NativeScreenTitleContext, useNativePlatform, type NativePlatform } from './platform';

const FONTS = { sans: 'var(--font-sans)', mono: 'var(--font-mono)' };

type Insets = { top: number; right: number; bottom: number; left: number };
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export type RNScreenProps = {
  /** The example: React Native elements */
  children: ReactNode;
  /** The example draws a whole screen of its own (a tab bar, a top app bar): it fills the phone, edge to edge */
  screen?: boolean;
  /** The grouped background under grouped content (the gray window of a settings screen) */
  grouped?: boolean;
  /**
   * The screen opens with a group's header: on iOS the header's own space is the top margin, with no 16 above it, as
   * the web's phone rows start a screen (a SwiftUI Form)
   */
  headerFirst?: boolean;
  /**
   * The example stands alone, with no app bar, 24 below the top of the phone and centered in the first 120, as a React
   * example with `phonePresentation="none"` (Avatar, Skeleton)
   */
  bare?: boolean;
  /** The height of the screen on a narrow page, where the example stands on the page itself */
  minHeight?: number;
  /** The phone's keyboard comes up under a focused field (off for an example that draws its own) */
  keyboard?: boolean;
};

/** An example that brings its own controls (a docs component around RNScreen), so RNExample renders it as is. */
export function docsDemo<P extends object>(demo: ComponentType<P>): ComponentType<P> & { docs: true } {
  return Object.assign(demo, { docs: true as const });
}

/**
 * The example the reader last touched on a page: only its screen shows toasts there. `toast()` is one list for the
 * page, and a Toaster in every example drew each toast in all of them. A phone preview is a page of its own.
 */
let activeStage: string | null = null;
const stageListeners = new Set<() => void>();
function activateStage(id: string) {
  if (activeStage === id) return;
  activeStage = id;
  stageListeners.forEach((listener) => listener());
}
function subscribeStage(listener: () => void) {
  stageListeners.add(listener);
  return () => {
    stageListeners.delete(listener);
  };
}
const readStage = () => activeStage;

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <pre style={{ padding: 16, color: 'var(--color-text-danger)', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>;
    }
    return this.props.children;
  }
}

type Layout = 'inline' | 'page' | 'screen' | 'bare';

/** The screen's color, for the bars over it: their scroll edges take it (Toolbar and TabBar `canvasColor`) */
const ScreenCanvasContext = createContext<string | undefined>(undefined);

export function useScreenCanvas() {
  return useContext(ScreenCanvasContext);
}

/**
 * The screen's own background, grouped under grouped content: on Android too, where settings stand on a gray window
 * (#F1F1F3, black at night) and plain screens on white, which the Plex grouped and plain tokens match
 */
function useCanvasColor(grouped: boolean) {
  const theme = useTheme();
  return grouped ? theme.colors.groupedBackground : theme.colors.background;
}

function Canvas({ layout, grouped, headerFirst, minHeight, title, bottom, onBackground, children }: {
  layout: Layout;
  grouped: boolean;
  headerFirst: boolean;
  minHeight: number;
  title?: string;
  bottom: number;
  onBackground: (color: string) => void;
  children: ReactNode;
}) {
  const background = useCanvasColor(grouped);
  useEffect(() => onBackground(background), [background, onBackground]);
  // Android's sections stand 12 from the screen's edges, iOS's 16
  const android = useTheme().isAndroid;
  const inset = android ? 12 : 16;
  const top = headerFirst && !android ? 0 : inset;
  // The web's phone rows stand 24 apart (a group, then the button under it); other examples 12
  const gap = grouped && !android ? 24 : 12;
  return <ScreenCanvasContext.Provider value={background}>{canvasBody(layout, background, minHeight, title, bottom, inset, top, gap, children)}</ScreenCanvasContext.Provider>;
}

function canvasBody(layout: Layout, background: string, minHeight: number, title: string | undefined, bottom: number, inset: number, top: number, gap: number, children: ReactNode) {
  if (layout === 'screen') return <View style={{ flex: 1, minHeight, backgroundColor: background }}>{children}</View>;
  // The React example's bare stage (phonePresentation="none"): 24 above and below the example and 16 at the sides, the
  // example centered in at least 120 (the preview's least height), so one line stands 48 from the top
  if (layout === 'bare') {
    return (
      <View style={{ flex: 1, backgroundColor: background }}>
        <View style={{ minHeight: 120, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', gap: 12 }}>{children}</View>
      </View>
    );
  }
  if (layout === 'page') {
    // An app screen named by the example, as a React example stands on a phone page under a top bar
    return (
      <View style={{ flex: 1, backgroundColor: background }}>
        <Toolbar background="none">{title ? <Toolbar.Title>{title}</Toolbar.Title> : null}</Toolbar>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: inset, paddingTop: top, paddingBottom: bottom + inset, gap }}>
          {children}
        </ScrollView>
      </View>
    );
  }
  // On a narrow page, which is a phone already, the example stands in the preview's own stage (24 above and below,
  // 16 at the sides), at its top, as a React example's phone composition does there
  return <View style={{ gap, backgroundColor: background }}>{children}</View>;
}

type StageProps = {
  id: string;
  platform: NativePlatform;
  scheme: 'light' | 'dark';
  layout: Layout;
  grouped: boolean;
  headerFirst: boolean;
  minHeight: number;
  title?: string;
  insets: Insets;
  toaster: boolean;
  keyboard: boolean;
  onBackground: (color: string) => void;
  children: ReactNode;
};

/**
 * The window, over the docs' own bars (their header stands at z-index 12000): `fixed` is a web position, which React
 * Native's types do not list
 */
const WINDOW = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 12001 } as const;

/** The example's app, in a React root of its own */
function StageApp({ id, platform, scheme, layout, grouped, headerFirst, minHeight, title, insets, toaster, keyboard: drawsKeyboard, onBackground, children }: StageProps) {
  const active = useSyncExternalStore(subscribeStage, readStage, () => null) === id;
  // The keyboard drawn over the phone's screen takes its bottom, as Android resizes the window for it and iOS lifts what
  // is pinned to its layout guide: the screen ends over it. The safe area stays (a bottom bar's own inset stands under
  // the bar, over the keys, and a full-window sheet keeps Android's navigation bar), so the screen gives up the rest
  const fills = layout === 'screen' || layout === 'page';
  const drawnKeyboard = useKeyboardInset();
  const keyboard = fills ? Math.max(0, drawnKeyboard - insets.bottom) : 0;
  return (
    <Boundary>
      <SafeAreaProvider initialMetrics={{ insets, frame: { x: 0, y: 0, width: 0, height: 0 } }}>
        <ThemeProvider platform={platform} scheme={scheme} fonts={FONTS}>
          <View style={{ flex: 1, paddingBottom: keyboard }}>
            <Canvas layout={layout} grouped={grouped} headerFirst={headerFirst} minHeight={minHeight} title={title} bottom={insets.bottom} onBackground={onBackground}>
              {children}
            </Canvas>
          </View>
          {toaster ? (
            <Toaster />
          ) : active ? (
            // On a narrow page, which is a phone already, the toasts stand on the window, as a Modal does: the
            // example's own box may be no taller than its button, and the preview's stacking would keep them under
            // the docs' bars, so they go to the body
            createPortal(
              <View pointerEvents="box-none" style={WINDOW as never}>
                <Toaster />
              </View>,
              document.body,
            )
          ) : null}
          {/* The phone's keyboard while a field has focus, as the device brings it up (one per page; none on a touch
              screen, which brings up its own) */}
          {drawsKeyboard ? <SystemKeyboard /> : null}
        </ThemeProvider>
      </SafeAreaProvider>
    </Boundary>
  );
}

/** The frame's safe areas, which the phone preview sets on its document (PreviewEmbed.module.css) */
function readFrameInsets(): Insets {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0;
  return { top: read('--safe-area-inset-top'), right: 0, bottom: read('--safe-area-inset-bottom'), left: 0 };
}

function useFrameInsets(embed: boolean): Insets {
  const [insets, setInsets] = useState<Insets>(NO_INSETS);
  useEffect(() => {
    if (!embed) return;
    const update = () =>
      setInsets((current) => {
        const next = readFrameInsets();
        return current.top === next.top && current.bottom === next.bottom ? current : next;
      });
    update();
    // The docs keyboard takes the bottom inset while it is open
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-preview-keyboard-open', 'data-preview-platform', 'class'] });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [embed]);
  return insets;
}

/**
 * An example runs in a React root of its own, as a React Native app does (AppRegistry), outside the page's Strict
 * Mode: its doubled effects left react-native-web's animations detached, so an overlay stayed at its closed frame.
 */
export function RNScreen({ children, screen = false, grouped = false, headerFirst = false, bare = false, minHeight = 160, keyboard = true }: RNScreenProps) {
  const id = useId();
  const embed = usePreviewEmbed() !== null;
  // On a wide page the example is drawn in the phone preview; the page keeps its controls only
  const phoneHost = useContext(DemoControlHostContext) !== null && !embed;
  const platform = useNativePlatform();
  const { resolvedTheme } = useSiteTheme();
  const scheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const { page, title } = useContext(NativeScreenTitleContext);
  const layout: Layout = embed ? (screen || !page ? 'screen' : bare ? 'bare' : 'page') : screen ? 'screen' : 'inline';
  const insets = useFrameInsets(embed);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const root = useRef<{ root: Root; element: HTMLDivElement } | null>(null);
  const [background, setBackground] = useState<string>();

  // Both in layout effects: a root rendered from a passive effect gets a default-priority update, so a controlled field
  // typed in fast is set back to its old value (and drops letters) before the new one arrives; from the commit the
  // render is synchronous, as within one root
  useLayoutEffect(() => {
    if (!node) return;
    // An element of its own per root: the page's Strict Mode mounts this twice, before the first root has unmounted
    const element = document.createElement('div');
    element.style.position = 'relative';
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.flex = '1';
    element.style.minHeight = '100%';
    // The docs center a demo stage's children: the app takes the whole screen, as a native app's root view does
    element.style.alignSelf = 'stretch';
    element.style.width = '100%';
    node.appendChild(element);
    const created = createRoot(element);
    root.current = { root: created, element };
    const activate = () => activateStage(id);
    node.addEventListener('pointerdown', activate, true);
    node.addEventListener('keydown', activate, true);
    return () => {
      root.current = null;
      node.removeEventListener('pointerdown', activate, true);
      node.removeEventListener('keydown', activate, true);
      // A root unmounts outside React's own commit
      setTimeout(() => {
        created.unmount();
        element.remove();
      });
    };
  }, [node, id]);

  useLayoutEffect(() => {
    root.current?.root.render(
      <StageApp
        id={id}
        platform={platform}
        scheme={scheme}
        layout={layout}
        grouped={grouped}
        headerFirst={headerFirst}
        minHeight={embed ? 0 : minHeight}
        title={title}
        insets={insets}
        toaster={embed}
        keyboard={keyboard}
        onBackground={setBackground}
      >
        {children}
      </StageApp>,
    );
  });

  if (phoneHost) return <div data-demo-stage hidden />;
  return (
    <div
      ref={setNode}
      data-demo-stage
      // The phone preview paints the frame's status bar with the screen's surface (PreviewEmbed)
      {...(embed ? { 'data-width': 'full', 'data-surface': 'plain' } : {})}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        width: '100%',
        minHeight: embed ? '100dvh' : layout === 'screen' ? minHeight : undefined,
        // A screen keeps its own margins on a narrow page, as in the phone preview: the stage's padding (24 and 16)
        // would stand around them
        padding: !embed && layout === 'screen' ? 0 : undefined,
        height: embed ? '100dvh' : undefined,
        backgroundColor: background,
      }}
    />
  );
}
