import { useRef, useState } from "react"
import { Platform, StyleSheet, View, type GestureResponderEvent } from "react-native"
import { Pressable } from "../../internal/Pressable"
import Svg, { Circle, Line } from "react-native-svg"
import { useTheme } from "../../theme/ThemeProvider"
import { Text } from "../Text/Text"
import { pad2, periodLabels } from "./dates"

export type TimeDialProps = {
  hours: number
  minutes: number
  onChange: (hours: number, minutes: number) => void
  hour12: boolean
  locale?: string
  /** The header over the time ("Select time"). */
  title: string
  hoursLabel?: string
  minutesLabel?: string
  testID?: string
}

const DIAL = 256
const OUTER = 101
const INNER = 69
const KNOB = 48

/**
 * Android's time picker dial (Material 3 TimePicker): "Select time" in Medium 12, the hour and the minute in Regular
 * 57 boxes 96 by 80 (the one being set in the primary container, the other in the highest surface container), AM and
 * PM stacked beside them on a 12-hour clock, and the 256dp dial: a 48dp knob in the primary color on a line from the
 * middle, the numbers 101dp out (a 24-hour clock adds 00 and 13–23 69dp out). A tap or a drag on the dial sets the
 * hour, then it turns to the minutes.
 */
export function TimeDial({ hours, minutes, onChange, hour12, locale, title, hoursLabel = "Hours", minutesLabel = "Minutes", testID }: TimeDialProps) {
  const theme = useTheme()
  const m = theme.material
  const [part, setPart] = useState<"hours" | "minutes">("hours")
  const pm = hours >= 12
  const [am, pmLabel] = periodLabels(locale)
  const shownHour = hour12 ? (hours % 12 === 0 ? 12 : hours % 12) : hours
  const center = DIAL / 2
  // The value under the knob: its angle from 12 o'clock and its ring
  const inner = part === "hours" && !hour12 && (hours === 0 || hours > 12)
  const angle = part === "hours" ? ((hours % 12) / 12) * 360 : (minutes / 60) * 360
  const radius = inner ? INNER : OUTER
  const knob = { x: center + radius * Math.sin((angle * Math.PI) / 180), y: center - radius * Math.cos((angle * Math.PI) / 180) }
  const dragging = useRef(false)
  const pick = (event: GestureResponderEvent, done: boolean) => {
    const x = event.nativeEvent.locationX - center
    const y = event.nativeEvent.locationY - center
    let degrees = (Math.atan2(x, -y) * 180) / Math.PI
    if (degrees < 0) degrees += 360
    if (part === "hours") {
      const slot = Math.round(degrees / 30) % 12
      const ringInner = !hour12 && Math.hypot(x, y) < (OUTER + INNER) / 2
      // Outer ring 12, 1…11; inner 00, 13…23 (Compose's 24-hour dial); a 12-hour clock keeps its half of the day
      const next = hour12 ? (slot % 12) + (pm ? 12 : 0) : ringInner ? (slot === 0 ? 0 : slot + 12) : slot === 0 ? 12 : slot
      if (next !== hours) onChange(next, minutes)
      if (done) setPart("minutes")
    } else {
      const next = Math.round(degrees / 6) % 60
      if (next !== minutes) onChange(hours, next)
    }
  }
  const numbers =
    part === "minutes"
      ? Array.from({ length: 12 }, (_, slot) => ({ label: pad2(slot * 5), slot, ring: OUTER, value: slot * 5 }))
      : [
          ...Array.from({ length: 12 }, (_, slot) => ({ label: String(slot === 0 ? 12 : slot), slot, ring: OUTER, value: slot === 0 ? 12 : slot })),
          ...(hour12 ? [] : Array.from({ length: 12 }, (_, slot) => ({ label: slot === 0 ? "00" : String(slot + 12), slot, ring: INNER, value: slot === 0 ? 0 : slot + 12 }))),
        ]
  const chosenValue = part === "hours" ? (hour12 ? shownHour : hours) : minutes
  const box = (which: "hours" | "minutes") => {
    const active = part === which
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${which === "hours" ? hoursLabel : minutesLabel}, ${which === "hours" ? shownHour : pad2(minutes)}`}
        accessibilityState={{ selected: active }}
        onPress={() => setPart(which)}
        testID={testID ? `${testID}-${which}` : undefined}
        style={[styles.box, { backgroundColor: active ? m.primaryContainer : m.surfaceContainerHighest }]}
      >
        <Text color={active ? m.onPrimaryContainer : m.onSurface} style={styles.boxText} tabularNums>
          {which === "hours" ? (hour12 ? String(shownHour) : pad2(hours)) : pad2(minutes)}
        </Text>
      </Pressable>
    )
  }
  const period = (afternoon: boolean) => {
    const active = pm === afternoon
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (active) return
          onChange(afternoon ? hours + 12 : hours - 12, minutes)
        }}
        style={[styles.period, active ? { backgroundColor: m.tertiaryContainer } : null]}
      >
        <Text color={active ? m.onTertiaryContainer : m.onSurfaceVariant} style={[styles.periodText, theme.font("medium")]}>
          {afternoon ? pmLabel : am}
        </Text>
      </Pressable>
    )
  }
  return (
    <View style={styles.root} testID={testID}>
      <Text color={m.onSurfaceVariant} style={[styles.title, theme.font("medium")]}>
        {title}
      </Text>
      <View style={styles.display}>
        {box("hours")}
        <Text color={m.onSurface} style={styles.colon}>
          :
        </Text>
        {box("minutes")}
        {hour12 ? (
          <View style={[styles.periods, { borderColor: m.outline }]}>
            {period(false)}
            <View style={{ height: 1, backgroundColor: m.outline }} />
            {period(true)}
          </View>
        ) : null}
      </View>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={part === "hours" ? hoursLabel : minutesLabel}
        accessibilityValue={{ text: part === "hours" ? String(shownHour) : pad2(minutes) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const up = event.nativeEvent.actionName === "increment" ? 1 : -1
          if (part === "hours") onChange((hours + up + 24) % 24, minutes)
          else onChange(hours, (minutes + up + 60) % 60)
        }}
        // The web's keyboard: the arrows step the hour or the minute, Enter moves on to the minutes
        {...((Platform.OS === "web"
          ? {
              tabIndex: 0,
              onKeyDown: (event: { key: string; preventDefault: () => void }) => {
                const up = event.key === "ArrowUp" || event.key === "ArrowRight" ? 1 : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -1 : 0
                if (event.key === "Enter" && part === "hours") setPart("minutes")
                else if (!up) return
                else if (part === "hours") onChange((hours + up + 24) % 24, minutes)
                else onChange(hours, (minutes + up + 60) % 60)
                event.preventDefault()
              },
            }
          : null) as object)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          dragging.current = true
          pick(event, false)
        }}
        onResponderMove={(event) => pick(event, false)}
        onResponderRelease={(event) => {
          dragging.current = false
          pick(event, true)
        }}
        testID={testID ? `${testID}-dial` : undefined}
        style={[styles.dial, { backgroundColor: m.surfaceContainerHighest }]}
      >
        <Svg width={DIAL} height={DIAL} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line x1={center} y1={center} x2={knob.x} y2={knob.y} stroke={m.primary} strokeWidth={2} />
          <Circle cx={center} cy={center} r={4} fill={m.primary} />
          <Circle cx={knob.x} cy={knob.y} r={KNOB / 2} fill={m.primary} />
        </Svg>
        {numbers.map(({ label, slot, ring, value }) => {
          const x = center + ring * Math.sin((slot * 30 * Math.PI) / 180)
          const y = center - ring * Math.cos((slot * 30 * Math.PI) / 180)
          const chosen = value === chosenValue && ring === radius
          return (
            <View key={`${ring}-${slot}`} pointerEvents="none" style={[styles.number, { left: x - KNOB / 2, top: y - KNOB / 2 }]}>
              <Text color={chosen ? m.onPrimary : m.onSurface} style={ring === INNER ? styles.innerText : styles.numberText}>
                {label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingTop: 24, alignItems: "center" },
  title: { alignSelf: "flex-start", fontSize: 12, lineHeight: 16, letterSpacing: 0.5, marginBottom: 20 },
  display: { flexDirection: "row", alignItems: "center", height: 80 },
  box: { width: 96, height: 80, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  boxText: { fontSize: 57, lineHeight: 64 },
  colon: { width: 24, textAlign: "center", fontSize: 57, lineHeight: 64 },
  periods: { width: 52, height: 80, marginStart: 12, borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  period: { flex: 1, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  dial: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, marginTop: 36 },
  number: { position: "absolute", width: KNOB, height: KNOB, alignItems: "center", justifyContent: "center" },
  numberText: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  innerText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
})
