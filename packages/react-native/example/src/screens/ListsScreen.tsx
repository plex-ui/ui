import { Badge, Button, Card, List, ListItem, PageControl, Slider, Switch, Text, useTheme } from "@plexui/react-native"
import { Bell, Globe, LockKeyHole, Moon, SoundOffSpeaker, SoundOnSpeaker } from "@plexui/react-native/icons"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import photo from "../../assets/photo.jpg"
import { Section } from "../demo"

export function ListsScreen() {
  const theme = useTheme()
  const [dark, setDark] = useState(false)
  const [volume, setVolume] = useState(60)
  const [brightness, setBrightness] = useState(30)
  const [price, setPrice] = useState([100, 300])
  const [size, setSize] = useState(50)
  const [bass, setBass] = useState(40)
  const [treble, setTreble] = useState(70)
  const [page, setPage] = useState(0)
  const [opened, setOpened] = useState("none")
  return (
    <>
      <Section title="List" note={theme.isAndroid ? "Android settings: a white section r16, 50dp rows, the value in the accent" : "iOS 26 inset grouped: radius 26, 52pt rows, hairlines from the text"}>
        <List header="General" footer="Notifications show on the lock screen." testID="list-general">
          <ListItem label="Notifications" leading={<Bell />} leadingColor={theme.color("--color-background-danger-solid")} value="On" onPress={() => setOpened("notifications")} testID="row-notifications" />
          <ListItem label="Language" leading={<Globe />} leadingColor={theme.color("--color-background-info-solid")} value="English" onPress={() => setOpened("language")} />
          <ListItem label="Dark mode" leading={<Moon />} leadingColor={theme.color("--color-background-discovery-solid")} trailing={<Switch checked={dark} onCheckedChange={setDark} accessibilityLabel="Dark mode" />} />
          <ListItem label="Privacy" description="Who can see your profile" leading={<LockKeyHole />} leadingColor={theme.color("--color-background-success-solid")} onPress={() => setOpened("privacy")} />
          <ListItem label="Beta" trailing={<Badge color="info">New</Badge>} onPress={() => setOpened("beta")} />
          <ListItem label="Screen Time" description="Managed by your organization" disabled onPress={() => {}} />
        </List>
        <List>
          <ListItem label="Sign out" destructive onPress={() => setOpened("sign out")} />
        </List>
        <Text variant="footnote" color="secondary" testID="list-value">
          Opened: {opened}
        </Text>
      </Section>
      <Section title="Card" note={theme.isAndroid ? "Android section cards: 16dp corners, no border, white on the gray page" : "Phone cards: radius 26, padding 16 or 20"}>
        <Card testID="card-outline">
          <Card.Header>
            <Card.Title>Weekly summary</Card.Title>
            <Card.Description>12 new places this week.</Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button size="sm" color="primary" pill>
              Open
            </Button>
            <Button size="sm" variant="soft" pill>
              Later
            </Button>
          </Card.Footer>
        </Card>
        <Card variant="solid" size="lg">
          <Card.Header>
            <Card.Title>Storage almost full</Card.Title>
            <Card.Description>14.2 GB of 15 GB used. Free up space or get more storage.</Card.Description>
          </Card.Header>
        </Card>
        <Card onPress={() => setOpened("photo card")} accessibilityLabel="Sunset over the hills, Sintra" testID="card-photo">
          <Card.Media source={photo} aspectRatio={4 / 3} title="Sunset over the hills" description="Sintra, Portugal · June 14" />
        </Card>
        <Card>
          <Card.Media source={photo} aspectRatio={2} />
          <Card.Header>
            <Card.Title>Lisbon · 4 nights</Card.Title>
            <Card.Description>May 12–16 · 2 guests · €640</Card.Description>
          </Card.Header>
        </Card>
      </Section>
      <Section title="Slider" note={theme.isAndroid ? "Android: a 3dp track, a 12dp thumb" : "iOS 26: a 6pt track, a 38x24 thumb"}>
        <Slider label="Volume" value={volume} onChange={setVolume} unit="%" resetValue={60} startAdornment={<SoundOffSpeaker size={20} color={theme.colors.textSecondary} />} endAdornment={<SoundOnSpeaker size={20} color={theme.colors.textSecondary} />} testID="slider-volume" />
        <Slider label="Brightness" value={brightness} onChange={setBrightness} step={10} testID="slider-brightness" />
        <Slider label="Microphone (not connected)" value={40} onChange={() => {}} disabled />
        <Slider range label="Price" value={price} onChange={setPrice} min={0} max={500} step={10} prefixUnit="$" minStepsBetweenThumbs={5} testID="slider-price" />
        <Slider
          label="Text size"
          value={size}
          onChange={setSize}
          step={25}
          marks={[
            { value: 0, label: "Small" },
            { value: 50, label: "Default" },
            { value: 100, label: "Large" },
          ]}
          testID="slider-size"
        />
        <View style={styles.vertical}>
          <Slider orientation="vertical" label="Bass" value={bass} onChange={setBass} testID="slider-bass" />
          <Slider orientation="vertical" label="Treble" value={treble} onChange={setTreble} />
        </View>
        <Text variant="footnote" color="secondary" testID="slider-value">
          Volume: {volume}, brightness: {brightness}
        </Text>
        <Text variant="footnote" color="secondary" testID="slider-more-value">
          Price: {price.join("–")}, text size: {size}, bass: {bass}
        </Text>
      </Section>
      <Section title="Page control" note={theme.isAndroid ? "Android page dots: 5dp, all full size, the current one in the accent" : "Dots of the iOS 26 kit; seven and more pages shrink the ends"}>
        <View style={styles.pages}>
          <PageControl count={4} value={page} onChange={setPage} testID="pages-four" />
          <PageControl count={12} defaultValue={5} background="prominent" />
          <PageControl count={7} defaultValue={6} background="minimal" />
          {/* Pages scrolled halfway from the second to the third: the pill shared between their marks */}
          <PageControl count={4} value={1} position={1.5} indicator="pill" testID="pages-half" />
          <PageControl count={4} value={1} position={1} indicator="pill" testID="pages-whole" />
        </View>
        <Text variant="footnote" color="secondary" testID="pages-value">
          Page {page + 1} of 4
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  pages: { alignSelf: "stretch", gap: 4 },
  vertical: { flexDirection: "row", gap: 32, alignSelf: "center" },
})
