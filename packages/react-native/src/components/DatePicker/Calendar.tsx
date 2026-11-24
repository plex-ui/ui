import { useMemo, useState } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { Pressable } from "../../internal/Pressable"
import ChevronLeftLg from "../../icons/plex/ChevronLeftLg"
import ChevronRightLg from "../../icons/plex/ChevronRightLg"
import { isRTL } from "../../internal/direction"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { MaterialChevronLeft, MaterialChevronRight } from "../Icon/material"
import { Text } from "../Text/Text"
import { dayOutside, formatFullDay, formatMonth, monthOf, monthWeeks, sameDay, weekdayLabels } from "./dates"

export type CalendarProps = {
  /** The chosen day. */
  value: Date | null
  /** Called with the day a person taps (its time is midnight). */
  onSelect: (day: Date) => void
  min?: Date
  max?: Date
  locale?: string
  weekStartsOn: number
  /** The calendar's width: seven columns across it (44 at the least on iOS). */
  width: number
  /** Takes no presses (an inline calendar of a disabled picker). */
  disabled?: boolean
  /** Labels of the month arrows, read by a screen reader. */
  previousLabel?: string
  nextLabel?: string
  testID?: string
}

/** iOS: the corner's inset around the grid of a compact picker's calendar (the web's `--calendar-inner-padding`). */
export const IOS_CALENDAR_INSET = 10

/**
 * The month grid of DatePicker. On iOS the phone calendar of @plexui/ui (Calendar.module.css under 768px): the month's
 * title Semibold 17 at the row's text inset, the two arrows as 44 targets at the end, the weekdays Semibold 13 in
 * capitals in the tertiary label, the days Regular 17 in 44 cells side by side and row on row, the chosen day white on
 * a 44 circle of the text's color, today a 4 dot under its digits, days out of range at 40%. On Android Material 3's
 * date picker: the month at the start in Medium 14 with the arrows at the end, the weekdays' letters, the days in 40dp
 * circles, the chosen one filled with the primary color and today ringed in it.
 */
export function Calendar({ value, onSelect, min, max, locale, weekStartsOn, width, disabled: off = false, previousLabel = "Previous month", nextLabel = "Next month", testID }: CalendarProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const [month, setMonth] = useState(() => monthOf(value ?? new Date()))
  // The value moved to another month from outside (a wheel, a reset): the calendar turns to it
  const [shownFor, setShownFor] = useState(value?.getTime() ?? null)
  if ((value?.getTime() ?? null) !== shownFor) {
    setShownFor(value?.getTime() ?? null)
    if (value != null && monthOf(value).getTime() !== month.getTime()) setMonth(monthOf(value))
  }
  const weeks = useMemo(() => monthWeeks(month, weekStartsOn), [month, weekStartsOn])
  const labels = useMemo(() => weekdayLabels(locale, weekStartsOn, android ? "narrow" : "short"), [locale, weekStartsOn, android])
  const today = new Date()
  // The arrows stop at the months that hold no day in range
  const canPrevious = min == null || monthOf(month, -1).getTime() >= monthOf(min).getTime()
  const canNext = max == null || monthOf(month, 1).getTime() <= monthOf(max).getTime()
  const rtl = isRTL()
  const cell = android ? Math.min(48, width / 7) : Math.max(44, width / 7)
  const m = theme.material
  const text = android ? m.onSurface : theme.colors.text
  const arrowColor = android ? m.onSurfaceVariant : text
  const arrow = (direction: -1 | 1) => {
    const enabled = !off && (direction < 0 ? canPrevious : canNext)
    // In a right-to-left layout the earlier month is on the right, its arrow pointing right
    const pointsLeft = (direction < 0) !== rtl
    const Icon = android ? (pointsLeft ? MaterialChevronLeft : MaterialChevronRight) : pointsLeft ? ChevronLeftLg : ChevronRightLg
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={direction < 0 ? previousLabel : nextLabel}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={() => setMonth((current) => monthOf(current, direction))}
        testID={testID ? `${testID}-${direction < 0 ? "previous" : "next"}` : undefined}
        style={({ pressed }) => [
          android ? styles.androidArrow : styles.arrow,
          pressed ? { backgroundColor: android ? withAlpha(m.onSurfaceVariant, 0.1) : theme.color("--button-background-color-active", withAlpha(text, 0.1)) } : null,
          { opacity: enabled ? 1 : android ? 0.38 : 0.4 },
        ]}
      >
        <Icon size={24} color={arrowColor} />
      </Pressable>
    )
  }
  return (
    <View style={{ width }} testID={testID}>
      <View style={[styles.header, android ? styles.androidHeader : { height: 44 }]}>
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          numberOfLines={1}
          color={android ? m.onSurfaceVariant : text}
          style={[
            styles.title,
            android
              ? [styles.androidTitle, theme.font("medium")]
              : [{ fontSize: 17, lineHeight: 22, paddingStart: Math.max(0, theme.length("--field-row-padding-inline", 16) - IOS_CALENDAR_INSET) }, theme.font("semibold")],
          ]}
        >
          {formatMonth(month, locale)}
        </Text>
        {arrow(-1)}
        {arrow(1)}
      </View>
      <View style={[styles.week, android ? { height: 48 } : styles.weekdays, android ? null : { marginBottom: 3 }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {labels.map(({ label, name }) => (
          <Text
            key={name}
            color={android ? m.onSurface : theme.colors.labelTertiary}
            style={[
              { width: cell, textAlign: "center" },
              android ? styles.androidWeekday : [styles.weekday, theme.font("semibold")],
            ]}
          >
            {android ? label : label.toUpperCase()}
          </Text>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, column) =>
            day == null ? (
              <View key={column} style={{ width: cell, height: android ? 48 : 44 }} />
            ) : (
              <Day
                key={column}
                day={day}
                cell={cell}
                chosen={sameDay(day, value)}
                isToday={sameDay(day, today)}
                disabled={dayOutside(day, min, max)}
                locked={off}
                locale={locale}
                onSelect={onSelect}
                testID={testID ? `${testID}-day-${day.getDate()}` : undefined}
              />
            ),
          )}
        </View>
      ))}
    </View>
  )
}

type DayProps = {
  locked?: boolean
  day: Date
  cell: number
  chosen: boolean
  isToday: boolean
  disabled: boolean
  locale?: string
  onSelect: (day: Date) => void
  testID?: string
}

function Day({ day, cell, chosen, isToday, disabled, locked, locale, onSelect, testID }: DayProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const m = theme.material
  const ink = theme.colors.text
  const size = android ? 40 : 44
  const digitColor = android
    ? chosen
      ? m.onPrimary
      : disabled
        ? withAlpha(m.onSurface, 0.38)
        : isToday
          ? m.primary
          : m.onSurface
    : chosen
      ? theme.colors.textInverse
      : ink
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatFullDay(day, locale)}
      accessibilityState={{ selected: chosen, disabled: disabled || locked }}
      disabled={disabled || locked}
      onPress={() => onSelect(day)}
      testID={testID}
      style={[styles.cell, { width: cell, height: android ? 48 : 44 }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.circle,
            { width: size, height: size, borderRadius: size / 2 },
            chosen
              ? { backgroundColor: android ? m.primary : ink }
              : android
                ? [isToday ? { borderWidth: 1, borderColor: m.primary } : null, pressed ? { backgroundColor: withAlpha(m.onSurface, 0.1) } : null]
                : // iOS: the web's hover ring, shown while the finger is on the day
                  pressed
                  ? { borderWidth: 1, borderColor: ink }
                  : null,
            !android && disabled ? { opacity: 0.4 } : null,
          ]}
        >
          <Text color={digitColor} style={android ? styles.androidDigit : styles.digit}>
            {day.getDate()}
          </Text>
          {isToday && !android ? <View style={[styles.dot, { backgroundColor: chosen ? theme.colors.textInverse : ink }]} /> : null}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center" },
  androidHeader: { height: 56, paddingStart: 12, paddingEnd: 0 },
  title: { flex: 1 },
  androidTitle: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  androidArrow: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  weekdays: { height: 20 },
  weekday: { fontSize: 13, lineHeight: 18 },
  androidWeekday: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  cell: { alignItems: "center", justifyContent: "center" },
  circle: { alignItems: "center", justifyContent: "center" },
  digit: { fontSize: 17, lineHeight: 22, ...(Platform.OS === "web" ? ({ userSelect: "none" } as object) : null) },
  androidDigit: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, ...(Platform.OS === "web" ? ({ userSelect: "none" } as object) : null) },
  dot: { position: "absolute", bottom: 8, width: 4, height: 4, borderRadius: 2 },
})
