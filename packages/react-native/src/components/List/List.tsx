import { createContext, isValidElement, useContext, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import Disclosure from "../../icons/plex/Disclosure"
import { useDescription } from "../../internal/a11y"
import { flattenChildren, textOf } from "../../internal/children"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type ListProps = {
  children: ReactNode
  /** The title over the section. */
  header?: ReactNode
  /** A note under the section. */
  footer?: ReactNode
  /**
   * The canvas the section stands on (iOS). `grouped`: the gray grouped canvas of a settings screen, the section in
   * the grouped secondary surface (white in light). `plain`: a plain canvas, the section in the plain secondary
   * gray (`--field-group-background`). @default "grouped"
   */
  surface?: "grouped" | "plain"
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

type RowPlace = { last: boolean }
const PlaceContext = createContext<RowPlace>({ last: true })

/**
 * A section of rows. iOS 26: a section of an inset grouped list, as @plexui/ui's FieldGroup on a phone
 * (`--field-group-radius` 26, the grouped secondary surface, rows 20 in from its edges, hairlines between rows
 * from the text's start; the header 17/22 at 590 in the secondary label, the footer 13/16). Android: a Material 3
 * list (no container, a Title S header in `primary` as Android's settings, 56 and 72dp rows, no dividers).
 */
export function List({ children, header, footer, surface = "grouped", "aria-label": ariaLabel, testID, style }: ListProps) {
  const theme = useTheme()
  const rows = flattenChildren(children).filter(isValidElement)
  const body = rows.map((row, index) => (
    <PlaceContext.Provider key={row.key ?? index} value={{ last: index === rows.length - 1 }}>
      {row}
    </PlaceContext.Provider>
  ))
  const label = ariaLabel ?? (textOf(header) || undefined)
  if (theme.isAndroid) {
    const m = theme.material
    return (
      <View accessibilityRole="list" aria-label={label} testID={testID} style={style}>
        {header != null ? (
          <Text accessibilityRole="header" color={m.primary} style={[styles.androidHeader, { fontSize: materialType.titleSmall.fontSize, lineHeight: materialType.titleSmall.lineHeight, ...theme.font("medium") }]}>
            {header}
          </Text>
        ) : null}
        {body}
        {footer != null ? (
          <Text color={m.onSurfaceVariant} style={[styles.androidFooter, { fontSize: materialType.bodySmall.fontSize, lineHeight: materialType.bodySmall.lineHeight }]}>
            {footer}
          </Text>
        ) : null}
      </View>
    )
  }
  const inset = theme.length("--list-row-inset", 20)
  return (
    <View testID={testID} style={style}>
      {header != null ? (
        <View style={{ minHeight: theme.length("--field-group-header-min-height", 39), justifyContent: "flex-end", paddingTop: 11, paddingBottom: 6, paddingHorizontal: inset }}>
          <Text accessibilityRole="header" weight="semibold" color={theme.color("--field-group-title-color", theme.colors.textSecondary)} style={styles.iosHeader}>
            {header}
          </Text>
        </View>
      ) : null}
      <View
        accessibilityRole="list"
        aria-label={label}
        style={[styles.iosGroup, { borderRadius: theme.length("--field-group-radius", 26), backgroundColor: surface === "plain" ? theme.color("--field-group-background", theme.colors.surfaceSecondary) : theme.colors.groupedSurface }]}
      >
        {body}
      </View>
      {footer != null ? (
        <Text color={theme.colors.textSecondary} style={[styles.iosFooter, { paddingHorizontal: inset }]}>
          {footer}
        </Text>
      ) : null}
    </View>
  )
}

export type ListItemProps = {
  /** The row's text, as @plexui/ui's NavigationRow `label`. */
  label: ReactNode
  description?: ReactNode
  /** A symbol at the start: in a tile of `leadingColor` on iOS (the Settings look), plain on Android. */
  leading?: ReactNode
  /** The fill of the leading tile on iOS; the symbol turns white on it. */
  leadingColor?: string
  /** A value at the end, in the secondary label (`Wi-Fi … Home`). */
  value?: ReactNode
  /** A control at the end: a Switch, a Badge. */
  trailing?: ReactNode
  /** The chevron of a row that opens a page. @default true when the row has `onPress` and no `trailing` */
  disclosure?: boolean
  onPress?: () => void
  disabled?: boolean
  /** A row in red, as a destructive action row. */
  destructive?: boolean
  accessibilityLabel?: string
  testID?: string
}

/**
 * A row of a List: the label (17/22, `--field-row-*`: 52 tall, 12 above and below the text) with a description,
 * a leading symbol, a value or a control, and the chevron of a drill-in (`Disclosure`, in the tertiary label). On
 * Android a Material 3 list item: Body L headline, Body M supporting text, a 24dp leading icon 16 from the text, the
 * value in Label S.
 */
export function ListItem({ label, description, leading, leadingColor, value, trailing, disclosure, onPress, disabled = false, destructive = false, accessibilityLabel, testID }: ListItemProps) {
  const theme = useTheme()
  const { last } = useContext(PlaceContext)
  const chevron = disclosure ?? (!!onPress && trailing == null)
  const name = accessibilityLabel ?? ([textOf(label), textOf(value)].filter(Boolean).join(", ") || undefined)
  // A pressable row reads its description after its name, as a hint
  const described = useDescription(onPress ? description : undefined)
  const row = (pressed: boolean) => (theme.isAndroid ? androidRow(theme, pressed) : iosRow(theme, pressed, last))
  const content = theme.isAndroid ? (
    <AndroidContent theme={theme} label={label} description={description} descriptionId={described.id} leading={leading} value={value} trailing={trailing} disabled={disabled} destructive={destructive} />
  ) : (
    <IOSContent theme={theme} label={label} description={description} descriptionId={described.id} leading={leading} leadingColor={leadingColor} value={value} trailing={trailing} chevron={chevron} disabled={disabled} destructive={destructive} last={last} />
  )
  if (onPress) {
    return (
      <Pressable {...described.props} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} testID={testID} style={({ pressed }) => row(pressed)}>
        {content}
      </Pressable>
    )
  }
  return (
    <View testID={testID} style={row(false)}>
      {content}
    </View>
  )
}

function iosRow(theme: Theme, pressed: boolean, last: boolean): ViewStyle {
  const inset = theme.length("--list-row-inset", 20)
  return {
    flexDirection: "row",
    alignItems: "center",
    minHeight: theme.length("--field-row-min-height", 52),
    paddingLeft: inset,
    backgroundColor: pressed ? theme.color("--field-row-press-background") : undefined,
    // The press fills the row to the group's rounded ends
    borderBottomLeftRadius: last ? theme.length("--field-group-radius", 26) : 0,
    borderBottomRightRadius: last ? theme.length("--field-group-radius", 26) : 0,
  }
}

function androidRow(theme: Theme, pressed: boolean): ViewStyle {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: pressed ? withAlpha(theme.material.onSurface, stateLayer.pressed) : undefined,
  }
}

type ContentProps = Pick<ListItemProps, "label" | "description" | "leading" | "value" | "trailing"> & { theme: Theme; disabled: boolean; destructive: boolean; descriptionId?: string }

function IOSContent({ theme, label, description, descriptionId, leading, leadingColor, value, trailing, chevron, disabled, destructive, last }: ContentProps & { leadingColor?: string; chevron: boolean; last: boolean }) {
  const inset = theme.length("--list-row-inset", 20)
  const tile = theme.length("--field-row-icon-size", 28)
  const labelColor = disabled ? theme.colors.textDisabled : destructive ? theme.color("--color-text-danger") : theme.colors.text
  const secondary = disabled ? theme.colors.textDisabled : theme.colors.labelSecondary
  return (
    <>
      {leading != null ? (
        <View
          style={[
            styles.tile,
            { width: tile, height: tile, marginLeft: theme.length("--field-row-icon-offset", -2), marginRight: theme.length("--field-row-icon-gap", 14) },
            leadingColor ? { backgroundColor: leadingColor, borderRadius: theme.length("--field-row-icon-radius", 7) } : null,
          ]}
        >
          <IconDefaultsProvider size={leadingColor ? 20 : theme.length("--field-row-icon-symbol-size", 24)} color={leadingColor ? "#ffffff" : disabled ? theme.colors.textDisabled : theme.colors.accent}>
            {leading}
          </IconDefaultsProvider>
        </View>
      ) : null}
      {/* The text and what ends the row share the hairline: it starts at the text, as UIKit's separator inset */}
      <View style={[styles.iosMain, { paddingRight: inset, gap: theme.length("--field-row-gap", 16) }, last ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator }]}>
        <View style={styles.iosText}>
          <Text color={labelColor} style={styles.iosLabel}>
            {label}
          </Text>
          {description != null ? (
            <Text nativeID={descriptionId} color={secondary} style={styles.iosDescription}>
              {description}
            </Text>
          ) : null}
        </View>
        {value != null || trailing != null || chevron ? (
          <View style={[styles.end, { gap: theme.length("--field-row-disclosure-gap", 8) }]}>
            {value != null ? (
              <Text color={secondary} numberOfLines={1} style={[styles.iosLabel, styles.shrink]}>
                {value}
              </Text>
            ) : null}
            {trailing != null ? <View style={styles.keep}>{trailing}</View> : null}
            {chevron ? <Disclosure size={20} color={disabled ? theme.colors.labelQuaternary : theme.colors.labelTertiary} style={styles.disclosure} /> : null}
          </View>
        ) : null}
      </View>
    </>
  )
}

function AndroidContent({ theme, label, description, descriptionId, leading, value, trailing, disabled, destructive }: ContentProps) {
  const m = theme.material
  const off = withAlpha(m.onSurface, 0.38)
  const body = materialType.bodyLarge
  const small = materialType.bodyMedium
  const tag = materialType.labelSmall
  return (
    <>
      {leading != null ? (
        <IconDefaultsProvider size={24} color={disabled ? off : destructive ? m.error : m.onSurfaceVariant}>
          {leading}
        </IconDefaultsProvider>
      ) : null}
      <View style={[styles.androidText, description != null ? styles.twoLine : null]}>
        <Text color={disabled ? off : destructive ? m.error : m.onSurface} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
          {label}
        </Text>
        {description != null ? (
          <Text nativeID={descriptionId} color={disabled ? off : m.onSurfaceVariant} style={{ fontSize: small.fontSize, lineHeight: small.lineHeight }}>
            {description}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <Text color={disabled ? off : m.onSurfaceVariant} numberOfLines={1} style={[styles.androidValue, { fontSize: tag.fontSize, lineHeight: tag.lineHeight, ...theme.font("medium") }]}>
          {value}
        </Text>
      ) : null}
      {trailing != null ? <View style={styles.androidEnd}>{trailing}</View> : null}
    </>
  )
}

const styles = StyleSheet.create({
  iosHeader: { fontSize: 17, lineHeight: 22 },
  iosFooter: { fontSize: 13, lineHeight: 16, paddingTop: 8, paddingBottom: 6 },
  iosGroup: { overflow: "hidden", borderCurve: "continuous" },
  iosMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", alignSelf: "stretch", minHeight: 52 },
  iosText: { flex: 1, minWidth: 0, paddingVertical: 12 },
  iosLabel: { fontSize: 17, lineHeight: 22 },
  iosDescription: { fontSize: 15, lineHeight: 20 },
  tile: { alignItems: "center", justifyContent: "center" },
  end: { flexDirection: "row", alignItems: "center", flexShrink: 1, maxWidth: "60%" },
  disclosure: { marginHorizontal: -5 },
  androidHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  androidFooter: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  androidText: { flex: 1, minWidth: 0 },
  androidEnd: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  // A long value gives way to the label and to a control: it takes at most 40% of the row and ends in an ellipsis
  androidValue: { flexShrink: 1, maxWidth: "40%" },
  shrink: { flexShrink: 1 },
  keep: { flexShrink: 0 },
  twoLine: { minHeight: 56, justifyContent: "center" },
})
