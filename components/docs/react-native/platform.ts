'use client';

import { createContext, useContext } from 'react';

/** The platform a React Native example draws: Apple's or Google's, as the reader picked it. */
export type NativePlatform = 'ios' | 'android';

export const NATIVE_PLATFORMS: readonly NativePlatform[] = ['ios', 'android'];

export function isNativePlatform(value: unknown): value is NativePlatform {
  return value === 'ios' || value === 'android';
}

/** A React Native component page, or its phone preview: /react-native/... and /preview/react-native/... */
export function isNativePath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && /^\/(preview\/)?react-native(\/|$)/.test(pathname));
}

/** The platform of the example being drawn: its own switch, the page's, or the phone preview's URL. */
export const NativePlatformContext = createContext<NativePlatform>('ios');

export function useNativePlatform(): NativePlatform {
  return useContext(NativePlatformContext);
}

/**
 * In a phone preview, an example that is not a screen of its own stands on an app screen whose top bar names it, as
 * a React example stands on a phone page (ComponentPreview). The React Native screen draws that bar itself, in the
 * platform's own top bar.
 */
export const NativeScreenTitleContext = createContext<{ page: boolean; title?: string }>({ page: false });
