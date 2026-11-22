import { createContext, useContext, useState, type ReactNode } from "react"
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import { useDescription } from "../../internal/a11y"
import { ControlLabel } from "../../internal/ControlLabel"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { selectionColor } from "../Switch/Switch"

export type RadioGroupProps<T extends string> = {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  "aria-label"?: string
  /** @default "row" on the web; a phone stacks its options: @default "col" */
  direction?: "row" | "col"
  disabled?: boolean
  children: ReactNode
  testID?: string
  style?: StyleProp<ViewStyle>
}

export type RadioGroupItemProps = {
  value: string
  children?: ReactNode
  description?: ReactNode
  disabled?: boolean
  /** Where the mark stands against the label. @default "left" */
  orientation?: "left" | "right"
  "aria-label"?: string
  testID?: string
}

type RadioNode = { focus?: () => void; compareDocumentPosition?: (other: RadioNode) => number }
type Context = { value: string | undefined; select: (value: string) => void; disabled: boolean; items: Map<string, { node: RadioNode; disabled: boolean }> }
const RadioContext = createContext<Context | null>(null)

/**
 * One choice of several. iOS marks the chosen option with the checkmark of a list row, as the phone layer does
 * (`--radio-group-checkmark-display`), in a 22pt column; Android draws Material 3's 20dp radio button (a 2dp ring, a
 * 12dp dot) in a 48dp target. Props follow @plexui/ui.
 */
function RadioGroupRoot<T extends string>({ value: valueProp, defaultValue, onChange, "aria-label": ariaLabel, direction = "col", disabled = false, children, testID, style }: RadioGroupProps<T>) {
  const [own, setOwn] = useState<string | undefined>(defaultValue)
  const value = valueProp ?? own
  // The options on the screen, for the arrow keys of the web
  const [items] = useState(() => new Map<string, { node: RadioNode; disabled: boolean }>())
  const select = (next: string) => {
    if (valueProp === undefined) setOwn(next)
    onChange?.(next as T)
  }
  return (
    <RadioContext.Provider value={{ value, select, disabled, items }}>
      <View accessibilityRole="radiogroup" aria-label={ariaLabel} testID={testID} style={[direction === "row" ? styles.rowGroup : styles.colGroup, style]}>
        {children}
      </View>
    </RadioContext.Provider>
  )
}
RadioGroupRoot.displayName = "RadioGroup"

function RadioGroupItem({ value, children, description, disabled: itemDisabled = false, orientation = "left", "aria-label": ariaLabel, testID }: RadioGroupItemProps) {
  const theme = useTheme()
  const context = useContext(RadioContext)
  if (!context) throw new Error("RadioGroup.Item must be inside a RadioGroup")
  const selected = context.value === value
  const disabled = context.disabled || itemDisabled
  const [pressed, setPressed] = useState(false)
  const described = useDescription(description)
  let mark: ReactNode
  if (theme.isAndroid) {
    const m = theme.material
    const color = disabled ? withAlpha(m.onSurface, 0.38) : selected ? selectionColor(theme) : m.onSurfaceVariant
    mark = (
      <View style={styles.androidTarget}>
        {pressed && !disabled ? <View pointerEvents="none" style={[styles.androidLayer, { backgroundColor: withAlpha(selected ? color : m.onSurface, stateLayer.pressed) }]} /> : null}
        <View style={[styles.androidRing, { borderColor: color }]}>{selected ? <View style={[styles.androidDot, { backgroundColor: color }]} /> : null}</View>
      </View>
    )
  } else {
    const size = theme.length("--radio-group-indicator-size", 22)
    mark = (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {/* The 24-unit checkmark drawn at 26 over the 22 column, as RadioGroup.module.css */}
        {selected ? <CheckMd size={26} color={disabled ? theme.colors.textDisabled : theme.color("--radio-group-checkmark-color", theme.colors.text)} /> : null}
      </View>
    )
  }
  return (
    <Pressable
      {...described.props}
      {...radioKeys(context, value, disabled, selected)}
      accessibilityRole="radio"
      accessibilityLabel={ariaLabel ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={() => !selected && context.select(value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={[
        styles.item,
        { gap: theme.isAndroid ? 4 : theme.length("--radio-group-item-gap", 6) + 5, minHeight: theme.isAndroid ? 48 : theme.length("--radio-group-target-size", 44) },
        orientation === "right" ? styles.reverse : null,
      ]}
    >
      {mark}
      <View style={styles.text}>
        <ControlLabel label={children} description={description} disabled={disabled} descriptionId={described.id} />
      </View>
    </Pressable>
  )
}
RadioGroupItem.displayName = "RadioGroup.Item"

/**
 * The keyboard of a radio group on the web, as WAI-ARIA and Radix: one option in the Tab order (the chosen one, or
 * every option while none is chosen), the arrows move to the next enabled option and choose it, Space chooses the
 * focused one. A phone has no keyboard focus to rove.
 */
function radioKeys(context: Context, value: string, disabled: boolean, selected: boolean) {
  if (Platform.OS !== "web") return {}
  const { items } = context
  const move = (step: 1 | -1) => {
    const order = [...items.entries()]
      .filter(([, item]) => !item.disabled)
      .sort(([, a], [, b]) => ((a.node.compareDocumentPosition?.(b.node) ?? 0) & FOLLOWING ? -1 : 1))
    const index = order.findIndex(([key]) => key === value)
    const next = order[(index + step + order.length) % order.length]
    if (!next) return
    next[1].node.focus?.()
    context.select(next[0])
  }
  return {
    ref: (instance: unknown) => {
      const node = instance as RadioNode | null
      if (node) items.set(value, { node, disabled })
      else items.delete(value)
    },
    tabIndex: (disabled ? -1 : context.value == null || selected ? 0 : -1) as 0 | -1,
    onKeyDown: (raw: unknown) => {
      const event = raw as { key: string; preventDefault: () => void }
      if (disabled) return
      if (event.key === " ") {
        event.preventDefault()
        if (!selected) context.select(value)
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault()
        move(event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1)
      }
    },
  }
}

/** `Node.DOCUMENT_POSITION_FOLLOWING`: the other node comes after this one. */
const FOLLOWING = 4

export const RadioGroup = Object.assign(RadioGroupRoot, { Item: RadioGroupItem })

const styles = StyleSheet.create({
  colGroup: { alignSelf: "stretch" },
  rowGroup: { flexDirection: "row", flexWrap: "wrap", columnGap: 20 },
  item: { flexDirection: "row", alignItems: "center" },
  reverse: { flexDirection: "row-reverse" },
  text: { flexShrink: 1, minWidth: 0 },
  androidTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginLeft: -14 },
  androidLayer: { position: "absolute", width: 40, height: 40, borderRadius: 20 },
  androidRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  androidDot: { width: 10, height: 10, borderRadius: 5 },
})
