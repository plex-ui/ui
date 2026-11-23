import { Avatar, AvatarGroup, Badge, Button, Chip, EmptyMessage, Skeleton, Text, useTheme } from "@plexui/react-native"
import { Archive, Filter, Heart, Search, User } from "@plexui/react-native/icons"
import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Row, Section } from "../demo"

/** People of a team, each with an avatar color. */
const PEOPLE = [
  { name: "Sofia Martinez", color: "secondary" },
  { name: "Priya Patel", color: "primary" },
  { name: "Liam Chen", color: "success" },
  { name: "Noah Williams", color: "info" },
  { name: "Emma Novak", color: "discovery" },
  { name: "Omar Haddad", color: "danger" },
] as const
const BADGE_COLORS = ["secondary", "success", "warning", "danger", "info", "discovery", "caution"] as const
/** A status that suits each badge color. */
const STATUSES: Record<(typeof BADGE_COLORS)[number], string> = {
  secondary: "Draft",
  success: "Paid",
  warning: "Pending",
  danger: "Failed",
  info: "New",
  discovery: "Beta",
  caution: "On hold",
}

export function ContentScreen() {
  const theme = useTheme()
  const [filters, setFilters] = useState<string[]>(["Nearby"])
  const [tags, setTags] = useState(["Design", "Mobile", "Plex"])
  const toggle = (name: string) => (on: boolean) => setFilters((list) => (on ? [...list, name] : list.filter((item) => item !== name)))
  return (
    <>
      <Section title="Avatar" note="An initial, a symbol or +N on a soft or solid fill; a picture over it">
        <Row gap={10} style={styles.center}>
          {PEOPLE.map(({ name, color }) => (
            <Avatar key={name} name={name} color={color} size={40} />
          ))}
        </Row>
        <Row gap={10} style={styles.center}>
          {PEOPLE.map(({ name, color }) => (
            <Avatar key={name} name={name} color={color} variant="solid" size={40} />
          ))}
        </Row>
        <Row gap={10} style={styles.center}>
          <Avatar name="Ada" size={28} />
          <Avatar Icon={User} size={40} color="info" />
          <Avatar overflowCount={12} size={40} />
          <Avatar name="Jordan Lee" imageUrl="not-a-picture" size={40} color="discovery" />
          <Avatar name="Grace Hopper" size={56} color="primary" onPress={() => {}} testID="avatar-button" />
        </Row>
        <AvatarGroup size={36}>
          <Avatar name="Ada" color="info" />
          <Avatar name="Grace" color="success" />
          <Avatar name="Linus" color="discovery" />
          <Avatar overflowCount={4} />
        </AvatarGroup>
      </Section>
      <Section title="Badge" note="Soft, solid and outline; four sizes; a pill; a cross">
        <Row gap={6}>
          {BADGE_COLORS.map((color) => (
            <Badge key={color} color={color}>
              {STATUSES[color]}
            </Badge>
          ))}
        </Row>
        <Row gap={6}>
          {BADGE_COLORS.map((color) => (
            <Badge key={color} color={color} variant="solid">
              {STATUSES[color]}
            </Badge>
          ))}
        </Row>
        <Row gap={6}>
          {BADGE_COLORS.slice(0, 4).map((color) => (
            <Badge key={color} color={color} variant="outline">
              {STATUSES[color]}
            </Badge>
          ))}
        </Row>
        <Row gap={6} style={styles.center}>
          <Badge size="sm">Pro</Badge>
          <Badge size="md">Pro</Badge>
          <Badge size="lg">Pro</Badge>
          <Badge size="xl" pill color="success">
            +12%
          </Badge>
          <Badge pill color="info" onRemove={() => {}}>
            Design
          </Badge>
        </Row>
      </Section>
      <Section title="Gradient avatars, counters" note={'variant="gradient": two initials; variant="counter": an unread count'}>
        <Row gap={10} style={styles.center}>
          {PEOPLE.map(({ name }) => (
            <Avatar key={name} name={name} variant="gradient" size={40} />
          ))}
        </Row>
        <Row gap={6} style={styles.center}>
          <Badge variant="counter">3</Badge>
          <Badge variant="counter">27</Badge>
          <Badge variant="counter">128</Badge>
          <Badge variant="counter" color="danger">
            1
          </Badge>
          <Badge variant="counter" color="success">
            New
          </Badge>
        </Row>
      </Section>
      <Section title="Chip" note={theme.isAndroid ? "Android chips: pills at 5%, the selected one solid" : "iOS filter capsules"}>
        <Row gap={8}>
          {["Nearby", "Open now", "Top rated"].map((name) => (
            <Chip key={name} selected={filters.includes(name)} onSelectedChange={toggle(name)} testID={`chip-${name.toLowerCase().replace(" ", "-")}`}>
              {name}
            </Chip>
          ))}
          <Chip icon={<Filter />} onPress={() => {}}>
            Filters
          </Chip>
          <Chip icon={<Archive />} disabled>
            Archived
          </Chip>
        </Row>
        <Row gap={8}>
          {tags.map((tag) => (
            <Chip key={tag} onRemove={() => setTags((list) => list.filter((item) => item !== tag))} removeLabel={`Remove ${tag}`}>
              {tag}
            </Chip>
          ))}
        </Row>
        <Text variant="footnote" color="secondary" testID="chip-value">
          Filters: {filters.join(", ") || "none"}
        </Text>
      </Section>
      <Section title="Skeleton" note={theme.isAndroid ? "Android shimmer: one band moves down across every block; still with reduced motion" : "Pulses between full and half opacity; still with reduced motion"}>
        <View style={styles.skeletonRow} accessibilityState={{ busy: true }} accessibilityLabel="Loading">
          <Skeleton circle height={44} />
          <View style={styles.skeletonText}>
            <Skeleton height={14} width="60%" />
            <Skeleton height={14} />
            <Skeleton height={14} width="80%" />
          </View>
        </View>
      </Section>
      <Section title="Empty message" note={theme.isAndroid ? "The Android empty view: a Medium 20 title, the description 14 gray, a full-width button" : "The phone layer's: a 48 symbol, the title 20/25 bold, the description 17/25"}>
        <EmptyMessage>
          <EmptyMessage.Icon>
            <Search />
          </EmptyMessage.Icon>
          <EmptyMessage.Title>No results</EmptyMessage.Title>
          <EmptyMessage.Description>Check the spelling or try a new search.</EmptyMessage.Description>
        </EmptyMessage>
        <EmptyMessage size="sm">
          <EmptyMessage.Icon color="danger">
            <Heart />
          </EmptyMessage.Icon>
          <EmptyMessage.Title>No favorites yet</EmptyMessage.Title>
          <EmptyMessage.Description>Tap the heart on a place to keep it here.</EmptyMessage.Description>
          <EmptyMessage.ActionRow>
            <Button color="primary" pill>
              Explore
            </Button>
          </EmptyMessage.ActionRow>
        </EmptyMessage>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch" },
  skeletonText: { flex: 1, gap: 8 },
})
