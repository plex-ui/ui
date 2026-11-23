import { TabBar, Text, useTheme, type TabBarBackground } from "@plexui/react-native"
import { Grid, Home, Music, PlayCircle, PlusLg, Pulse, Stack } from "@plexui/react-native/icons"
import { useState, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Frame, Section } from "../demo"

/** The tabs of a music app; search, where a bar has it, is the circle at the end. */
function Tabs({ badges = {}, disabled }: { badges?: Record<string, ReactNode>; disabled?: string }) {
  return [
    <TabBar.Item key="home" value="home" label="Home" icon={<Home />} badge={badges.home} disabled={disabled === "home"} testID="tab-home" />,
    <TabBar.Item key="new" value="new" label="New" icon={<Grid />} badge={badges.new} disabled={disabled === "new"} testID="tab-new" />,
    <TabBar.Item key="radio" value="radio" label="Radio" icon={<Pulse />} badge={badges.radio} disabled={disabled === "radio"} testID="tab-radio" />,
    <TabBar.Item key="library" value="library" label="Library" icon={<Stack />} badge={badges.library} disabled={disabled === "library"} testID="tab-library" />,
  ]
}

/** The prominent tab of the music app: a new playlist. */
const NEW_PLAYLIST = { value: "playlist", label: "New playlist", icon: <PlusLg /> }

const BACKGROUNDS: TabBarBackground[] = ["glass", "hard"]

/** A song on the bottom accessory. */
function NowPlaying() {
  return (
    <View style={styles.playing}>
      <Music size={20} />
      <Text variant="subheadline" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
        Blinding Lights · The Weeknd
      </Text>
      <PlayCircle size={24} />
    </View>
  )
}

export function TabBarScreen() {
  const theme = useTheme()
  const [tab, setTab] = useState("home")
  return (
    <>
      <Section
        title="Tabs"
        note={theme.isAndroid ? "Android: a capsule of the card at 76%; the chosen tab's own pill fades in and grows" : "iOS 26: a glass capsule, the selected tab on a pill"}
      >
        <Frame striped testID="tab-bar-interactive">
          <TabBar value={tab} onValueChange={setTab} safeArea={false}>
            {Tabs({ badges: { new: 3 } })}
          </TabBar>
        </Frame>
        <Text variant="footnote" color="secondary" testID="tab-bar-value">
          Selected: {tab}
        </Text>
      </Section>
      <Section title="Search and prominent tabs" note={theme.isAndroid ? "Search a circle beside the capsule (Android has none), a prominent tab an accent one" : "A glass circle of their own at the trailing end; with both, search joins the capsule"}>
        <Frame striped>
          <TabBar defaultValue="home" search={{ value: "search" }} safeArea={false}>
            {Tabs({})}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" prominent={NEW_PLAYLIST} safeArea={false}>
            {Tabs({}).slice(0, 3)}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" prominent={NEW_PLAYLIST} search={{ value: "search" }} safeArea={false} testID="tab-bar-both">
            {Tabs({}).slice(0, 3)}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Badges" note="A count, a word, a dot (true); a count of 0 shows none">
        <Frame striped>
          <TabBar defaultValue="home" safeArea={false}>
            {Tabs({ badges: { home: 0, new: 128, radio: "Live", library: true } })}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Disabled tab" note="Radio, not available in your region">
        <Frame striped>
          <TabBar defaultValue="home" safeArea={false}>
            {Tabs({ disabled: "radio" })}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Accessory" note={theme.isAndroid ? "A capsule of the card at 76% above the tabs" : "A glass capsule above the tabs"}>
        <Frame striped>
          <TabBar defaultValue="home" accessory={<NowPlaying />} safeArea={false} testID="tab-bar-accessory">
            {Tabs({})}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Minimized" note={theme.isAndroid ? "The Android tab bar does not minimize" : "The selected tab alone in a 48pt circle; a tap expands it"}>
        <Frame striped testID="tab-bar-minimized">
          <TabBar defaultValue="new" defaultMinimized search={{ value: "search" }} safeArea={false}>
            {Tabs({ badges: { new: 3 } })}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" defaultMinimized search={{ value: "search" }} accessory={<NowPlaying />} safeArea={false} testID="tab-bar-accessory-minimized">
            {Tabs({})}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Backgrounds" note="Content under the bar: glass and hard">
        {BACKGROUNDS.map((background) => (
          <Frame key={background} striped>
            <TabBar defaultValue="home" background={background} scrolled safeArea={false}>
              {Tabs({})}
            </TabBar>
          </Frame>
        ))}
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  playing: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
})
