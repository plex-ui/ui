// The docs bundle has no expo-blur or expo-glass-effect: @plexui/react-native requires them inside a try, so this
// throws as a missing package would, and the glass falls back to its blur and fill.
throw new Error('Not available in the docs: an optional peer of @plexui/react-native');
