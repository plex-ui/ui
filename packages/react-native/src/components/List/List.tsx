import { cloneElement, createContext, isValidElement, useCallback, useContext, useMemo, useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import Disclosure from "../../icons/plex/Disclosure"
import ExclamationMarkCircle from "../../icons/plex/ExclamationMarkCircle"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { flattenChildren, textOf } from "../../internal/children"
import { cssBox } from "../../internal/cssBox"
import { mirrored, useRTL } from "../../internal/direction"
import { RowEndContext, RowFrameContext, RowHoldContext, RowStartContext, type RowEnd, type RowFrame } from "../../internal/row"
import { accentText, controlHighlight, dangerText, divider, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Checkbox, type CheckboxProps } from "../Checkbox/Checkbox"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { RadioContext, RadioGroup, type RadioGroupContext, type RadioGroupItemProps } from "../RadioGroup/RadioGroup"
import { Switch, SwitchTrack, type SwitchProps } from "../Switch/Switch"
import { Text } from "../Text/Text"

export type ListProps = {
  children: ReactNode
  /** The title over the section. */
  header?: ReactNode
  /** A line under the title, as the web's FieldGroup `description`: 15/20 in the secondary label on iOS. */
  description?: ReactNode
  /** A note under the section. */
  footer?: ReactNode
  /**
   * An error under the rows, as the web's FieldError in a group's footer: the danger color, 15/20, 4 lower than a
   * footer on iOS. It stands in place of the footer while it is set, and is announced when it appears.
   */
  error?: ReactNode
  /**
   * The canvas the section stands on. `grouped`: the gray grouped canvas of a settings screen, the section in the
   * grouped secondary surface (white in light). `plain`: a plain canvas; on iOS the section in the plain secondary gray
   * (`--field-group-background`), on Android a plain list: no card, the rows across the canvas (the screen sets such a
   * list at its edges) in the cards' color, the header a 32dp band of the grouped gray. @default "grouped"
   */
  surface?: "grouped" | "plain"
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** The corners of Android's card of rows. */
const ANDROID_CARD_RADIUS = 16

/** A row's place in its section, and the radius of the corners it shares with the section's card (none in a plain list). */
type RowPlace = { first: boolean; last: boolean; top: number; bottom: number }
const PlaceContext = createContext<RowPlace>({ first: true, last: true, top: 0, bottom: 0 })

/**
 * A section of rows. iOS 26: a section of an inset grouped list, as @plexui/ui's FieldGroup on a phone
 * (`--field-group-radius` 26, the grouped secondary surface, rows 20 in from its edges, hairlines between rows from
 * the text's start; the header 17/22 at 590 in the secondary label over its description 15/20, the footer 13/16, an
 * error 15/20 in the danger color). Android: a section of a settings screen: one card of the section's rows,
 * 16dp round, a 1px divider between rows from the text's start; the header inside the card, a 40dp row of 14sp Medium
 * in the accent 20 in, its description 14sp in the secondary label under it; the footer under the card, 14sp in the
 * secondary label 12 in (24 from the screen's edge, as the screen insets the card 12), 10 above and 17 below, an
 * error the same in the error color. The screen sets the cards 12 from its edges and 12 apart. On a plain canvas
 * Android draws a plain list: the rows across the screen with no card, the header a 32dp band of the grouped gray,
 * the footer on that gray.
 */
export function List({ children, header, description, footer, error, surface = "grouped", "aria-label": ariaLabel, testID, style }: ListProps) {
  const theme = useTheme()
  const rows = flattenChildren(children).filter(isValidElement)
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
          {header == null ? null : plain ? (
            <View style={[styles.androidBand, { backgroundColor: band }]}>
              <Text accessibilityRole="header" color={theme.colors.labelSecondary} weight="medium" numberOfLines={1} style={styles.androidBandText}>
                {header}
              </Text>
            </View>
          ) : (
            <Text accessibilityRole="header" color={accentText(theme)} weight="medium" style={styles.androidHeader}>
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
            {body}
          </View>
        </View>
        {error != null ? (
          <Text color={dangerText(theme)} accessibilityLiveRegion="polite" style={[styles.androidFooter, plain ? [styles.androidFooterPlain, { backgroundColor: band }] : null]}>
            {error}
          </Text>
        ) : footer != null ? (
          <Text color={theme.colors.labelSecondary} style={[styles.androidFooter, plain ? [styles.androidFooterPlain, { backgroundColor: band }] : null]}>
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
      {header != null || description != null ? (
        <View
          style={{
            minHeight: theme.length("--field-group-header-min-height", 39),
            justifyContent: "flex-end",
            paddingTop: theme.length("--field-group-header-padding-top", 11),
            paddingBottom: theme.length("--field-group-header-padding-bottom", 6),
            paddingHorizontal: theme.length("--field-group-title-padding-inline", inset),
          }}
        >
          {header != null ? (
            <Text
              accessibilityRole="header"
              weight="semibold"
              color={theme.colors.labelSecondary}
              style={{ fontSize: theme.length("--field-group-title-font-size", 17), lineHeight: theme.length("--field-group-title-line-height", 22) }}
            >
              {header}
            </Text>
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
        {body}
      </View>
      {error != null ? (
        // The web's FieldError in the footer: its 4 offset over the footer's padding
        <Text
          color={errorColor(theme)}
          accessibilityLiveRegion="polite"
          style={{
            fontSize: theme.length("--mobile-field-error-font-size", 15),
            lineHeight: theme.length("--mobile-field-error-line-height", 20),
            paddingTop: footerBox.top + theme.length("--mobile-field-error-offset", 4),
            paddingEnd: footerBox.right,
            paddingBottom: footerBox.bottom,
            paddingStart: footerBox.left,
          }}
        >
          {error}
        </Text>
      ) : footer != null ? (
        <Text
          color={theme.colors.labelSecondary}
          style={{
            fontSize: theme.length("--field-group-footer-font-size", 13),
            lineHeight: theme.length("--field-group-footer-line-height", 16),
            paddingTop: footerBox.top,
            paddingEnd: footerBox.right,
            paddingBottom: footerBox.bottom,
            paddingStart: footerBox.left,
          }}
        >
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
  /**
   * A symbol at the start, plain or in a tile of `leadingColor` (the Settings look). Or, inside a RadioGroup, an
   * option with no text of its own: the row is a choice with its mark first (a language list), and its press chooses it.
   */
  leading?: ReactNode
  /** The fill of the leading tile; the symbol turns white on it. */
  leadingColor?: string
  /** A value at the end, in the secondary label on iOS (`Wi-Fi … Home`) and the accent on Android. */
  value?: ReactNode
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
  /** The chevron of a row that opens a page. @default true when the row has `onPress`, no `trailing` and is not `destructive` */
  disclosure?: boolean
  onPress?: () => void
  disabled?: boolean
  /** A row in red, as a destructive action row. */
  destructive?: boolean
  accessibilityLabel?: string
  testID?: string
}

/**
 * A row of a List: the label (17/22, `--field-row-*`: 52 tall, 70 with a description, 12 above and below the text at
 * least) with a description, a leading symbol, a value (wrapping within 60% of the row, or under the label: `valuePlacement`) or a control, and the chevron
 * of a drill-in (`Disclosure`, in the tertiary label, turned over right to left). A row with `checked` is a switch
 * row. On Android a row of a settings screen: 50dp tall at least (60 with a description), the label 16sp, the
 * description 13sp in the secondary label under it, the value 16sp in the accent at the end, 17 from it (20 in a row
 * with a tile), no chevron; the text 20 in, or 71 after a 24dp symbol at 21, or 64 after a 28dp tile of
 * `leadingColor` at 18 with a 24dp symbol (the tile's corners 10), or 64 after a RadioGroup option's 20dp ring at 22
 * (the row 64dp with a description); a 1px divider from the text's start to the next row, none under a row with a
 * tile (a tiled row draws none).
 */
export function ListItem({
  label,
  description,
  leading,
  leadingColor,
  value,
  valuePlacement = "end",
  trailing,
  error,
  checked: checkedProp,
  defaultChecked,
  onCheckedChange,
  disclosure,
  onPress,
  disabled = false,
  destructive = false,
  accessibilityLabel,
  testID,
}: ListItemProps) {
  const theme = useTheme()
  const { last, top, bottom } = useContext(PlaceContext)
  // A menu opened from the row finds the row (Android lights it over the dim of the screen)
  const frameNode = useRef<unknown>(null)
  const frame = useMemo<RowFrame>(() => ({ node: frameNode, radius: { top, bottom } }), [top, bottom])
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
  const found = atEnd ?? atStart
  const [controlOwn, setControlOwn] = useState<boolean | "indeterminate">(() => (found && found.kind !== "radio" ? (found.element.props.defaultChecked ?? false) : false))
  const rowName = textOf(label) || undefined
  const control = !found ? null : found.kind === "radio" ? radioControl(found.element, radios!, disabled, rowName) : endControl(found, controlOwn, setControlOwn, disabled, rowName)
  // A control at the end that opens from the row (`RowEnd.press`) gets the row's press, as it gets a toggle's; it stays
  // the one element for a screen reader and the keyboard
  const [endPress, setEndPress] = useState<(() => void) | null>(null)
  const handPress = useCallback((open: (() => void) | null) => setEndPress(() => open), [])
  const handed = !switchRow && !onPress && !control && !disabled ? endPress : null
  const press = switchRow ? toggle : (onPress ?? control?.toggle ?? handed ?? undefined)
  const endOwnsFocus = control != null || handed != null
  // A destructive row is an action, not a page (Settings' Sign Out has no chevron)
  const chevron = disclosure ?? (!!onPress && !switchRow && trailing == null && !destructive)
  const name = accessibilityLabel ?? ([textOf(label), textOf(value)].filter(Boolean).join(", ") || undefined)
  // A pressable row reads its description after its name, as a hint (a row that toggles its control is no element)
  const described = useDescription(press && !endOwnsFocus ? description : undefined)
  const nativeRipple = theme.isAndroid && Platform.OS === "android"
  // iOS lights a held choice row, not a switch row, as the web's phone rows
  const lit = !switchRow && control?.kind !== "switch"
  const row = (pressed: boolean) =>
    theme.isAndroid ? styles.androidRow : iosRow(theme, pressed && lit, last, description != null || error != null)
  // A finger on the control at the end holds the row, as one on the row's text does
  const [held, setHeld] = useState(false)
  const content = (pressed: boolean) => {
    // The row's switch is drawn only: the row is the control
    const track = <SwitchTrack checked={checked} disabled={disabled} pressed={pressed} />
    const end = !switchRow ? (
      atStart ? trailing : (control?.node ?? trailing)
    ) : trailing != null ? (
      <View style={[styles.pair, { gap: theme.isAndroid ? 16 : theme.length("--field-row-disclosure-gap", 8) }]}>
        {trailing}
        {track}
      </View>
    ) : (
      track
    )
    const start = atStart && control ? <RowStartContext.Provider value>{control.node}</RowStartContext.Provider> : leading
    const startColor = atStart ? undefined : leadingColor
    return (
      <RowFrameContext.Provider value={frame}>
        {theme.isAndroid ? (
          <AndroidContent handPress={handPress} theme={theme} label={label} description={description} descriptionId={described.id} leading={start} leadingColor={startColor} leadingMark={atStart != null} value={value} valuePlacement={valuePlacement} trailing={end} error={error} disabled={disabled} destructive={destructive} last={last} />
        ) : (
          <IOSContent theme={theme} label={label} description={description} descriptionId={described.id} leading={start} leadingColor={startColor} value={value} valuePlacement={valuePlacement} trailing={end} error={error} chevron={chevron} disabled={disabled} destructive={destructive} last={last} />
        )}
      </RowFrameContext.Provider>
    )
  }
  if (press) {
    // Android's rows press in the list selector: the native ripple on a device, a layer on the web
    const highlight = controlHighlight(theme.scheme)
    return (
      <Pressable
        ref={frameNode as never}
        collapsable={false}
        {...described.props}
        {...(switchRow ? spaceToggles(toggle) : null)}
        // A row that toggles its control is not a second element for a screen reader or a Tab stop: the control is
        accessible={endOwnsFocus ? false : undefined}
        focusable={endOwnsFocus ? false : undefined}
        tabIndex={endOwnsFocus ? -1 : undefined}
        accessibilityRole={endOwnsFocus ? undefined : switchRow ? "switch" : "button"}
        accessibilityLabel={endOwnsFocus ? undefined : name}
        accessibilityState={endOwnsFocus ? undefined : switchRow ? { checked, disabled } : { disabled }}
        aria-checked={switchRow ? checked : undefined}
        disabled={disabled}
        onPress={press}
        android_ripple={nativeRipple ? { color: highlight, foreground: true } : undefined}
        testID={testID}
        style={({ pressed }) => row(pressed || held)}
      >
        {({ pressed }) => (
          <RowHoldContext.Provider value={disabled ? null : setHeld}>
            {theme.isAndroid && ((!nativeRipple && pressed) || held) ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: highlight }]} /> : null}
            {content(pressed || held)}
          </RowHoldContext.Provider>
        )}
      </Pressable>
    )
  }
  return (
    <View ref={frameNode as never} collapsable={false} testID={testID} style={row(false)}>
      {content(false)}
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

/** A row's least height: 52, 70 with a description (`--field-row-description-min-height`), as the web's NavigationRow. */
const iosMinHeight = (theme: Theme, described: boolean) =>
  described ? theme.length("--field-row-description-min-height", 70) : theme.length("--field-row-min-height", 52)

function iosRow(theme: Theme, pressed: boolean, last: boolean, described: boolean): ViewStyle {
  const inset = theme.length("--list-row-inset", 20)
  return {
    flexDirection: "row",
    alignItems: "center",
    minHeight: iosMinHeight(theme, described),
    paddingStart: inset,
    backgroundColor: pressed ? theme.color("--field-row-press-background") : undefined,
    // The press fills the row to the group's rounded ends
    borderBottomLeftRadius: last ? theme.length("--field-group-radius", 26) : 0,
    borderBottomRightRadius: last ? theme.length("--field-group-radius", 26) : 0,
  }
}

type ContentProps = Pick<ListItemProps, "label" | "description" | "leading" | "value" | "trailing" | "error"> & {
  theme: Theme
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

function IOSContent({ theme, label, description, descriptionId, leading, leadingColor, value, valuePlacement, trailing, error, chevron, disabled, destructive, last }: ContentProps & { leadingColor?: string; chevron: boolean; last: boolean }) {
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
  // and below it, or 12 around a description, so a wrapped label or description grows the row by its own lines only
  const target = theme.length("--control-size-lg", 44)
  const formRow = trailing != null
  const textPadding = formRow
    ? description != null
      ? theme.length("--field-row-text-padding-block", 12)
      : (iosMinHeight(theme, false) - target) / 2
    : Math.max(
        theme.length("--field-row-text-padding-block", 12),
        (iosMinHeight(theme, description != null) - labelType.lineHeight - (description != null ? descriptionLine : 0)) / 2,
      )
  // A field at the end fills the room after the label (`RowEnd.fill`)
  const [fill, setFill] = useState(false)
  const rowEnd = useMemo<RowEnd>(() => ({ fill: setFill }), [])
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
            { width: tile, height: tile, marginStart: theme.length("--field-row-icon-offset", -2), marginEnd: theme.length("--field-row-icon-gap", 14) },
            leadingColor ? { backgroundColor: leadingColor, borderRadius: theme.length("--field-row-icon-radius", 7) } : null,
          ]}
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
            ? { paddingVertical: Math.max(theme.length("--field-row-text-padding-block", 12), (iosMinHeight(theme, true) - labelType.lineHeight - errorOffset - errorLine) / 2) }
            : { gap: below ? disclosureGap : gap },
        ]}
      >
        {/* Over the row's bottom edge, not under it: the row keeps its height, as the web's separator */}
        {last ? null : <View pointerEvents="none" style={[styles.iosSeparator, { backgroundColor: theme.colors.separator }]} />}
        {probe}
        {line(
          <>
        <View style={[fill ? styles.iosTextHug : styles.iosText, { paddingVertical: error != null ? 0 : textPadding }, formRow && description == null && error == null ? { minHeight: target, justifyContent: "center" } : null]}>
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
          <View style={[fill ? styles.endFill : styles.end, { gap: disclosureGap }]}>
            {value != null && !below ? (
              // A long value wraps within the 60% the end takes, as the web's, rather than losing its end; set at the
              // row's end (a phone turns "right" over in a right-to-left layout itself, the web does not)
              <Text color={secondary} style={[labelType, styles.shrink, { textAlign: Platform.OS === "web" && rtl ? "left" : "right" }]}>
                {value}
              </Text>
            ) : null}
            {trailing != null ? (
              <View style={fill ? styles.grow : styles.keep} onLayout={onTrailingLayout}>
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
  theme,
  label,
  description,
  descriptionId,
  leading,
  leadingColor,
  leadingMark = false,
  value,
  valuePlacement,
  trailing,
  error,
  disabled,
  destructive,
  last,
}: ContentProps & { leadingColor?: string; leadingMark?: boolean; last: boolean; handPress: RowEnd["press"] }) {
  // A disabled row fades to half, as Android's rows do
  const dim = (color: string) => (disabled ? withAlpha(color, 0.5) : color)
  const danger = dangerText(theme)
  const ink = dim(destructive ? danger : theme.colors.text)
  // Android's row symbols are the text's ink over a light card and a gray over a dark one
  const symbol = dim(destructive ? danger : theme.scheme === "dark" ? theme.colors.labelSecondary : theme.colors.text)
  const tile = leading != null && !!leadingColor
  // A choice led by its mark: the 20dp ring 22 in, the text (and the divider) 64 in, 64dp tall with a description
  const textStart = leading == null ? 20 : tile || leadingMark ? 64 : 71
  // A value that ends the row stands 17 from the end (a value row), 20 in a row with a tile (a tiled row)
  const valueEnd = trailing == null && !tile ? 17 : 20
  // At the end the value takes half the row at most, 16 from the label and from a control
  const { below, probe, onRowLayout, onTrailingLayout } = useValueBelow(valuePlacement, label, value, { label: styles.androidLabel, value: styles.androidLabel }, (widths) => {
    const end = 16 + widths.value + (trailing != null ? 16 + widths.trailing : 0)
    return widths.value <= (widths.row - 40) * 0.5 + 0.5 && widths.label + end <= widths.row - textStart - valueEnd + 0.5
  })
  // A field at the end fills the room after the label, as on iOS; a select opens from the whole row
  const [fill, setFill] = useState(false)
  const rowEnd = useMemo<RowEnd>(() => ({ fill: setFill, press: handPress }), [handPress])
  const parts = (
    <>
      {leading == null ? null : leadingMark ? (
        <View style={styles.androidMark}>{leading}</View>
      ) : (
        <View style={tile ? [styles.androidTile, { backgroundColor: leadingColor, opacity: disabled ? 0.5 : 1 }] : styles.androidIcon}>
          <IconDefaultsProvider size={24} color={tile ? "#ffffff" : symbol}>
            {leading}
          </IconDefaultsProvider>
        </View>
      )}
      <View
        style={[
          fill ? styles.androidTextHug : styles.androidText,
          { paddingVertical: error != null ? 0 : description != null || below ? (leadingMark ? 12 : 10) : 15 },
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
        <Text color={dim(accentText(theme))} numberOfLines={1} style={[styles.androidLabel, styles.androidValue, { marginEnd: valueEnd - 20 }]}>
          {value}
        </Text>
      ) : null}
      {trailing != null ? (
        <View style={fill ? styles.androidEndFill : styles.androidEnd} onLayout={onTrailingLayout}>
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
  androidHeader: { height: 40, paddingHorizontal: 20, paddingTop: 15, fontSize: 14, lineHeight: 18 },
  androidDescriptionLine: { paddingHorizontal: 20, paddingBottom: 6, fontSize: 14, lineHeight: 18 },
  androidDescriptionAlone: { paddingTop: 15 },
  androidFooter: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 17, fontSize: 14, lineHeight: 18 },
  // A plain list's header band (32dp, its text 16 in), its description and its footer 20 in as the rows' text, the
  // footer on the band's gray as the space between sections
  androidBand: { height: 32, justifyContent: "center", paddingHorizontal: 16 },
  androidBandText: { fontSize: 14, lineHeight: 18 },
  androidDescriptionPlain: { paddingTop: 10 },
  androidFooterPlain: { paddingHorizontal: 20 },
  androidRow: { flexDirection: "row", alignItems: "center", minHeight: 50, paddingStart: 20, paddingEnd: 20 },
  // A symbol at 21 and the text at 71; a 28dp tile at 18 with a 24dp symbol and the text at 64 (a tiled row)
  androidIcon: { width: 24, height: 24, alignItems: "center", justifyContent: "center", marginStart: 1, marginEnd: 26 },
  androidMark: { width: 20, alignItems: "center", justifyContent: "center", marginStart: 2, marginEnd: 22 },
  androidTile: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", marginStart: -2, marginEnd: 18 },
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
})
