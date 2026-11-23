import { useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Path } from "react-native-svg"
import ChevronUpDown from "../../icons/plex/ChevronUpDown"
import { spaceToggles } from "../../internal/a11y"
import { useRipple } from "../../internal/ripple"
import { RowEndContext, RowFrameContext, RowHoldContext, rowHold } from "../../internal/row"
import { androidSelector, withAlpha } from "../../theme/material"
import { MaterialArrowDropDown } from "../Icon/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { ControlSize } from "../Button/Button"
import { ChoiceDialog } from "../Dialog/Dialog"
import { FieldOutline, fieldLook, type InputVariant } from "../Input/Input"
import { Menu, menuKeyDown, MenuSurface, useMenuAnchor } from "../Menu/Menu"
import { selectionColor } from "../Switch/Switch"
import { Text } from "../Text/Text"

export type SelectOption<V extends string = string> = {
  value: V
  label: string
  description?: ReactNode
  disabled?: boolean
}

type SingleSelectProps<T extends SelectOption> = {
  /** Several options can be chosen. @default false */
  multiple?: false
  /** The value of the chosen option. */
  value: T["value"] | null | undefined
  /** Called with the option a person chooses, as on the web. */
  onChange: (option: T) => void
}

type MultipleSelectProps<T extends SelectOption> = {
  /** Several options can be chosen. @default false */
  multiple: true
  /** The values of the chosen options. */
  value: readonly T["value"][]
  /** Called with the options chosen, in the options' order, as on the web. */
  onChange: (options: T[]) => void
}

export type SelectProps<T extends SelectOption> = (SingleSelectProps<T> | MultipleSelectProps<T>) & {
  /** The options, as @plexui/ui's `options`. */
  options: readonly T[]
  /** @default "Select…" */
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** @default "outline" */
  variant?: InputVariant
  size?: ControlSize
  pill?: boolean
  /** Fill the width. @default true on a phone */
  block?: boolean
  "aria-label"?: string
  /**
   * Android: what a press opens. `dialog`, Android's choice dialog: the setting's name over a row for each option, and
   * Cancel; with one choice a row has a radio and a press on it chooses it and closes the dialog, a `multiple` select's
   * rows have a checkbox and OK applies the rows checked. `menu`, the popup of the options from the field (in a List
   * row, the row's menu, as the web's), a check at the end of each chosen one. iOS always opens its menu.
   * @default "dialog", or "menu" for a `multiple` select
   */
  picker?: "dialog" | "menu"
  /** Android: the title of the picker dialog (`picker="dialog"`), the setting's name. @default the `aria-label` */
  title?: string
  /** Android: the button that closes the picker dialog (`picker="dialog"`) with no change. @default "Cancel" */
  cancelLabel?: string
  /** Android: the button of a `multiple` select's picker dialog (`picker="dialog"`) that applies the rows checked. @default "OK" */
  okLabel?: string
  /** The field's text when a `multiple` select has every option chosen. @default "All selected" */
  allSelectedLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A choice of one option (or several, `multiple`): the field of an Input with the chosen label and a chevron. iOS 26: UIKit's pop-up button
 * field with `chevron.up.chevron.down`, opening the glass menu of the options with a checkmark at the chosen one; at
 * the end of an iOS List row it is the row's pop-up, as the web's in a phone row: the value in the row's type (the
 * secondary label, the placeholder in the tertiary), the menu picker's chevrons after it, and the menu opening over it
 * at its end. Android: the field with Material's dropdown arrow (at a List row's end, the row's value in the accent,
 * as an Android value row), opening Android's single-choice dialog: the setting's name over 50dp rows with a radio,
 * and Cancel. Choosing a row closes it. With `picker="menu"` Android opens the popup of the options instead: under the
 * field, or from a List row the row's menu (the screen dimmed around the lit row), its chosen row checked at the end.
 * A `multiple` select opens the menu, where each press checks or unchecks an option and the menu stays open; on
 * Android `picker="dialog"` opens the dialog of checkbox rows instead, whose OK applies them.
 */
export function Select<T extends SelectOption>(props: SelectProps<T>) {
  const {
    options,
    multiple = false,
    placeholder = "Select…",
    disabled = false,
    invalid = false,
    variant = "outline",
    size = "md",
    pill = false,
    block = true,
    "aria-label": ariaLabel,
    picker = multiple ? "menu" : "dialog",
    title,
    cancelLabel = "Cancel",
    okLabel = "OK",
    allSelectedLabel = "All selected",
    testID,
    style,
  } = props
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  // A field disabled while its menu is open closes the menu: nothing can be chosen from it any more
  if (disabled && open) setOpen(false)
  const shown = open && !disabled
  const android = theme.isAndroid
  // Android's dialog stands in the middle of the screen: only a menu (iOS's, Android's `picker="menu"`) follows the field
  const dialog = android && picker !== "menu"
  const { anchor, row: menuRow, place, setTrigger, setRowFrame } = useMenuAnchor(shown && !dialog)
  const values: readonly string[] = props.multiple ? props.value : props.value != null ? [props.value] : []
  const chosenOptions = options.filter((option) => values.includes(option.value))
  // A multiple select's dialog keeps its checked rows here from its opening until OK applies them
  const [checked, setChecked] = useState<readonly string[]>([])
  const [wasShown, setWasShown] = useState(shown)
  if (wasShown !== shown) {
    setWasShown(shown)
    if (shown) setChecked(values)
  }
  const apply = (next: readonly string[]) => {
    if (props.multiple) props.onChange(options.filter((option) => next.includes(option.value)))
  }
  const choose = (option: T) => {
    if (disabled || option.disabled) return
    // A multiple select's option checks or unchecks itself
    if (props.multiple) apply(values.includes(option.value) ? values.filter((item) => item !== option.value) : [...values, option.value])
    else props.onChange(option)
  }
  // The field's text, the web's: the chosen label; for several, the one label, "3 selected", or every one chosen
  const shownLabel = !multiple
    ? chosenOptions[0]?.label
    : chosenOptions.length && chosenOptions.length >= options.length
      ? allSelectedLabel
      : chosenOptions.length === 0
        ? undefined
        : chosenOptions.length === 1
          ? chosenOptions[0].label
          : `${chosenOptions.length} selected`
  const look = fieldLook(theme, { variant, size, pill }, { focused: open, filled: shownLabel != null, disabled, invalid })
  const row = useContext(RowEndContext)
  const hold = useContext(RowHoldContext)
  const rowEnd = row != null
  const inRow = rowEnd && !android
  // At the end of an Android row the select is the row's value, as in an Android value row, and a press anywhere
  // on the row opens its choice
  const androidRow = rowEnd && android
  // Alone in a row whose label is hidden (a label-hidden `Field row`): the value from the row's text start and the
  // chevrons at its end, on the row's line
  const stacked = row?.stacked === true && block
  const handRow = androidRow && !disabled ? row?.press : undefined
  useEffect(() => {
    if (!handRow) return
    handRow(dialog ? () => setOpen(true) : () => place(() => setOpen(true)))
    return () => handRow(null)
  }, [handRow, dialog, place])
  // Android's menu from a List row is the row's: it dims the screen around the row and stands under it
  const frame = useContext(RowFrameContext)
  const rowMenu = !dialog && androidRow ? frame : null
  useLayoutEffect(() => {
    setRowFrame(rowMenu)
    return () => setRowFrame(null)
  }, [rowMenu, setRowFrame])
  const tertiary = theme.colors.labelTertiary
  const m = theme.material
  return (
    // A field that moves while its menu is open takes the menu with it
    <View ref={setTrigger as never} collapsable={false} onLayout={shown && !dialog ? () => place() : undefined} style={[block ? styles.block : styles.hug, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel ? `${ariaLabel}, ${shownLabel ?? placeholder}` : undefined}
        accessibilityState={{ disabled, expanded: open }}
        aria-haspopup={dialog ? "dialog" : "menu"}
        aria-expanded={open}
        disabled={disabled}
        {...rowHold(hold)}
        onPress={() => (dialog ? setOpen(true) : place(() => setOpen(true)))}
        // A row's value takes the presses of the row's height (where the row does not hand it its own)
        hitSlop={androidRow && !row?.press ? ROW_SLOP : undefined}
        testID={testID}
        // The arrow sits in Compose's trailing icon slot, 12 from the edge
        style={[styles.box, inRow ? styles.row : androidRow ? null : [look.box, { gap: look.gap }], android && !androidRow ? { paddingEnd: 12 } : null, stacked ? styles.stacked : null]}
      >
        {android && !androidRow ? <FieldOutline frame={look.frame} /> : null}
        {androidRow ? (
          // A value row's value: 16sp in the accent, the placeholder in the hint's gray, faded to half when disabled
          <Text
            numberOfLines={1}
            color={withAlpha(shownLabel != null ? m.primary : withAlpha(m.onSurface, 0.35), disabled ? 0.5 : 1)}
            style={[stacked ? styles.grow : styles.shrink, styles.androidValue, stacked ? styles.startText : null]}
          >
            {shownLabel ?? placeholder}
          </Text>
        ) : inRow ? (
          <Text
            numberOfLines={1}
            color={shownLabel != null && !disabled ? theme.colors.labelSecondary : tertiary}
            style={[stacked ? styles.grow : styles.shrink, { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }]}
          >
            {shownLabel ?? placeholder}
          </Text>
        ) : (
          <Text numberOfLines={1} color={shownLabel != null ? look.text.color : look.placeholder} style={[styles.grow, { fontSize: look.text.fontSize, lineHeight: look.text.lineHeight }]}>
            {shownLabel ?? placeholder}
          </Text>
        )}
        {inRow ? (
          // The menu picker's chevrons, 8.5 by 22 with the 17 symbol overflowing it, 2 inside the row's end
          <View style={styles.rowChevrons}>
            <ChevronUpDown size={17} color={disabled ? tertiary : theme.color("--mobile-accessory-secondary", theme.colors.labelSecondary)} />
          </View>
        ) : androidRow ? null : android ? (
          // Turned about the box's center while the picker is open, as Compose rotates its trailing icon 180°
          <View style={open ? styles.turned : null}>
            <MaterialArrowDropDown size={24} color={look.trailingIcon} />
          </View>
        ) : (
          <ChevronUpDown size={17} color={theme.color("--mobile-label-secondary")} />
        )}
      </Pressable>
      {dialog ? (
        <ChoiceDialog
          open={shown}
          onClose={() => setOpen(false)}
          title={title ?? ariaLabel}
          cancelLabel={cancelLabel}
          okLabel={multiple ? okLabel : undefined}
          onOk={multiple ? () => apply(checked) : undefined}
          // The web reads the rows as a menu of radio items (the roles of the iOS menu), of checkbox items for several;
          // TalkBack as radio buttons or checkboxes
          listProps={
            Platform.OS === "web"
              ? { role: "menu", "aria-label": title ?? ariaLabel, onKeyDown: (event: unknown) => menuKeyDown(event) }
              : { accessibilityRole: multiple ? undefined : "radiogroup", accessibilityLabel: title ?? ariaLabel }
          }
          testID={testID ? `${testID}-menu` : undefined}
        >
          {options.map((option) => (
            <ChoiceRow
              key={option.value}
              option={option}
              check={multiple}
              chosen={multiple ? checked.includes(option.value) : values.includes(option.value)}
              disabled={disabled || !!option.disabled}
              onChoose={() => {
                if (disabled || option.disabled || !shown) return
                // A checkbox row checks or unchecks itself until OK; a radio row chooses and closes
                if (multiple) {
                  setChecked((current) => (current.includes(option.value) ? current.filter((item) => item !== option.value) : [...current, option.value]))
                  return
                }
                choose(option)
                setOpen(false)
              }}
              testID={testID ? `${testID}-option-${option.value}` : undefined}
            />
          ))}
        </ChoiceDialog>
      ) : (
        <MenuSurface
          open={shown}
          anchor={anchor}
          onClose={() => setOpen(false)}
          check
          multiple={multiple}
          cover={inRow}
          align={inRow ? "end" : "start"}
          // Android's: a row's menu fits its items; a field's list is the field's width (Compose's exposed dropdown)
          row={android ? menuRow : undefined}
          width={android ? (androidRow ? undefined : anchor?.width) : Math.max(theme.length("--menu-default-width", 250), anchor?.width ?? 0)}
          aria-label={ariaLabel}
          testID={testID ? `${testID}-menu` : undefined}
        >
          {options.map((option) => (
            <Menu.Item
              key={option.value}
              checked={values.includes(option.value)}
              disabled={disabled || option.disabled}
              description={option.description}
              onSelect={() => choose(option)}
              testID={testID ? `${testID}-option-${option.value}` : undefined}
            >
              {option.label}
            </Menu.Item>
          ))}
        </MenuSurface>
      )}
    </View>
  )
}

type ChoiceRowProps = { option: SelectOption; check: boolean; chosen: boolean; disabled: boolean; onChoose: () => void; testID?: string }

/**
 * A row of Android's choice dialog (4 in from the dialog's sides): 50dp, a 20dp radio in a 22dp frame 22 in and 14
 * down, the label 16sp at 55 (a description 14sp gray under it); its press the list selector's ripple from the touch
 * point (the platform's on a device, drawn on the web). The radio: a 2dp ring in the light gray (the web's #afafaf,
 * #5d5d5d at night), the selection color with a 10dp dot when chosen. A multiple choice's row has an 18dp square with
 * 4dp corners in the same frame (24 in, as the web's; the reference's checkbox cell has it 1 further in and its label
 * 1 nearer): empty, a 1.5 outline in the mid gray (#767676); checked, the selection color with a white check 2 wide.
 */
function ChoiceRow({ option, check, chosen, disabled, onChoose, testID }: ChoiceRowProps) {
  const theme = useTheme()
  const m = theme.material
  const on = selectionColor(theme)
  const dark = theme.scheme === "dark"
  const off = check ? theme.color(dark ? "--gray-550" : "--gray-450") : theme.color(dark ? "--gray-500" : "--gray-300")
  const nativeRipple = Platform.OS === "android"
  const ripple = useRipple(androidSelector(theme.scheme), !nativeRipple, theme.reducedMotion)
  const semantics =
    Platform.OS === "web"
      ? { role: (check ? "menuitemcheckbox" : "menuitemradio") as "menuitem", "aria-checked": chosen, accessibilityState: { checked: chosen, disabled }, ...spaceToggles(onChoose) }
      : { accessibilityRole: check ? ("checkbox" as const) : ("radio" as const), accessibilityState: { checked: chosen, disabled } }
  return (
    <Pressable
      {...semantics}
      disabled={disabled}
      onPress={onChoose}
      onPressIn={nativeRipple ? undefined : ripple.start}
      onPressOut={nativeRipple ? undefined : ripple.end}
      android_ripple={nativeRipple ? { color: androidSelector(theme.scheme), foreground: true } : undefined}
      testID={testID}
      style={[styles.choice, { opacity: disabled ? 0.5 : 1 }]}
    >
      {ripple.layer}
      <View style={styles.choiceRadio}>
        {check ? (
          <View style={[styles.square, chosen ? { backgroundColor: on } : { borderWidth: 1.5, borderColor: off }]}>
            {chosen ? (
              <Svg width={18} height={18} viewBox="0 0 18 18">
                <Path d="M4 10l3 3 7-7" fill="none" stroke={theme.color(`--color-text-${theme.selectionColor}-solid`, "#FFFFFF")} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </View>
        ) : (
          <View style={[styles.ring, { borderColor: chosen ? on : off }]}>{chosen ? <View style={[styles.dot, { backgroundColor: on }]} /> : null}</View>
        )}
      </View>
      <View style={[styles.choiceText, option.description != null ? styles.choiceDescribed : null]}>
        <Text color={m.onSurface} numberOfLines={1} style={styles.choiceLabel}>
          {option.label}
        </Text>
        {option.description != null ? (
          <Text color={theme.colors.labelSecondary} style={styles.choiceDescription}>
            {option.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

/** A row's value reaches the 50dp row: 15 over and under its 20 line. */
const ROW_SLOP = { top: 15, bottom: 15, left: 8, right: 8 }

const styles = StyleSheet.create({
  turned: { transform: [{ rotate: "180deg" }] },
  block: { alignSelf: "stretch" },
  hug: { alignSelf: "flex-start" },
  box: { flexDirection: "row", alignItems: "center" },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1, minWidth: 0 },
  // A row's pop-up: no field, 34 tall, the value 8 before its chevrons
  row: { minHeight: 34, gap: 8 },
  stacked: { minHeight: 0 },
  startText: { textAlign: "left" },
  rowChevrons: { width: 8.5, height: 22, marginStart: -2, marginEnd: 2, alignItems: "center", justifyContent: "center", overflow: "visible" },
  androidValue: { fontSize: 16, lineHeight: 20, textAlign: "right" },
  // A radio row in the dialog: 4 of padding and the row's 18 before the radio's frame, 21 and 4 after the text
  choice: { minHeight: 50, flexDirection: "row", alignItems: "flex-start", paddingStart: 22, paddingEnd: 25 },
  choiceRadio: { width: 22, height: 22, marginTop: 14, alignItems: "center", justifyContent: "center" },
  ring: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  square: { width: 18, height: 18, borderRadius: 4, overflow: "hidden" },
  // The label at 55: 11 past the radio's frame, 15 under the row's top (its baseline 31 into the row, the reference's
  // 30.5), as the web's; one line keeps the row 50
  choiceText: { flex: 1, minWidth: 0, marginStart: 11, paddingTop: 15, paddingBottom: 15, gap: 4 },
  // A description: its first baseline 52.3 into the row, lines 16.4 apart (14sp Roboto's), 15 under its last line and
  // the font's 2 of padding (a two-line description makes the row 89, as the web's)
  choiceDescribed: { paddingBottom: 17 },
  choiceLabel: { fontSize: 16, lineHeight: 20 },
  choiceDescription: { fontSize: 14, lineHeight: 16.4 },
})
