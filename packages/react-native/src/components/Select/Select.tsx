import { useContext, useEffect, useState, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import ChevronUpDown from "../../icons/plex/ChevronUpDown"
import { spaceToggles } from "../../internal/a11y"
import { RowEndContext, RowHoldContext, rowHold } from "../../internal/row"
import { mix, withAlpha } from "../../theme/material"
import { MaterialArrowDropDown } from "../Icon/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { ControlSize } from "../Button/Button"
import { androidDialogBackground, ChoiceDialog } from "../Dialog/Dialog"
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

export type SelectProps<T extends SelectOption> = {
  /** The options, as @plexui/ui's `options`. */
  options: readonly T[]
  /** The value of the chosen option. */
  value: T["value"] | null | undefined
  /** Called with the option a person chooses, as on the web. */
  onChange: (option: T) => void
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
  /** Android: the title of the picker dialog, the setting's name. @default the `aria-label` */
  title?: string
  /** Android: the button that closes the picker dialog. @default "Cancel" */
  cancelLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A choice of one option: the field of an Input with the chosen label and a chevron. iOS 26: UIKit's pop-up button
 * field with `chevron.up.chevron.down`, opening the glass menu of the options with a checkmark at the chosen one; at
 * the end of an iOS List row it is the row's pop-up, as the web's in a phone row: the value in the row's type (the
 * secondary label, the placeholder in the tertiary), the menu picker's chevrons after it, and the menu opening over it
 * at its end. Android: the field with Material's dropdown arrow (at a List row's end, the row's value in the accent,
 * as an Android value row), opening Android's single-choice dialog: the setting's name over 50dp rows with a radio,
 * and Cancel. Choosing a row closes it.
 */
export function Select<T extends SelectOption>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  invalid = false,
  variant = "outline",
  size = "md",
  pill = false,
  block = true,
  "aria-label": ariaLabel,
  title,
  cancelLabel = "Cancel",
  testID,
  style,
}: SelectProps<T>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  // A field disabled while its menu is open closes the menu: nothing can be chosen from it any more
  if (disabled && open) setOpen(false)
  const shown = open && !disabled
  const android = theme.isAndroid
  // Android's dialog stands in the middle of the screen: only iOS's menu follows the field
  const { anchor, place, setTrigger } = useMenuAnchor(shown && !android)
  const choose = (option: T) => {
    if (disabled || option.disabled) return
    onChange(option)
  }
  const chosen = options.find((option) => option.value === value)
  const look = fieldLook(theme, { variant, size, pill }, { focused: open, filled: !!chosen, disabled, invalid })
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
    handRow(() => setOpen(true))
    return () => handRow(null)
  }, [handRow])
  const tertiary = theme.colors.labelTertiary
  const m = theme.material
  return (
    // A field that moves while its menu is open takes the menu with it
    <View ref={setTrigger as never} collapsable={false} onLayout={shown && !android ? () => place() : undefined} style={[block ? styles.block : styles.hug, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel ? `${ariaLabel}, ${chosen?.label ?? placeholder}` : undefined}
        accessibilityState={{ disabled, expanded: open }}
        aria-haspopup={android ? "dialog" : "menu"}
        aria-expanded={open}
        disabled={disabled}
        {...rowHold(hold)}
        onPress={() => (android ? setOpen(true) : place(() => setOpen(true)))}
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
            color={withAlpha(chosen ? m.primary : withAlpha(m.onSurface, 0.35), disabled ? 0.5 : 1)}
            style={[stacked ? styles.grow : styles.shrink, styles.androidValue, stacked ? styles.startText : null]}
          >
            {chosen?.label ?? placeholder}
          </Text>
        ) : inRow ? (
          <Text
            numberOfLines={1}
            color={chosen && !disabled ? theme.colors.labelSecondary : tertiary}
            style={[stacked ? styles.grow : styles.shrink, { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }]}
          >
            {chosen?.label ?? placeholder}
          </Text>
        ) : (
          <Text numberOfLines={1} color={chosen ? look.text.color : look.placeholder} style={[styles.grow, { fontSize: look.text.fontSize, lineHeight: look.text.lineHeight }]}>
            {chosen?.label ?? placeholder}
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
      {android ? (
        <ChoiceDialog
          open={shown}
          onClose={() => setOpen(false)}
          title={title ?? ariaLabel}
          cancelLabel={cancelLabel}
          // The web reads the rows as a menu of radio items (the roles of the iOS menu); TalkBack as radio buttons
          listProps={
            Platform.OS === "web"
              ? { role: "menu", "aria-label": title ?? ariaLabel, onKeyDown: (event: unknown) => menuKeyDown(event) }
              : { accessibilityRole: "radiogroup", accessibilityLabel: title ?? ariaLabel }
          }
          testID={testID ? `${testID}-menu` : undefined}
        >
          {options.map((option) => (
            <ChoiceRow
              key={option.value}
              option={option}
              chosen={option.value === value}
              disabled={disabled || !!option.disabled}
              onChoose={() => {
                if (disabled || option.disabled || !shown) return
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
          cover={inRow}
          align={inRow ? "end" : "start"}
          width={Math.max(theme.length("--menu-default-width", 250), anchor?.width ?? 0)}
          aria-label={ariaLabel}
          testID={testID ? `${testID}-menu` : undefined}
        >
          {options.map((option) => (
            <Menu.Item
              key={option.value}
              checked={option.value === value}
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

type ChoiceRowProps = { option: SelectOption; chosen: boolean; disabled: boolean; onChoose: () => void; testID?: string }

/**
 * A row of Android's single-choice dialog (4 in from the dialog's sides): 50dp, a 20dp radio in a 22dp
 * frame 22 in and 14 down, the label 16sp at 55 (a description 14sp gray under it); its press the list selector.
 * The radio is the RadioGroup's on Android: a 2dp ring in the light gray, the selection color with a 10dp dot when chosen.
 */
function ChoiceRow({ option, chosen, disabled, onChoose, testID }: ChoiceRowProps) {
  const theme = useTheme()
  const m = theme.material
  const on = selectionColor(theme)
  const off = mix(theme.colors.text, androidDialogBackground(theme), 0.3)
  const semantics =
    Platform.OS === "web"
      ? { role: "menuitemradio" as "menuitem", "aria-checked": chosen, accessibilityState: { checked: chosen, disabled }, ...spaceToggles(onChoose) }
      : { accessibilityRole: "radio" as const, accessibilityState: { checked: chosen, disabled } }
  return (
    <Pressable
      {...semantics}
      disabled={disabled}
      onPress={onChoose}
      testID={testID}
      style={({ pressed }) => [styles.choice, { opacity: disabled ? 0.5 : 1 }, pressed ? { backgroundColor: listPress(theme.scheme) } : null]}
    >
      <View style={styles.choiceRadio}>
        <View style={[styles.ring, { borderColor: chosen ? on : off }]}>{chosen ? <View style={[styles.dot, { backgroundColor: on }]} /> : null}</View>
      </View>
      <View style={styles.choiceText}>
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

/** Android's list selector: black at 6% over a light card, white at 5% at night. */
const listPress = (scheme: "light" | "dark") => (scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)")

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
  // The label at 55: 11 past the radio's frame; one line keeps the row 50
  choiceText: { flex: 1, minWidth: 0, marginStart: 11, paddingVertical: 15, gap: 4 },
  choiceLabel: { fontSize: 16, lineHeight: 20 },
  choiceDescription: { fontSize: 14, lineHeight: 18 },
})
