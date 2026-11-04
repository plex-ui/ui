'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Desktop, Mobile } from '@plexui/ui/components/Icon';

export type PreviewViewport = 'desktop' | 'phone';
const initialViewport = { viewport: 'desktop' as PreviewViewport, revision: 0 };
type ViewportContext = typeof initialViewport & { change: (viewport: PreviewViewport) => void };
const PreviewViewportContext = createContext<ViewportContext>({ ...initialViewport, change: () => {} });

/** A page-wide default; an individual example may still be compared independently. */
export function PreviewViewportProvider({ children }: { children: ReactNode }) {
  const [state, change] = useReducer(
    (current: typeof initialViewport, viewport: PreviewViewport) => ({ viewport, revision: current.revision + 1 }),
    initialViewport,
  );
  return <PreviewViewportContext.Provider value={{ ...state, change }}>{children}</PreviewViewportContext.Provider>;
}

export function usePreviewViewport() {
  return useContext(PreviewViewportContext);
}

export function PreviewViewportControl() {
  const { viewport, change } = usePreviewViewport();
  return (
    <div className="hidden items-center gap-3 md:flex">
      <span className="text-sm text-secondary">Examples</span>
      <SegmentedControl value={viewport} onChange={change} size="sm" pill aria-label="All examples">
        <SegmentedControl.Option value="desktop" icon={<Desktop />}>Desktop</SegmentedControl.Option>
        <SegmentedControl.Option value="phone" icon={<Mobile />}>Phone</SegmentedControl.Option>
      </SegmentedControl>
    </div>
  );
}
