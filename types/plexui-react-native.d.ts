// The docs bundle @plexui/react-native from its source (next.config.mjs aliases it, and `react-native` is
// react-native-web): its types need React Native's, which the site does not install, so the docs see it untyped.
declare module '@plexui/react-native';
declare module '@plexui/react-native/icons';
// `react-native` is react-native-web here, which ships no types
declare module 'react-native';

// The docs alias react-native-safe-area-context to their own shim (shims/safe-area.js), which RNScreen sets
declare module 'react-native-safe-area-context' {
  import type { ReactNode } from 'react';
  type Insets = { top: number; right: number; bottom: number; left: number };
  export function useSafeAreaInsets(): Insets;
  export function SafeAreaProvider(props: { initialMetrics?: { insets: Insets; frame: { x: number; y: number; width: number; height: number } }; children?: ReactNode }): ReactNode;
}
