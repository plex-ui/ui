import { Button, Heading, Text, useTheme } from "@plexui/react-native"
import { useEffect } from "react"
import { Platform, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Row } from "./demo"
import { screens } from "./screens"
import type { Settings } from "./settings"

declare const history: { replaceState(data: unknown, unused: string, url: string): void } | undefined

type Option<T> = { value: T; label: string }

function Choice<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: Option<T>[]; onChange: (value: T) => void }) {
  return (
    <Row gap={4}>
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant="soft"
          selected={option.value === value}
          onPress={() => onChange(option.value)}
          testID={`${name}-${option.value}`}
        >
          {option.label}
        </Button>
      ))}
    </Row>
  )
}

/**
 * The gallery of the example: the settings of the theme (platform, scheme, brand), the screens of the components
 * and the current screen. In a browser the fragment of the address follows the settings.
 */
export function Gallery({ settings, onChange }: { settings: Settings; onChange: (settings: Settings) => void }) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const screen = screens.find((item) => item.id === settings.screen) ?? screens[0]
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => onChange({ ...settings, [key]: value })
  useEffect(() => {
    if (Platform.OS !== "web" || typeof history === "undefined") return
    const query = new URLSearchParams({ platform: settings.platform, scheme: settings.scheme, brand: settings.brand, screen: screen.id })
    history.replaceState(null, "", `#${query}`)
  }, [settings.platform, settings.scheme, settings.brand, screen.id])
  const canvas = theme.isAndroid ? theme.material.surface : theme.colors.groupedBackground
  const bar = theme.isAndroid ? theme.material.surfaceContainer : theme.colors.background
  return (
    <View style={[styles.page, { backgroundColor: Platform.OS === "web" ? theme.color("--gray-100") : canvas }]}>
      <View style={[styles.phone, { backgroundColor: canvas }]} testID="gallery">
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: bar, borderColor: theme.colors.border }]}>
          <View style={styles.title}>
            <Heading size="sm">Plex UI</Heading>
            <Text variant="footnote" color="secondary">
              React Native
            </Text>
          </View>
          <Row gap={12}>
            <Choice
              name="platform"
              value={settings.platform}
              options={[
                { value: "ios", label: "iOS" },
                { value: "android", label: "Android" },
              ]}
              onChange={set("platform")}
            />
            <Choice
              name="scheme"
              value={settings.scheme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={set("scheme")}
            />
            <Choice
              name="brand"
              value={settings.brand}
              options={[
                { value: "plex", label: "Plex" },
                { value: "violet", label: "Brand" },
              ]}
              onChange={set("brand")}
            />
          </Row>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {screens.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant="ghost"
                selected={item.id === screen.id}
                onPress={() => set("screen")(item.id)}
                testID={`screen-tab-${item.id}`}
              >
                {item.title}
              </Button>
            ))}
          </ScrollView>
        </View>
        <ScrollView key={screen.id} testID={`screen-${screen.id}`} contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}>
          <screen.Component />
        </ScrollView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 440 },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  tabs: { gap: 4 },
})
