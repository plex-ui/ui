'use client';

/**
 * The phone screen of a React Native example: @plexui/react-native drawn by react-native-web, in the platform and
 * scheme the page's switch chose. Loaded only in the browser (RNPreview imports it with `ssr: false`).
 */
import { Component, useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider, Toaster, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { demoModules } from './demos';
import { OVERLAY_HOST_ATTRIBUTE, OverlayHostContext, type OverlayHost } from './overlay-host';
import type { RNPlatform, RNScheme } from './RNPreviewSettings';

const FONTS = { sans: 'var(--font-sans)', mono: 'var(--font-mono)' };

/** The screen's own background: Material's surface, or iOS's grouped background under grouped content. */
function Canvas({ grouped, minHeight, children }: { grouped: boolean; minHeight: number; children: ReactNode }) {
  const theme = useTheme();
  const background = theme.isAndroid
    ? grouped
      ? theme.material.surfaceContainer
      : theme.material.surface
    : grouped
      ? theme.colors.groupedBackground
      : theme.colors.background;
  return <View style={{ minHeight, padding: 16, gap: 12, justifyContent: 'center', backgroundColor: background }}>{children}</View>;
}

/**
 * The example the reader last touched: only its screen shows toasts. `toast()` is one list for the page, and a
 * Toaster in every example drew each toast in all of them.
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

type StageProps = {
  /** `<file>/<export>`, a demo of ./demos */
  demo: string;
  platform: RNPlatform;
  scheme: RNScheme;
  grouped?: boolean;
  minHeight?: number;
};

/** The example's app: its demo on the screen's canvas, in the theme the page chose. */
function StageApp({ id, demo, platform, scheme, grouped, minHeight, host }: Required<StageProps> & { id: string; host: OverlayHost }) {
  const [loaded, setLoaded] = useState<{ demo: string; Demo: ComponentType } | { demo: string; error: Error } | null>(null);
  useEffect(() => {
    const [file, name] = demo.split('/');
    let live = true;
    const load = demoModules[file];
    (load ? load() : Promise.reject(new Error(`No React Native demos named ${file}`)))
      .then((demos) => {
        const Demo = demos[name];
        if (!Demo) throw new Error(`No demo ${name} in ${file}`);
        if (live) setLoaded({ demo, Demo });
      })
      .catch((error: Error) => {
        if (live) setLoaded({ demo, error });
      });
    return () => {
      live = false;
    };
  }, [demo]);
  const active = useSyncExternalStore(subscribeStage, readStage, () => null) === id;
  const current = loaded?.demo === demo ? loaded : null;
  if (current && 'error' in current) {
    return <pre style={{ padding: 16, color: 'var(--color-text-danger)', whiteSpace: 'pre-wrap' }}>{current.error.message}</pre>;
  }
  const Demo = current?.Demo;
  return (
    <Boundary>
      <OverlayHostContext.Provider value={host}>
        <ThemeProvider platform={platform} scheme={scheme} fonts={FONTS}>
          <Canvas grouped={grouped} minHeight={minHeight}>
            {Demo ? <Demo /> : null}
          </Canvas>
          {active ? <Toaster /> : null}
        </ThemeProvider>
      </OverlayHostContext.Provider>
    </Boundary>
  );
}

/**
 * An example runs in a React root of its own, as a React Native app does (AppRegistry), outside the page's Strict
 * Mode: its doubled effects left react-native-web's animations detached, so an overlay stayed at its closed frame.
 * The root's element is the window of the example's overlays (OverlayHostContext): they open in it and take its size.
 */
export default function RNStage({ demo, platform, scheme, grouped = false, minHeight = 160 }: StageProps) {
  const id = useId();
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 393, height: minHeight });
  const root = useRef<{ root: Root; element: HTMLDivElement } | null>(null);
  useEffect(() => {
    if (!node) return;
    // An element of its own per root: the page's Strict Mode mounts this twice, before the first root has unmounted
    const element = document.createElement('div');
    element.style.position = 'relative';
    element.style.minHeight = '100%';
    node.appendChild(element);
    const created = createRoot(element);
    root.current = { root: created, element };
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    const activate = () => activateStage(id);
    node.addEventListener('pointerdown', activate, true);
    node.addEventListener('keydown', activate, true);
    return () => {
      root.current = null;
      observer.disconnect();
      node.removeEventListener('pointerdown', activate, true);
      node.removeEventListener('keydown', activate, true);
      // A root unmounts outside React's own commit
      setTimeout(() => {
        created.unmount();
        element.remove();
      });
    };
  }, [node, id]);
  useEffect(() => {
    const current = root.current;
    if (!current) return;
    const host = { node: current.element, ...size };
    current.root.render(<StageApp id={id} demo={demo} platform={platform} scheme={scheme} grouped={grouped} minHeight={minHeight} host={host} />);
  }, [node, size, id, demo, platform, scheme, grouped, minHeight]);
  return <div ref={setNode} {...{ [OVERLAY_HOST_ATTRIBUTE]: '' }} style={{ position: 'relative', minHeight }} />;
}
