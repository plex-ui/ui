import { Text, useTheme, type IconComponent } from "@plexui/react-native"
import * as Plex from "@plexui/react-native/icons"
import HugeHome from "@plexui/react-native/icons/hugeicons/Home01Icon"
import HugeSearch from "@plexui/react-native/icons/hugeicons/Search01Icon"
import LucideCamera from "@plexui/react-native/icons/lucide/Camera"
import LucideHeart from "@plexui/react-native/icons/lucide/Heart"
import TablerBell from "@plexui/react-native/icons/tabler/Bell"
import TablerStar from "@plexui/react-native/icons/tabler/Star"
import { Labeled, Row, Section } from "../demo"

const SAMPLE = [
  "Search", "Plus", "CheckMd", "Bell", "Heart", "Home", "SettingsCog", "Share", "Copy", "Download",
  "EditPencil", "RemoveTrash", "Calendar", "Chat", "Email", "Globe", "LockKeyHole", "MapPin", "Mic", "Phone",
  "Play", "Reload", "Star", "Filter", "InfoCircle", "ExclamationMarkCircle", "ChevronRightMd", "ArrowLeftLg", "DotsHorizontal", "Eye",
] as const

export function IconsScreen() {
  const theme = useTheme()
  const set = Plex as Record<string, IconComponent | undefined>
  const icons = SAMPLE.flatMap((name) => {
    const Icon = set[name]
    return Icon ? [[name, Icon] as const] : []
  })
  return (
    <>
      <Section title="Plex UI set" note={`${Object.keys(Plex).length} icons from @plexui/react-native/icons`}>
        <Row gap={16}>
          {icons.map(([name, Icon]) => (
            <Icon key={name} accessibilityLabel={name} />
          ))}
        </Row>
      </Section>
      <Section title="Sizes">
        <Row gap={16}>
          {[16, 20, 24, 32, 40].map((size) => (
            <Labeled key={size} label={String(size)}>
              <Plex.Search size={size} />
            </Labeled>
          ))}
        </Row>
      </Section>
      <Section title="Colors" note="The text color by default; any color; two-tone icons take the accent">
        <Row gap={16}>
          <Plex.Heart />
          <Plex.Heart color={theme.colors.textSecondary} />
          <Plex.HeartFilled color={theme.color("--color-text-danger")} />
          <Plex.BellFilled color={theme.colors.accent} />
          <Plex.FilterBadge />
          <Plex.Scales />
        </Row>
      </Section>
      <Section title="Other sets" note="lucide, tabler and hugeicons, outlined">
        <Row gap={16}>
          <Labeled label="lucide">
            <Row gap={8}>
              <LucideHeart />
              <LucideCamera />
            </Row>
          </Labeled>
          <Labeled label="tabler">
            <Row gap={8}>
              <TablerStar />
              <TablerBell />
            </Row>
          </Labeled>
          <Labeled label="hugeicons">
            <Row gap={8}>
              <HugeHome />
              <HugeSearch />
            </Row>
          </Labeled>
        </Row>
        <Text variant="footnote" color="tertiary">
          Deep imports keep a bundle to the icons it uses.
        </Text>
      </Section>
    </>
  )
}
