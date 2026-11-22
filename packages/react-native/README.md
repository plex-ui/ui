# @plexui/react-native

Plex UI components for React Native and Expo. One set of components draws the iOS 26 look (the phone layer of
Plex UI: native sizes, glass) or Material 3 on Android, from the same design tokens as the web (`@plexui/styles`).

> Private and in development: not published to npm yet.

## Use

```tsx
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular"
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium"
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold"
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold"
import { Button, IconButton, Text, ThemeProvider, interFonts } from "@plexui/react-native"
import { Plus, Search } from "@plexui/react-native/icons"
import { useFonts } from "expo-font"

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  if (!loaded) return null
  return (
    <ThemeProvider fonts={interFonts}>
      <Text variant="title2">Hello</Text>
      <Button onPress={() => {}}>
        <Plus />
        New
      </Button>
      <IconButton icon={<Search />} accessibilityLabel="Search" />
    </ThemeProvider>
  )
}
```

`ThemeProvider` props:

- `scheme`: `"system"` (default), `"light"` or `"dark"`.
- `platform`: `"ios"` or `"android"`. Defaults to the device; a browser draws iOS.
- `brand`: a product's colors, tokens, fonts and radii over Plex UI:

```tsx
<ThemeProvider
  brand={{
    colors: { accent: "#7c3aed" },
    tokens: { "--color-background-primary-solid": "var(--color-accent)" },
    radius: { lg: 12 },
  }}
>
```

`useTheme()` gives any token resolved for the current scheme: `theme.color("--color-text")`,
`theme.length("--button-size-md")`, and Material 3 roles on `theme.material`.

## Peers

`react`, `react-native`, `react-native-svg`, `react-native-safe-area-context`. Optional: `expo-glass-effect` (native
Liquid Glass on iOS 26) and `expo-blur` (blur under the glass on earlier iOS).

## Develop

```bash
npm run build:icons          # generate the icon modules (gitignored)
npm run typecheck
npm run lint
npm test                     # typecheck, lint and the Playwright tests of the example's web build
```

The example app (`example/`) shows every component in every state, with iOS / Android, light / dark and a brand
theme. `npm run web --prefix example` opens it in a browser; `npm run ios` / `npm run android` on a simulator.
