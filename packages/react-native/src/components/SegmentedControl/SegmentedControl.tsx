import { createContext, isValidElement, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { childrenOfType, isRenderable, textOf } from "../../internal/children"
import { Glass } from "../../internal/Glass"
import { useTabKeys } from "../../internal/tabKeys"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { BarItemContext, useMaterialPress, type ControlSize } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type SegmentedControlProps<T extends string> = {
  /** The value of the selected segment (controlled). */
  value: T
  /** Called with the value of the segment a person selects. */
  onChange?: (nextValue: T) => void
  /** Called on any press of the control, even when the value stays. */
  onClick?: () => void
  /** The name of the control for assistive technology. */
  "aria-label": string
  /**
   * The two sizes of the iOS segmented control: `sm` and smaller the small 32pt one, `md` and larger the large 48pt one
   * (49 with `mobileMaterial="flat"`). Android draws Material's 40dp connected button group at every size.
   * @default "md"
   */
  size?: ControlSize
  /** Disables every segment. */
  disabled?: boolean
  /** Fills the row, the segments sharing its width. */
  block?: boolean
  /** Kept for the API of @plexui/ui: a phone's segmented control is always a capsule. */
  pill?: boolean
  /**
   * The large control is the glass capsule of iOS 26 apps and the small one the plain capsule of SwiftUI's segmented
   * Picker; `flat` gives the large one the plain look of `.controlSize(.large)`, `glass` gives the small one glass. In
   * a Toolbar the control is the large glass one. @default "glass" at md and larger, "flat" at sm and smaller
   */
  mobileMaterial?: "glass" | "flat"
  /**
   * `equal` gives every segment the widest one's width, as UISegmentedControl; `content` each its own label's.
   * @default "equal"
   */
  mobileSegmentWidth?: "equal" | "content"
  style?: StyleProp<ViewStyle>
  testID?: string
  /** `SegmentedControl.Tab` elements. */
  children: ReactNode
}

export type SegmentedControlBadgeProp = ReactNode | { content: ReactNode }

export type SegmentedControlOptionProps = {
  value: string
  /** The name of the segment for assistive technology, for a symbol alone. */
  "aria-label"?: string
  /** The label. */
  children?: ReactNode
  /** A symbol before the label; with a label, iOS shows the symbol alone, as UISegmentedControl. */
  icon?: ReactNode
  /** A count. Segmented controls draw none on a phone (iOS and Material alike): it is read with the segment's name. */
  badge?: SegmentedControlBadgeProp
  disabled?: boolean
  testID?: string
}

/** The metrics of one look of the iOS control (touch.css, the phone layer of the segmented control). */
type Look = {
  height: number
  /** The thumb's inset from the capsule. */
  gutter: number
  gap: number
  /** Air beside a label inside its segment. */
  optionGutter: number
  fontSize: number
  lineHeight: number
  weight: "medium" | "semibold"
  selectedWeight: "medium" | "semibold"
  glass: boolean
  /** The plain fill of the capsule (the small control's, also under the small glass). */
  fill?: string
  thumb: string
  duration: number
}

function iosLook(theme: Theme, size: ControlSize, material: "glass" | "flat" | undefined, inBar: boolean, inRow: boolean): Look {
  const small = ["3xs", "2xs", "xs", "sm"].includes(size)
  // touch.css: in a bar's own row every control is the large glass one; in a Toolbar.Row the md control is a 40pt
  // glass one (flat: the small plain one) and the others keep their sizes, as in content
  const kind: "small" | "flat" | "large" | "row" =
    inBar && !inRow ? "large" : inRow && size === "md" ? (material === "flat" ? "small" : "row") : small ? "small" : material === "flat" ? "flat" : "large"
  if (kind === "large" || kind === "row") {
    const row = kind === "row"
    return {
      height: row ? 40 : 48,
      gutter: row ? 3 : 4,
      gap: 8,
      optionGutter: row ? 12 : 4,
      fontSize: 15,
      lineHeight: 20,
      weight: "medium",
      selectedWeight: "medium",
      glass: true,
      fill: theme.color("--segmented-control-mobile-glass-background"),
      thumb: theme.color("--segmented-control-mobile-thumb-background"),
      duration: 400,
    }
  }
  return {
    height: kind === "small" ? 32 : 49,
    gutter: 2,
    gap: 4,
    optionGutter: 9,
    fontSize: 13,
    lineHeight: 18,
    weight: "medium",
    selectedWeight: "semibold",
    glass: kind === "small" && material === "glass",
    fill: theme.color("--segmented-control-mobile-plain-background"),
    thumb: theme.color("--segmented-control-mobile-plain-thumb-background"),
    duration: 250,
  }
}

type ControlContext = { inRow: boolean }
/** A Toolbar.Row tells the control in it that it is in a row, not in the bar's own row. */
export const SegmentedControlRowContext = createContext<ControlContext>({ inRow: false })

function SegmentedControlTab(_: SegmentedControlOptionProps): ReactElement | null {
  // Drawn by SegmentedControl
  return null
}
SegmentedControlTab.displayName = "SegmentedControl.Tab"

const badgeText = (badge: SegmentedControlBadgeProp): string | undefined => {
  const content = badge && typeof badge === "object" && !isValidElement(badge) && "content" in badge ? badge.content : badge
  return textOf(content as ReactNode) || undefined
}

/** The accessible name: the label's text, read through elements (iOS shows a symbol alone), then the badge. */
const optionName = (option: SegmentedControlOptionProps) => {
  const label = option["aria-label"] ?? (textOf(option.children) || undefined)
  const count = option.badge != null ? badgeText(option.badge) : undefined
  return label && count ? `${label}, ${count}` : label
}

/**
 * A segmented control: on iOS the small plain capsule of SwiftUI's segmented Picker (32pt) or the large glass one of
 * iOS 26 apps (48pt; 40 in a Toolbar.Row), its thumb sliding to the selection; on Android Material 3's connected
 * button group. Props follow @plexui/ui (`SegmentedControl` and `SegmentedControl.Tab`).
 */
function SegmentedControlRoot<T extends string>({
  value,
  onChange,
  onClick,
  "aria-label": ariaLabel,
  size = "md",
  disabled = false,
  block = false,
  mobileMaterial,
  mobileSegmentWidth = "equal",
  style,
  testID,
  children,
}: SegmentedControlProps<T>) {
  const theme = useTheme()
  const options = childrenOfType<SegmentedControlOptionProps>(children, SegmentedControlTab).map((child) => child.props)
  const select = (option: SegmentedControlOptionProps) => {
    onClick?.()
    if (option.value !== value && !option.disabled && !disabled) onChange?.(option.value as T)
  }
  const keys = useTabKeys(
    options.map((option) => ({ value: option.value, disabled: disabled || option.disabled })),
    value,
    (next) => {
      const option = options.find((candidate) => candidate.value === next)
      if (option) select(option)
    },
  )
  const common = { options, value, select, keys, disabled, block, equal: mobileSegmentWidth === "equal" }
  return (
    <View accessibilityRole="tablist" aria-label={ariaLabel} accessibilityState={{ disabled }} testID={testID} style={[block ? styles.block : styles.hug, style]}>
      {theme.isAndroid ? <AndroidControl {...common} /> : <IOSControl {...common} size={size} material={mobileMaterial} />}
    </View>
  )
}
SegmentedControlRoot.displayName = "SegmentedControl"

type ControlProps = {
  options: SegmentedControlOptionProps[]
  value: string
  select: (option: SegmentedControlOptionProps) => void
  keys: ReturnType<typeof useTabKeys>
  disabled: boolean
  block: boolean
  equal: boolean
}

function IOSControl({ options, value, select, keys, disabled, block, equal, size, material }: ControlProps & { size: ControlSize; material?: "glass" | "flat" }) {
  const theme = useTheme()
  const inBar = !!useContext(BarItemContext)
  const { inRow } = useContext(SegmentedControlRowContext)
  const look = iosLook(theme, size, material, inBar, inRow)
  // The widths of the labels, measured, for equal segments; the widths of the segments, for the thumb
  const [labels, setLabels] = useState<Record<string, number>>({})
  const [widths, setWidths] = useState<Record<string, number>>({})
  const widest = Math.max(0, ...options.map((option) => labels[option.value] ?? 0))
  const optionRadius = look.height / 2 - look.gutter
  // The thumb's place from the segments in their order, so a reorder moves it even when no box changes size
  const index = options.findIndex((option) => option.value === value)
  const measured = index >= 0 && options.slice(0, index + 1).every((option) => widths[option.value] != null)
  const left = measured ? look.gutter + options.slice(0, index).reduce((sum, option) => sum + widths[option.value] + look.gap, 0) : 0
  const selected = measured ? { x: left, width: widths[value] } : undefined
  const selectedX = selected?.x
  const selectedWidth = selected?.width
  const [x] = useState(() => new Animated.Value(0))
  const [width] = useState(() => new Animated.Value(0))
  const placed = useRef(false)
  useEffect(() => {
    if (selectedX == null || selectedWidth == null) return
    if (!placed.current || theme.reducedMotion) {
      x.setValue(selectedX)
      width.setValue(selectedWidth)
      placed.current = true
      return
    }
    // The large control's lens lands in 400ms on a fast-out curve (iOS 27.2, touch.css); the small one eases in 250
    const easing = look.glass && look.height >= 40 ? Easing.out(Easing.poly(5)) : Easing.bezier(0.25, 0.1, 0.25, 1)
    Animated.parallel([
      Animated.timing(x, { toValue: selectedX, duration: look.duration, easing, useNativeDriver: false }),
      Animated.timing(width, { toValue: selectedWidth, duration: look.duration, easing, useNativeDriver: false }),
    ]).start()
  }, [selectedX, selectedWidth, look.duration, look.glass, look.height, theme.reducedMotion, x, width])
  const track: ViewStyle = {
    height: look.height,
    padding: look.gutter,
    gap: look.gap,
    flexDirection: "row",
    borderRadius: look.height / 2,
    borderCurve: "continuous",
  }
  const content = (
    <>
      {selected ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { top: look.gutter, bottom: look.gutter, left: x, width, borderRadius: optionRadius, backgroundColor: look.thumb }]}
        />
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value
        const off = disabled || !!option.disabled
        const color = off ? theme.color("--alpha-20") : theme.colors.text
        const symbolOnly = isRenderable(option.icon)
        return (
          <Pressable
            key={option.value}
            {...keys({ value: option.value, disabled: off })}
            accessibilityRole="tab"
            accessibilityLabel={optionName(option)}
            accessibilityState={{ selected: isSelected, disabled: off }}
            aria-selected={isSelected}
            disabled={off}
            onPress={() => select(option)}
            testID={option.testID}
            onLayout={(event: LayoutChangeEvent) => {
              const w = event.nativeEvent.layout.width
              setWidths((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))
            }}
            style={[
              styles.option,
              { paddingHorizontal: look.optionGutter, borderRadius: optionRadius },
              block ? styles.grow : equal && widest ? { width: widest + 2 * look.optionGutter } : null,
            ]}
          >
            <View
              onLayout={(event: LayoutChangeEvent) => {
                const w = Math.ceil(event.nativeEvent.layout.width)
                setLabels((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))
              }}
              style={styles.label}
            >
              {symbolOnly ? (
                <IconDefaultsProvider size={20} color={color}>
                  {option.icon}
                </IconDefaultsProvider>
              ) : (
                <Text
                  numberOfLines={1}
                  color={color}
                  weight={isSelected ? look.selectedWeight : look.weight}
                  style={{ fontSize: look.fontSize, lineHeight: look.lineHeight }}
                >
                  {option.children}
                </Text>
              )}
            </View>
          </Pressable>
        )
      })}
    </>
  )
  if (look.glass) {
    // The glass keeps the control's fill over it: one flat layer, no sheen (touch.css)
    return (
      <Glass radius={look.height / 2} fillToken={look.height >= 40 ? "--segmented-control-mobile-glass-background" : undefined} style={[track, block ? styles.stretch : null]}>
        {look.height < 40 && look.fill ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: look.height / 2, backgroundColor: look.fill }]} /> : null}
        {content}
      </Glass>
    )
  }
  return <View style={[track, { backgroundColor: look.fill }, block ? styles.stretch : null]}>{content}</View>
}

/**
 * Material 3 Expressive's connected button group, the successor of segmented buttons: 40dp toggle buttons 2dp apart,
 * the outer corners full and the inner 8dp, the selected one fully round in the Plex primary solid.
 */
const TARGET_SLOP = { top: 4, bottom: 4 }

function AndroidControl({ options, value, select, keys, disabled, block, equal }: ControlProps) {
  const theme = useTheme()
  const m = theme.material
  const nativeRipple = useMaterialPress(theme)
  const [pressed, setPressed] = useState<string | null>(null)
  const [labels, setLabels] = useState<Record<string, number>>({})
  const widest = Math.max(0, ...options.map((option) => labels[option.value] ?? 0))
  const type = materialType.labelLarge
  const height = 40
  const full = height / 2
  return (
    <View style={[styles.androidGroup, block ? styles.stretch : null]}>
      {options.map((option, index) => {
        const isSelected = option.value === value
        const off = disabled || !!option.disabled
        const first = index === 0
        const last = index === options.length - 1
        const inner = pressed === option.value ? 4 : 8
        const corners: ViewStyle = isSelected
          ? { borderRadius: full }
          : {
              borderTopLeftRadius: first ? full : inner,
              borderBottomLeftRadius: first ? full : inner,
              borderTopRightRadius: last ? full : inner,
              borderBottomRightRadius: last ? full : inner,
            }
        // Selected as a selected Plex button: the primary solid (the neutral ink, or a brand's), as decision 0017 keeps
        // Plex primary neutral on Android where Material would fill it with the accent
        const background = off ? withAlpha(m.onSurface, 0.1) : isSelected ? theme.color("--color-background-primary-solid") : m.surfaceContainer
        const color = off ? withAlpha(m.onSurface, 0.38) : isSelected ? theme.color("--color-text-primary-solid") : m.onSurfaceVariant
        return (
          <Pressable
            key={option.value}
            {...keys({ value: option.value, disabled: off })}
            accessibilityRole="tab"
            accessibilityLabel={optionName(option)}
            accessibilityState={{ selected: isSelected, disabled: off }}
            aria-selected={isSelected}
            disabled={off}
            onPress={() => select(option)}
            onPressIn={() => setPressed(option.value)}
            onPressOut={() => setPressed(null)}
            android_ripple={nativeRipple ? { color: withAlpha(color, stateLayer.pressed), foreground: true } : undefined}
            // Material's 48dp touch target around the 40dp button (ButtonGroup's minimumInteractiveComponentSize)
            hitSlop={TARGET_SLOP}
            testID={option.testID}
            style={[
              styles.androidOption,
              corners,
              { height, backgroundColor: background },
              block ? styles.grow : equal && widest ? { width: widest + 32 } : null,
            ]}
          >
            {pressed === option.value && !nativeRipple && !off ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(color, stateLayer.pressed) }]} />
            ) : null}
            <View
              style={styles.androidLabel}
              onLayout={(event: LayoutChangeEvent) => {
                const w = Math.ceil(event.nativeEvent.layout.width)
                setLabels((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))
              }}
            >
              {isRenderable(option.icon) ? (
                <IconDefaultsProvider size={20} color={color}>
                  {option.icon}
                </IconDefaultsProvider>
              ) : null}
              {isRenderable(option.children) ? (
                <Text numberOfLines={1} color={color} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight, ...theme.font("medium") }}>
                  {option.children}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export const SegmentedControl = Object.assign(SegmentedControlRoot, { Tab: SegmentedControlTab, Option: SegmentedControlTab })

const styles = StyleSheet.create({
  hug: { alignSelf: "flex-start" },
  block: { alignSelf: "stretch" },
  grow: { flex: 1 },
  // The control is in a column: it fills the width and keeps its own height
  stretch: { alignSelf: "stretch" },
  thumb: { position: "absolute", borderCurve: "continuous" },
  option: { alignItems: "center", justifyContent: "center", minWidth: 0 },
  label: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  androidGroup: { flexDirection: "row", gap: 2 },
  androidOption: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16, overflow: "hidden" },
  androidLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
})
