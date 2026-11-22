import { Button, Heading, Text, useTheme } from "@plexui/react-native"
import { useEffect, useRef, useState } from "react"
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Row } from "./demo"
import { screens } from "./screens"
import { LinkContext, type Settings } from "./settings"

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
  // A change made here leaves the offset and the overlay a link asked for
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => onChange({ ...settings, [key]: value, scroll: undefined, open: undefined })
  const scroller = useRef<ScrollViewInstance>(null)
  const [viewport, setViewport] = useState(0)
  const [content, setContent] = useState(0)
  // The offset of a link (`scroll=`), kept until a finger scrolls: it is reached as the content grows tall enough
  const [linked, setLinked] = useState(settings)
  const [pending, setPending] = useState(settings.scroll)
  if (linked !== settings) {
    setLinked(settings)
    setPending(settings.scroll)
  }
  useEffect(() => {
    if (pending == null || viewport === 0 || content <= viewport) return
    scroller.current?.scrollTo({ y: Math.min(pending, content - viewport), animated: false })
    if (content - viewport < pending) return
    // Reached: a later change of the content's height leaves the offset alone (the web fires no `onScrollBeginDrag`)
    const frame = requestAnimationFrame(() => setPending(undefined))
    return () => cancelAnimationFrame(frame)
  }, [pending, content, viewport])
  useEffect(() => {
    if (Platform.OS !== "web" || typeof history === "undefined") return
    const query = new URLSearchParams({ platform: settings.platform, scheme: settings.scheme, brand: settings.brand, screen: screen.id })
    // A link's offset and overlay stay in the address until a control of the gallery changes, so a reload keeps them
    if (settings.scroll != null) query.set("scroll", String(settings.scroll))
    if (settings.open != null) query.set("open", settings.open)
    history.replaceState(null, "", `#${query}`)
  }, [settings.platform, settings.scheme, settings.brand, settings.scroll, settings.open, screen.id])
  // iOS: the grouped background. Android: a settings page stands on Settings' surfaceContainer (its cards
  // surfaceBright), the others on surface, as Google's apps
  const canvas = theme.isAndroid ? (screen.grouped ? theme.material.surfaceContainer : theme.material.surface) : theme.colors.groupedBackground
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
        <ScrollView
          key={screen.id}
          ref={scroller}
          testID={`screen-${screen.id}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
          onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContent(height)}
          onScrollBeginDrag={() => setPending(undefined)}
        >
          <LinkContext.Provider value={settings}>
            <screen.Component />
          </LinkContext.Provider>
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
