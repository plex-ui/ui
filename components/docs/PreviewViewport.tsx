'use client';

import { createContext, useCallback, useContext, useReducer, useState, type ReactNode } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Desktop, Mobile } from '@plexui/ui/components/Icon';

export type PreviewViewport = 'desktop' | 'phone';
const initialViewport = { viewport: 'desktop' as PreviewViewport, revision: 0 };
type ViewportContext = typeof initialViewport & {
  change: (viewport: PreviewViewport) => void;
  hasPhoneExamples: boolean;
  registerPhoneExample: () => () => void;
  /** False on a page whose phone view is not ready (`phoneDraft`): its examples show no Phone switch. */
  phoneViews: boolean;
};
const PreviewViewportContext = createContext<ViewportContext>({
  ...initialViewport,
  change: () => {},
  hasPhoneExamples: false,
  registerPhoneExample: () => () => {},
  phoneViews: true,
});

/** A page-wide default; an individual example may still be compared independently. */
export function PreviewViewportProvider({ children, phoneViews = true }: { children: ReactNode; phoneViews?: boolean }) {
  const [state, change] = useReducer(
    (current: typeof initialViewport, viewport: PreviewViewport) => ({ viewport, revision: current.revision + 1 }),
    initialViewport,
  );
  const [phoneExamples, setPhoneExamples] = useState(0);
  const registerPhoneExample = useCallback(() => {
    setPhoneExamples((count) => count + 1);
    return () => setPhoneExamples((count) => count - 1);
  }, []);
  return <PreviewViewportContext.Provider value={{ ...state, change, hasPhoneExamples: phoneExamples > 0, registerPhoneExample, phoneViews }}>{children}</PreviewViewportContext.Provider>;
}

export function usePreviewViewport() {
  return useContext(PreviewViewportContext);
}

export function PreviewViewportControl() {
  const { viewport, change, hasPhoneExamples } = usePreviewViewport();
  if (!hasPhoneExamples) return null;
  return (
    <div className="hidden items-center gap-3 md:flex">
      <SegmentedControl value={viewport} onChange={change} size="sm" pill aria-label="All examples">
        <SegmentedControl.Option value="desktop" icon={<Desktop />}>Desktop</SegmentedControl.Option>
        <SegmentedControl.Option value="phone" icon={<Mobile />}>Phone</SegmentedControl.Option>
      </SegmentedControl>
    </div>
  );
}
