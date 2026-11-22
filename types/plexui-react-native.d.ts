// The docs bundle @plexui/react-native from its source (next.config.mjs aliases it, and `react-native` is
// react-native-web): its types need React Native's, which the site does not install, so the docs see it untyped.
declare module '@plexui/react-native';
declare module '@plexui/react-native/icons';
// `react-native` is react-native-web here, which ships no types
declare module 'react-native';
