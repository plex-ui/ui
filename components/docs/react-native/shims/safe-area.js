// The docs' phone screens have no notch or home indicator: @plexui/react-native reads zero insets. The package's own
// web build sits behind `.web.js` files, which Turbopack does not prefer.
import { createElement, Fragment } from 'react';

const NONE = { top: 0, right: 0, bottom: 0, left: 0 };

export function useSafeAreaInsets() {
  return NONE;
}

export function SafeAreaProvider({ children }) {
  return createElement(Fragment, null, children);
}
