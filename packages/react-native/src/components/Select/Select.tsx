import { useRef, useState, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import ChevronUpDown from "../../icons/plex/ChevronUpDown"
import { createIcon } from "../Icon/createIcon"
import { useTheme } from "../../theme/ThemeProvider"
import type { ControlSize } from "../Button/Button"
import { FieldOutline, fieldLook, type InputVariant } from "../Input/Input"
import { Menu, MenuSurface, measure, type MenuAnchor, type Measurable } from "../Menu/Menu"
import { Text } from "../Text/Text"

export type SelectOption<V extends string = string> = {
  value: V
  label: string
  description?: ReactNode
  disabled?: boolean
}

/**
 * Material's exposed dropdown arrow, `arrow_drop_down`: a sharp 10x5 triangle in a 24dp box (Compose material3
 * `Icons.Filled.ArrowDropDown`, used by `ExposedDropdownMenuDefaults.TrailingIcon`). The Plex carets are rounded and
 * 12x8, a size larger.
 */
const ArrowDropDown = createIcon("ArrowDropDown", "0 0 24 24", [["path", { d: "M7 10l5 5 5-5z", fill: 0 }]])

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
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A choice of one option: the field of an Input with the chosen label and a chevron, opening a menu of the options
 * with a checkmark at the chosen one. iOS 26: UIKit's pop-up button field with `chevron.up.chevron.down` and the
 * glass menu; Android: Material 3's exposed dropdown menu (an outlined or filled field, the dropdown arrow, the menu
 * under it).
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
  testID,
  style,
}: SelectProps<T>) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const trigger = useRef<Measurable | null>(null)
  const chosen = options.find((option) => option.value === value)
  const look = fieldLook(theme, { variant, size, pill }, { focused: open, filled: !!chosen, disabled, invalid })
  return (
    <View ref={trigger as never} collapsable={false} style={[block ? styles.block : styles.hug, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel ? `${ariaLabel}, ${chosen?.label ?? placeholder}` : undefined}
        accessibilityState={{ disabled, expanded: open }}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onPress={() => measure(trigger.current, (box) => (setAnchor(box), setOpen(true)))}
        testID={testID}
        // The arrow sits in Compose's trailing icon slot, 12 from the edge
        style={[styles.box, look.box, { gap: look.gap }, theme.isAndroid ? { paddingRight: 12 } : null]}
      >
        {theme.isAndroid ? <FieldOutline frame={look.frame} /> : null}
        <Text numberOfLines={1} color={chosen ? look.text.color : look.placeholder} style={[styles.grow, { fontSize: look.text.fontSize, lineHeight: look.text.lineHeight }]}>
          {chosen?.label ?? placeholder}
        </Text>
        {theme.isAndroid ? (
          // Turned about the box's center while the menu is open, as Compose rotates its trailing icon 180°
          <View style={open ? styles.turned : null}>
            <ArrowDropDown size={24} color={look.trailingIcon} />
          </View>
        ) : (
          <ChevronUpDown size={17} color={theme.color("--mobile-label-secondary")} />
        )}
      </Pressable>
      <MenuSurface
        open={open}
        anchor={anchor}
        onClose={() => setOpen(false)}
        check
        width={theme.isAndroid ? anchor?.width : Math.max(theme.length("--menu-default-width", 250), anchor?.width ?? 0)}
        aria-label={ariaLabel}
        testID={testID ? `${testID}-menu` : undefined}
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            description={option.description}
            onSelect={() => onChange(option)}
            testID={testID ? `${testID}-option-${option.value}` : undefined}
          >
            {option.label}
          </Menu.Item>
        ))}
      </MenuSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  turned: { transform: [{ rotate: "180deg" }] },
  block: { alignSelf: "stretch" },
  hug: { alignSelf: "flex-start" },
  box: { flexDirection: "row", alignItems: "center" },
  grow: { flex: 1, minWidth: 0 },
})
