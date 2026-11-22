import { Text, useTheme, type MaterialColors } from "@plexui/react-native"
import { StyleSheet, View } from "react-native"
import { Row, Section } from "../demo"

const ACCENT = ["50", "75", "200", "300", "500", "600", "700", "a25", "a50", "a75"]
const ROLES = ["text", "text-secondary", "text-tertiary", "text-accent", "text-danger", "text-success", "text-warning", "text-info"]
const SURFACES = ["surface", "surface-secondary", "surface-tertiary", "surface-elevated", "border", "border-strong"]

function Swatch({ name, color }: { name: string; color: string }) {
  const theme = useTheme()
  return (
    <View style={styles.swatch} testID={`swatch-${name}`}>
      <View style={[styles.chip, { backgroundColor: color, borderColor: theme.colors.border }]} />
      <View style={styles.swatchText}>
        <Text variant="footnote" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption1" color="secondary" mono numberOfLines={1}>
          {color}
        </Text>
      </View>
    </View>
  )
}

/** The tokens of the current theme: what a brand changes, and Material's roles drawn from Plex UI on Android. */
export function ThemeScreen() {
  const theme = useTheme()
  return (
    <>
      <Section title="Accent" note="--color-accent and the steps drawn from it">
        <Swatch name="--color-accent" color={theme.colors.accent} />
        <Row gap={4}>
          {ACCENT.map((step) => (
            <View key={step} style={[styles.step, { backgroundColor: theme.color(`--accent-${step}`) }]} />
          ))}
        </Row>
      </Section>
      <Section title="Text">
        {ROLES.map((name) => (
          <Swatch key={name} name={`--color-${name}`} color={theme.color(`--color-${name}`)} />
        ))}
      </Section>
      <Section title="Surfaces">
        {SURFACES.map((name) => (
          <Swatch key={name} name={`--color-${name}`} color={theme.color(`--color-${name}`)} />
        ))}
      </Section>
      <Section title="Material 3 roles" note="Drawn from Plex UI tokens: primary is the accent, the neutral roles the Plex grays">
        {(Object.keys(theme.material) as (keyof MaterialColors)[]).map((role) => (
          <Swatch key={role} name={role} color={theme.material[role]} />
        ))}
      </Section>
      <Section title="Typography">
        <Text>The quick brown fox jumps over the lazy dog</Text>
        <Text variant="footnote" color="secondary">
          Tracking at 17: {theme.tracking(17).toFixed(3)} px
        </Text>
      </Section>
    </>
  )
}

const styles = StyleSheet.create({
  swatch: { flexDirection: "row", alignItems: "center", gap: 12 },
  chip: { width: 32, height: 32, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  swatchText: { flex: 1 },
  step: { flex: 1, height: 32, borderRadius: 6, minWidth: 28 },
})
