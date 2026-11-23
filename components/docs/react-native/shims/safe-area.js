// react-native-safe-area-context for the docs: the insets of the phone frame an example is drawn in (RNScreen passes
// them), or none on the page. The package's own web build sits behind `.web.js` files, which Turbopack does not prefer.
import { createContext, createElement, useContext } from 'react';

const NONE = { top: 0, right: 0, bottom: 0, left: 0 };
const SafeAreaInsetsContext = createContext(NONE);

export function useSafeAreaInsets() {
  return useContext(SafeAreaInsetsContext);
}

/** `initialMetrics.insets` sets the insets below it; without metrics a provider keeps its parent's. */
export function SafeAreaProvider({ initialMetrics, children }) {
  const parent = useContext(SafeAreaInsetsContext);
  return createElement(SafeAreaInsetsContext.Provider, { value: initialMetrics?.insets ?? parent }, children);
}

export { SafeAreaInsetsContext };
