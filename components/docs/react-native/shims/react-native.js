// The docs' `react-native` (next.config.mjs aliases it here): react-native-web, imported by its path so the alias
// does not point back at this file. An example runs as an app would: in the phone preview (an iframe the size of the
// phone's screen) or on a narrow page, which is a phone already, so its window, modals and measures are the
// browser's own.
export * from '../../../../node_modules/react-native/dist/index.js';
