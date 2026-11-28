import { cloneElement, createContext, isValidElement, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Pressable } from "../../internal/Pressable"
import CheckMd from "../../icons/plex/CheckMd"
import Disclosure from "../../icons/plex/Disclosure"
import ExclamationMarkCircle from "../../icons/plex/ExclamationMarkCircle"
import DotsHorizontal from "../../icons/plex/DotsHorizontal"
import DotsVertical from "../../icons/plex/DotsVertical"
import { describedBy, spaceToggles, useDescription, useHint } from "../../internal/a11y"
import { useRipple } from "../../internal/ripple"
import { flattenChildren, textOf } from "../../internal/children"
import { cssBox } from "../../internal/cssBox"
import { mirrored, useRTL } from "../../internal/direction"
import { RowActionContext, RowEndContext, RowFrameContext, RowHoldContext, RowStartContext, holdProps, type RowEnd, type RowFrame } from "../../internal/row"
import { accentText, controlHighlight, dangerText, divider, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Button, ListActionContext, buttonColors, buttonMetrics } from "../Button/Button"
import { Checkbox, type CheckboxProps } from "../Checkbox/Checkbox"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { RadioContext, RadioGroup, type RadioGroupContext, type RadioGroupItemProps } from "../RadioGroup/RadioGroup"
import { Switch, SwitchTrack, type SwitchProps } from "../Switch/Switch"
import { Text } from "../Text/Text"
import { Menu } from "../Menu/Menu"

export type ListProps = {
  children: ReactNode
  /** The title over the section. */
  header?: ReactNode
  /** A line under the title, as the web's FieldGroup `description`: 15/20 in the secondary label on iOS. */
  description?: ReactNode
  /** A note under the section. */
  footer?: ReactNode
  /**
   * An error under the rows: it stands in the footer's place, in the footer's type (iOS 13/16, 8 under the section;
   * Android 14sp), only in the danger color, while it is set, and is announced when it appears.
   */
  error?: ReactNode
  /**
   * The canvas the section stands on. `grouped`: the gray grouped canvas of a settings screen, the section in the
   * grouped secondary surface (white in light). `plain`: a plain canvas; on iOS the section in the plain secondary gray
   * (`--field-group-background`), on Android a plain list: no card, the rows across the canvas (the screen sets such a
   * list at its edges) in the cards' color, the header a 32dp band of the grouped gray. @default "grouped"
   */
  surface?: "grouped" | "plain"
  /**
   * Content at the end of the header, as the web's FieldGroup `action`: a ghost Button there is the list header's text
   * action (iOS: tinted 17/22 text on the title's line with a 44pt target; Android: 14sp Medium in its color). A string,
   * a number or a Text (a count such as "2/3") takes the header's type in the secondary label, on the title's line. With
   * no `header` the action stands alone at the header's end.
   */
  action?: ReactNode
  /**
   * How much the header stands out, as the web's FieldGroup `headerProminence`: `increased` is iOS's prominent list
   * header (20/25 Semibold in the primary label, 10 above the rows), and on Android a 16sp Medium title in the text
   * color in place of the accent's 14sp. @default "standard"
   */
  headerProminence?: "standard" | "increased"
  /**
   * Every row's value starts at one column, 40% into the row (`--field-row-column-width`), as the web's FieldGroup
   * `columns`: a form of typed details. Off, values end at the row's edge.
   */
  columns?: boolean
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** What a List tells its rows; null outside a List. */
const ListOptionsContext = createContext<{ columns: boolean } | null>(null)

/** Whether a control stands in a List's rows (a FloatingLabelInput is a row there, a List of its own elsewhere). */
export function useInList() {
  return useContext(ListOptionsContext) != null
}

/** The corners of Android's card of rows. */
const ANDROID_CARD_RADIUS = 16
/** The start and end of an Android row's text, 21dp in from the card's edge (`--list-row-inset`). */
const ANDROID_INSET = 21

/**
 * Where a List's rows start their text inside the card and how round the card is, for a card built beside a List
 * that must line up with it: iOS `--list-row-inset` (20) and `--field-group-radius` (26), Android 21 and 16.
 */
export function useListMetrics(): { rowInset: number; radius: number } {
  const theme = useTheme()
  return theme.isAndroid
    ? { rowInset: ANDROID_INSET, radius: ANDROID_CARD_RADIUS }
    : { rowInset: theme.length("--list-row-inset", 20), radius: theme.length("--field-group-radius", 26) }
}

/** A row's place in its section, and the radius of the corners it shares with the section's card (none in a plain list). */
type RowPlace = { first: boolean; last: boolean; top: number; bottom: number }
const PlaceContext = createContext<RowPlace>({ first: true, last: true, top: 0, bottom: 0 })

/**
 * How far a line's baseline stands over the line's bottom: half the leading under the face's box, and its descent.
 * The kit's faces (Inter, SF Pro, Roboto) draw about 1.21 of the size from ascent to descent, 0.24 of it a descent.
 */
const baselineOverBottom = (fontSize: number, lineHeight: number) => (lineHeight - fontSize * 1.21) / 2 + fontSize * 0.24

/**
 * A header's action that is not a Button (a count such as "2/3") takes the header's type, so it stands on the title's
 * line: iOS 17/22 on its last line, Android the header's 15sp on its 40dp row. Its own style still wins; on iOS
 * (`onBaseline`) a Text in a type of its own is lifted onto the title's baseline.
 */
function headerAction(action: ReactNode, type: StyleProp<TextStyle>, color: string, onBaseline = false): ReactNode {
  if (typeof action === "string" || typeof action === "number") {
    return (
      <Text color={color} tabularNums style={type}>
        {action}
      </Text>
    )
  }
  if (isValidElement<{ style?: StyleProp<TextStyle> }>(action) && action.type === Text) {
    // A count in a type of its own (a 15/20 subheadline beside the 17/22 title) is lifted onto the title's baseline,
    // the row still set at its bottoms so the count stays on the title's last line
    const header = StyleSheet.flatten(type) ?? {}
    const own = StyleSheet.flatten([type, action.props.style]) ?? {}
    const lift =
      onBaseline && typeof header.fontSize === "number" && typeof header.lineHeight === "number" && typeof own.fontSize === "number" && typeof own.lineHeight === "number"
        ? baselineOverBottom(header.fontSize, header.lineHeight) - baselineOverBottom(own.fontSize, own.lineHeight)
        : 0
    return cloneElement(action, { style: [type, action.props.style, lift !== 0 ? { marginBottom: lift } : null] })
  }
  return action
}

/**
 * A section of rows. iOS 26: a section of an inset grouped list, as @plexui/ui's FieldGroup on a phone
 * (`--field-group-radius` 26, the grouped secondary surface, rows 20 in from its edges, hairlines between rows from
 * the text's start; the header 17/22 at 590 in the secondary label over its description 15/20, the footer 13/16, an
 * error in its place and type in the danger color). Android: a section of a settings screen: one card of the section's rows,
 * 16dp round, a 1px divider between rows from the text's start to the card's end; the header inside the card, a 40dp
 * row of 15sp Medium in the accent 21 in (14 above it), its description 14sp in the secondary label under it; the
 * footer under the card, 14sp in the secondary label 13 in (25 from the screen's edge, as the screen insets the card
 * 12), 11 above and 17 below, an error the same in the error color (the web's FieldGroup on Android). The screen sets the cards 12 from its edges and 12 apart. On a plain canvas
 * Android draws a plain list: the rows across the screen with no card, the header a 32dp band of the grouped gray,
 * the footer on that gray.
 */
export function List({
  children,
  header,
  description,
  footer,
  error,
  surface = "grouped",
  action,
  headerProminence = "standard",
  columns = false,
  "aria-label": ariaLabel,
  testID,
  style,
}: ListProps) {
  const theme = useTheme()
  // A Button among the rows is an action row, as the web's ghost Button in a `[data-row]`
  const rows = flattenChildren(children)
    .filter(isValidElement)
    .map((row) => (row.type === Button ? <ActionRow key={row.key ?? undefined}>{row}</ActionRow> : row))
  const options = useMemo(() => ({ columns }), [columns])
  const increased = headerProminence === "increased"
  // Android's footer 13 into the card's width, as the Settings app; a token for a screen that keeps text at its gutter
  const footerInset = theme.length("--list-android-footer-inset", 13)
  const fill = surface === "plain" ? theme.color("--field-group-background", theme.colors.surfaceSecondary) : theme.colors.groupedSurface
  // The card's corners: Android's 16dp card (a header or description inside it stands over the first row), iOS's group
  const corner = surface === "plain" && theme.isAndroid ? 0 : theme.isAndroid ? ANDROID_CARD_RADIUS : theme.length("--field-group-radius", 26)
  const opensCard = theme.isAndroid ? header == null && description == null : true
  const body = rows.map((row, index) => (
    <PlaceContext.Provider
      key={row.key ?? index}
      value={{
        first: index === 0,
        last: index === rows.length - 1,
        top: index === 0 && opensCard ? corner : 0,
        bottom: index === rows.length - 1 ? corner : 0,
      }}
    >
      {row}
    </PlaceContext.Provider>
  ))
  const label = ariaLabel ?? (textOf(header) || undefined)
  if (theme.isAndroid) {
    // A plain list has no card: its rows run across the screen in the cards' color (so a divider shows in dark mode
    // too), and its header is a band of the grouped canvas across them, 14sp Medium in the secondary label 16 in
    const plain = surface === "plain"
    const band = theme.colors.groupedBackground
    return (
      <View testID={testID} style={style}>
        <View style={plain ? { backgroundColor: theme.colors.groupedSurface } : [styles.androidCard, { backgroundColor: fill }]}>
          {header == null && action == null ? null : plain ? (
            <View style={[styles.androidBand, action != null ? styles.androidBandRow : null, { backgroundColor: band }]}>
              {header != null ? (
                <Text accessibilityRole="header" color={theme.colors.labelSecondary} weight="medium" numberOfLines={1} style={[styles.androidBandText, action != null ? styles.grow : null]}>
                  {header}
                </Text>
              ) : (
                <View style={styles.grow} />
              )}
              {action != null ? <ListActionContext.Provider value="header">{headerAction(action, styles.androidBandText, theme.colors.labelSecondary)}</ListActionContext.Provider> : null}
            </View>
          ) : action != null ? (
            <View style={styles.androidHeaderRow}>
              {header != null ? (
                <Text accessibilityRole="header" color={increased ? theme.colors.text : accentText(theme)} weight="medium" style={[styles.androidHeaderTitle, increased ? styles.androidHeaderIncreased : null]}>
                  {header}
                </Text>
              ) : (
                <View style={styles.grow} />
              )}
              <ListActionContext.Provider value="header">{headerAction(action, styles.androidHeaderTitleType, theme.colors.labelSecondary)}</ListActionContext.Provider>
            </View>
          ) : (
            <Text accessibilityRole="header" color={increased ? theme.colors.text : accentText(theme)} weight="medium" style={[styles.androidHeader, increased ? styles.androidHeaderIncreased : null]}>
              {header}
            </Text>
          )}
          {description != null ? (
            <Text
              color={theme.colors.labelSecondary}
              style={[styles.androidDescriptionLine, plain ? styles.androidDescriptionPlain : header == null ? styles.androidDescriptionAlone : null]}
            >
              {description}
            </Text>
          ) : null}
          <View accessibilityRole="list" aria-label={label}>
            <ListOptionsContext.Provider value={options}>{body}</ListOptionsContext.Provider>
          </View>
        </View>
        {error != null ? (
          <Text color={dangerText(theme)} accessibilityLiveRegion="polite" style={[styles.androidFooter, { paddingHorizontal: footerInset }, plain ? [styles.androidFooterPlain, { backgroundColor: band }] : null]}>
            {error}
          </Text>
        ) : footer != null ? (
          <Text color={theme.colors.labelSecondary} style={[styles.androidFooter, { paddingHorizontal: footerInset }, plain ? [styles.androidFooterPlain, { backgroundColor: band }] : null]}>
            {footer}
          </Text>
        ) : null}
      </View>
    )
  }
  const inset = theme.length("--list-row-inset", 20)
  const footerBox = cssBox(theme, "--field-group-footer-padding", [8, inset, 6, inset])
  return (
    <View testID={testID} style={style}>
      {header != null || description != null || action != null ? (
        <View
          style={{
            // The prominent header: 20/25 Semibold in the primary label, 10 above and below (45 at least), as the kit's
            // Prominent list header
            minHeight: increased ? 45 : theme.length("--field-group-header-min-height", 39),
            justifyContent: "flex-end",
            paddingTop: increased ? 10 : theme.length("--field-group-header-padding-top", 11),
            paddingBottom: increased ? 10 : theme.length("--field-group-header-padding-bottom", 6),
            paddingHorizontal: theme.length("--field-group-title-padding-inline", inset),
          }}
        >
          {header != null || action != null ? (
            <View style={action != null ? styles.iosHeaderRow : null}>
              {header == null ? <View style={styles.grow} /> : null}
              {header == null ? null : <Text
                accessibilityRole="header"
                weight="semibold"
                color={increased ? theme.colors.text : theme.colors.labelSecondary}
                style={[
                  increased ? { fontSize: 20, lineHeight: 25 } : { fontSize: theme.length("--field-group-title-font-size", 17), lineHeight: theme.length("--field-group-title-line-height", 22) },
                  action != null ? styles.grow : null,
                ]}
              >
                {header}
              </Text>}
              {/* On the title's last line, its target reaching over and under the line without making the header taller */}
              {action != null ? (
                <ListActionContext.Provider value="header">
                  {headerAction(
                    action,
                    { fontSize: theme.length("--field-group-title-font-size", 17), lineHeight: theme.length("--field-group-title-line-height", 22) },
                    theme.colors.labelSecondary,
                    true,
                  )}
                </ListActionContext.Provider>
              ) : null}
            </View>
          ) : null}
          {description != null ? (
            <Text
              color={theme.colors.labelSecondary}
              style={{ fontSize: theme.length("--field-group-description-font-size", 15), lineHeight: theme.length("--field-group-description-line-height", 20) }}
            >
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        accessibilityRole="list"
        aria-label={label}
        style={[styles.iosGroup, { borderRadius: theme.length("--field-group-radius", 26), backgroundColor: surface === "plain" ? theme.color("--field-group-background", theme.colors.surfaceSecondary) : theme.colors.groupedSurface }]}
      >
        <ListOptionsContext.Provider value={options}>{body}</ListOptionsContext.Provider>
      </View>
      {error != null || footer != null ? (
        // An error takes the footer's place and type (13/16, 8 under the section), only in the danger color
        <Text
          color={error != null ? errorColor(theme) : theme.colors.labelSecondary}
          accessibilityLiveRegion={error != null ? "polite" : undefined}
          style={{
            fontSize: theme.length("--field-group-footer-font-size", 13),
            lineHeight: theme.length("--field-group-footer-line-height", 16),
            paddingTop: footerBox.top,
            paddingEnd: footerBox.right,
            paddingBottom: footerBox.bottom,
            paddingStart: footerBox.left,
          }}
        >
          {error ?? footer}
        </Text>
      ) : null}
    </View>
  )
}

export type ListStackProps = {
  /** The sections (`List`) and any blocks between them (a note, a button). */
  children: ReactNode
  /** The space between two blocks that are not both sections, as the screen's own. @default 0 */
  gap?: number
  /**
   * Keeps the room under the last section (iOS 35 over the home indicator, Android at least 16 over the system's bar).
   * Off for a stack that is not the screen's end. @default true
   */
  end?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * Sections one under another, as SwiftUI's Form and the web's stacked FieldGroups space them: on iOS 35 rows to rows,
 * less what a footer's block (17.33) and a header's (18.67, a prominent one 18, after a footer 11.33) take; on Android
 * 12 apart, none after a footer. Blocks that are not sections keep `gap`; the stack ends with the last section's room.
 */
export function ListStack({ children, gap = 0, end = true, style, testID }: ListStackProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const items = flattenChildren(children)
  const section = (node: ReactNode): ListProps | null => (isValidElement(node) && node.type === List ? (node.props as ListProps) : null)
  const space = (before: ListProps | null, after: ListProps | null) => {
    if (before == null || after == null) return gap
    const footer = before.footer != null || before.error != null
    const header = after.header != null || after.description != null || after.action != null
    if (theme.isAndroid) return footer ? 0 : 12
    const prominent = after.headerProminence === "increased"
    return 35 - (footer ? 17.33 : 0) - (header ? (prominent ? 18 : footer ? 11.33 : 18.67) : 0)
  }
  const last = section(items[items.length - 1])
  const bottom = !end ? 0 : theme.isAndroid ? Math.max(16, insets.bottom) : last != null ? 35 + insets.bottom : insets.bottom
  return (
    <View style={[{ paddingBottom: bottom }, style]} testID={testID}>
      {items.map((child, index) => (
        <View key={isValidElement(child) && child.key != null ? child.key : index} style={index > 0 ? { marginTop: space(section(items[index - 1]), section(child)) } : null}>
          {child}
        </View>
      ))}
    </View>
  )
}

export type ListItemProps = {
  /** The row's text, as @plexui/ui's NavigationRow `label`. */
  label: ReactNode
  description?: ReactNode
  /**
   * A symbol at the start, plain or in a tile of `leadingColor` (the Settings look). Or, inside a RadioGroup, an
   * option with no text of its own: the row is a choice with its mark first (a language list), and its press chooses it.
   */
  leading?: ReactNode
  /** The fill of the leading tile; the symbol turns white on it. */
  leadingColor?: string
  /**
   * The leading picture's size when it is not a symbol (a 40 photo, a 32 avatar): the row takes its height from the
   * first frame. Without it the row reads the picture's size before its first frame where the element can tell it (the
   * web, React Native's new architecture), else on layout.
   */
  leadingSize?: number
  /** A value at the end, in the secondary label on iOS (`Wi-Fi … Home`) and the accent on Android. */
  value?: ReactNode
  /**
   * The value's color, and a select's at the row's end: `secondary`, the secondary label, as iOS draws it; `accent`, as
   * an Android value row draws it. @default "secondary" on iOS, "accent" on Android
   */
  valueColor?: "secondary" | "accent"
  /**
   * Where the value stands: at the `end` of the row, `below` the label at the full width of the text, or `auto`: at
   * the end while the label and the value fit beside each other on one line, otherwise below (as Calendar sets a long
   * value; the web's NavigationRow). Below the label it is in the secondary label, before the description; on Android
   * it is the 13sp gray second line of a detail row. @default "end"
   */
  valuePlacement?: "end" | "below" | "auto"
  /**
   * A control at the end: a Badge, a Checkbox, an Input (on iOS a field fills the room after the label, its text at the
   * row's end, as the web's form row). For a switch give `checked` and `onCheckedChange` instead. A Switch or a
   * Checkbox here, in a row without `onPress`, toggles on a press anywhere on the row, as the web's phone rows; the
   * control stays the one element for a screen reader, named by the label when it has no name of its own.
   */
  trailing?: ReactNode
  /**
   * A row of a list to pick one from (countries with their codes, a sound): `true` draws the check at its end (the
   * accent's checkmark), `false` keeps the check's room, so the values of every row stand in one column and a pick
   * moves no text. Read as selected. Leave `trailing` out.
   */
  selected?: boolean
  /**
   * An error under the row, as the web's FieldError in a form row: on iOS a line of its own across the row, 4 under the
   * label, 15/20 in the danger color after a 16pt exclamation mark; on Android under the label, 13sp in the error color.
   * It is announced when it appears.
   */
  error?: ReactNode
  /**
   * Makes the row a switch row: a switch at its end, and the whole row the switch, one stop for a screen reader that
   * toggles on a press anywhere (Settings' SwitchPreference; the web's label of a Switch).
   */
  checked?: boolean
  /** The switch row's state when it holds its own. */
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /**
   * A menu the row opens: a `Menu.Content` with its items. The row is the menu's one button (a press anywhere opens
   * it), and its end draws More as a mark, not a second button: iOS's ellipsis, Android's vertical dots, in a
   * secondary ghost IconButton's box and color. The menu stands at the More as at a trigger: on iOS at its trailing
   * edge, on Android under the row at its end, the screen dimmed around the row. A `trailing` takes the More's place.
   */
  menu?: ReactElement
  /** Whether the row's menu shows, when the app holds it (with `onMenuOpenChange`); else the row holds its own. */
  menuOpen?: boolean
  onMenuOpenChange?: (open: boolean) => void
  /** The chevron of a row that opens a page. @default true when the row has `onPress`, no `trailing` and is not `destructive` */
  disclosure?: boolean
  onPress?: () => void
  /** A touch and hold on the row (half a second): a ContextMenu around the row sets it. */
  onLongPress?: () => void
  /**
   * The name a screen reader gives the hold's action ("Show meaning"), or it reads the bare action. A control at the
   * row's end that takes the row's focus (a checkbox, a switch, a choice) carries the action and holds for the row.
   */
  longPressLabel?: string
  disabled?: boolean
  /** A row in red, as a destructive action row. */
  destructive?: boolean
  accessibilityLabel?: string
  /** What a press does, read after the name ("Edit date of birth"): on the row, or on the control that takes its focus. */
  accessibilityHint?: string
  testID?: string
}

/**
 * A row of a List: the label (17/22, `--field-row-*`: 52 tall, 62 with a description, 12 above and below the text at
 * least) with a description, a leading symbol, a value (wrapping within 60% of the row, or under the label: `valuePlacement`) or a control, and the chevron
 * of a drill-in (`Disclosure`, in the tertiary label, turned over right to left). A row with `checked` is a switch
 * row. On Android a row of a settings screen: 50dp tall at least (64 with a description, its text 12 from the row's
 * top and bottom), the label 16sp, the description 13sp in the secondary label under it, the value 16sp in the accent
 * at the end, 17 from it (20 in a row with a tile), no chevron; the text 21 in, or 64 after a 24dp symbol at 20, or 64
 * after a 28dp tile of `leadingColor` at 18 with a 24dp symbol (the tile's corners 10), or 64 after a RadioGroup
 * option's 20dp ring at 22; a lone Checkbox at the end of a row with no `leading` leads it instead, its 20dp circle 22
 * in (a multi-select list); a 1px divider from the text's start to the card's end, none under a row with a tile (a
 * tiled row draws none).
 */
export function ListItem({
  label,
  description,
  leading,
  leadingColor,
  leadingSize,
  value,
  valuePlacement = "end",
  valueColor,
  trailing: trailingProp,
  selected,
  error,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  disclosure,
  menu,
  menuOpen,
  onMenuOpenChange,
  onPress,
  onLongPress,
  longPressLabel,
  disabled = false,
  destructive = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ListItemProps) {
  const theme = useTheme()
  const { last, top, bottom } = useContext(PlaceContext)
  // A menu opened from the row finds the row (Android lights it over the dim of the screen)
  const frameNode = useRef<unknown>(null)
  const frame = useMemo<RowFrame>(() => ({ node: frameNode, radius: { top, bottom } }), [top, bottom])
  // A row's menu: the row opens it, its More (or `trailing`) is where it stands
  const [ownMenu, setOwnMenu] = useState(false)
  const menuShown = menuOpen ?? ownMenu
  const showMenu = (next: boolean) => {
    if (menuOpen === undefined) setOwnMenu(next)
    onMenuOpenChange?.(next)
  }
  const more = menu != null ? <MoreMark disabled={disabled} /> : null
  const trailingOwn = trailingProp ?? more ?? (selected === undefined ? undefined : <CheckSlot selected={selected} />)
  const trailing =
    menu != null ? (
      <Menu open={menuShown} onOpenChange={showMenu}>
        <Menu.Anchor>{trailingOwn}</Menu.Anchor>
        {menu}
      </Menu>
    ) : (
      trailingOwn
    )
  const switchRow = checkedProp !== undefined || defaultChecked !== undefined || onCheckedChange !== undefined
  const [own, setOwn] = useState(defaultChecked ?? false)
  const checked = checkedProp ?? own
  const toggle = () => {
    if (disabled) return
    if (checkedProp === undefined) setOwn(!checked)
    onCheckedChange?.(!checked)
  }
  // A Switch, a Checkbox or a RadioGroup option at the end of a row with no press of its own: a press anywhere on the
  // row toggles or chooses it, as Android's switch, checkbox and radio rows and the web's phone rows. The
  // row holds the state of a control that would hold its own, so the row's press and the control's change the same
  // state; an option's state is its group's
  const radios = useContext(RadioContext)
  const atEnd = !switchRow && !onPress ? rowControl(trailing, radios != null) : null
  // An option may lead the row instead, its mark first
  const atStart =
    !switchRow && !onPress && !atEnd && radios != null && isValidElement(leading) && leading.type === RadioGroup.Item
      ? { kind: "radio" as const, element: leading as ReactElement<RadioGroupItemProps> }
      : null
  // Android's multi-select row: a lone checkbox (no text of its own) at the end of a row with no symbol leads the row
  const checkLeads =
    theme.isAndroid && atEnd?.kind === "checkbox" && leading == null && atEnd.element.props.label == null && atEnd.element.props.description == null
  const found = atEnd ?? atStart
  const [controlOwn, setControlOwn] = useState<boolean | "indeterminate">(() => (found && found.kind !== "radio" ? (found.element.props.defaultChecked ?? false) : false))
  const rowName = textOf(label) || undefined
  const control = !found ? null : found.kind === "radio" ? radioControl(found.element, radios!, disabled, rowName) : endControl(found, controlOwn, setControlOwn, disabled, rowName)
  // A control at the end that opens from the row (`RowEnd.press`) gets the row's press, as it gets a toggle's; it stays
  // the one element for a screen reader and the keyboard
  const [endPress, setEndPress] = useState<(() => void) | null>(null)
  // Once a control has handed the row its press the row stays a pressable frame, so taking the press back (a select
  // disabled) does not swap the frame and remount the row's contents with their state
  const [endHands, setEndHands] = useState(false)
  const handPress = useCallback((open: (() => void) | null) => {
    setEndPress(() => open)
    if (open != null) setEndHands(true)
  }, [])
  const handed = !switchRow && !onPress && !control && !disabled ? endPress : null
  const menuPress = menu != null && !disabled ? () => showMenu(!menuShown) : undefined
  const press = switchRow ? toggle : (menuPress ?? onPress ?? control?.toggle ?? handed ?? undefined)
  const hinted = useHint(accessibilityHint)
  // On the web the hint is an unseen text the row's element, or the control that takes its focus, is described by
  const hintNode = hinted.id != null ? <Text nativeID={hinted.id} style={styles.unseen}>{accessibilityHint}</Text> : null
  const endOwnsFocus = control != null || handed != null || (endHands && press == null)
  // The hint goes to the control at the end only when it takes the row's focus: a switch of its own beside a row that
  // opens a page keeps to its own words
  const controlHint = endOwnsFocus ? accessibilityHint : undefined
  const rowAction = useMemo(
    () => (onLongPress == null && controlHint == null ? null : { run: disabled ? undefined : onLongPress, label: longPressLabel, hint: controlHint, hintId: hinted.id }),
    [controlHint, disabled, hinted.id, longPressLabel, onLongPress],
  )
  // A destructive row is an action, not a page (Settings' Sign Out has no chevron)
  const chevron = disclosure ?? (!!onPress && !switchRow && trailing == null && !destructive)
  const name = accessibilityLabel ?? ([textOf(label), textOf(value)].filter(Boolean).join(", ") || undefined)
  // A pressable row reads its description after its name, as a hint (a row that toggles its control is no element)
  const described = useDescription(press && !endOwnsFocus ? description : undefined)
  const nativeRipple = theme.isAndroid && Platform.OS === "android"
  // iOS lights a held choice row, not a switch row, as the web's phone rows
  const lit = !switchRow && control?.kind !== "switch"
  const row =
    theme.isAndroid ? styles.androidRow : iosRow(theme, last, description != null || error != null)
  // A finger on the control at the end holds the row, as one on the row's text does
  const [held, setHeld] = useState(false)
  // Android's press is the list selector's ripple from the touch point, clipped to the row (and the card's corners):
  // the platform's on a device; drawn here on the web, and for a row held through the control at its end
  const ripple = useRipple(controlHighlight(theme.scheme), theme.isAndroid, theme.reducedMotion)
  const hold = (next: boolean, event?: GestureResponderEvent) => {
    setHeld(next)
    if (!theme.isAndroid) return
    if (next) ripple.start(event)
    else ripple.end()
  }
  const content = (pressed: boolean) => {
    // The row's switch is drawn only: the row is the control
    const track = <SwitchTrack checked={checked} disabled={disabled} pressed={pressed} />
    const end = !switchRow ? (
      atStart ? trailing : checkLeads ? null : (control?.node ?? trailing)
    ) : trailing != null ? (
      <View style={[styles.pair, { gap: theme.isAndroid ? 16 : theme.length("--field-row-disclosure-gap", 8) }]}>
        {trailing}
        {track}
      </View>
    ) : (
      track
    )
    const start = (atStart || checkLeads) && control ? <RowStartContext.Provider value>{control.node}</RowStartContext.Provider> : leading
    const startColor = atStart || checkLeads ? undefined : leadingColor
    return (
      <RowFrameContext.Provider value={frame}>
        {theme.isAndroid ? (
          <AndroidContent handPress={handPress} valueColor={valueColor ?? "accent"} theme={theme} label={label} description={description} descriptionId={described.id} leading={start} leadingColor={startColor} leadingSize={atStart || checkLeads ? undefined : leadingSize} leadingMark={atStart != null || checkLeads} value={value} valuePlacement={valuePlacement} trailing={end} edgeControl={found != null || switchRow} error={error} disabled={disabled} destructive={destructive} last={last} />
        ) : (
          <IOSContent handPress={handPress} valueColor={valueColor ?? "secondary"} theme={theme} label={label} description={description} descriptionId={described.id} leading={start} leadingColor={startColor} leadingSize={atStart || checkLeads ? undefined : leadingSize} value={value} valuePlacement={valuePlacement} trailing={end} edgeControl={found != null || switchRow} error={error} chevron={chevron} disabled={disabled} destructive={destructive} last={last} />
        )}
      </RowFrameContext.Provider>
    )
  }
  if (press || onLongPress || endHands) {
    // Android's rows press in the list selector: the native ripple on a device, the drawn one on the web
    const highlight = controlHighlight(theme.scheme)
    const drawn = theme.isAndroid && !nativeRipple
    return (
      <Pressable
        ref={frameNode as never}
        collapsable={false}
        {...described.props}
        // The hint over the description's (a phone's one hint), or beside it on the web
        {...(endOwnsFocus || accessibilityHint == null
          ? null
          : Platform.OS === "web"
            ? { "aria-describedby": describedBy(described.id, hinted.id) }
            : hinted.props)}
        {...(switchRow ? spaceToggles(toggle) : null)}
        // A row that toggles its control is not a second element for a screen reader or a Tab stop: the control is
        accessible={endOwnsFocus ? false : undefined}
        focusable={endOwnsFocus ? false : undefined}
        tabIndex={endOwnsFocus ? -1 : undefined}
        accessibilityRole={endOwnsFocus ? undefined : switchRow ? "switch" : "button"}
        accessibilityLabel={endOwnsFocus ? undefined : name}
        accessibilityState={endOwnsFocus ? undefined : switchRow ? { checked, disabled } : { disabled, ...(selected !== undefined ? { selected } : null) }}
        aria-checked={switchRow ? checked : undefined}
        {...(menu != null ? ({ "aria-haspopup": "menu", "aria-expanded": menuShown } as object) : null)}
        // React Native Web drops a button's selected state: the web reads a chosen row as a pressed button
        {...(Platform.OS === "web" && !endOwnsFocus && !switchRow && selected !== undefined ? ({ "aria-pressed": selected } as object) : null)}
        disabled={disabled || (press == null && onLongPress == null)}
        onPress={press}
        {...holdProps({ run: onLongPress, label: longPressLabel }, null)}
        onPressIn={drawn ? ripple.start : undefined}
        onPressOut={drawn ? ripple.end : undefined}
        android_ripple={nativeRipple ? { color: highlight, foreground: true } : undefined}
        testID={testID}
        style={row}
      >
        {({ pressed }) => (
          <RowHoldContext.Provider value={disabled ? null : theme.isAndroid ? hold : setHeld}>
            <RowActionContext.Provider value={rowAction}>
              {hintNode}
              {ripple.layer}
              {theme.isAndroid ? null : <RowHighlight on={(pressed || held) && lit} last={last} />}
              {content(pressed || held)}
            </RowActionContext.Provider>
          </RowHoldContext.Provider>
        )}
      </Pressable>
    )
  }
  // A row that only shows (a detail, a value) is one element named by `accessibilityLabel` when it has one; with a
  // control at its end it stays a group, so the control is still reached
  const named = accessibilityLabel != null && trailing == null && found == null
  return (
    <View
      ref={frameNode as never}
      collapsable={false}
      testID={testID}
      accessible={named || undefined}
      accessibilityLabel={accessibilityLabel}
      {...(named ? hinted.props : null)}
      accessibilityRole={named && Platform.OS !== "web" ? "text" : undefined}
      role={named && Platform.OS === "web" ? "group" : undefined}
      style={row}
    >
      {named ? hintNode : null}
      {content(false)}
    </View>
  )
}

/** The check of a choice row, or its empty room: the accent's checkmark, 20 on iOS (a 17pt symbol), 24 on Android. */
/**
 * The More at the end of a row that opens a menu: the platform's dots in a secondary ghost IconButton's box and color,
 * drawn only, since the row is the button
 */
function MoreMark({ disabled }: { disabled: boolean }) {
  const theme = useTheme()
  const box = buttonMetrics(theme, "md", "round", true)
  const color = buttonColors(theme, "secondary", "ghost", disabled, false).text
  const Dots = theme.isAndroid ? DotsVertical : DotsHorizontal
  return (
    <View pointerEvents="none" style={{ width: box.height, height: box.height, alignItems: "center", justifyContent: "center" }}>
      <Dots size={box.iconSize} color={color} />
    </View>
  )
}

function CheckSlot({ selected }: { selected: boolean }) {
  const theme = useTheme()
  const size = theme.isAndroid ? 24 : 20
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {selected ? <CheckMd size={size} color={theme.isAndroid ? theme.material.primary : theme.colors.accent} /> : null}
    </View>
  )
}

/** A Button among a List's rows: the row is the button (`ListActionContext`), the hairline under it from the text's start. */
function ActionRow({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const { last } = useContext(PlaceContext)
  return (
    <View style={styles.actionRow}>
      <ListActionContext.Provider value="row">{children}</ListActionContext.Provider>
      {last ? null : (
        <View
          pointerEvents="none"
          // iOS: from the text to 20 before the group's end, as the other rows' lines
          style={[styles.actionSeparator, theme.isAndroid ? { start: ANDROID_INSET } : { start: theme.length("--list-row-inset", 20), end: theme.length("--list-row-inset", 20) }, { backgroundColor: theme.isAndroid ? divider(theme) : theme.colors.separator }]}
        />
      )}
    </View>
  )
}

export type StackedRowProps = {
  /** The label over the value; none for a row whose placeholder names the field (`hideLabel`). */
  label?: ReactNode
  /** Words under the value (a label-hidden field's description). */
  description?: ReactNode
  error?: ReactNode
  disabled?: boolean
  /** A control at the end of the label's line. */
  action?: ReactNode
  /** The field: drawn bare, its text from the row's text start, as tall as its lines. */
  children: ReactNode
  testID?: string
}

/**
 * A field row whose value is a line of its own, as the web's `Field row` with `orientation="vertical"` or `hideLabel`
 * on a phone. iOS: the label 15/20 in the secondary label (`--field-row-above-*`), the value under it in the row's
 * 17/22, 13 above and below (68 for one line); with no label the value alone, centred in the row's 52. The error 4
 * under the value, as a row's. Android: the label 13sp in the secondary label, 4 over the bare value (17sp, as a card's
 * text field), 10 above and below, 21 in; with no label the value alone 17 above and below and 22 in, a 54dp row (the
 * reference's card input), the line above the row starting there too.
 */
export function ListStackedRow({ label, description, error, disabled = false, action, children, testID }: StackedRowProps) {
  const theme = useTheme()
  const { last } = useContext(PlaceContext)
  const rowEnd = useMemo<RowEnd>(() => ({ fill: () => {}, stacked: true }), [])
  const android = theme.isAndroid
  const hidden = label == null
  const rowLine = theme.length("--field-row-label-line-height", 22)
  // iOS: a row with words under its value (a description or an error) keeps the insets of a row with text, 12, as
  // the web's phone rows do; an error stands 4 under the value and the value 4 under the label
  const texted = description != null || error != null
  // Android: a field alone in its row (no label, no words under it) is the reference's card input, 17 above and below
  // and 22 in; with words under it 15 above and below
  const alone = android && hidden && !texted
  const inset = android ? (alone ? 22 : ANDROID_INSET) : theme.length("--list-row-inset", 20)
  const padding = android
    ? alone ? 17 : hidden ? 15 : 10
    : texted ? theme.length("--field-row-text-padding-block", 12) : hidden ? (theme.length("--field-row-min-height", 52) - rowLine) / 2 : theme.length("--field-row-above-padding-block", 13)
  const secondary = disabled ? (android ? withAlpha(theme.colors.labelSecondary, 0.5) : theme.colors.labelTertiary) : theme.colors.labelSecondary
  const labelType = android
    ? styles.androidDescription
    : { fontSize: theme.length("--field-row-above-font-size", 15), lineHeight: theme.length("--field-row-above-line-height", 20) }
  const labelText = hidden ? null : (
    <Text color={secondary} style={[labelType, action != null ? styles.grow : null, !android && error != null && action == null ? { marginBottom: theme.length("--mobile-field-error-offset", 4) } : null]}>
      {label}
    </Text>
  )
  const errorOffset = theme.length("--mobile-field-error-offset", 4)
  const errorLine = theme.length("--mobile-field-error-line-height", 20)
  const iconSize = theme.length("--mobile-field-error-icon-size", 16)
  return (
    <View testID={testID} style={[styles.stackedRow, { paddingStart: inset }]}>
      <View style={[styles.stackedColumn, { paddingEnd: inset, paddingVertical: padding, gap: android ? 4 : 0 }]}>
        {/* iOS stops the line 20 before the group's end, as its rows' text (Settings, iOS 26 and 27) */}
        {last ? null : <View pointerEvents="none" style={[styles.iosSeparator, { backgroundColor: android ? divider(theme) : theme.colors.separator }, android ? null : { end: inset }]} />}
        {labelText != null && action != null ? (
          <View style={[styles.pair, { gap: 8 }, !android && error != null ? { marginBottom: theme.length("--mobile-field-error-offset", 4) } : null]}>
            {labelText}
            {action}
          </View>
        ) : (
          labelText
        )}
        <RowEndContext.Provider value={rowEnd}>{children}</RowEndContext.Provider>
        {description != null ? (
          <Text
            color={secondary}
            style={android ? styles.androidDescription : { fontSize: theme.length("--field-row-description-font-size", 15), lineHeight: theme.length("--field-row-description-line-height", 20) }}
          >
            {description}
          </Text>
        ) : null}
        {error == null ? null : android ? (
          <Text color={dangerText(theme)} accessibilityLiveRegion="polite" style={styles.androidDescription}>
            {error}
          </Text>
        ) : (
          <View accessibilityLiveRegion="polite" style={[styles.iosError, { marginTop: errorOffset, gap: theme.length("--mobile-field-error-icon-gap", 4) }]}>
            <ExclamationMarkCircle size={iconSize} color={errorColor(theme)} style={{ marginTop: (errorLine - iconSize) / 2 }} />
            <Text color={errorColor(theme)} style={[styles.shrink, { fontSize: theme.length("--mobile-field-error-font-size", 15), lineHeight: errorLine }]}>
              {error}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

type FoundControl =
  | { kind: "switch"; element: ReactElement<SwitchProps> }
  | { kind: "checkbox"; element: ReactElement<CheckboxProps> }
  | { kind: "radio"; element: ReactElement<RadioGroupItemProps> }

/** A Switch, a Checkbox or (inside its RadioGroup) an option given as a row's `trailing`, which the row's press toggles. */
function rowControl(trailing: ReactNode, inGroup: boolean): FoundControl | null {
  if (!isValidElement(trailing)) return null
  if (trailing.type === Switch) return { kind: "switch", element: trailing as ReactElement<SwitchProps> }
  if (trailing.type === Checkbox) return { kind: "checkbox", element: trailing as ReactElement<CheckboxProps> }
  if (inGroup && trailing.type === RadioGroup.Item) return { kind: "radio", element: trailing as ReactElement<RadioGroupItemProps> }
  return null
}

/**
 * An option at a row's end: the row's press chooses it, as the option's own press does (a chosen option stays
 * chosen), and the row's label names it when it has no name. No press while the row, the option or its group is
 * disabled.
 */
function radioControl(element: ReactElement<RadioGroupItemProps>, group: RadioGroupContext, rowDisabled: boolean, name: string | undefined) {
  const props = element.props
  const node = props["aria-label"] == null && name != null ? cloneElement(element, { "aria-label": name }) : element
  const off = rowDisabled || props.disabled || group.disabled
  return { kind: "radio" as const, node, toggle: off ? undefined : () => group.value !== props.value && group.select(props.value) }
}

/**
 * The control at a row's end, with the row's copy of its state: `checked` and `onCheckedChange` keep the state of a
 * control that would hold its own, the row's label names it when it has no name, and the row's press flips it as the
 * control's own press does (a mixed checkbox checks). No press while the row or the control is disabled.
 */
function endControl(found: Exclude<FoundControl, { kind: "radio" }>, own: boolean | "indeterminate", setOwn: (next: boolean) => void, rowDisabled: boolean, name: string | undefined) {
  const props = found.element.props
  const state = props.checked ?? own
  const change = (next: boolean) => {
    if (props.checked === undefined) setOwn(next)
    props.onCheckedChange?.(next)
  }
  const accessibilityLabel = props.accessibilityLabel ?? (props.label == null ? name : undefined)
  const node =
    found.kind === "switch"
      ? cloneElement(found.element, { checked: state === true, onCheckedChange: change, accessibilityLabel })
      : cloneElement(found.element, { checked: state, onCheckedChange: change, accessibilityLabel })
  return { kind: found.kind, node, toggle: rowDisabled || props.disabled ? undefined : () => change(state !== true) }
}

/** A row's least height: 52, 62 with a description (as Settings, iOS 26 and 27) (`--field-row-description-min-height`), as the web's NavigationRow. */
const iosMinHeight = (theme: Theme, described: boolean) =>
  described ? theme.length("--field-row-description-min-height", 62) : theme.length("--field-row-min-height", 52)

function iosRow(theme: Theme, last: boolean, described: boolean): ViewStyle {
  const inset = theme.length("--list-row-inset", 20)
  return {
    flexDirection: "row",
    alignItems: "center",
    minHeight: iosMinHeight(theme, described),
    paddingStart: inset,
    // The press is RowHighlight's, under the content; the row's rounded end clips it to the group's
    borderBottomLeftRadius: last ? theme.length("--field-group-radius", 26) : 0,
    borderBottomRightRadius: last ? theme.length("--field-group-radius", 26) : 0,
  }
}

/**
 * iOS's press on a row: the row lights at once under a finger and, when it lifts, the light fades out over 0.3s, as
 * UIKit deselects a cell (the system gray 4 of `--field-row-press-background`); at once with reduced motion.
 */
function RowHighlight({ on, last }: { on: boolean; last: boolean }) {
  const theme = useTheme()
  const opacity = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (on || theme.reducedMotion) {
      opacity.stopAnimation()
      opacity.setValue(on ? 1 : 0)
      return
    }
    const fade = Animated.timing(opacity, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" })
    fade.start()
    return () => fade.stop()
  }, [on, opacity, theme.reducedMotion])
  const radius = last ? theme.length("--field-group-radius", 26) : 0
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity, backgroundColor: theme.color("--field-row-press-background"), borderBottomLeftRadius: radius, borderBottomRightRadius: radius },
      ]}
    />
  )
}

type ContentProps = Pick<ListItemProps, "label" | "description" | "leading" | "leadingSize" | "value" | "trailing" | "error"> & {
  theme: Theme
  /** The end is a switch, a checkbox or a radio: with `columns` it stays at the row's edge. */
  edgeControl?: boolean
  disabled: boolean
  destructive: boolean
  descriptionId?: string
  valuePlacement: NonNullable<ListItemProps["valuePlacement"]>
}

type Widths = { row: number; label: number; value: number; trailing: number }

/**
 * Whether a row's value goes under its label: `below`, or `auto` when the label and the value do not fit beside each
 * other on one line. As the web's NavigationRow measures them unwrapped in the end layout's limits, a hidden probe
 * lays the two out on one line each; `fits` judges those widths against the row's.
 */
function useValueBelow(
  placement: ContentProps["valuePlacement"],
  label: ReactNode,
  value: ReactNode,
  type: { label: StyleProp<TextStyle>; value: StyleProp<TextStyle> },
  fits: (widths: Widths) => boolean,
) {
  const [widths, setWidths] = useState<Widths>({ row: 0, label: 0, value: 0, trailing: 0 })
  const measure = (key: keyof Widths) => (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    setWidths((old) => (old[key] === width ? old : { ...old, [key]: width }))
  }
  const auto = placement === "auto" && value != null
  const below = value != null && (placement === "below" || (auto && widths.row > 0 && !fits(widths)))
  const probe = auto ? (
    <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.probe}>
      <Text numberOfLines={1} style={type.label} onLayout={measure("label")}>
        {label}
      </Text>
      <Text numberOfLines={1} style={type.value} onLayout={measure("value")}>
        {value}
      </Text>
    </View>
  ) : null
  return { below, probe, onRowLayout: auto ? measure("row") : undefined, onTrailingLayout: auto ? measure("trailing") : undefined }
}

/**
 * The leading picture's size before the row's first frame, where the element tells it at once: the web's box, React
 * Native's new architecture (`getBoundingClientRect`). Elsewhere the picture's `onLayout` tells it a frame later.
 */
function usePictureFrame(leading: ReactNode, onSize: (width: number, height: number) => void) {
  const ref = useRef<ComponentRef<typeof View>>(null)
  useLayoutEffect(() => {
    const element = ref.current as unknown as { offsetWidth?: number; offsetHeight?: number; getBoundingClientRect?: () => { width: number; height: number } } | null
    if (!element || leading == null) return
    if (typeof element.offsetWidth === "number" && typeof element.offsetHeight === "number") onSize(element.offsetWidth, element.offsetHeight)
    else if (typeof element.getBoundingClientRect === "function") {
      const box = element.getBoundingClientRect()
      onSize(box.width, box.height)
    }
  }, [leading, onSize])
  return ref
}

function IOSContent({ handPress, valueColor, theme, label, description, descriptionId, leading, leadingColor, leadingSize, value, valuePlacement, trailing, edgeControl = false, error, chevron, disabled, destructive, last }: ContentProps & { leadingColor?: string; chevron: boolean; last: boolean; handPress: RowEnd["press"]; valueColor: "secondary" | "accent" }) {
  const inset = theme.length("--list-row-inset", 20)
  const tile = theme.length("--field-row-icon-size", 28)
  const gap = theme.length("--field-row-gap", 16)
  const disclosureGap = theme.length("--field-row-disclosure-gap", 8)
  // A disabled row greys all of it in the tertiary label, as the web's phone row (its button's disabled ink)
  const labelColor = disabled ? theme.colors.labelTertiary : destructive ? theme.color("--color-text-danger") : theme.colors.text
  const secondary = disabled ? theme.colors.labelTertiary : theme.colors.labelSecondary
  // The disclosure points the way the row reads: it turns over in a right-to-left row, as the web's
  const { ref, rtl } = useRTL<ComponentRef<typeof View>>()
  const labelType = { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }
  const descriptionLine = theme.length("--field-row-description-line-height", 20)
  // The text's padding centres one line (or a label and its description) in the row's least height, 12 at least, as the
  // web's: a row of more lines (a wrapped label, a value below) keeps those 15 (14) above and below
  // A row with a control at its end is the web's form row (`Field row`): its text keeps the control's 44pt line, 4 above
  // and below it, or 10 around a description, so a wrapped label or description grows the row by its own lines only
  const target = theme.length("--control-size-lg", 44)
  const formRow = trailing != null
  // A two-line row keeps 10 over its label and under its description, as Settings (62 in all)
  const descriptionPadding = theme.length("--field-row-description-padding-block", 10)
  const textPadding = formRow
    ? description != null
      ? descriptionPadding
      : (iosMinHeight(theme, false) - target) / 2
    : Math.max(
        description != null ? descriptionPadding : theme.length("--field-row-text-padding-block", 12),
        (iosMinHeight(theme, description != null) - labelType.lineHeight - (description != null ? descriptionLine : 0)) / 2,
      )
  // A field at the end fills the room after the label (`RowEnd.fill`)
  const [fill, setFill] = useState(false)
  // A picture wider than the tile (a photo, an avatar) keeps its own size: it starts at the row's inset, where the
  // header and the footer stand, and the text follows 14 past it, as UIKit's image to text padding
  const [wide, setWide] = useState(() => leadingColor == null && leadingSize != null && leadingSize > tile + 0.5)
  // A picture taller than the tile (a 40 photo) keeps the cell's margins over and under it, 10 as UIKit's content
  // configuration keeps them: a 40 photo makes a 60 row
  const [tall, setTall] = useState(() => leadingColor == null && leadingSize != null && leadingSize > tile + 0.5)
  const picture = usePictureFrame(
    leading,
    useCallback(
      (width: number, height: number) => {
        setWide(width > tile + 0.5)
        setTall(height > tile + 0.5)
      },
      [tile],
    ),
  )
  // In a List with `columns` a field's value starts at one column, 40% into the row (`--field-row-column-width`)
  // A switch, a checkbox and a radio stay at the row's edge
  const columns = useContext(ListOptionsContext)?.columns === true && trailing != null
  const startsColumn = columns && !edgeControl
  const rowEnd = useMemo<RowEnd>(() => ({ fill: setFill, press: handPress, align: startsColumn ? "start" : "end", valueColor }), [handPress, startsColumn, valueColor])
  const errorOffset = theme.length("--mobile-field-error-offset", 4)
  const errorLine = theme.length("--mobile-field-error-line-height", 20)
  // With an error the label and the control stand on a line of their own over it
  const line = (parts: ReactNode) => (error != null ? <View style={[styles.iosLine, { gap: below ? disclosureGap : gap }]}>{parts}</View> : parts)
  // The end holds the value, the control and the chevron (its 20pt glyph 5 into each side), within 60% of the row
  const { below, probe, onRowLayout, onTrailingLayout } = useValueBelow(valuePlacement, label, value, { label: labelType, value: labelType }, (widths) => {
    const room = widths.row - inset
    const end = widths.value + (trailing != null ? disclosureGap + widths.trailing : 0) + (chevron ? disclosureGap + 10 : 0)
    return end <= room * 0.6 + 0.5 && widths.label + gap + end <= room + 0.5
  })
  return (
    <>
      {leading != null ? (
        <View
          style={[
            styles.tile,
            { minWidth: tile, minHeight: tile, marginStart: wide ? 0 : theme.length("--field-row-icon-offset", -2), marginEnd: theme.length("--field-row-icon-gap", 14) },
            tall ? { marginVertical: theme.length("--field-row-picture-margin-block", 10) } : null,
            leadingColor ? { backgroundColor: leadingColor, borderRadius: theme.length("--field-row-icon-radius", 7) } : null,
          ]}
          ref={picture}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.width > tile + 0.5
            if (next !== wide) setWide(next)
            const taller = event.nativeEvent.layout.height > tile + 0.5
            if (taller !== tall) setTall(taller)
          }}
        >
          <IconDefaultsProvider size={leadingColor ? 20 : theme.length("--field-row-icon-symbol-size", 24)} color={leadingColor ? "#ffffff" : disabled ? theme.colors.labelTertiary : theme.colors.accent}>
            {leading}
          </IconDefaultsProvider>
        </View>
      ) : null}
      {/* The text and what ends the row share the hairline: it starts at the text, as UIKit's separator inset. With an
          error the row is a column: the line of the label and the control, then the error across the row (the web's
          row grid: 12 above and below, the error 4 under the line) */}
      <View
        ref={ref}
        onLayout={onRowLayout}
        style={[
          error != null ? styles.iosColumn : styles.iosMain,
          { minHeight: iosMinHeight(theme, description != null || error != null), paddingEnd: inset },
          error != null
            ? { paddingVertical: Math.max(descriptionPadding, (iosMinHeight(theme, true) - labelType.lineHeight - errorOffset - errorLine) / 2) }
            : { gap: below ? disclosureGap : gap },
        ]}
      >
        {/* Over the row's bottom edge, not under it: the row keeps its height, as the web's separator. It runs from the
            text to 20 before the group's end (the row's end inset), as Settings draws it on iOS 26 and 27 */}
        {last ? null : <View pointerEvents="none" style={[styles.iosSeparator, { backgroundColor: theme.colors.separator, end: inset }]} />}
        {probe}
        {line(
          <>
        <View style={[columns ? styles.column : fill ? styles.iosTextHug : styles.iosText, { paddingVertical: error != null ? 0 : textPadding }, formRow && description == null && error == null ? { minHeight: target, justifyContent: "center" } : null]}>
          <Text color={labelColor} style={labelType}>
            {label}
          </Text>
          {below ? (
            // Under the label, the lines touching as a subtitle cell's, at the text's start
            <Text color={secondary} style={labelType}>
              {value}
            </Text>
          ) : null}
          {description != null ? (
            <Text
              nativeID={descriptionId}
              color={secondary}
              style={{ fontSize: theme.length("--field-row-description-font-size", 15), lineHeight: descriptionLine }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {(value != null && !below) || trailing != null || chevron ? (
          <View style={[fill || columns ? styles.endFill : styles.end, columns && !startsColumn ? styles.endAtEdge : null, { gap: disclosureGap }]}>
            {value != null && !below ? (
              // A long value wraps within the 60% the end takes, as the web's, rather than losing its end; set at the
              // row's end (a phone turns "right" over in a right-to-left layout itself, the web does not)
              <Text color={valueColor === "accent" && !disabled ? theme.colors.accent : secondary} style={[labelType, styles.shrink, { textAlign: Platform.OS === "web" && rtl ? "left" : "right" }]}>
                {value}
              </Text>
            ) : null}
            {trailing != null ? (
              <View style={fill ? styles.grow : startsColumn ? styles.keepStart : styles.keep} onLayout={onTrailingLayout}>
                <RowEndContext.Provider value={rowEnd}>{trailing}</RowEndContext.Provider>
              </View>
            ) : null}
            {chevron ? <Disclosure size={20} color={theme.colors.labelTertiary} style={[styles.disclosure, mirrored(rtl)]} /> : null}
          </View>
        ) : null}
          </>,
        )}
        {error != null ? (
          <View accessibilityLiveRegion="polite" style={[styles.iosError, { marginTop: errorOffset, gap: theme.length("--mobile-field-error-icon-gap", 4) }]}>
            <ExclamationMarkCircle
              size={theme.length("--mobile-field-error-icon-size", 16)}
              color={errorColor(theme)}
              style={{ marginTop: (errorLine - theme.length("--mobile-field-error-icon-size", 16)) / 2 }}
            />
            <Text color={errorColor(theme)} style={[styles.shrink, { fontSize: theme.length("--mobile-field-error-font-size", 15), lineHeight: errorLine }]}>
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  )
}

/** The danger ink of a form's error, as the web's FieldError (`--field-error-color`). */
const errorColor = (theme: Theme) => theme.color("--field-error-color", theme.color("--color-text-danger-outline", theme.color("--color-text-danger")))

function AndroidContent({
  handPress,
  valueColor,
  theme,
  label,
  description,
  descriptionId,
  leading,
  leadingColor,
  leadingSize,
  leadingMark = false,
  value,
  valuePlacement,
  trailing,
  edgeControl = false,
  error,
  disabled,
  destructive,
  last,
}: ContentProps & { leadingColor?: string; leadingMark?: boolean; last: boolean; handPress: RowEnd["press"]; valueColor: "secondary" | "accent" }) {
  // A disabled row fades to half, as Android's rows do
  const dim = (color: string) => (disabled ? withAlpha(color, 0.5) : color)
  const danger = dangerText(theme)
  const ink = dim(destructive ? danger : theme.colors.text)
  // Android's row symbols are the text's ink over a light card and a gray over a dark one
  const symbol = dim(destructive ? danger : theme.scheme === "dark" ? theme.colors.labelSecondary : theme.colors.text)
  const tile = leading != null && !!leadingColor
  // A picture wider than the symbol's 24 (a photo, an avatar) keeps its own size from the rows' inset (21, where the
  // header and the footer stand), the text 16 past it, as Material's list item with a leading avatar; 0 for a symbol
  const [wide, setWide] = useState(() => (!tile && leadingSize != null && leadingSize > 24.5 ? leadingSize : 0))
  // A picture taller than the symbol's 24 (a 40 avatar) keeps 8 over and under it, Material's list item with a leading
  // avatar: a 40 photo makes a 56 row
  const [tall, setTall] = useState(() => !tile && leadingSize != null && leadingSize > 24.5)
  const picture = usePictureFrame(
    tile || leadingMark ? null : leading,
    useCallback((width: number, height: number) => {
      setWide((was) => {
        const next = width > 24.5 ? width : 0
        return Math.abs(next - was) > 0.5 ? next : was
      })
      setTall(height > 24.5)
    }, []),
  )
  // The text (and the divider) 21 in, or 64 after a symbol, a tile or a choice's mark (its 20dp circle 22 in)
  const textStart = leading == null ? ANDROID_INSET : wide > 0 && !tile && !leadingMark ? ANDROID_INSET + wide + 16 : 64
  // A value that ends the row stands 17 from the end (a value row), 20 in a row with a tile (a tiled row)
  const valueEnd = trailing == null && !tile ? 17 : 20
  // At the end the value takes half the row at most, 16 from the label and from a control
  const { below, probe, onRowLayout, onTrailingLayout } = useValueBelow(valuePlacement, label, value, { label: styles.androidLabel, value: styles.androidLabel }, (widths) => {
    const end = 16 + widths.value + (trailing != null ? 16 + widths.trailing : 0)
    return widths.value <= (widths.row - 2 * ANDROID_INSET) * 0.5 + 0.5 && widths.label + end <= widths.row - textStart - valueEnd + 0.5
  })
  // A field at the end fills the room after the label, as on iOS; a select opens from the whole row
  const [fill, setFill] = useState(false)
  const columns = useContext(ListOptionsContext)?.columns === true && trailing != null
  const startsColumn = columns && !edgeControl
  const rowEnd = useMemo<RowEnd>(() => ({ fill: setFill, press: handPress, align: startsColumn ? "start" : "end", valueColor }), [handPress, startsColumn, valueColor])
  const parts = (
    <>
      {leading == null ? null : leadingMark ? (
        <View style={styles.androidMark}>{leading}</View>
      ) : (
        <View
          ref={tile ? undefined : picture}
          style={tile ? [styles.androidTile, { backgroundColor: leadingColor, opacity: disabled ? 0.5 : 1 }] : [styles.androidIcon, wide > 0 ? styles.androidWide : null, tall ? styles.androidTall : null]}
          onLayout={
            tile
              ? undefined
              : (event) => {
                  const width = event.nativeEvent.layout.width
                  const next = width > 24.5 ? width : 0
                  if (Math.abs(next - wide) > 0.5) setWide(next)
                  const taller = event.nativeEvent.layout.height > 24.5
                  if (taller !== tall) setTall(taller)
                }
          }
        >
          <IconDefaultsProvider size={24} color={tile ? "#ffffff" : symbol}>
            {leading}
          </IconDefaultsProvider>
        </View>
      )}
      <View
        style={[
          columns ? [styles.androidTextHug, styles.column] : fill ? styles.androidTextHug : styles.androidText,
          // One line centred in the 50dp row (54 beside a text field: a card's input row); with a second line 12 above
          // and below (a 64dp row)
          { paddingVertical: error != null ? 0 : description != null || below ? 12 : fill ? 17 : 15 },
        ]}
      >
        <Text color={ink} style={styles.androidLabel}>
          {label}
        </Text>
        {below ? (
          // A detail row: the value a 13sp gray line under the label
          <Text color={dim(theme.colors.labelSecondary)} style={styles.androidDescription}>
            {value}
          </Text>
        ) : null}
        {description != null ? (
          <Text nativeID={descriptionId} color={dim(theme.colors.labelSecondary)} style={styles.androidDescription}>
            {description}
          </Text>
        ) : null}
      </View>
      {value != null && !below ? (
        <Text color={dim(valueColor === "accent" ? accentText(theme) : theme.material.onSurfaceVariant)} numberOfLines={1} style={[styles.androidLabel, styles.androidValue, { marginEnd: valueEnd - ANDROID_INSET }]}>
          {value}
        </Text>
      ) : null}
      {trailing != null ? (
        <View
          style={
            // A switch or a checkbox stays at the row's edge after the label's column (it stretches in a column cell)
            fill || startsColumn ? [styles.androidEndFill, startsColumn ? styles.androidEndStart : null] : columns ? [styles.androidEnd, styles.androidEndEdge] : styles.androidEnd
          }
          onLayout={onTrailingLayout}
        >
          <RowEndContext.Provider value={rowEnd}>{trailing}</RowEndContext.Provider>
        </View>
      ) : null}
    </>
  )
  return (
    <>
      {onRowLayout ? <View pointerEvents="none" onLayout={onRowLayout} style={styles.androidSpan} /> : null}
      {probe}
      {error != null ? (
        // The error a 13sp line of its own across the row, under the label and the field
        <View style={styles.androidColumn}>
          <View style={styles.androidLine}>{parts}</View>
          <Text color={danger} accessibilityLiveRegion="polite" style={[styles.androidDescription, { marginTop: 4 }]}>
            {error}
          </Text>
        </View>
      ) : (
        parts
      )}
      {/* Android's divider color; Settings' rows with a tile draw none */}
      {last || tile ? null : <View pointerEvents="none" style={[styles.androidDivider, { start: textStart, backgroundColor: divider(theme) }]} />}
    </>
  )
}

const styles = StyleSheet.create({
  iosGroup: { overflow: "hidden", borderCurve: "continuous" },
  iosMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  iosText: { flex: 1, minWidth: 0 },
  // Beside a field that fills the end the label keeps its own width
  iosTextHug: { flexShrink: 1, minWidth: 0 },
  iosColumn: { flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: "center" },
  iosLine: { flexDirection: "row", alignItems: "center" },
  iosError: { flexDirection: "row", alignItems: "flex-start" },
  iosSeparator: { position: "absolute", start: 0, end: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  tile: { alignItems: "center", justifyContent: "center" },
  end: { flexDirection: "row", alignItems: "center", flexShrink: 1, maxWidth: "60%" },
  endFill: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  disclosure: { marginHorizontal: -5 },
  // Android's section: one card, 16 round; the header a 40dp row inside it (a header row), the footer under it
  // (a footer: 24 from the screen's edge, 10 above, 17 below)
  androidCard: { borderRadius: ANDROID_CARD_RADIUS, overflow: "hidden" },
  // The header: 15/20 Medium 14 under the card's top and 21 in, 6 under it to close its 40dp line
  androidHeader: { minHeight: 40, paddingHorizontal: ANDROID_INSET, paddingTop: 14, paddingBottom: 6, fontSize: 15, lineHeight: 20 },
  androidDescriptionLine: { paddingHorizontal: ANDROID_INSET, paddingBottom: 6, fontSize: 14, lineHeight: 18 },
  androidDescriptionAlone: { paddingTop: 14 },
  androidFooter: { paddingHorizontal: 13, paddingTop: 11, paddingBottom: 17, fontSize: 14, lineHeight: 18 },
  // A plain list's header band (32dp, its text 16 in), its description and its footer 20 in as the rows' text, the
  // footer on the band's gray as the space between sections
  androidBand: { height: 32, justifyContent: "center", paddingHorizontal: 16 },
  androidBandText: { fontSize: 14, lineHeight: 18 },
  androidDescriptionPlain: { paddingTop: 10 },
  androidFooterPlain: { paddingHorizontal: ANDROID_INSET },
  androidRow: { flexDirection: "row", alignItems: "center", minHeight: 50, paddingStart: ANDROID_INSET, paddingEnd: ANDROID_INSET },
  // A 24dp symbol at 20, a 28dp tile at 18 with a 24dp symbol, or a choice's 20dp mark at 22: the text at 64
  androidTall: { marginVertical: 8 },
  androidIcon: { minWidth: 24, minHeight: 24, alignItems: "center", justifyContent: "center", marginStart: -1, marginEnd: 20 },
  androidWide: { marginStart: 0, marginEnd: 16 },
  androidMark: { width: 20, alignItems: "center", justifyContent: "center", marginStart: 1, marginEnd: 22 },
  androidTile: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", marginStart: -3, marginEnd: 18 },
  androidText: { flex: 1, minWidth: 0, gap: 4 },
  androidTextHug: { flexShrink: 1, minWidth: 0, gap: 4 },
  androidColumn: { flex: 1, minWidth: 0, paddingVertical: 10 },
  androidLine: { flexDirection: "row", alignItems: "center" },
  androidLabel: { fontSize: 16, lineHeight: 20 },
  androidDescription: { fontSize: 13, lineHeight: 16 },
  androidValue: { flexShrink: 1, maxWidth: "50%", marginStart: 16, textAlign: "right" },
  androidEnd: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexShrink: 0, marginStart: 16 },
  // A field that fills the end stretches across it
  androidEndFill: { flex: 1, minWidth: 0, justifyContent: "center", marginStart: 16 },
  androidDivider: { position: "absolute", end: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  // The row's full width, for `auto` to measure against (an absolute child spans the padding box)
  androidSpan: { position: "absolute", start: 0, end: 0, top: 0, height: 0 },
  // Off to the side and unseen: the label and the value on one line each, at their own widths
  probe: { position: "absolute", top: 0, start: 0, width: 10000, alignItems: "flex-start", opacity: 0 },
  pair: { flexDirection: "row", alignItems: "center" },
  shrink: { flexShrink: 1 },
  keep: { flexShrink: 0 },
  grow: { flex: 1, minWidth: 0 },
  // The label's column of a List with `columns`, the value starting after it
  column: { width: "40%", flexGrow: 0, flexShrink: 0 },
  keepStart: { flexShrink: 1, minWidth: 0, alignItems: "flex-start" },
  androidEndStart: { alignItems: "flex-start" },
  androidEndEdge: { marginStart: "auto" },
  endAtEdge: { justifyContent: "flex-end" },
  iosHeaderRow: { flexDirection: "row", alignItems: "flex-end", gap: 16 },
  unseen: { display: "none" },
  androidHeaderRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 40, paddingHorizontal: ANDROID_INSET, paddingTop: 14, paddingBottom: 6, gap: 16 },
  androidHeaderTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20 },
  androidHeaderTitleType: { fontSize: 15, lineHeight: 20 },
  // A prominent header: the title 16sp in the text color
  androidHeaderIncreased: { fontSize: 16, lineHeight: 20 },
  androidBandRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  // A row that is a Button: the button fills it, the hairline under it from the text's start
  actionRow: { alignSelf: "stretch" },
  actionSeparator: { position: "absolute", end: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  // A field row whose value is a line of its own
  stackedRow: { alignSelf: "stretch", flexDirection: "row", alignItems: "center" },
  stackedColumn: { flex: 1, minWidth: 0, alignSelf: "stretch" },
})
