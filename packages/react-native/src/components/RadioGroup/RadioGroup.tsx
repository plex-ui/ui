import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import CheckMd from "../../icons/plex/CheckMd"
import { useDescription } from "../../internal/a11y"
import { ControlLabel } from "../../internal/ControlLabel"
import { isRTL, nextKey } from "../../internal/direction"
import { RowEndContext, RowHoldContext, RowStartContext, rowHold } from "../../internal/row"
import { mix } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { ANDROID_ROW_END, androidEaseInOut, iosCheckmarkColor, selectionColor } from "../Switch/Switch"

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
export type RadioGroupContext = Context
/** The group around an option. Internal (not in the package index): a List row reads it to choose its end option. */
export const RadioContext = createContext<Context | null>(null)

/** Android's radio button in a row: a 20dp ring, in a 48dp target that reaches 14dp past it. */
const ANDROID_RING = 20
const ANDROID_REACH = (48 - ANDROID_RING) / 2
/** A radio row: the text starts 12dp after the ring. */
const ANDROID_LABEL_GAP = 12
/** A radio row: the ring at a row's end stands 23dp in from its edge. */
const ANDROID_ROW_INSET = 23

/**
 * One choice of several. iOS marks the chosen option with the checkmark of a list row, as the phone layer does
 * (`--radio-group-checkmark-display`), in a 22pt column; Android draws its radio button (a 20dp ring of 2dp,
 * a 10dp dot when chosen) in a 48dp target. Props follow @plexui/ui.
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
  const described = useDescription(description)
  const hasText = children != null || description != null
  // At a List row's end with no text of its own (the docs' pattern): the row is its label
  const inRow = useContext(RowEndContext) != null && !hasText
  // Or at its start (a list with the marks first): the mark alone, as wide as its ring or its checkmark's column
  const atStart = useContext(RowStartContext) && !hasText
  const hold = useContext(RowHoldContext)
  // The radio button runs 0 to 1 in 200ms on Android's default ease-in-out: the first half fills the ring inward
  // in its gray, the second shrinks the fill to the dot while it turns the on color; unchoosing runs it back. A
  // disabled option snaps. Android only: iOS shows a list row's checkmark, which does not animate
  const [progress] = useState(() => new Animated.Value(selected ? 1 : 0))
  const animate = theme.isAndroid && !disabled
  useEffect(() => {
    if (theme.reducedMotion || !animate) {
      progress.stopAnimation()
      progress.setValue(selected ? 1 : 0)
      return
    }
    const animation = Animated.timing(progress, { toValue: selected ? 1 : 0, duration: 200, easing: androidEaseInOut, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [selected, animate, theme.reducedMotion, progress])
  let mark: ReactNode
  if (theme.isAndroid) {
    // The empty ring a light gray (#B3B3B3 on white: the ink at 30% over the card), the chosen one the selection
    // color
    const idle = mix(theme.colors.text, theme.colors.groupedSurface, 0.3)
    const chosen = selectionColor(theme)
    // The 48dp target reaches past the ring without taking room: on the outer side the ring keeps the row's edge, on
    // the label's side the text starts 12dp after it. At a List row's end the ring stands Android's 23dp in
    const reach: ViewStyle = inRow
      ? { marginStart: -ANDROID_REACH, marginEnd: -(ANDROID_REACH - (ANDROID_ROW_INSET - ANDROID_ROW_END)) }
      : atStart
        ? { marginHorizontal: -ANDROID_REACH }
        : orientation === "right"
          ? { marginEnd: -ANDROID_REACH, marginStart: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
          : { marginStart: -ANDROID_REACH, marginEnd: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
    // No press of its own: a row shows the press. Disabled, the ring keeps its colors at half (as a radio row's)
    mark = (
      <View style={[styles.androidTarget, reach]}>
        <View style={disabled ? styles.half : null}>
          <AndroidRadio progress={progress} idle={idle} chosen={chosen} />
        </View>
      </View>
    )
  } else {
    const size = theme.length("--radio-group-indicator-size", 22)
    mark = (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {/* The 24-unit checkmark drawn at 26 over the 22 column, as RadioGroup.module.css. No token defines
            --radio-group-checkmark-color: the CSS falls back to --color-text, as here */}
        {selected ? <CheckMd size={26} color={disabled ? theme.colors.textDisabled : iosCheckmarkColor(theme)} /> : null}
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
      {...rowHold(hold)}
      onPress={() => !selected && context.select(value)}
      testID={testID}
      style={[
        styles.item,
        // Android's gap is in the target's margins
        { gap: theme.isAndroid ? 0 : theme.length("--radio-group-item-gap", 6) + 5, minHeight: theme.isAndroid ? 48 : theme.length("--radio-group-target-size", 44) },
        orientation === "right" ? styles.reverse : null,
      ]}
    >
      {mark}
      {/* iOS keeps the empty column of a mark alone; Android draws none, so the ring keeps its place at a row's end.
          At a row's start the row's own text follows the mark */}
      {hasText || (!theme.isAndroid && !atStart) ? (
        <View style={[styles.text, orientation === "right" ? styles.fill : null]}>
          <ControlLabel control="radio-group" label={children} description={description} disabled={disabled} descriptionId={described.id} />
        </View>
      ) : null}
    </Pressable>
  )
}
RadioGroupItem.displayName = "RadioGroup.Item"

/**
 * Android's radio button at 20dp, drawn from its numbers: a 2dp ring 1dp in from its 20dp box. Over the first half of
 * `progress` the ring draws 1dp in and its gray fills inward to a disc; over the second it grows back while the fill
 * shrinks to the 10dp dot, 3dp inside the ring, and both turn from the gray to the on color.
 */
function AndroidRadio({ progress, idle, chosen }: { progress: Animated.Value; idle: string; chosen: string }) {
  // The ring's outer edge 10dp out at rest and 9 at the middle
  const size = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [ANDROID_RING, ANDROID_RING - 2, ANDROID_RING] })
  // The first half: the ring and the gray filling it, 2 + 8c - c² dp thick as c runs 0 to 1; the second, the 2dp ring
  const borderWidth = progress.interpolate({ inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.5001, 1], outputRange: [2, 3.94, 5.75, 7.44, 9, 2, 2] })
  const color = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [idle, idle, chosen] })
  // The dot, 10dp at rest: 14dp where it takes over from the filled ring, 5 + (3 - c)c dp in radius as c runs 1 to 0
  const dot = progress.interpolate({ inputRange: [0.5, 0.625, 0.75, 0.875, 1], outputRange: [1.4, 1.3375, 1.25, 1.1375, 1], extrapolate: "clamp" })
  const shown = progress.interpolate({ inputRange: [0.5, 0.5001], outputRange: [0, 1], extrapolate: "clamp" })
  return (
    <View style={styles.androidFrame}>
      <Animated.View style={{ width: size, height: size, borderRadius: ANDROID_RING / 2, borderWidth, borderColor: color }} />
      <Animated.View style={[styles.androidDot, { backgroundColor: color, opacity: shown, transform: [{ scale: dot }] }]} />
    </View>
  )
}

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
      const event = raw as { key: string; preventDefault: () => void; currentTarget?: unknown }
      if (disabled) return
      if (event.key === " ") {
        event.preventDefault()
        if (!selected) context.select(value)
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault()
        // Right to left, the left arrow goes on to the next option, as Radix's roving focus
        move(event.key === "ArrowDown" || event.key === nextKey(isRTL(event.currentTarget)) ? 1 : -1)
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
  // A label before the mark fills the row, so the mark ends it, as the control of a settings row
  fill: { flexGrow: 1 },
  androidTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  half: { opacity: 0.5 },
  androidFrame: { width: ANDROID_RING, height: ANDROID_RING, alignItems: "center", justifyContent: "center" },
  androidDot: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
})
