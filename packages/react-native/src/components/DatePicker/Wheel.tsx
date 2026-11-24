import { useEffect, useRef, useState } from "react"
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"

export type WheelItem = { label: string; disabled?: boolean }

export type WheelColumn = {
  key: string
  items: WheelItem[]
  /** The item at the band. */
  index: number
  onChange: (index: number) => void
  /** The column's width. */
  width: number
  /** The column's name, read by a screen reader ("Hours"). */
  label: string
  /** Where its labels stand in the column. @default "center" */
  align?: "start" | "center" | "end"
  /** The labels' inset from the column's side they stand at. @default 4 */
  inset?: number
}

export type WheelsProps = {
  columns: WheelColumn[]
  /** The wheels' height. @default 202 on iOS (a compact time picker's popover), 144 on Android */
  height?: number
  /** iOS: the band's inset from the wheels' sides. @default 20 */
  bandInset?: number
  /** Takes no turns, presses or keys. */
  disabled?: boolean
  testID?: string
}

/** iOS: a row of UIDatePicker's wheels, 32 apart (the band of iOS 27.2, 32 tall). Android: a NumberPicker's 48dp rows. */
export const IOS_WHEEL_ROW = 32
export const ANDROID_WHEEL_ROW = 48

/**
 * The wheels of a time (or date) picker. On iOS UIDatePicker's `.wheels` as iOS 27.2 draws them in a compact time
 * picker's popover: rows 32 apart in Regular 22, a 32 band of the ink at 7% across the columns 20 in from the sides,
 * the rows on the band in the ink and the others in its 35% gray, turning away like a cylinder's. On Android the
 * spinner mode of its DatePicker and TimePicker: three 48dp rows, the middle one between two lines in the ink, the
 * others faded. A wheel stops on a row; a tap on a row turns it there; VoiceOver and TalkBack turn it one row at a time.
 */
export function Wheels({ columns, height: heightProp, bandInset = 20, disabled = false, testID }: WheelsProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const row = android ? ANDROID_WHEEL_ROW : IOS_WHEEL_ROW
  const height = heightProp ?? (android ? row * 3 : 202)
  const ink = android ? theme.material.onSurface : theme.colors.text
  const band = (height - row) / 2
  // Columns wider than the room narrow in step, so the wheels keep inside the band
  const [room, setRoom] = useState(0)
  const total = columns.reduce((sum, column) => sum + column.width, 0)
  const fit = room > 0 ? Math.min(1, (room - 2 * (android ? 0 : bandInset)) / total) : 1
  return (
    <View style={[styles.wheels, { height }]} testID={testID} onLayout={(event) => setRoom(event.nativeEvent.layout.width)}>
      {/* The band: the ink at 7% (12% at night) on iOS, two lines on Android */}
      <View
        pointerEvents="none"
        style={[
          styles.band,
          { top: band, height: row },
          android
            ? { borderTopWidth: 2, borderBottomWidth: 2, borderColor: theme.material.outline, left: 0, right: 0 }
            : { left: bandInset, right: bandInset, borderRadius: 8, backgroundColor: withAlpha(ink, theme.scheme === "dark" ? 0.12 : 0.07) },
        ]}
      />
      {columns.map((column) => (
        <Wheel
          key={column.key}
          column={fit < 1 ? { ...column, width: Math.floor(column.width * fit) } : column}
          disabled={disabled}
          row={row}
          height={height}
          ink={ink} testID={testID ? `${testID}-${column.key}` : undefined} />
      ))}
    </View>
  )
}

function Wheel({ column, row, height, ink, disabled, testID }: { column: WheelColumn; row: number; height: number; ink: string; disabled: boolean; testID?: string }) {
  const theme = useTheme()
  const android = theme.isAndroid
  const { items, index, onChange, width, label, align = "center", inset = 4 } = column
  const scroll = useRef<{ scrollTo: (options: { y: number; animated?: boolean }) => void } | null>(null)
  const [offset] = useState(() => new Animated.Value(index * row))
  const last = useRef(index * row)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touching = useRef(false)
  const pad = (height - row) / 2
  const web = Platform.OS === "web"
  const nearestEnabled = (target: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, target))
    if (!items[clamped]?.disabled) return clamped
    for (let step = 1; step < items.length; step += 1) {
      if (!items[clamped - step]?.disabled && clamped - step >= 0) return clamped - step
      if (!items[clamped + step]?.disabled && clamped + step < items.length) return clamped + step
    }
    return clamped
  }
  const turnTo = (next: number, animated: boolean) => {
    scroll.current?.scrollTo({ y: next * row, animated: animated && !theme.reducedMotion })
  }
  // The wheel comes to rest on the row nearest the band, or the nearest one that can be chosen
  const settle = () => {
    timer.current = null
    if (touching.current) return
    const next = nearestEnabled(Math.round(last.current / row))
    if (Math.abs(last.current - next * row) > 0.5) turnTo(next, true)
    if (next !== index) onChange(next)
  }
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y
    last.current = y
    offset.setValue(y)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(settle, web ? 120 : 90)
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])
  // A value set from outside turns the wheel to it (a settle still waiting gives way to it)
  useEffect(() => {
    if (touching.current) return
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (Math.abs(last.current - index * row) > 0.5) turnTo(index, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, row])
  const textAlign = align === "start" ? "left" : align === "end" ? "right" : "center"
  const fontSize = android ? 20 : 22
  const lineHeight = android ? 28 : 28
  // A row's look by its distance from the band: it turns away and fades as on a cylinder (iOS); Android fades it
  const rowStyle = (position: number) => {
    const distance = Animated.divide(Animated.subtract(offset, position * row), row)
    return {
      opacity: distance.interpolate({ inputRange: [-3, -1, 0, 1, 3], outputRange: [0.25, android ? 0.6 : 0.85, 1, android ? 0.6 : 0.85, 0.25], extrapolate: "clamp" }),
      transform: android
        ? []
        : [
            { perspective: 600 },
            { rotateX: distance.interpolate({ inputRange: [-4, 4], outputRange: ["72deg", "-72deg"], extrapolate: "clamp" }) },
            { scale: distance.interpolate({ inputRange: [-3, 0, 3], outputRange: [0.9, 1, 0.9], extrapolate: "clamp" }) },
          ],
    }
  }
  const step = (direction: 1 | -1) => {
    if (disabled) return
    const next = nearestEnabled(index + direction)
    if (next === index) return
    turnTo(next, true)
    onChange(next)
  }
  const gray = withAlpha(ink, android ? 0.38 : 0.35)
  const labelFor = (item: WheelItem, position: number, color: string, pressable: boolean) => {
    const text = (
      <Animated.Text
        numberOfLines={1}
        style={[
          { width, height: row, fontSize, lineHeight: row, textAlign, color: item.disabled ? withAlpha(ink, 0.2) : color, paddingStart: align === "end" ? 4 : inset, paddingEnd: align === "start" ? 4 : align === "end" ? inset : 4 },
          theme.font("regular"),
          web ? ({ userSelect: "none" } as object) : null,
          rowStyle(position),
        ]}
      >
        {item.label}
      </Animated.Text>
    )
    if (!pressable) return <View key={position}>{text}</View>
    return (
      <Pressable
        key={position}
        disabled={item.disabled || disabled}
        importantForAccessibility="no"
        accessibilityElementsHidden
        onPress={() => {
          turnTo(position, true)
          if (position !== index) onChange(position)
        }}
      >
        {text}
      </Pressable>
    )
  }
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index]?.label }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      {...((web
        ? {
            tabIndex: disabled ? -1 : 0,
            onKeyDown: (event: { key: string; preventDefault: () => void }) => {
              if (event.key === "ArrowDown") step(1)
              else if (event.key === "ArrowUp") step(-1)
              else return
              event.preventDefault()
            },
          }
        : null) as object)}
      style={{ width, height }}
      testID={testID}
    >
      <ScrollView
        ref={scroll as never}
        scrollEnabled={!disabled}
        showsVerticalScrollIndicator={false}
        snapToInterval={row}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          touching.current = true
        }}
        onScrollEndDrag={() => {
          touching.current = false
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(settle, 90)
        }}
        onLayout={() => turnTo(index, false)}
        contentContainerStyle={{ paddingVertical: pad }}
        style={web ? ({ scrollbarWidth: "none" } as object) : null}
      >
        {items.map((item, position) => labelFor(item, position, gray, true))}
      </ScrollView>
      {/* The rows on the band, in the ink: a copy clipped to the band, moving with the wheel */}
      <View pointerEvents="none" style={[styles.clip, { top: pad, height: row, width }]}>
        <Animated.View style={{ transform: [{ translateY: Animated.multiply(offset, -1) }] }}>
          {items.map((item, position) => labelFor(item, position, ink, false))}
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wheels: { flexDirection: "row", justifyContent: "center", alignSelf: "stretch" },
  band: { position: "absolute" },
  clip: { position: "absolute", left: 0, overflow: "hidden" },
})
