'use client';

import { createContext, useCallback, useContext, useReducer, useState, type ReactNode } from 'react';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { AndroidMark, AppleMark, DesktopMark } from './PlatformIcons';
import type { NativePlatform } from './react-native/platform';

export type PreviewViewport = 'desktop' | 'phone';
const initialViewport = { viewport: 'desktop' as PreviewViewport, revision: 0 };
const initialPlatform = { platform: 'ios' as NativePlatform, platformRevision: 0 };
type ViewportContext = typeof initialViewport & typeof initialPlatform & {
  change: (viewport: PreviewViewport) => void;
  hasPhoneExamples: boolean;
  registerPhoneExample: () => () => void;
  /** False on a page whose phone view is not ready (`phoneDraft`): its examples show no Phone switch. */
  phoneViews: boolean;
  /** The platform every example draws, unless an example's own switch picks another: on a React Native page its
   * look, on a React or Vue page the device of the Phone view. */
  changePlatform: (platform: NativePlatform) => void;
  hasNativeExamples: boolean;
  registerNativeExample: () => () => void;
  /** Examples that are always a phone (`phoneOnly`, such as Toolbar): the page offers their device even on Desktop. */
  hasPhoneOnlyExamples: boolean;
  registerPhoneOnlyExample: () => () => void;
};
const PreviewViewportContext = createContext<ViewportContext>({
  ...initialViewport,
  ...initialPlatform,
  change: () => {},
  hasPhoneExamples: false,
  registerPhoneExample: () => () => {},
  phoneViews: true,
  changePlatform: () => {},
  hasNativeExamples: false,
  registerNativeExample: () => () => {},
  hasPhoneOnlyExamples: false,
  registerPhoneOnlyExample: () => () => {},
});

/** A page-wide default; an individual example may still be compared independently. */
export function PreviewViewportProvider({ children, phoneViews = true }: { children: ReactNode; phoneViews?: boolean }) {
  const [state, change] = useReducer(
    (current: typeof initialViewport, viewport: PreviewViewport) => ({ viewport, revision: current.revision + 1 }),
    initialViewport,
  );
  const [platformState, changePlatform] = useReducer(
    (current: typeof initialPlatform, platform: NativePlatform) => ({ platform, platformRevision: current.platformRevision + 1 }),
    initialPlatform,
  );
  const [phoneExamples, setPhoneExamples] = useState(0);
  const registerPhoneExample = useCallback(() => {
    setPhoneExamples((count) => count + 1);
    return () => setPhoneExamples((count) => count - 1);
  }, []);
  const [nativeExamples, setNativeExamples] = useState(0);
  const registerNativeExample = useCallback(() => {
    setNativeExamples((count) => count + 1);
    return () => setNativeExamples((count) => count - 1);
  }, []);
  const [phoneOnlyExamples, setPhoneOnlyExamples] = useState(0);
  const registerPhoneOnlyExample = useCallback(() => {
    setPhoneOnlyExamples((count) => count + 1);
    return () => setPhoneOnlyExamples((count) => count - 1);
  }, []);
  return (
    <PreviewViewportContext.Provider
      value={{
        ...state,
        ...platformState,
        change,
        hasPhoneExamples: phoneExamples > 0,
        registerPhoneExample,
        phoneViews,
        changePlatform,
        hasNativeExamples: nativeExamples > 0,
        registerNativeExample,
        hasPhoneOnlyExamples: phoneOnlyExamples > 0,
        registerPhoneOnlyExample,
      }}
    >
      {children}
    </PreviewViewportContext.Provider>
  );
}

export function usePreviewViewport() {
  return useContext(PreviewViewportContext);
}

export function PreviewViewportControl() {
  const { viewport, change, hasPhoneExamples, hasPhoneOnlyExamples, platform, changePlatform } = usePreviewViewport();
  if (!hasPhoneExamples && !hasPhoneOnlyExamples) return null;
  // One switch for the screen and the phone's platform: the desktop, or a phone's browser on iOS or Android. A page
  // whose examples are all phones (such as Toolbar) offers the two platforms alone; its phones keep the platform on
  // Desktop too.
  const value = hasPhoneExamples && viewport === 'desktop' ? 'desktop' : platform;
  return (
    <div className="hidden items-center gap-3 md:flex">
      <SegmentedControl
        value={value}
        onChange={(next) => {
          if (next === 'desktop') {
            change('desktop');
          } else {
            changePlatform(next as NativePlatform);
            if (hasPhoneExamples) change('phone');
          }
        }}
        size="sm"
        pill
        aria-label={hasPhoneExamples ? 'All examples' : 'All phones'}
      >
        {hasPhoneExamples && <SegmentedControl.Option value="desktop" icon={<DesktopMark />}>Desktop</SegmentedControl.Option>}
        <SegmentedControl.Option value="ios" icon={<AppleMark />}>iOS</SegmentedControl.Option>
        <SegmentedControl.Option value="android" icon={<AndroidMark />}>Android</SegmentedControl.Option>
      </SegmentedControl>
    </div>
  );
}

/** React Native pages: the platform of all examples, in the place of the Desktop and Phone switch. */
export function NativePlatformControl() {
  const { platform, changePlatform, hasNativeExamples } = usePreviewViewport();
  if (!hasNativeExamples) return null;
  return (
    <div className="flex items-center gap-3">
      <SegmentedControl value={platform} onChange={changePlatform} size="sm" pill aria-label="All examples">
        <SegmentedControl.Option value="ios" icon={<AppleMark />}>iOS</SegmentedControl.Option>
        <SegmentedControl.Option value="android" icon={<AndroidMark />}>Android</SegmentedControl.Option>
      </SegmentedControl>
    </div>
  );
}
