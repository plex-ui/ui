import { maskitoTransform } from "@maskito/core"
import { maskitoDateOptionsGenerator, maskitoDateTimeOptionsGenerator } from "@maskito/kit"
import { DateTime } from "luxon"
import { describe, expect, test, vi } from "vitest"
import * as reactText from "../../packages/ui/src/lib/dateInputText"
import * as vueText from "../../packages/vue/src/lib/dateInputText"

// DateInput's text and value (lib/dateInputText, one copy per framework, kept identical by lib-sync): made from the
// DateTime's own fields in its own zone, never through the browser's local Date. The zones here are chosen so the
// answers hold whatever zone the machine running the tests is in.

const BERLIN = "Europe/Berlin"
const NEW_YORK = "America/New_York"

const dateFormat = { mode: "dd/mm/yyyy", separator: ".", dateTimeSeparator: ", " } as const
const dateTimeFormat = { ...dateFormat, timeMode: "HH:MM" } as const

/** Runs `run` with the browser's (Node's) local zone set to `zone` */
const inLocalZone = <T>(zone: string, run: () => T): T => {
  const before = process.env.TZ
  process.env.TZ = zone
  try {
    return run()
  } finally {
    if (before === undefined) delete process.env.TZ
    else process.env.TZ = before
  }
}

for (const [framework, { dateInputValueKey, formatDateInput, keepTypedValue, maskDate, parseDateInput }] of [
  ["React", reactText],
  ["Vue", vueText],
] as const) {
  describe(`${framework} DateInput text`, () => {
    test("a value shows its wall clock in its own zone", () => {
      const value = DateTime.fromISO("2024-03-15T14:30:45", { zone: NEW_YORK })
      expect(formatDateInput(value, dateTimeFormat)).toBe("15.03.2024, 14:30")
      expect(formatDateInput(value.setZone("Asia/Tokyo"), dateTimeFormat)).toBe("16.03.2024, 03:30")
    })

    test("on a day the clocks move, the time is the one on the clock", () => {
      // Berlin goes from 02:00 to 03:00 on 30 March 2025 and back from 03:00 to 02:00 on 26 October
      for (const iso of ["2025-03-30T05:00", "2025-03-30T01:30", "2025-10-26T05:00", "2025-10-26T23:15"]) {
        const value = DateTime.fromISO(iso, { zone: BERLIN })
        const [date, time] = iso.split("T")
        const [year, month, day] = date!.split("-")
        expect(formatDateInput(value, dateTimeFormat)).toBe(`${day}.${month}.${year}, ${time}`)
        expect(parseDateInput(`${day}.${month}.${year}, ${time}`, { ...dateTimeFormat, zone: BERLIN })?.toISO()).toBe(value.toISO())
      }
    })

    test("a typed date is made in the value's zone, or Luxon's default zone without one", () => {
      expect(parseDateInput("09.03.2025, 05:00", { ...dateTimeFormat, zone: NEW_YORK })?.toISO()).toBe(
        "2025-03-09T05:00:00.000-04:00",
      )
      // The packages' Luxon is their own copy, so its default zone is the machine's here
      for (const text of ["30.03.2025, 05:00", "09.03.2025, 05:00", "26.10.2025, 05:00"]) {
        const parsed = parseDateInput(text, dateTimeFormat)
        expect(parsed && formatDateInput(parsed, dateTimeFormat)).toBe(text)
        expect(parsed?.zoneName).toBe(DateTime.local().zoneName)
      }
    })

    test("a time the clocks skip moves forward, one they show twice is its first pass; a date that does not exist is null", () => {
      expect(parseDateInput("30.03.2025, 02:30", { ...dateTimeFormat, zone: BERLIN })?.toISO()).toBe(
        "2025-03-30T03:30:00.000+02:00",
      )
      // Whatever the date today: Luxon alone reads it with today's offset
      vi.useFakeTimers({ toFake: ["Date"] })
      try {
        for (const today of ["2025-07-01T12:00:00Z", "2025-12-01T12:00:00Z"]) {
          vi.setSystemTime(new Date(today))
          expect(parseDateInput("26.10.2025, 02:30", { ...dateTimeFormat, zone: BERLIN })?.toISO()).toBe(
            "2025-10-26T02:30:00.000+02:00",
          )
          expect(parseDateInput("02.11.2025, 01:30", { ...dateTimeFormat, zone: NEW_YORK })?.toISO()).toBe(
            "2025-11-02T01:30:00.000-04:00",
          )
          expect(parseDateInput("26.10.2025, 03:30", { ...dateTimeFormat, zone: BERLIN })?.toISO()).toBe(
            "2025-10-26T03:30:00.000+01:00",
          )
          expect(parseDateInput("30.03.2025, 02:30", { ...dateTimeFormat, zone: BERLIN })?.toISO()).toBe(
            "2025-03-30T03:30:00.000+02:00",
          )
        }
      } finally {
        vi.useRealTimers()
      }
      // Juneau moved from Russian to American time in October 1867: that day's 12:30 came twice, a day apart
      expect(parseDateInput("19.10.1867, 12:30", { ...dateTimeFormat, zone: "America/Juneau" })?.toISO()).toBe(
        "1867-10-19T12:30:00.000+15:02",
      )
      expect(parseDateInput("31.02.2025", { ...dateFormat, zone: BERLIN })).toBeNull()
      expect(parseDateInput("00.00.2025", { ...dateFormat, zone: BERLIN })).toBeNull()
      expect(parseDateInput("15.03.2024, 25:00", { ...dateTimeFormat, zone: BERLIN })).toBeNull()
    })

    test("text that is not complete is null", () => {
      expect(parseDateInput("", dateFormat)).toBeNull()
      expect(parseDateInput("15.03.202", dateFormat)).toBeNull()
      expect(parseDateInput("15.03.2024", dateTimeFormat)).toBeNull()
      expect(parseDateInput("15.03.2024, 14:3", dateTimeFormat)).toBeNull()
    })

    test("modes, separators and AM/PM read like Maskito's", () => {
      const zone = BERLIN
      const value = DateTime.fromISO("2024-03-05T14:07:09", { zone })
      const cases: Array<[Record<string, string>, string]> = [
        [{ mode: "mm/dd/yyyy", separator: "/" }, "03/05/2024"],
        [{ mode: "yyyy/mm/dd", separator: "-" }, "2024-03-05"],
        [{ mode: "mm/yy" }, "03.24"],
        [{ mode: "mm/yyyy" }, "03.2024"],
        [{ mode: "yyyy/mm" }, "2024.03"],
        [{ mode: "dd/mm" }, "05.03"],
        [{ mode: "yyyy" }, "2024"],
        [{ timeMode: "HH:MM:SS" }, "05.03.2024, 14:07:09"],
        [{ timeMode: "HH:MM AA" }, "05.03.2024, 02:07 PM"],
        [{ timeMode: "HH:MM AA", dateTimeSeparator: " " }, "05.03.2024 02:07 PM"],
      ]
      for (const [patch, text] of cases) {
        const format = { ...dateFormat, ...patch } as Parameters<typeof formatDateInput>[1]
        expect(formatDateInput(value, format)).toBe(text)
        const parsed = parseDateInput(text, { ...format, zone })
        expect(parsed && formatDateInput(parsed, format)).toBe(text)
      }
      // 12 AM is midnight, 12 PM is noon
      const amPm = { ...dateFormat, timeMode: "HH:MM AA", zone } as const
      expect(parseDateInput("05.03.2024, 12:00 AM", amPm)?.hour).toBe(0)
      expect(parseDateInput("05.03.2024, 12:00 PM", amPm)?.hour).toBe(12)
      // A two-digit year is in the 2000s, a missing one is year 0, a missing day is the 1st
      expect(parseDateInput("03.24", { ...dateFormat, mode: "mm/yy", zone })?.toISODate()).toBe("2024-03-01")
      expect(parseDateInput("05.03", { ...dateFormat, mode: "dd/mm", zone })?.toISODate()).toBe("0000-03-05")
    })

    test("min and max keep the text within the range", () => {
      const zone = BERLIN
      const min = DateTime.fromISO("2024-03-10T09:00", { zone }).toMillis()
      const max = DateTime.fromISO("2024-03-20T18:00", { zone }).toMillis()
      const format = { ...dateTimeFormat, min, max, zone }
      expect(formatDateInput(DateTime.fromISO("2024-03-01T12:00", { zone }), format)).toBe("10.03.2024, 09:00")
      expect(formatDateInput(DateTime.fromISO("2024-04-01T12:00", { zone }), format)).toBe("20.03.2024, 18:00")
      expect(parseDateInput("25.03.2024, 10:00", format)?.toISO()).toBe("2024-03-20T18:00:00.000+01:00")
      expect(parseDateInput("05.03.2024, 10:00", format)?.toISO()).toBe("2024-03-10T09:00:00.000+01:00")
      // A bound is shown in the value's zone
      const inNewYork = DateTime.fromISO("2024-03-01T12:00", { zone: NEW_YORK })
      expect(formatDateInput(inNewYork, format)).toBe("10.03.2024, 04:00")
      // Without a year in the mode a typed date is in year 0: shown as typed, not as Maskito's 0001-01-01
      const noYear = { ...dateFormat, mode: "dd/mm", zone } as const
      const typed = parseDateInput("25.03", noYear)
      expect(typed?.toISODate()).toBe("0000-03-25")
      expect(typed && formatDateInput(typed, noYear)).toBe("25.03")
      // Given min and max still hold for it, as they do in the mask
      expect(typed && formatDateInput(typed, { ...noYear, min, max })).toBe("10.03")
      expect(formatDateInput(DateTime.fromISO("2024-01-01", { zone }), { ...noYear, min, max })).toBe("10.03")
    })

    test("an invalid or missing value shows nothing", () => {
      expect(formatDateInput(null, dateFormat)).toBe("")
      expect(formatDateInput(DateTime.invalid("test"), dateFormat)).toBe("")
      expect(dateInputValueKey(null)).toBe("")
      expect(dateInputValueKey(DateTime.invalid("test"))).toBe("")
    })

    test("the value key changes with the instant and with the zone", () => {
      const value = DateTime.fromISO("2024-03-15T14:30", { zone: BERLIN })
      expect(dateInputValueKey(DateTime.fromISO("2024-03-15T14:30", { zone: BERLIN }))).toBe(dateInputValueKey(value))
      expect(dateInputValueKey(value.plus({ minutes: 1 }))).not.toBe(dateInputValueKey(value))
      expect(dateInputValueKey(value.setZone(NEW_YORK))).not.toBe(dateInputValueKey(value))
    })

    test("the mask's min and max carry the wall clock in the value's zone", () => {
      const millis = DateTime.fromISO("2024-03-10T09:15", { zone: NEW_YORK }).toMillis()
      const date = maskDate(millis, NEW_YORK)
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()]).toEqual([2024, 3, 10, 9, 15])
      const early = maskDate(DateTime.fromObject({ year: 50, month: 6, day: 1 }, { zone: BERLIN }).toMillis(), BERLIN)
      expect(early.getFullYear()).toBe(50)
    })
    test("in the hour the browser's clocks skip, the mask keeps the time typed for a value in another zone", () => {
      const params = { dateMode: "dd/mm/yyyy", timeMode: "HH:MM", dateSeparator: ".", dateTimeSeparator: ", " } as const
      const format = { ...dateTimeFormat, zone: "UTC" }
      inLocalZone(BERLIN, () => {
        // Maskito's own last step goes through the browser's Date: Berlin has no 02:30 on 30 March 2025
        expect(maskitoTransform("30.03.2025, 02:30", maskitoDateTimeOptionsGenerator(params))).toBe("30.03.2025, 03:30")
        const kept = keepTypedValue(maskitoDateTimeOptionsGenerator(params), format)
        expect(maskitoTransform("30.03.2025, 02:30", kept)).toBe("30.03.2025, 02:30")
        // min and max on the value's wall clock: 02:30 UTC, not Berlin's 03:30
        const min = DateTime.fromISO("2025-03-30T02:30", { zone: "UTC" }).toMillis()
        const max = DateTime.fromISO("2025-03-30T20:00", { zone: "UTC" }).toMillis()
        const bounded = keepTypedValue(
          maskitoDateTimeOptionsGenerator({ ...params, min: maskDate(min, "UTC"), max: maskDate(max, "UTC") }),
          { ...format, min, max },
        )
        expect(maskitoTransform("30.03.2025, 03:15", bounded)).toBe("30.03.2025, 03:15")
        expect(maskitoTransform("30.03.2025, 01:00", bounded)).toBe("30.03.2025, 02:30")
        expect(maskitoTransform("30.03.2025, 21:00", bounded)).toBe("30.03.2025, 20:00")
        expect(maskitoTransform("31.03.2025, 10:00", bounded)).toBe("30.03.2025, 20:00")
        // Without a complete time, the date is kept within the dates of min and max
        expect(maskitoTransform("29.03.2025, 1", bounded)).toBe("30.03.2025, 1")
        expect(maskitoTransform("31.03.2025, 1", bounded)).toBe("30.03.2025, 1")
        expect(maskitoTransform("30.03.2025, 1", bounded)).toBe("30.03.2025, 1")
      })
    })

    test("in the hour the clocks repeat, the mask's range compares instants: the typed time is its first pass, or the one in range", () => {
      // Berlin's clocks go from 03:00 summer time back to 02:00 on 26 October 2025: 02:30 comes twice
      const params = { dateMode: "dd/mm/yyyy", timeMode: "HH:MM", dateSeparator: ".", dateTimeSeparator: ", " } as const
      const max = DateTime.fromISO("2025-10-26T02:15+01:00", { setZone: true }).setZone(BERLIN).toMillis()
      const format = { ...dateTimeFormat, zone: BERLIN, max }
      const bounded = keepTypedValue(maskitoDateTimeOptionsGenerator({ ...params, max: maskDate(max, BERLIN) }), format)
      // 02:30 in summer time is before 02:15 in winter time
      expect(maskitoTransform("26.10.2025, 02:30", bounded)).toBe("26.10.2025, 02:30")
      expect(parseDateInput("26.10.2025, 02:30", format)?.toISO()).toBe("2025-10-26T02:30:00.000+02:00")
      // 04:00 is after it: the bound, shown on Berlin's clock, and that text reads back as the bound
      expect(maskitoTransform("26.10.2025, 04:00", bounded)).toBe("26.10.2025, 02:15")
      expect(parseDateInput("26.10.2025, 02:15", format)?.toMillis()).toBe(max)

      // With the same time as min: 02:45 in winter time is after it, 02:00 in either is before it
      const min = max
      const fromMin = { ...dateTimeFormat, zone: BERLIN, min }
      const fromBound = keepTypedValue(maskitoDateTimeOptionsGenerator({ ...params, min: maskDate(min, BERLIN) }), fromMin)
      expect(maskitoTransform("26.10.2025, 02:45", fromBound)).toBe("26.10.2025, 02:45")
      expect(parseDateInput("26.10.2025, 02:45", fromMin)?.toISO()).toBe("2025-10-26T02:45:00.000+01:00")
      expect(maskitoTransform("26.10.2025, 02:00", fromBound)).toBe("26.10.2025, 02:15")
      expect(parseDateInput("26.10.2025, 02:15", fromMin)?.toMillis()).toBe(min)
    })

    test("with AM/PM the mask's range holds once the AM or PM is typed, in 12-hour time", () => {
      const params = { dateMode: "dd/mm/yyyy", timeMode: "HH:MM AA", dateSeparator: ".", dateTimeSeparator: ", " } as const
      const min = DateTime.fromISO("2025-03-10T13:30", { zone: BERLIN }).toMillis()
      const format = { ...dateFormat, timeMode: "HH:MM AA", zone: BERLIN, min } as const
      const bounded = keepTypedValue(maskitoDateTimeOptionsGenerator({ ...params, min: maskDate(min, BERLIN) }), format)
      expect(maskitoTransform("10.03.2025, 02:00 PM", bounded)).toBe("10.03.2025, 02:00\u00A0PM")
      expect(maskitoTransform("10.03.2025, 11:00 AM", bounded)).toBe("10.03.2025, 01:30\u00A0PM")
      // Before the AM or PM, the time is not complete yet (Maskito itself completes an A or a P)
      expect(maskitoTransform("10.03.2025, 11:00", bounded)).toBe("10.03.2025, 11:00")
      expect(maskitoTransform("10.03.2025, 11:00 A", bounded)).toBe("10.03.2025, 01:30\u00A0PM")
    })

    test("a complete text shows as the value reads it: a time the clocks skip moves forward in the mask too", () => {
      const params = { dateMode: "dd/mm/yyyy", timeMode: "HH:MM", dateSeparator: ".", dateTimeSeparator: ", " } as const
      const kept = keepTypedValue(maskitoDateTimeOptionsGenerator(params), { ...dateTimeFormat, zone: BERLIN })
      expect(maskitoTransform("30.03.2025, 02:30", kept)).toBe("30.03.2025, 03:30")
      expect(maskitoTransform("30.03.2025, 04:30", kept)).toBe("30.03.2025, 04:30")
    })

    test("a date the browser's clocks skip stays as typed for a value in another zone", () => {
      // Samoa skipped 30 December 2011 to move across the date line
      const dateParams = { mode: "dd/mm/yyyy", separator: "." } as const
      const dateTimeParams = { dateMode: "dd/mm/yyyy", timeMode: "HH:MM", dateSeparator: ".", dateTimeSeparator: ", " } as const
      inLocalZone("Pacific/Apia", () => {
        // Maskito's own last step goes through the browser's Date
        expect(maskitoTransform("30.12.2011", maskitoDateOptionsGenerator(dateParams))).toBe("31.12.2011")
        expect(maskitoTransform("30.12.2011, 1", maskitoDateTimeOptionsGenerator(dateTimeParams))).toBe("31.12.2011, 1")

        const utcDate = { ...dateFormat, zone: "UTC" }
        expect(maskitoTransform("30.12.2011", keepTypedValue(maskitoDateOptionsGenerator(dateParams), utcDate))).toBe("30.12.2011")
        expect(parseDateInput("30.12.2011", utcDate)?.toISODate()).toBe("2011-12-30")
        const utcDateTime = keepTypedValue(maskitoDateTimeOptionsGenerator(dateTimeParams), { ...dateTimeFormat, zone: "UTC" })
        expect(maskitoTransform("30.12.2011, 1", utcDateTime)).toBe("30.12.2011, 1")
        expect(maskitoTransform("30.12.2011, 10:00", utcDateTime)).toBe("30.12.2011, 10:00")

        // In Samoa's own zone the day does not exist: forward, as Luxon does
        const apiaDate = { ...dateFormat, zone: "Pacific/Apia" }
        expect(maskitoTransform("30.12.2011", keepTypedValue(maskitoDateOptionsGenerator(dateParams), apiaDate))).toBe("31.12.2011")
      })
    })

    test("a date-only mask keeps a complete date within min and max, and leaves the rest to Maskito", () => {
      const min = DateTime.fromISO("2025-03-15T10:00", { zone: BERLIN }).toMillis()
      const max = DateTime.fromISO("2025-03-20T10:00", { zone: BERLIN }).toMillis()
      const format = { ...dateFormat, zone: BERLIN, min, max }
      const params = { mode: "dd/mm/yyyy", separator: ".", min: maskDate(min, BERLIN), max: maskDate(max, BERLIN) } as const
      const bounded = keepTypedValue(maskitoDateOptionsGenerator(params), format)
      expect(maskitoTransform("14.03.2025", bounded)).toBe("15.03.2025")
      expect(maskitoTransform("17.03.2025", bounded)).toBe("17.03.2025")
      expect(maskitoTransform("21.03.2025", bounded)).toBe("20.03.2025")
      expect(maskitoTransform("1", bounded)).toBe(maskitoTransform("1", maskitoDateOptionsGenerator(params)))
      expect(maskitoTransform("14.03", bounded)).toBe(maskitoTransform("14.03", maskitoDateOptionsGenerator(params)))
    })
  })
}
