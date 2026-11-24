import { useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { RowEndContext, RowHoldContext, rowHold } from "../../internal/row"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { PickerDialog } from "../Dialog/Dialog"
import { MaterialCalendarToday, MaterialSchedule } from "../Icon/material"
import { FieldOutline, fieldLook } from "../Input/Input"
import { Popover } from "../Popover/Popover"
import { Text } from "../Text/Text"
import { Calendar, IOS_CALENDAR_INSET } from "./Calendar"
import {
  clampDate,
  dateOrder,
  formatDate,
  formatHeadline,
  formatTime,
  formatWheelDay,
  localeHour12,
  localeWeekStart,
  monthNames,
  pad2,
  sameDay,
  periodLabels,
  startOfDay,
  timeOutside,
  withDay,
  withTime,
} from "./dates"
import { TimeDial } from "./TimeDial"
import { Wheels, type WheelColumn } from "./Wheel"

export type DatePickerMode = "date" | "time" | "datetime"
export type DatePickerDisplay = "compact" | "inline" | "wheels"

export type DatePickerProps = {
  /** The date and time chosen, `null` for none yet. */
  value: Date | null
  /** Called with the new date (its time kept when only the day changes, its day when only the time does). */
  onChange: (value: Date) => void
  /** What is chosen: a day, a time, or both. @default "date" */
  mode?: DatePickerMode
  /**
   * How it is drawn. `compact`: the value in a capsule on iOS that opens the calendar (or the time's wheels) in a
   * popover, Android's field or row value that opens Material's date (or time) dialog. `inline`: the month's calendar
   * in place. `wheels`: the wheels of iOS, Android's spinners. @default "compact"
   */
  display?: DatePickerDisplay
  /** The earliest date that can be chosen. */
  min?: Date
  /** The latest date that can be chosen. */
  max?: Date
  /** The locale of the names and the formats. @default the device's */
  locale?: string
  /** The first day of the week, 0 Sunday to 6 Saturday. @default the locale's */
  weekStartsOn?: number
  /** A 12-hour clock with AM and PM. @default the locale's */
  hour12?: boolean
  /** Shown while there is no value. @default "Select date" / "Select time" */
  placeholder?: string
  disabled?: boolean
  /** The picker's name for a screen reader (a row's label). */
  "aria-label"?: string
  /** Android: the header of the date dialog. @default "Select date" */
  dateTitle?: string
  /** Android: the header of the time dialog. @default "Select time" */
  timeTitle?: string
  /** @default "Cancel" */
  cancelLabel?: string
  /** @default "OK" */
  okLabel?: string
  /** The label of the time row under an inline calendar (`mode="datetime"`). @default "Time" */
  timeLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

type Shared = {
  value: Date | null
  set: (next: Date) => void
  min?: Date
  max?: Date
  locale?: string
  weekStartsOn: number
  hour12: boolean
  disabled: boolean
  ariaLabel?: string
  placeholder: { date: string; time: string }
  dateTitle: string
  timeTitle: string
  cancelLabel: string
  okLabel: string
  testID?: string
  /** One of the parts' pickers is open (or just closed): a press that reaches the row from inside it opens no other. */
  busy: { current: boolean }
}

/**
 * A date and time picker. On iOS UIDatePicker of iOS 27.2: `compact`, the date and the time in two capsules 8 apart
 * (34 tall, 12 in, the secondary soft fill, the text in the accent while open) that open the month's calendar and the
 * time's wheels in the glass popover, at most 32 from the screen's edge; `inline`, the calendar in place (a Time row
 * under it for both); `wheels`, the wheels. On Android Material 3's pickers: the value as a row's value in the accent
 * (or an outlined field with its icon) that opens the date picker dialog (the headline date over the month) or the
 * time picker dial, both applied with OK; `inline` the calendar in place, `wheels` Android's spinners. The value is a
 * plain `Date`; `min` and `max` bound it.
 */
export function DatePicker({
  value,
  onChange,
  mode = "date",
  display = "compact",
  min,
  max,
  locale,
  weekStartsOn,
  hour12,
  placeholder,
  disabled = false,
  "aria-label": ariaLabel,
  dateTitle = "Select date",
  timeTitle = "Select time",
  cancelLabel = "Cancel",
  okLabel = "OK",
  timeLabel = "Time",
  testID,
  style,
}: DatePickerProps) {
  const theme = useTheme()
  const busy = useRef(false)
  const shared: Shared = {
    busy,
    value,
    set: (next) => onChange(clampDate(next, min, max)),
    min,
    max,
    locale,
    weekStartsOn: weekStartsOn ?? localeWeekStart(locale),
    hour12: hour12 ?? localeHour12(locale),
    disabled,
    ariaLabel,
    placeholder: { date: placeholder ?? "Select date", time: placeholder ?? "Select time" },
    dateTitle,
    timeTitle,
    cancelLabel,
    okLabel,
    testID,
  }
  if (display === "wheels" || (display === "inline" && mode === "time")) {
    return (
      <View style={style} pointerEvents={disabled ? "none" : "auto"}>
        <View style={{ opacity: disabled ? 0.4 : 1 }}>
          <Wheels columns={wheelColumns(shared, mode)} height={theme.isAndroid ? undefined : 216} bandInset={8} disabled={disabled} testID={testID} />
        </View>
      </View>
    )
  }
  if (display === "inline") return <InlinePicker shared={shared} mode={mode} timeLabel={timeLabel} style={style} />
  return <Compact shared={shared} mode={mode} style={style} />
}
DatePicker.displayName = "DatePicker"

/** The compact parts, at a row's end: they take the room after the label (two capsules pass its 60%), set at its end. */
function Compact({ shared, mode, style }: { shared: Shared; mode: DatePickerMode; style?: StyleProp<ViewStyle> }) {
  const row = useContext(RowEndContext)
  const fill = row?.fill
  useEffect(() => {
    if (!fill) return
    fill(true)
    return () => fill(false)
  }, [fill])
  return (
    <View style={[styles.parts, row ? styles.atEnd : null, style]} testID={shared.testID}>
      {mode !== "time" ? <Part shared={shared} kind="date" first /> : null}
      {mode !== "date" ? <Part shared={shared} kind="time" first={mode === "time"} /> : null}
    </View>
  )
}

/**
 * The wheels, as UIDatePicker's `.wheels` (iOS 27.2, en_US, 402pt): a date's month, day and year in the locale's order,
 * their centres 104 and 77.5 apart (the month 157 wide, the day 50, the year 105); a time's hour and minute 63.5 apart,
 * AM / PM from 49 after the minute's centre; with both, one column of days ("Wed Nov 25", "Today") before the time.
 */
function wheelColumns(shared: Shared, mode: DatePickerMode): WheelColumn[] {
  const { value, set, min, max, locale } = shared
  const base = value ?? clampDate(new Date(), min, max)
  const columns: WheelColumn[] = []
  if (mode === "datetime") columns.push(dayColumn(shared, base))
  else if (mode === "date") {
    const names = monthNames(locale)
    // The years stand still around today (not the value), so turning the wheel never moves its rows
    const thisYear = new Date().getFullYear()
    const yearFrom = Math.min(min?.getFullYear() ?? thisYear - 100, base.getFullYear())
    const yearTo = Math.max(max?.getFullYear() ?? thisYear + 50, base.getFullYear())
    const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
    // A day that would fall out of the month (31 into February) is the month's last
    const on = (year: number, month: number, day: number) => {
      const last = new Date(year, month + 1, 0).getDate()
      return new Date(year, month, Math.min(day, last), base.getHours(), base.getMinutes())
    }
    const dayOut = (date: Date) => (min != null && startOfDay(date) < startOfDay(min)) || (max != null && startOfDay(date) > startOfDay(max))
    const byPart = {
      month: {
        key: "month",
        label: "Month",
        width: 157,
        items: names.map((label, month) => ({
          label,
          disabled: (min != null && new Date(base.getFullYear(), month + 1, 0) < startOfDay(min)) || (max != null && new Date(base.getFullYear(), month, 1) > startOfDay(max)),
        })),
        index: base.getMonth(),
        onChange: (month: number) => set(on(base.getFullYear(), month, base.getDate())),
      },
      day: {
        key: "day",
        label: "Day",
        width: 50,
        items: Array.from({ length: days }, (_, index) => ({ label: String(index + 1), disabled: dayOut(on(base.getFullYear(), base.getMonth(), index + 1)) })),
        index: base.getDate() - 1,
        onChange: (index: number) => set(on(base.getFullYear(), base.getMonth(), index + 1)),
      },
      year: {
        key: "year",
        label: "Year",
        width: 105,
        items: Array.from({ length: yearTo - yearFrom + 1 }, (_, index) => ({ label: String(yearFrom + index) })),
        index: base.getFullYear() - yearFrom,
        onChange: (index: number) => set(on(yearFrom + index, base.getMonth(), base.getDate())),
      },
    }
    for (const part of dateOrder(locale)) columns.push(byPart[part])
  }
  if (mode !== "date") columns.push(...timeColumns(shared, base, set))
  return columns
}

/** The days of a date-and-time wheel: a year each side of today (or `min` to `max`), "Today" for today. */
function dayColumn(shared: Shared, base: Date): WheelColumn {
  const { min, max, locale, set } = shared
  const today = startOfDay(new Date())
  const from = min ? startOfDay(min) : new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
  const to = max ? startOfDay(max) : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  const first = startOfDay(base) < from ? startOfDay(base) : from
  const last = startOfDay(base) > to ? startOfDay(base) : to
  const days: Date[] = []
  for (let day = first; day <= last; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) days.push(day)
  return {
    key: "day",
    label: "Day",
    width: 130,
    align: "end",
    items: days.map((day) => ({ label: sameDay(day, today) ? "Today" : formatWheelDay(day, locale) })),
    index: Math.max(0, days.findIndex((day) => sameDay(day, base))),
    onChange: (index) => set(withDay(base, days[index])),
  }
}

function timeColumns(shared: Shared, base: Date, set: (next: Date) => void): WheelColumn[] {
  const { min, max, locale, hour12 } = shared
  const hours = base.getHours()
  const minutes = base.getMinutes()
  // An hour can be chosen when any of its minutes lies in range
  const hourOut = (hour: number) => (min != null && withTime(base, hour, 59) < min) || (max != null && withTime(base, hour, 0) > max)
  const columns: WheelColumn[] = [
    hour12
      ? {
          key: "hours",
          label: "Hours",
          width: 64,
          items: Array.from({ length: 12 }, (_, index) => ({ label: String(index === 0 ? 12 : index), disabled: hourOut(index + (hours >= 12 ? 12 : 0)) })),
          index: hours % 12,
          onChange: (index) => set(withTime(base, index + (hours >= 12 ? 12 : 0), minutes)),
        }
      : {
          key: "hours",
          label: "Hours",
          width: 64,
          items: Array.from({ length: 24 }, (_, hour) => ({ label: pad2(hour), disabled: hourOut(hour) })),
          index: hours,
          onChange: (hour) => set(withTime(base, hour, minutes)),
        },
    {
      key: "minutes",
      label: "Minutes",
      width: 64,
      items: Array.from({ length: 60 }, (_, minute) => ({ label: pad2(minute), disabled: timeOutside(withTime(base, hours, minute), min, max) })),
      index: minutes,
      onChange: (minute) => set(withTime(base, hours, minute)),
    },
  ]
  if (hour12) {
    const [am, pm] = periodLabels(locale)
    // AM / PM from 49 after the minutes' centre: 17 into its column
    columns.push({
      key: "period",
      label: "AM/PM",
      width: 64,
      align: "start",
      inset: 17,
      items: [
        { label: am, disabled: hourOut(hours % 12) && [...Array(12).keys()].every((hour) => hourOut(hour)) },
        { label: pm, disabled: [...Array(12).keys()].every((hour) => hourOut(hour + 12)) },
      ],
      index: hours >= 12 ? 1 : 0,
      onChange: (index) => set(withTime(base, (hours % 12) + (index ? 12 : 0), minutes)),
    })
  }
  return columns
}

/** One part of a compact picker: the date or the time. */
function Part({ shared, kind, first }: { shared: Shared; kind: "date" | "time"; first: boolean }) {
  const theme = useTheme()
  const row = useContext(RowEndContext)
  const hold = useContext(RowHoldContext)
  const [open, setOwnOpen] = useState(false)
  // Presses inside a picker's dialog or popover reach the row in React's tree: while one is open, and for the press
  // that closes it, the row opens nothing
  const setOpen = (next: boolean) => {
    if (next) {
      if (shared.busy.current) return
      shared.busy.current = true
    } else setTimeout(() => (shared.busy.current = false), 0)
    setOwnOpen(next)
  }
  const screen = useWindowDimensions().width
  const { value, disabled, locale, hour12, ariaLabel, testID } = shared
  if (disabled && open) {
    shared.busy.current = false
    setOwnOpen(false)
  }
  const text = value == null ? null : kind === "date" ? formatDate(value, locale) : formatTime(value, locale, hour12)
  const shown = text ?? shared.placeholder[kind]
  const partID = testID ? `${testID}-${kind}` : undefined
  const a11y = {
    accessibilityRole: "button" as const,
    accessibilityLabel: [ariaLabel, shown].filter(Boolean).join(", "),
    accessibilityState: { disabled, expanded: open },
  }
  if (theme.isAndroid) {
    return <AndroidPart shared={shared} kind={kind} first={first} open={open} setOpen={setOpen} shown={shown} filled={text != null} a11y={a11y} partID={partID} />
  }
  // iOS: the capsule, and the popover it opens
  const calendarWidth = 7 * 44 + 2 * IOS_CALENDAR_INSET
  // At most 32 from the screen's edge, as the compact picker's popover stands (less on a narrow screen)
  const edge = Math.max(8, Math.min(32, (screen - calendarWidth) / 2))
  // The popover's wheels: a 24-hour time 75 apart (iOS 27.2's compact time popover), a 12-hour one as the wheels
  const columns = kind === "time" ? timeColumns(shared, value ?? clampDate(new Date(), shared.min, shared.max), shared.set).map((column) => (hour12 ? column : { ...column, width: 75 })) : []
  const wheelsWidth = Math.max(233, 40 + columns.reduce((sum, column) => sum + column.width, 0))
  return (
    <Popover open={open} onOpenChange={(next) => setOpen(next && !disabled)}>
      <Popover.Trigger>
        <Pressable
          {...a11y}
          disabled={disabled}
          {...rowHold(hold)}
          testID={partID}
          style={({ pressed }) => [
            styles.capsule,
            disabled
              ? null
              : { backgroundColor: theme.color("--color-background-secondary-soft-alpha", withAlpha(theme.colors.text, 0.07)), opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text
            numberOfLines={1}
            color={disabled || text == null ? theme.colors.labelTertiary : open ? theme.colors.textAccent : theme.colors.text}
            style={styles.capsuleText}
            tabularNums={kind === "time"}
          >
            {shown}
          </Text>
        </Pressable>
      </Popover.Trigger>
      <Popover.Content
        width={kind === "date" ? calendarWidth : wheelsWidth}
        minWidth="auto"
        align={row ? "end" : "center"}
        alignOffset={0}
        collisionPadding={{ left: edge, right: edge, top: 20, bottom: 20 }}
        aria-label={kind === "date" ? shared.dateTitle : shared.timeTitle}
        testID={partID ? `${partID}-popover` : undefined}
        style={kind === "date" ? { padding: IOS_CALENDAR_INSET } : { padding: 0 }}
      >
        {kind === "date" ? (
          <Calendar
            value={value}
            onSelect={(day) => {
              shared.set(withDay(value, day))
              setOpen(false)
            }}
            min={shared.min}
            max={shared.max}
            locale={locale}
            weekStartsOn={shared.weekStartsOn}
            width={7 * 44}
            testID={partID ? `${partID}-calendar` : undefined}
          />
        ) : (
          <Wheels columns={columns} testID={partID ? `${partID}-wheels` : undefined} />
        )}
      </Popover.Content>
    </Popover>
  )
}

type AndroidPartProps = {
  shared: Shared
  kind: "date" | "time"
  first: boolean
  open: boolean
  setOpen: (open: boolean) => void
  shown: string
  filled: boolean
  a11y: Record<string, unknown>
  partID?: string
}

/** Android: a row's value in the accent, or an outlined field with its icon; either opens Material's dialog. */
function AndroidPart({ shared, kind, first, open, setOpen, shown, filled, a11y, partID }: AndroidPartProps) {
  const theme = useTheme()
  const m = theme.material
  const row = useContext(RowEndContext)
  const hold = useContext(RowHoldContext)
  const { disabled } = shared
  // In a row the first part takes the row's press, as an Android value row opens its picker from anywhere on it
  const handRow = row != null && first && !disabled ? row.press : undefined
  useEffect(() => {
    if (!handRow) return
    handRow(() => setOpen(true))
    return () => handRow(null)
  }, [handRow, setOpen])
  const look = fieldLook(theme, { variant: "outline", size: "md", pill: false }, { focused: open, filled, disabled, invalid: false })
  const Icon = kind === "date" ? MaterialCalendarToday : MaterialSchedule
  return (
    <>
      {row != null ? (
        <Pressable {...a11y} disabled={disabled} {...rowHold(hold)} onPress={() => setOpen(true)} hitSlop={ROW_SLOP} testID={partID}>
          <Text numberOfLines={1} color={withAlpha(filled ? m.primary : withAlpha(m.onSurface, 0.35), disabled ? 0.5 : 1)} style={styles.androidValue} tabularNums={kind === "time"}>
            {shown}
          </Text>
        </Pressable>
      ) : (
        <Pressable {...a11y} disabled={disabled} onPress={() => setOpen(true)} testID={partID} style={[styles.field, look.box, { gap: look.gap, paddingEnd: 12 }]}>
          <FieldOutline frame={look.frame} />
          <Text numberOfLines={1} color={filled ? look.text.color : look.placeholder} style={[styles.grow, { fontSize: look.text.fontSize, lineHeight: look.text.lineHeight }]}>
            {shown}
          </Text>
          <Icon size={24} color={look.trailingIcon} />
        </Pressable>
      )}
      {kind === "date" ? <AndroidDateDialog shared={shared} open={open} onClose={() => setOpen(false)} partID={partID} /> : <AndroidTimeDialog shared={shared} open={open} onClose={() => setOpen(false)} partID={partID} />}
    </>
  )
}

/** Material 3's date picker dialog: "Select date", the headline date, a line, then the month; OK applies the day. */
function AndroidDateDialog({ shared, open, onClose, partID }: { shared: Shared; open: boolean; onClose: () => void; partID?: string }) {
  const theme = useTheme()
  const m = theme.material
  const { value, locale } = shared
  const [draft, setDraft] = useState<Date | null>(value)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setDraft(value)
  }
  const width = Math.min(useWindowDimensions().width - 48, 356)
  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      onOk={() => {
        if (draft) shared.set(withDay(value, draft))
      }}
      cancelLabel={shared.cancelLabel}
      okLabel={shared.okLabel}
      label={shared.dateTitle}
      testID={partID ? `${partID}-dialog` : undefined}
    >
      <View style={styles.androidHeader}>
        <Text color={m.onSurfaceVariant} style={[styles.androidSupporting, theme.font("medium")]}>
          {shared.dateTitle}
        </Text>
        <Text color={m.onSurfaceVariant} style={styles.androidHeadline} accessibilityLiveRegion="polite">
          {draft ? formatHeadline(draft, locale) : shared.placeholder.date}
        </Text>
      </View>
      <View style={{ height: 1, backgroundColor: m.outlineVariant }} />
      <View style={styles.androidCalendar}>
        <Calendar
          value={draft}
          onSelect={setDraft}
          min={shared.min}
          max={shared.max}
          locale={locale}
          weekStartsOn={shared.weekStartsOn}
          width={width - 24}
          testID={partID ? `${partID}-calendar` : undefined}
        />
      </View>
    </PickerDialog>
  )
}

/** Material 3's time picker dialog: the dial; OK applies the time. */
function AndroidTimeDialog({ shared, open, onClose, partID }: { shared: Shared; open: boolean; onClose: () => void; partID?: string }) {
  const { value } = shared
  const now = value ?? new Date()
  const [draft, setDraft] = useState({ hours: now.getHours(), minutes: now.getMinutes() })
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setDraft({ hours: now.getHours(), minutes: now.getMinutes() })
  }
  return (
    <PickerDialog
      open={open}
      onClose={onClose}
      onOk={() => shared.set(withTime(value, draft.hours, draft.minutes))}
      cancelLabel={shared.cancelLabel}
      okLabel={shared.okLabel}
      label={shared.timeTitle}
      testID={partID ? `${partID}-dialog` : undefined}
    >
      <TimeDial
        hours={draft.hours}
        minutes={draft.minutes}
        onChange={(hours, minutes) => setDraft({ hours, minutes })}
        hour12={shared.hour12}
        locale={shared.locale}
        title={shared.timeTitle}
        testID={partID ? `${partID}-dial` : undefined}
      />
    </PickerDialog>
  )
}

/** The calendar in place; with the time, a Time row under it whose value opens the time's picker. */
function InlinePicker({ shared, mode, timeLabel, style }: { shared: Shared; mode: DatePickerMode; timeLabel: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const { value, testID } = shared
  const android = theme.isAndroid
  const timeRow: ReactNode =
    mode === "datetime" ? (
      // iOS 27.2's inline picker with the time (dates-uikit-inline-time): no line over the row, its centre 51 under the
      // last week's, the capsule 11 above the card's edge, the label Semibold; Android a row under a line
      <View style={[styles.timeRow, android ? [styles.androidTimeRow, { borderTopColor: theme.material.outlineVariant }] : styles.iosTimeRow]}>
        <Text style={android ? styles.androidRowLabel : [styles.rowLabel, theme.font("semibold")]} color={android ? theme.material.onSurface : theme.colors.text}>
          {timeLabel}
        </Text>
        <RowEndContext.Provider value={{ fill: () => {} }}>
          <Part shared={{ ...shared, ariaLabel: timeLabel }} kind="time" first={false} />
        </RowEndContext.Provider>
      </View>
    ) : null
  return (
    <View
      style={[styles.inline, android ? null : styles.iosInline, mode === "datetime" && !android ? { paddingBottom: 8 } : null, style, { opacity: shared.disabled ? 0.4 : 1 }]}
      pointerEvents={shared.disabled ? "none" : "auto"}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID={testID}
    >
      {width > 0 ? (
        <View style={android ? null : { paddingHorizontal: IOS_CALENDAR_INSET }}>
          <Calendar
            value={value}
            onSelect={(day) => shared.set(withDay(value, day))}
            disabled={shared.disabled}
            min={shared.min}
            max={shared.max}
            locale={shared.locale}
            weekStartsOn={shared.weekStartsOn}
            width={android ? width : width - 2 * IOS_CALENDAR_INSET}
            testID={testID ? `${testID}-calendar` : undefined}
          />
        </View>
      ) : null}
      {timeRow}
    </View>
  )
}

const ROW_SLOP = { top: 15, bottom: 15, left: 8, right: 8 }

const styles = StyleSheet.create({
  parts: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  atEnd: { flexGrow: 1, justifyContent: "flex-end" },
  capsule: { height: 34, borderRadius: 17, paddingHorizontal: 12, justifyContent: "center" },
  capsuleText: { fontSize: 17, lineHeight: 22 },
  androidValue: { fontSize: 16, lineHeight: 20 },
  field: { flexDirection: "row", alignItems: "center", flexGrow: 1, minWidth: 140 },
  grow: { flex: 1, minWidth: 0 },
  androidHeader: { paddingStart: 24, paddingEnd: 12, paddingTop: 16, paddingBottom: 12 },
  androidSupporting: { fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  androidHeadline: { fontSize: 32, lineHeight: 40, marginTop: 36 },
  androidCalendar: { paddingHorizontal: 12, paddingBottom: 8 },
  inline: { alignSelf: "stretch" },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  iosTimeRow: { minHeight: 40, marginTop: 9 },
  androidTimeRow: { minHeight: 52, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  // As iOS 27.2's inline picker in a cell: the month's title centred 34 under the top, the last week (or the Time row's
  // capsule) 11 above the bottom
  iosInline: { paddingTop: 12, paddingBottom: 11 },
  rowLabel: { fontSize: 17, lineHeight: 22 },
  androidRowLabel: { fontSize: 16, lineHeight: 24 },
})
