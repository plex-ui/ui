import { createContext, isValidElement, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { CssSlide } from "../../internal/CssSlide"
import { childrenOfType, isRenderable, textOf } from "../../internal/children"
import { Glass } from "../../internal/Glass"
import { curves } from "../../internal/motion"
import { useTabKeys } from "../../internal/tabKeys"
import { barShadow, barSurface, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { BarItemContext, type ControlSize } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, textStyle } from "../Text/Text"

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
   * (49 with `mobileMaterial="flat"`). On Android the capsule: 32dp at `sm` and smaller, 36 at `md`, 40 at `lg`,
   * 44 above; in a bar's row of controls the height of its circles.
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
  /**
   * Draws each tab's `badge`: a count in a small capsule after its label, as a messenger's folder tabs set their
   * unread counts; each segment then takes its own width (`mobileSegmentWidth` content), 10 beside its label and
   * count. Off, the count is only read with the segment's name, as the native controls draw none. @default false
   */
  showBadges?: boolean
  /**
   * The drawn counts' color. `label`: the label's on the selected segment, the secondary one on the others (Android:
   * the selected segment's ink, the gray on the others), so a count changes with the selection. `accent`: one accent
   * capsule with white digits on every segment, as TabBar's `badgeColor="accent"`, the same whichever is selected.
   * @default "label"
   */
  badgeColor?: "label" | "accent"
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
  /**
   * A count. Read with the segment's name; drawn only with the control's `showBadges`, as the native controls (iOS and
   * Material alike) draw none.
   */
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
      duration: 300,
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
 * iOS 26 apps (48pt; 40 in a Toolbar.Row), its thumb sliding to the selection; on Android a segmented capsule, white
 * with a sliding pill of the accent. Props follow @plexui/ui (`SegmentedControl` and `SegmentedControl.Tab`).
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
  showBadges = false,
  badgeColor = "label",
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
  // Drawn counts differ from tab to tab, so each segment takes its own width with them, as a messenger's folder tabs
  const counted = showBadges && options.some((option) => option.badge != null)
  const common = { options, value, select, keys, disabled, block, equal: mobileSegmentWidth === "equal" && !counted, showBadges, badgeColor }
  return (
    <View accessibilityRole="tablist" aria-label={ariaLabel} accessibilityState={{ disabled }} testID={testID} style={[block ? styles.block : styles.hug, style]}>
      {theme.isAndroid ? <AndroidControl {...common} size={size} /> : <IOSControl {...common} size={size} material={mobileMaterial} />}
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
  showBadges: boolean
  badgeColor: "label" | "accent"
}

function IOSControl({ options, value, select, keys, disabled, block, equal, showBadges, badgeColor, size, material }: ControlProps & { size: ControlSize; material?: "glass" | "flat" }) {
  const theme = useTheme()
  const inBar = !!useContext(BarItemContext)
  const { inRow } = useContext(SegmentedControlRowContext)
  const look = iosLook(theme, size, material, inBar, inRow)
  // The widths of the labels, measured, for equal segments; the widths of the segments, for the thumb
  const [labels, setLabels] = useState<Record<string, number>>({})
  const [widths, setWidths] = useState<Record<string, number>>({})
  const widest = Math.max(0, ...options.map((option) => labels[option.value] ?? 0))
  const optionRadius = look.height / 2 - look.gutter
  // A drawn count ends a label in a capsule of its own: the thumb keeps 10 beside the label and the capsule, so the
  // capsule does not touch the thumb's end
  const gutter = showBadges && options.some((option) => option.badge != null) ? Math.max(look.optionGutter, 10) : look.optionGutter
  // The large glass control held down: the held label fades to 20%, as UISegmentedControl dims a segment under the
  // finger; the capsule stays as it is, no growth and no whitening (owner 25.11: the control must not swell and snap
  // back on a tap)
  const largeGlass = look.glass && look.height >= 40
  const [held, setHeld] = useState<string | null>(null)
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
    // The web's thumb slides in CSS
    if (selectedX == null || selectedWidth == null || Platform.OS === "web") return
    if (!placed.current || theme.reducedMotion) {
      x.setValue(selectedX)
      width.setValue(selectedWidth)
      placed.current = true
      return
    }
    // The thumb eases (CSS `ease`): in 300ms on the large control, 250 on the small one. The lens's own curve (fast,
    // then a long settle) reads as a jump and a crawl when no lens is drawn over it (owner, 24.11)
    const easing = Easing.bezier(0.25, 0.1, 0.25, 1)
    Animated.parallel([
      Animated.timing(x, { toValue: selectedX, duration: look.duration, easing, useNativeDriver: false }),
      Animated.timing(width, { toValue: selectedWidth, duration: look.duration, easing, useNativeDriver: false }),
    ]).start()
  }, [selectedX, selectedWidth, look.duration, theme.reducedMotion, x, width])
  // The segments take the capsule's whole height, so a press anywhere on it lands (the thumb keeps its inset); a
  // minimum, so text a person enlarges is not cut
  const track: ViewStyle = {
    minHeight: look.height,
    paddingHorizontal: look.gutter,
    gap: look.gap,
    flexDirection: "row",
    borderRadius: look.height / 2,
    borderCurve: "continuous",
  }
  // UISegmentedControl keeps its type at a large text size; a label here grows until it fills its segment
  const maxScale = look.height / look.lineHeight
  const content = (
    <>
      {selected && Platform.OS === "web" ? (
        // The web slides the thumb in CSS, off the JavaScript thread
        <CssSlide
          x={selected.x}
          width={selected.width}
          side="left"
          duration={look.duration}
          easing="cubic-bezier(0.25, 0.1, 0.25, 1)"
          still={theme.reducedMotion}
          style={[styles.thumb, { top: look.gutter, bottom: look.gutter, borderRadius: optionRadius, backgroundColor: look.thumb }]}
        />
      ) : selected ? (
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
            onPressIn={largeGlass ? () => setHeld(option.value) : undefined}
            onPressOut={largeGlass ? () => setHeld(null) : undefined}
            onPress={() => select(option)}
            testID={option.testID}
            onLayout={(event: LayoutChangeEvent) => {
              const w = event.nativeEvent.layout.width
              setWidths((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))
            }}
            style={[
              styles.option,
              { paddingHorizontal: gutter, borderRadius: look.height / 2 },
              block ? styles.grow : equal && widest ? { width: widest + 2 * gutter } : null,
            ]}
          >
            <View
              onLayout={(event: LayoutChangeEvent) => {
                const w = Math.ceil(event.nativeEvent.layout.width)
                setLabels((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))
              }}
              style={[styles.label, held === option.value ? styles.heldLabel : null]}
            >
              {symbolOnly ? (
                <IconDefaultsProvider size={20} color={color}>
                  {option.icon}
                </IconDefaultsProvider>
              ) : (
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={maxScale}
                  color={color}
                  weight={isSelected ? look.selectedWeight : look.weight}
                  style={{ fontSize: look.fontSize, lineHeight: look.lineHeight }}
                >
                  {option.children}
                </Text>
              )}
              {showBadges ? <SegmentCount badge={option.badge} selected={isSelected} off={off} color={badgeColor} /> : null}
            </View>
          </Pressable>
        )
      })}
    </>
  )
  if (look.glass) {
    // The glass keeps the control's fill over it: one flat layer, no sheen (touch.css)
    return (
      <Glass
        radius={look.height / 2}
        fillToken={look.height >= 40 ? "--segmented-control-mobile-glass-background" : undefined}
        style={[track, block ? styles.stretch : null]}
      >
        {look.height < 40 && look.fill ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: look.height / 2, backgroundColor: look.fill }]} /> : null}
        {content}
      </Glass>
    )
  }
  return <View style={[track, { backgroundColor: look.fill }, block ? styles.stretch : null]}>{content}</View>
}

/** The height of Android's segmented capsule under its bar (36dp, measured), a step smaller and larger by size. */
const ANDROID_HEIGHT: Record<string, number> = { "3xs": 32, "2xs": 32, xs: 32, sm: 32, md: 36, lg: 40, xl: 44, "2xl": 44, "3xl": 44 }

/**
 * Android's tabs: the pill moves in 320ms on an ease-out quint, the labels' colors blending with it. A press draws
 * nothing: the pill moving is the feedback.
 */
const ANDROID_MOVE = { duration: 320, easing: curves.easeOutQuint }

/**
 * Android's control is a segmented capsule, as the tabs under a bar and a settings row in the content draw it
 * (Material's connected button group has no place in this look): a capsule of the bar's surface (white, a gray at
 * night) with the shadow of the bar's circles, its segments 4dp in, the selected one a pill of the accent at 12% with
 * its label in the accent, the others in the secondary gray. The pill slides to a new selection and takes its width.
 * In a bar's row of controls the capsule takes the height of the circles beside it (46dp).
 */
function AndroidControl({ options, value, select, keys, disabled, block, equal, showBadges, badgeColor, size }: ControlProps & { size: ControlSize }) {
  const theme = useTheme()
  const m = theme.material
  const bar = useContext(BarItemContext)
  const { inRow } = useContext(SegmentedControlRowContext)
  const height = bar && !inRow ? bar.height : (ANDROID_HEIGHT[size] ?? 36)
  const inner = height - 8
  const [widths, setWidths] = useState<Record<string, number>>({})
  // Equal segments that hug their labels all take the widest one's width
  const widest = equal && !block ? Math.max(0, ...Object.values(widths)) : 0
  const [x] = useState(() => new Animated.Value(0))
  const [width] = useState(() => new Animated.Value(0))
  const placed = useRef(false)
  // The pill's place from the segments' widths in their order, 4 in from the capsule's start (react-native-web reports
  // a layout on a resize, not on a move)
  const index = options.findIndex((option) => option.value === value)
  const measured = index >= 0 && options.slice(0, index + 1).every((option) => widths[option.value] != null)
  const frameX = measured ? 4 + options.slice(0, index).reduce((sum, option) => sum + widths[option.value], 0) : undefined
  const frameWidth = measured ? widths[options[index].value] : undefined
  const frame = frameX != null
  useEffect(() => {
    if (frameX == null || frameWidth == null || Platform.OS === "web") return
    if (!placed.current || theme.reducedMotion) {
      x.setValue(frameX)
      width.setValue(frameWidth)
      placed.current = true
      return
    }
    const timing = { ...ANDROID_MOVE, useNativeDriver: false }
    Animated.parallel([Animated.timing(x, { ...timing, toValue: frameX }), Animated.timing(width, { ...timing, toValue: frameWidth })]).start()
  }, [frameX, frameWidth, x, width, theme.reducedMotion])
  return (
    <View
      style={[
        styles.androidRow,
        { height, borderRadius: height / 2, backgroundColor: barSurface(m, theme.scheme), boxShadow: barShadow(theme.scheme) },
        block ? styles.stretch : null,
      ]}
    >
      {frame && Platform.OS === "web" ? (
        <CssSlide
          x={frameX}
          width={frameWidth!}
          side="left"
          duration={ANDROID_MOVE.duration}
          easing="cubic-bezier(0.23, 1, 0.32, 1)"
          still={theme.reducedMotion}
          style={[styles.androidPill, { height: inner, borderRadius: inner / 2, backgroundColor: withAlpha(m.primary, 0.12) }]}
        />
      ) : frame ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.androidPill, { height: inner, borderRadius: inner / 2, backgroundColor: withAlpha(m.primary, 0.12), left: x, width }]}
        />
      ) : null}
      {options.map((option) => (
        <AndroidSegment
          key={option.value}
          option={option}
          selected={option.value === value}
          off={disabled || !!option.disabled}
          framed={frame}
          showBadges={showBadges}
          badgeColor={badgeColor}
          height={inner}
          // In a filled row equal segments share the width and the others take their label and share what is left; a
          // control that hugs its segments gives equal ones the widest one's width
          size={block ? (equal ? styles.grow : styles.share) : widest ? { minWidth: widest } : null}
          keys={keys}
          select={select}
          onWidth={(w) => setWidths((prev) => (prev[option.value] === w ? prev : { ...prev, [option.value]: w }))}
        />
      ))}
    </View>
  )
}

type AndroidSegmentProps = {
  option: SegmentedControlOptionProps
  selected: boolean
  off: boolean
  /** The pill is placed: the selected segment draws none of its own. */
  framed: boolean
  showBadges: boolean
  badgeColor: "label" | "accent"
  height: number
  size: ViewStyle | null
  keys: ReturnType<typeof useTabKeys>
  select: (option: SegmentedControlOptionProps) => void
  onWidth: (width: number) => void
}

/** One segment of the capsule: its label turns from the gray to the accent as the pill comes, and back as it goes. */
function AndroidSegment({ option, selected, off, framed, showBadges, badgeColor, height, size, keys, select, onWidth }: AndroidSegmentProps) {
  const theme = useTheme()
  const m = theme.material
  const [tint] = useState(() => new Animated.Value(selected ? 1 : 0))
  useEffect(() => {
    if (theme.reducedMotion) {
      tint.stopAnimation()
      tint.setValue(selected ? 1 : 0)
      return
    }
    const animation = Animated.timing(tint, { toValue: selected ? 1 : 0, ...ANDROID_MOVE, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [selected, theme.reducedMotion, tint])
  // A tab's label: the inactive gray (#777C7F) to the accent; a disabled segment the ink at 38%
  const idle = theme.colors.labelSecondary
  const color = off ? withAlpha(m.onSurface, 0.38) : selected ? m.primary : idle
  const label = off ? color : tint.interpolate({ inputRange: [0, 1], outputRange: [idle, m.primary] })
  return (
    <Pressable
      {...keys({ value: option.value, disabled: off })}
      accessibilityRole="tab"
      accessibilityLabel={optionName(option)}
      accessibilityState={{ selected, disabled: off }}
      aria-selected={selected}
      disabled={off}
      onPress={() => select(option)}
      testID={option.testID}
      onLayout={(event: LayoutChangeEvent) => onWidth(event.nativeEvent.layout.width)}
      style={[
        styles.androidOption,
        { height, borderRadius: height / 2 },
        size,
        // Until the pill is placed the selected segment draws its own
        selected && !framed ? { backgroundColor: withAlpha(m.primary, 0.12) } : null,
      ]}
    >
      {isRenderable(option.icon) ? (
        <IconDefaultsProvider size={20} color={color}>
          {option.icon}
        </IconDefaultsProvider>
      ) : null}
      {isRenderable(option.children) ? (
        // An Animated text, so its color can blend: the face, size and tracking of the kit's Text
        <Animated.Text numberOfLines={1} style={[textStyle(theme, { weight: "medium" }), { fontSize: 14, lineHeight: 20, letterSpacing: theme.tracking(14), color: label }]}>
          {option.children}
        </Animated.Text>
      ) : null}
      {showBadges ? <SegmentCount badge={option.badge} selected={selected} off={off} color={badgeColor} /> : null}
    </Pressable>
  )
}

/**
 * A tab's count drawn after its label (`showBadges`): a capsule 18 tall, the digits 12 semibold in the screen's color.
 * iOS: the label's color on the selected segment, so it reads on the thumb, the secondary label on the others.
 * Android: the accent on the selected segment, as its label, the gray on the others. `accent`: the accent's capsule and
 * white digits on every segment, on both platforms.
 */
function SegmentCount({ badge, selected, off, color }: { badge: SegmentedControlBadgeProp | undefined; selected: boolean; off: boolean; color: "label" | "accent" }) {
  const theme = useTheme()
  const text = badge != null ? badgeText(badge) : undefined
  if (!text) return null
  // iOS: the label's color in a capsule, the bar's ink in it; Android: the segment's own ink, the selected one's
  // container in it (onSecondaryContainer on secondaryContainer), the others' onSurfaceVariant on the surface, so the
  // small digits keep their contrast
  const accent = color === "accent"
  const fill = off
    ? theme.color("--alpha-20")
    : accent
      ? theme.color("--color-background-accent-solid")
      : theme.isAndroid
      ? selected
        ? theme.material.onSecondaryContainer
        : theme.material.onSurfaceVariant
      : selected
        ? theme.colors.text
        : theme.colors.labelSecondary
  const ink = accent && !off ? theme.color("--color-text-accent-solid", "#FFFFFF") : theme.isAndroid ? (selected ? theme.material.secondaryContainer : theme.material.surface) : theme.colors.background
  return (
    <View aria-hidden style={[styles.count, { backgroundColor: fill }]}>
      <Text numberOfLines={1} weight="semibold" color={ink} style={styles.countText}>
        {text}
      </Text>
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
  heldLabel: { opacity: 0.2 },
  // 18 tall, taller with a larger text size: the capsule grows round its digits
  count: { minWidth: 18, minHeight: 18, paddingHorizontal: 5, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  thumb: { position: "absolute", borderCurve: "continuous" },
  option: { alignItems: "center", justifyContent: "center", minWidth: 0 },
  label: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  androidRow: { flexDirection: "row", alignItems: "center", padding: 4 },
  androidPill: { position: "absolute", top: 4 },
  androidOption: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12.5, minWidth: 0 },
  share: { flexGrow: 1, flexShrink: 1, flexBasis: "auto" },
})
