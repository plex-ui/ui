import { TabBar, Text, useTheme, type TabBarBackground } from "@plexui/react-native"
import { Calendar, Chats, Home, Music, PlayCircle, PlusLg, SettingsCog } from "@plexui/react-native/icons"
import { useState, type ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Frame, Section } from "../demo"

function Tabs({ badges = {}, disabled }: { badges?: Record<string, ReactNode>; disabled?: string }) {
  return [
    <TabBar.Item key="home" value="home" label="Home" icon={<Home />} badge={badges.home} disabled={disabled === "home"} testID="tab-home" />,
    <TabBar.Item key="chats" value="chats" label="Chats" icon={<Chats />} badge={badges.chats} disabled={disabled === "chats"} testID="tab-chats" />,
    <TabBar.Item key="calendar" value="calendar" label="Calendar" icon={<Calendar />} badge={badges.calendar} disabled={disabled === "calendar"} testID="tab-calendar" />,
    <TabBar.Item key="settings" value="settings" label="Settings" icon={<SettingsCog />} badge={badges.settings} disabled={disabled === "settings"} testID="tab-settings" />,
  ]
}

const BACKGROUNDS: TabBarBackground[] = ["glass", "hard"]

/** A song on the bottom accessory. */
function NowPlaying() {
  return (
    <View style={styles.playing}>
      <Music size={20} />
      <Text variant="subheadline" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
        Morning walk
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
        note={theme.isAndroid ? "Material 3 navigation bar: the 56x32 indicator, Label M" : "iOS 26: a glass capsule, the selected tab on a pill"}
      >
        <Frame striped testID="tab-bar-interactive">
          <TabBar value={tab} onValueChange={setTab} safeArea={false}>
            {Tabs({ badges: { chats: 3 } })}
          </TabBar>
        </Frame>
        <Text variant="footnote" color="secondary" testID="tab-bar-value">
          Selected: {tab}
        </Text>
      </Section>
      <Section title="Search and prominent tabs" note={theme.isAndroid ? "Regular destinations of the bar on Android" : "A glass circle of their own at the trailing end; with both, search joins the capsule"}>
        <Frame striped>
          <TabBar defaultValue="home" search={{ value: "search" }} safeArea={false}>
            {Tabs({})}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" prominent={{ value: "new", label: "New", icon: <PlusLg /> }} safeArea={false}>
            {Tabs({}).slice(0, 3)}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" prominent={{ value: "new", label: "New", icon: <PlusLg /> }} search={{ value: "search" }} safeArea={false} testID="tab-bar-both">
            {Tabs({}).slice(0, 3)}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Badges" note="A count, a word, a dot (true); a count of 0 shows none">
        <Frame striped>
          <TabBar defaultValue="home" safeArea={false}>
            {Tabs({ badges: { home: 0, chats: 128, calendar: "New", settings: true } })}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Disabled tab">
        <Frame striped>
          <TabBar defaultValue="home" safeArea={false}>
            {Tabs({ disabled: "calendar" })}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Accessory" note={theme.isAndroid ? "Material has no bottom accessory: a row above the bar" : "A glass capsule above the tabs"}>
        <Frame striped>
          <TabBar defaultValue="home" accessory={<NowPlaying />} safeArea={false} testID="tab-bar-accessory">
            {Tabs({})}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Minimized" note={theme.isAndroid ? "Android's navigation bar does not minimize" : "The selected tab alone in a 48pt circle; a tap expands it"}>
        <Frame striped testID="tab-bar-minimized">
          <TabBar defaultValue="chats" defaultMinimized search={{ value: "search" }} safeArea={false}>
            {Tabs({ badges: { chats: 3 } })}
          </TabBar>
        </Frame>
        <Frame striped>
          <TabBar defaultValue="home" defaultMinimized search={{ value: "search" }} accessory={<NowPlaying />} safeArea={false} testID="tab-bar-accessory-minimized">
            {Tabs({})}
          </TabBar>
        </Frame>
      </Section>
      <Section title="Backgrounds" note={theme.isAndroid ? "The bar is always surfaceContainer" : "Content under the bar: glass and hard"}>
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
