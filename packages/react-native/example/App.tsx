import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular"
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium"
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold"
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold"
import { ThemeProvider, defaultPlatform, interFonts } from "@plexui/react-native"
import { useFonts } from "expo-font"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import { Platform, useColorScheme } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { violetBrand } from "./src/brand"
import { Gallery } from "./src/Gallery"
import { initialSettings, type Settings } from "./src/settings"

declare const window: { addEventListener(type: string, listener: () => void): void; removeEventListener(type: string, listener: () => void): void }

export default function App() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  const system = useColorScheme()
  const [settings, setSettings] = useState<Settings>(() =>
    initialSettings({ platform: defaultPlatform(), scheme: system === "dark" ? "dark" : "light", brand: "plex", screen: "theme" }),
  )
  // A link to another state of the gallery (a new fragment) opens it
  useEffect(() => {
    if (Platform.OS !== "web") return
    const follow = () => setSettings((current) => initialSettings(current))
    window.addEventListener("hashchange", follow)
    return () => window.removeEventListener("hashchange", follow)
  }, [])
  if (!loaded) return null
  return (
    <SafeAreaProvider>
      <ThemeProvider
        platform={settings.platform}
        scheme={settings.scheme}
        fonts={interFonts}
        brand={settings.brand === "violet" ? violetBrand : undefined}
      >
        <StatusBar style={settings.scheme === "dark" ? "light" : "dark"} />
        <Gallery settings={settings} onChange={setSettings} />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
