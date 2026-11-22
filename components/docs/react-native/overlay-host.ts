import { createContext } from 'react';

/**
 * The phone screen of a React Native example (RNStage): the docs' `react-native` (shims/react-native.js) opens a
 * `Modal` inside it rather than over the page, and gives its size as the window's, so a dialog, a sheet or a menu
 * stays in the example's screen.
 */
export type OverlayHost = { node: HTMLElement; width: number; height: number };

export const OverlayHostContext = createContext<OverlayHost | null>(null);

/** Marks the host element: a measure in the window is taken from its corner (see the shim). */
export const OVERLAY_HOST_ATTRIBUTE = 'data-rn-overlay-host';
