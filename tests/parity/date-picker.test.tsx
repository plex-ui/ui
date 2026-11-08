import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import postcss from "postcss"
import { DateTime } from "luxon"
import { createElement, useSyncExternalStore, type ComponentType, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Fragment, h, reactive, ref, type Component, type VNode } from "vue"
import { DatePicker as ReactDatePicker } from "../../packages/ui/src/components/DatePicker"
import { DatePicker } from "../../packages/vue/src/components/DatePicker"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for DatePicker (trigger, popover calendar, month and
// year dropdowns, time inputs).
//
// The clock is fixed (Wednesday 14 October 2026, 10:30) so both frameworks
// render the same month and the same "today" dot.
//
// Normalized here, and only here:
// - Reka's popper wrapper: `--reka-popper-*` names and `dir="ltr"` (as in
//   tooltip-popover.test.tsx); the content's own properties keep Radix's names.
//
// Snapshots also record the focused element, input values and the `change`
// events. In Vue every `update:value` must carry the value of the `change`
// it comes with.

const NOW = new Date(2026, 9, 14, 10, 30)

const settle = async () => {
  for (let i = 0; i < 200; i++) await Promise.resolve()
}

const normalize = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
}

const describeFocus = () => {
  const element = document.activeElement
  if (!element || element === document.body) return "focus: body"
  const role = element.getAttribute("role")
  const label = element.getAttribute("aria-label")
  const text = (element.textContent ?? "").trim().slice(0, 30)
  return `focus: <${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"${role ? ` role="${role}"` : ""}${label ? ` aria-label="${label}"` : ""}> ${JSON.stringify(text)}`
}

let events: string[] = []
let vueUpdates: string[] = []
let vueChanges: string[] = []
let width = 1024
const mediaQueries = new Set<{ min: number; listeners: Set<() => void> }>()

beforeEach(() => {
  events = []
  Element.prototype.scrollIntoView = function () {}
  document.documentElement.style.setProperty("--breakpoint-md", "768px")
  width = 1024
  vi.stubGlobal("innerWidth", width)
  mediaQueries.clear()
  vi.stubGlobal("matchMedia", (query: string) => {
    const entry = { min: Number(/min-width: (\d+)px/.exec(query)?.[1]), listeners: new Set<() => void>() }
    mediaQueries.add(entry)
    return {
      get matches() { return width >= entry.min },
      media: query,
      addEventListener: (_: string, listener: () => void) => entry.listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => entry.listeners.delete(listener),
      addListener: (listener: () => void) => entry.listeners.add(listener),
      removeListener: (listener: () => void) => entry.listeners.delete(listener),
    }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalize(clone)
  const dom = serializeDom(clone)
  // Input values are DOM properties: a typed value React puts back shows here
  const inputs = Array.from(document.querySelectorAll("input")).map((input) => `${input.getAttribute("aria-label")}=${JSON.stringify(input.value)}`)
  const extra = [describeFocus(), `inputs: ${inputs.join(" ")}`, `events: ${events.join(" | ")}`]
  events = []
  return `${dom}\n${extra.join("\n")}`
}

const formatValue = (value: DateTime | null) => (value ? value.toISO() : "null")

// ---------------------------------------------------------------------------
// Rendering

type Case = {
  value?: DateTime | null
  /** Plain props, identical in both frameworks */
  props?: Record<string, unknown>
  /** Parent updates `value` from changes (otherwise it keeps its value) */
  controlled?: boolean
  /** A visible label the picker references with aria-labelledby */
  labelledBy?: boolean
}

type Update = (patch: Partial<Case>) => void

const reactPicker = (c: Case, update: Update): ReactElement => (
  <>
    {c.labelledBy && <label id="dob-label">Date of birth</label>}
    {createElement(ReactDatePicker as unknown as ComponentType<Record<string, unknown>>, {
      "id": "dp",
      "value": c.value ?? null,
      "onChange": (next: DateTime | null) => {
        events.push(`change ${formatValue(next)}`)
        if (c.controlled) update({ value: next })
      },
      ...(c.labelledBy ? { "aria-labelledby": "dob-label" } : {}),
      ...c.props,
    })}
    <button data-testid="outside">Outside</button>
  </>
)

const vuePicker = (c: Case, update: Update): VNode =>
  h(Fragment, [
    c.labelledBy ? h("label", { id: "dob-label" }, "Date of birth") : null,
    h(DatePicker as unknown as Component, {
      "id": "dp",
      "value": c.value ?? null,
      "onUpdate:value": (next: DateTime | null) => {
        vueUpdates.push(formatValue(next))
        if (c.controlled) update({ value: next })
      },
      "onChange": (next: DateTime | null) => {
        vueChanges.push(formatValue(next))
        events.push(`change ${formatValue(next)}`)
      },
      ...(c.labelledBy ? { "aria-labelledby": "dob-label" } : {}),
      ...c.props,
    }),
    h("button", { "data-testid": "outside" }, "Outside"),
  ])

// ---------------------------------------------------------------------------
// Walk: the same script against React, then Vue, with fake timers

type Target = string | (() => Element | null)
const resolve = (target: Target) => {
  const element = typeof target === "string" ? document.querySelector(target) : target()
  if (!element) throw new Error(`No element for ${String(target)}`)
  return element
}

type Tools = {
  snapshot: () => void
  fire: (target: Target, event: keyof typeof fireEvent, init?: object) => Promise<void>
  click: (target: Target) => Promise<void>
  key: (key: string, target?: Target, init?: object) => Promise<void>
  type: (target: Target, value: string) => Promise<void>
  focus: (target: Target) => Promise<void>
  blur: (target: Target) => Promise<void>
  advance: (ms: number) => Promise<void>
  set: (patch: Partial<Case>) => Promise<void>
  resize: (next: number) => Promise<void>
  open: () => Promise<void>
}

const TRIGGER = '[role="button"]#dp'
const mouse = { pointerType: "mouse" }

/** A day button of the visible (not exiting) calendar */
const day = (n: number, monthLabel?: string) => () =>
  Array.from(document.querySelectorAll<HTMLElement>(".Calendar")).flatMap((calendar) => {
    if (calendar.closest("[data-exiting]")) return []
    if (monthLabel && calendar.querySelector(".MonthLabel")?.textContent !== monthLabel) return []
    return Array.from(calendar.querySelectorAll<HTMLButtonElement>(".InteractiveDay")).filter(
      (button) => button.firstChild?.textContent === String(n),
    )
  })[0] ?? null

const button = (label: string) => `[aria-label="${label}"]`
const option = (value: string) => `[data-option-id="${value}"]`

/** A day's accessible name, and the name of the focused element */
const dayName = (date: DateTime) => date.toLocaleString(DateTime.DATE_HUGE)
const focused = () => document.activeElement?.getAttribute("aria-label") ?? null

/** Month labels of the visible (not exiting) calendars */
const visibleMonths = () =>
  Array.from(document.querySelectorAll(".Calendar"))
    .filter((calendar) => !calendar.closest("[data-exiting]"))
    .map((calendar) => calendar.querySelector(".MonthLabel")?.textContent)

const eventsLine = (snapshot: string) => snapshot.split("\n").at(-1)

/** Records each keydown (and whether its default was prevented) into `events` */
const recordKeys = () => {
  const listener = (event: KeyboardEvent) =>
    events.push(`key ${JSON.stringify(event.key)}${event.defaultPrevented ? " prevented" : ""}`)
  document.addEventListener("keydown", listener)
  return () => document.removeEventListener("keydown", listener)
}

const walk = async (initial: Case, steps: (tools: Tools) => Promise<void>) => {
  let current: Case = { ...initial }
  const listeners = new Set<() => void>()
  const vueState = reactive({ ...initial }) as Case
  let framework: "react" | "vue" = "react"

  const update: Update = (patch) => {
    if (framework === "react") {
      current = { ...current, ...patch }
      for (const listener of listeners) listener()
    } else {
      Object.assign(vueState, patch)
    }
  }

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    return reactPicker(state, update)
  }

  const run = async (action: () => void) => {
    await act(async () => {
      action()
      await settle()
    })
    await flushVue()
    await settle()
    await flushVue()
  }

  // Vue skips a second listener for an event whose timestamp is not later
  // than the listener's attachment; the frozen fake clock moves 1ms first.
  const dispatch = (action: () => void) =>
    run(() => {
      vi.setSystemTime(Date.now() + 1)
      action()
    })

  const tools = (snapshots: string[]): Tools => {
    const fire: Tools["fire"] = (target, event, init) =>
      dispatch(() => {
        ;(fireEvent[event] as (element: Element, init?: object) => boolean)(resolve(target), init)
      })
    return {
      snapshot: () => snapshots.push(snapshotDom()),
      fire,
      click: (target) => fire(target, "click", { button: 0, detail: 1 }),
      key: (key, target = () => document.activeElement, init) => fire(target, "keyDown", { key, ...init }),
      type: (target, value) => fire(target, "input", { target: { value } }),
      focus: (target) => dispatch(() => (resolve(target) as HTMLElement).focus()),
      blur: (target) => dispatch(() => (resolve(target) as HTMLElement).blur()),
      advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
      set: (patch) => run(() => update(patch)),
      resize: async (next) => {
        // Commit the media-query change before the layout resize notification.
        // jsdom has no resized boxes to notify Floating UI's ResizeObserver.
        await run(() => {
          width = next
          vi.stubGlobal("innerWidth", next)
          for (const entry of mediaQueries) for (const listener of entry.listeners) listener()
        })
        await run(() => window.dispatchEvent(new Event("resize")))
      },
      open: async () => {
        await fire(TRIGGER, "pointerDown", { button: 0, ...mouse })
        await run(() => vi.advanceTimersByTime(100))
      },
    }
  }

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  vi.setSystemTime(NOW)
  try {
    framework = "react"
    const react: string[] = []
    await run(() => {
      render(createElement(ReactApp))
    })
    events = []
    await steps(tools(react))
    await run(() => cleanup())
    vi.clearAllTimers()

    framework = "vue"
    vi.setSystemTime(NOW)
    Object.assign(vueState, initial)
    vueUpdates = []
    vueChanges = []
    const vue: string[] = []
    const { unmount } = mountVue(() => vuePicker(vueState, update))
    await run(() => {})
    events = []
    await steps(tools(vue))
    unmount()
    vi.clearAllTimers()

    // `update:value` (v-model) carries what `change` carries
    expect(vueUpdates).toEqual(vueChanges)

    return { react, vue }
  } finally {
    vi.useRealTimers()
  }
}

/** Renders a case, optionally opens it, and snapshots both frameworks. */
const pair = (c: Case, { open = false } = {}) =>
  walk(c, async (tools) => {
    if (open) await tools.open()
    await tools.advance(100)
    tools.snapshot()
  })

const expectSame = ({ react, vue }: { react: string[]; vue: string[] }) => {
  expect(vue.length).toBe(react.length)
  for (let i = 0; i < react.length; i++) expect(vue[i], `snapshot ${i}`).toBe(react[i])
}

// ---------------------------------------------------------------------------
// Markup

const oct20 = DateTime.local(2026, 10, 20)
const mar3 = DateTime.local(2025, 3, 3, 8, 5)

const closedCases: Array<[string, Case]> = [
  ["placeholder", {}],
  ["value", { value: oct20 }],
  ["custom placeholder", { props: { placeholder: "Choose a date" } }],
  ["trigger date format", { value: oct20, props: { triggerDateFormat: "MMMM d, yyyy" } }],
  ["showTime picks the date-time format", { value: mar3, props: { showTime: true } }],
  ["showTime with an explicit format", { value: mar3, props: { showTime: true, triggerDateFormat: "MMM d, yyyy HH:mm" } }],
  ["showTime with a time format", { value: mar3, props: { showTime: true, triggerDateFormat: "MMM d, yyyy", triggerTimeFormat: "HH:mm" } }],
  ["a time format with aria-labelledby", { value: mar3, labelledBy: true, props: { showTime: true, triggerTimeFormat: "HH:mm" } }],
  ["a time format, clearable and disabled", { value: mar3, props: { showTime: true, triggerTimeFormat: "HH:mm", clearable: true, disabled: true } }],
  ["disabled", { value: oct20, props: { disabled: true } }],
  ["soft", { value: oct20, props: { variant: "soft" } }],
  ["ghost", { props: { variant: "ghost" } }],
  ...["3xs", "sm", "lg", "3xl"].map((size): [string, Case] => [`size ${size}`, { value: oct20, props: { size } }]),
  ["pill false", { props: { pill: false } }],
  ["block", { props: { block: true } }],
  ["clearable with a value", { value: oct20, props: { clearable: true } }],
  ["clearable without a value", { props: { clearable: true } }],
  ["clearable, disabled", { value: oct20, props: { clearable: true, disabled: true } }],
  ["dropdown icon chevronDown", { props: { dropdownIconType: "chevronDown" } }],
  ["dropdown icon none, clearable", { value: oct20, props: { dropdownIconType: "none", clearable: true } }],
  ["without icon", { props: { triggerShowIcon: false } }],
  ["trigger class", { props: { triggerClassName: "w-[200px] font-semibold" } }],
  ["aria-label and aria-invalid", { props: { "aria-label": "Start date", "aria-invalid": true } }],
  ["aria-invalid false", { props: { "aria-invalid": false } }],
  ["aria-describedby", { props: { "aria-describedby": "hint" } }],
  ["aria-labelledby wraps the value", { value: oct20, labelledBy: true }],
  ["aria-labelledby wraps the placeholder", { labelledBy: true }],
]

const openCases: Array<[string, Case]> = [
  ["no value: current month, today marked", {}],
  ["value in another month", { value: mar3 }],
  ["value in the current month is selected", { value: oct20 }],
  [
    "min and max are inclusive whole days",
    { value: oct20, props: { min: DateTime.local(2026, 10, 10, 15), max: DateTime.local(2026, 10, 24, 9) } },
  ],
  ["min in an earlier month, max in a later one", { props: { min: DateTime.local(2026, 8, 1), max: DateTime.local(2026, 12, 31) } }],
  ["selected day outside min/max is not marked", { value: oct20, props: { min: DateTime.local(2026, 10, 21) } }],
  ["dropdown caption", { value: oct20, props: { captionLayout: "dropdown" } }],
  ["dropdown caption, year range", { props: { captionLayout: "dropdown", yearRange: [2020, 2030] } }],
  ["dropdown caption, years from min/max", { props: { captionLayout: "dropdown", min: DateTime.local(2019, 5, 1), max: DateTime.local(2027, 1, 1) } }],
  ["show time, no value", { props: { showTime: true } }],
  ["show time with a value", { value: mar3, props: { showTime: true } }],
  ["dropdown caption and time", { value: mar3, props: { captionLayout: "dropdown", showTime: true, yearRange: [2020, 2030] } }],
  // Inclusive bounds: equal min and max allow one day (this used to throw)
  ["min equal to max allows one day", { props: { min: DateTime.local(2026, 10, 16, 9), max: DateTime.local(2026, 10, 16, 9) } }],
  ["side top, offset 12", { props: { side: "top", sideOffset: 12 } }],
  ["align start (offset -5)", { props: { align: "start" } }],
  ["align end, offset 4", { props: { align: "end", alignOffset: 4 } }],
]

describe("DatePicker parity: markup", () => {
  test("an open calendar updates collision space across the mobile breakpoint", async () => {
    expectSame(await walk({}, async (tools) => {
      await tools.resize(1024)
      await tools.open()
      const availableWidth = () => Number(/--radix-popper-available-width: (-?[\d.]+)px/.exec(snapshotDom())?.[1])
      const desktop = availableWidth()
      expect(Number.isFinite(desktop)).toBe(true)
      await tools.resize(375)
      expect(availableWidth()).toBe(desktop + 8)
      await tools.resize(360)
      expect(availableWidth()).toBe(desktop + 14)
      await tools.resize(320)
      expect(availableWidth()).toBe(desktop + 34)
      await tools.resize(375)
      expect(availableWidth()).toBe(desktop + 8)
      await tools.resize(1024)
      expect(availableWidth()).toBe(desktop)
      tools.snapshot()
    }))
  })

  test.each(["top", "right", "bottom", "left"] as const)("respects preferred side %s across desktop and phone fit", async (side) => {
    const phoneSide = { top: "top", right: "bottom", bottom: "bottom", left: "bottom" }[side]
    expectSame(await walk({ props: { side } }, async (tools) => {
      await tools.resize(1024)
      await tools.open()
      const placement = () => resolve('[role="dialog"]').getAttribute("data-side")
      expect(placement()).toBe(side)
      await tools.resize(320)
      expect(placement()).toBe(phoneSide)
      await tools.resize(375)
      expect(placement()).toBe(phoneSide)
      await tools.resize(1024)
      expect(placement()).toBe(side)
      tools.snapshot()
    }))
  })

  test.each(closedCases)("closed: %s", async (_name, c) => {
    expectSame(await pair(c))
  })

  // A phone row draws the two parts as the two capsules of iOS's compact date and time (Field.module.css).
  test("with showTime, a time format makes the date and the time two parts of the trigger", async () => {
    const seen: string[] = []
    const read = async () => {
      const parts = document.querySelector(`${TRIGGER} [data-date-parts]`)
      seen.push(parts ? `${[...parts.children].map((part) => `${part.getAttribute("data-date-part")}=${part.textContent}`).join(" ")} | ${parts.textContent} | in value ${!!parts.closest("#dp-value")}` : `none | ${document.querySelector(TRIGGER)?.textContent}`)
    }
    const cases: Case[] = [
      { value: mar3, props: { showTime: true, triggerTimeFormat: "HH:mm" } },
      { value: mar3, props: { showTime: true, triggerDateFormat: "MMM d, yyyy", triggerTimeFormat: "h:mm a" } },
      { value: mar3, labelledBy: true, props: { showTime: true, triggerTimeFormat: "HH:mm" } },
      { value: mar3, props: { triggerTimeFormat: "HH:mm" } },
      { props: { showTime: true, triggerTimeFormat: "HH:mm", placeholder: "Select date" } },
    ]
    for (const c of cases) await walk(c, read)
    expect(seen).toEqual([
      ...Array(2).fill("date=03/03/25 time=08:05 | 03/03/25 08:05 | in value false"),
      ...Array(2).fill("date=Mar 3, 2025 time=8:05 AM | Mar 3, 2025 8:05 AM | in value false"),
      ...Array(2).fill("date=03/03/25 time=08:05 | 03/03/25 08:05 | in value true"),
      ...Array(2).fill("none | 03/03/25"),
      ...Array(2).fill("none | Select date"),
    ])
  })

  test.each(openCases)("open: %s", async (_name, c) => {
    expectSame(await pair(c, { open: true }))
  })

  test.each([true, false])("open with animations %s", async (animated) => {
    animation.disabled = !animated
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        tools.snapshot()
        await tools.advance(400)
        tools.snapshot()
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Calendar keyboard: arrows, Home/End and PageUp/PageDown move focus between
// days; a day in another month moves the view first and takes focus a frame
// later, once that month has rendered

describe("DatePicker parity: calendar keyboard", () => {
  test("arrows move a day and a week within the month; other keys are left alone", async () => {
    const result = await walk({ value: oct20 }, async (tools) => {
      const stop = recordKeys()
      try {
        await tools.open()
        await tools.focus(day(20))
        await tools.key("ArrowRight")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 21)))
        await tools.key("ArrowDown")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 28)))
        await tools.key("ArrowLeft")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 27)))
        await tools.key("ArrowUp")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 20)))
        tools.snapshot()
        // Enter and Space stay with the button; a modified arrow is not a grid key
        await tools.key("Enter")
        await tools.key(" ")
        await tools.key("Tab")
        await tools.key("ArrowRight", undefined, { metaKey: true })
        await tools.key("ArrowLeft", undefined, { altKey: true })
        expect(focused()).toBe(dayName(oct20))
        tools.snapshot()
        await tools.key("Escape")
        await tools.advance(100)
        tools.snapshot()
      } finally {
        stop()
      }
    })
    expectSame(result)
    expect(eventsLine(result.react[0])).toBe(
      'events: key "ArrowRight" prevented | key "ArrowDown" prevented | key "ArrowLeft" prevented | key "ArrowUp" prevented',
    )
    expect(eventsLine(result.react[1])).toBe('events: key "Enter" | key " " | key "Tab" | key "ArrowRight" | key "ArrowLeft"')
  })

  test.each([true, false])("arrows cross into the next and previous month (animations %s)", async (animated) => {
    animation.disabled = !animated
    const result = await walk({ value: oct20 }, async (tools) => {
      await tools.open()
      await tools.focus(day(31))
      await tools.key("ArrowRight")
      // The view has moved; the day takes focus a frame later (with
      // animations, October 31 keeps it until then on the leaving calendar)
      expect(visibleMonths()).toEqual(["November 2026"])
      if (animated) expect(focused()).toBe(dayName(DateTime.local(2026, 10, 31)))
      tools.snapshot()
      await tools.advance(100)
      expect(focused()).toBe(dayName(DateTime.local(2026, 11, 1)))
      tools.snapshot()
      await tools.advance(400)
      await tools.key("ArrowUp")
      await tools.advance(100)
      expect(focused()).toBe(dayName(DateTime.local(2026, 10, 25)))
      expect(visibleMonths()).toEqual(["October 2026"])
      tools.snapshot()
      await tools.advance(400)
      // Two keys before the frame. With animations October 25 keeps focus on
      // the leaving calendar, and the second key starts from November 1, where
      // the first is going. Without, that calendar is gone and so is focus
      await tools.key("ArrowDown")
      await tools.key("ArrowLeft")
      await tools.advance(100)
      expect(focused()).toBe(dayName(animated ? DateTime.local(2026, 10, 31) : DateTime.local(2026, 11, 1)))
      expect(visibleMonths()).toEqual([animated ? "October 2026" : "November 2026"])
      tools.snapshot()
      await tools.advance(400)
      tools.snapshot()
    })
    expectSame(result)
  })

  test("Home and End move to the Sunday and Saturday of the week, across months too", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.focus(day(20))
        await tools.key("Home")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 18)))
        await tools.key("End")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 24)))
        await tools.key("End")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 24)))
        tools.snapshot()
        await tools.focus(day(1))
        await tools.key("Home")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 9, 27)))
        expect(visibleMonths()).toEqual(["September 2026"])
        tools.snapshot()
        await tools.focus(day(30))
        await tools.key("End")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 3)))
        expect(visibleMonths()).toEqual(["October 2026"])
        tools.snapshot()
      }),
    )
  })

  test("PageUp and PageDown move a month and clamp the day (Jan 31 to Feb 28)", async () => {
    expectSame(
      await walk({ value: DateTime.local(2027, 1, 31) }, async (tools) => {
        await tools.open()
        await tools.focus(day(31))
        await tools.key("PageDown")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2027, 2, 28)))
        expect(visibleMonths()).toEqual(["February 2027"])
        tools.snapshot()
        await tools.key("PageUp")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2027, 1, 28)))
        await tools.key("PageUp")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 12, 28)))
        expect(visibleMonths()).toEqual(["December 2026"])
        tools.snapshot()
      }),
    )
  })

  test("a day outside min/max keeps focus and the view", async () => {
    const result = await walk(
      { value: oct20, props: { min: DateTime.local(2026, 10, 10, 15), max: DateTime.local(2026, 11, 3, 9) } },
      async (tools) => {
        await tools.open()
        await tools.focus(day(10))
        await tools.key("ArrowLeft")
        await tools.key("ArrowUp")
        await tools.key("Home")
        await tools.key("PageUp")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 10)))
        expect(visibleMonths()).toEqual(["October 2026"])
        tools.snapshot()
        // November 3 is the max day; November 7 and December are past it
        await tools.focus(day(31))
        await tools.key("ArrowDown")
        await tools.key("PageDown")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 31)))
        expect(visibleMonths()).toEqual(["October 2026"])
        await tools.key("End")
        expect(focused()).toBe(dayName(DateTime.local(2026, 10, 31)))
        await tools.key("ArrowRight")
        await tools.advance(100)
        expect(focused()).toBe(dayName(DateTime.local(2026, 11, 1)))
        await tools.key("ArrowRight")
        await tools.key("ArrowRight")
        await tools.key("ArrowRight")
        expect(focused()).toBe(dayName(DateTime.local(2026, 11, 3)))
        tools.snapshot()
      },
    )
    expectSame(result)
  })

  test("dropdown caption: a day in another month re-renders the view and takes focus", async () => {
    const result = await walk({ value: oct20, props: { captionLayout: "dropdown", yearRange: [2020, 2030] } }, async (tools) => {
      await tools.open()
      await tools.focus(day(31))
      await tools.key("ArrowRight")
      await tools.advance(100)
      expect(focused()).toBe(dayName(DateTime.local(2026, 11, 1)))
      expect(document.querySelector(button("Month"))?.textContent).toBe("Nov")
      tools.snapshot()
      await tools.key("PageUp")
      await tools.advance(100)
      expect(focused()).toBe(dayName(DateTime.local(2026, 10, 1)))
      await tools.key("ArrowLeft")
      await tools.advance(100)
      expect(focused()).toBe(dayName(DateTime.local(2026, 9, 30)))
      expect(document.querySelector(button("Month"))?.textContent).toBe("Sep")
      tools.snapshot()
    })
    expectSame(result)
  })
})

// ---------------------------------------------------------------------------
// Behaviour

describe("DatePicker parity: behaviour", () => {
  test("opens on pointer down, closes on Escape and on an outside pointer down", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        tools.snapshot()
        await tools.key("Escape")
        await tools.advance(100)
        tools.snapshot()
        await tools.open()
        await tools.fire('[data-testid="outside"]', "pointerDown", { button: 0, ...mouse })
        await tools.fire('[data-testid="outside"]', "click", { button: 0 })
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("keyboard: ArrowDown and Space on the trigger open it, Enter does not", async () => {
    expectSame(
      await walk({}, async (tools) => {
        await tools.focus(TRIGGER)
        await tools.key("Enter")
        await tools.advance(100)
        tools.snapshot()
        await tools.key("ArrowDown")
        await tools.advance(100)
        tools.snapshot()
        await tools.key("Escape")
        await tools.advance(100)
        tools.snapshot()
        await tools.key(" ")
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("disabled trigger does not open", async () => {
    expectSame(
      await walk({ props: { disabled: true } }, async (tools) => {
        await tools.fire(TRIGGER, "pointerDown", { button: 0, ...mouse })
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test.each([true, false])("month navigation buttons (animations %s)", async (animated) => {
    animation.disabled = !animated
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.click(button("Next month"))
        tools.snapshot()
        await tools.advance(200)
        tools.snapshot()
        await tools.advance(300)
        tools.snapshot()
        await tools.click(button("Next month"))
        await tools.click(button("Previous month"))
        await tools.advance(50)
        tools.snapshot()
        await tools.click(button("Previous month"))
        await tools.click(button("Previous month"))
        await tools.advance(500)
        tools.snapshot()
      }),
    )
  })

  test("navigation stops at min and max months", async () => {
    expectSame(
      await walk({ props: { min: DateTime.local(2026, 9, 5), max: DateTime.local(2026, 11, 20) } }, async (tools) => {
        await tools.open()
        await tools.click(button("Previous month"))
        await tools.advance(500)
        tools.snapshot()
        await tools.click(button("Previous month"))
        await tools.click(button("Next month"))
        await tools.click(button("Next month"))
        await tools.advance(500)
        tools.snapshot()
        await tools.click(button("Next month"))
        await tools.advance(500)
        tools.snapshot()
      }),
    )
  })

  test("selecting a day emits it and closes (controlled)", async () => {
    expectSame(
      await walk({ controlled: true }, async (tools) => {
        await tools.open()
        await tools.click(day(22))
        await tools.advance(100)
        tools.snapshot()
        await tools.open()
        tools.snapshot()
        await tools.click(day(3))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("uncontrolled: the parent keeps its value", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.click(day(5))
        await tools.advance(100)
        tools.snapshot()
        await tools.open()
        tools.snapshot()
      }),
    )
  })

  test("min and max days are selectable, days outside are not", async () => {
    const min = DateTime.local(2026, 10, 10, 15)
    const max = DateTime.local(2026, 10, 24, 9)
    expectSame(
      await walk({ controlled: true, props: { min, max } }, async (tools) => {
        await tools.open()
        // Days 9 and 25 are disabled buttons (browsers do not click them;
        // jsdom would dispatch to Vue's listener, React filters it)
        expect((day(9)() as HTMLButtonElement).disabled).toBe(true)
        expect((day(25)() as HTMLButtonElement).disabled).toBe(true)
        tools.snapshot()
        await tools.click(day(10))
        await tools.advance(100)
        tools.snapshot()
        await tools.open()
        await tools.click(day(24))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("clear action emits null", async () => {
    expectSame(
      await walk({ value: oct20, controlled: true, props: { clearable: true } }, async (tools) => {
        await tools.fire(button("Clear current value"), "pointerDown", { button: 0, ...mouse })
        await tools.click(button("Clear current value"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("a value outside the view resets the calendar; one inside updates the selection", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.click(button("Next month"))
        await tools.advance(500)
        await tools.set({ value: DateTime.local(2026, 11, 9) })
        await tools.advance(100)
        tools.snapshot()
        await tools.set({ value: DateTime.local(2025, 2, 14) })
        await tools.advance(100)
        tools.snapshot()
        await tools.set({ value: null })
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("prop changes while open: min, max, caption layout", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.set({ value: oct20, props: { min: DateTime.local(2026, 10, 12), max: DateTime.local(2026, 10, 28) } })
        tools.snapshot()
        await tools.set({ value: oct20, props: { captionLayout: "dropdown" } })
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("dropdown caption: arrows, month menu and year menu", async () => {
    expectSame(
      await walk({ value: oct20, props: { captionLayout: "dropdown", yearRange: [2000, 2030] } }, async (tools) => {
        await tools.open()
        await tools.click(button("Next month"))
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(button("Month"), "pointerDown", { button: 0, ...mouse })
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(option("3"), "pointerMove", mouse)
        await tools.fire(option("3"), "pointerUp", mouse)
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(button("Year"), "pointerDown", { button: 0, ...mouse })
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(option("2011"), "pointerMove", mouse)
        await tools.fire(option("2011"), "pointerUp", mouse)
        await tools.advance(100)
        tools.snapshot()
        await tools.click(day(15))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("dropdown caption: opening the year menu while the month menu is open closes the month menu", async () => {
    const result = await walk({ value: oct20, props: { captionLayout: "dropdown", yearRange: [2000, 2030] } }, async (tools) => {
      await tools.open()
      await tools.fire(button("Month"), "pointerDown", { button: 0, ...mouse })
      await tools.advance(100)
      tools.snapshot()
      await tools.fire(button("Year"), "pointerDown", { button: 0, ...mouse })
      await tools.advance(100)
      tools.snapshot()
      await tools.fire(button("Month"), "pointerDown", { button: 0, ...mouse })
      await tools.advance(100)
      tools.snapshot()
    })
    expectSame(result)
    const menus = (dom: string) => dom.match(/class="MenuList"/g)?.length ?? 0
    expect(result.react.map(menus)).toEqual([1, 1, 1])
    expect(result.react[1]).toContain('data-option-id="2011"')
    expect(result.react[2]).toContain('data-option-id="11"')
  })

  test("time: selecting a day keeps the popover open and uses the pending time", async () => {
    expectSame(
      await walk({ controlled: true, props: { showTime: true } }, async (tools) => {
        await tools.open()
        await tools.click(day(16))
        await tools.advance(100)
        tools.snapshot()
        await tools.click(day(18))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("time: arrow keys step hours and minutes (Shift steps 10, wrapping)", async () => {
    expectSame(
      await walk({ value: DateTime.local(2026, 10, 20, 23, 55), controlled: true, props: { showTime: true } }, async (tools) => {
        await tools.open()
        await tools.focus(button("Hour"))
        tools.snapshot()
        await tools.key("ArrowUp")
        tools.snapshot()
        await tools.key("ArrowDown", undefined, { shiftKey: true })
        tools.snapshot()
        await tools.focus(button("Minute"))
        await tools.key("ArrowUp", undefined, { shiftKey: true })
        tools.snapshot()
        await tools.key("ArrowDown")
        await tools.key("ArrowLeft")
        tools.snapshot()
        await tools.blur(button("Minute"))
        tools.snapshot()
      }),
    )
  })

  test("time: typing two hour digits moves to the minutes; blur commits and clamps", async () => {
    expectSame(
      await walk({ value: DateTime.local(2026, 10, 20, 9, 5), controlled: true, props: { showTime: true } }, async (tools) => {
        await tools.open()
        await tools.focus(button("Hour"))
        await tools.type(button("Hour"), "7")
        tools.snapshot()
        await tools.type(button("Hour"), "7a")
        tools.snapshot()
        await tools.type(button("Hour"), "75")
        tools.snapshot()
        await tools.type(button("Minute"), "9")
        tools.snapshot()
        await tools.type(button("Minute"), "93")
        tools.snapshot()
        await tools.blur(button("Minute"))
        tools.snapshot()
        await tools.focus(button("Hour"))
        await tools.type(button("Hour"), "")
        await tools.blur(button("Hour"))
        tools.snapshot()
      }),
    )
  })

  test("time without a value: changes stay pending until a day is picked", async () => {
    expectSame(
      await walk({ controlled: true, props: { showTime: true } }, async (tools) => {
        await tools.open()
        await tools.focus(button("Hour"))
        await tools.key("ArrowDown")
        await tools.focus(button("Minute"))
        await tools.key("ArrowUp", undefined, { shiftKey: true })
        tools.snapshot()
        await tools.click(day(2))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("time: a time past min or max on their days is clamped to the bound", async () => {
    const min = DateTime.local(2026, 10, 10, 15, 30)
    const max = DateTime.local(2026, 10, 24, 9, 15)
    const result = await walk({ controlled: true, props: { showTime: true, min, max } }, async (tools) => {
      await tools.open()
      // The pending 12:00 on the min day is before min
      await tools.click(day(10))
      await tools.advance(100)
      tools.snapshot()
      await tools.focus(button("Hour"))
      await tools.key("ArrowDown")
      tools.snapshot()
      await tools.focus(button("Minute"))
      await tools.type(button("Minute"), "00")
      tools.snapshot()
      // The pending 15:30 on the max day is after max
      await tools.click(day(24))
      await tools.advance(100)
      tools.snapshot()
      await tools.focus(button("Hour"))
      await tools.key("ArrowUp")
      tools.snapshot()
      await tools.blur(button("Hour"))
      tools.snapshot()
    })
    expectSame(result)
    expect(result.react[0]).toContain("change 2026-10-10T15:30:00.000")
    expect(result.react[2]).toContain('inputs: Hour="15" Minute="30"')
    expect(result.react[3]).toContain("change 2026-10-24T09:15:00.000")
    expect(result.react[4]).toContain('inputs: Hour="09" Minute="15"')
  })

  test("day buttons: full-date name, pressed state and today", async () => {
    const result = await pair({ value: oct20 }, { open: true })
    expectSame(result)
    const name = (date: DateTime) => date.toLocaleString(DateTime.DATE_HUGE)
    expect(result.react[0]).toContain(`<button aria-label="${name(oct20)}" aria-pressed="true" class="InteractiveDay" type="button">`)
    expect(result.react[0]).toContain(`<button aria-label="${name(oct20.minus({ days: 1 }))}" aria-pressed="false" class="InteractiveDay" type="button">`)
    expect(result.react[0]).toContain(
      `<button aria-current="date" aria-label="${name(DateTime.local(2026, 10, 14))}" aria-pressed="false" class="InteractiveDay" type="button">`,
    )
  })

  test("aria-labelledby without an id: the value text gets a generated id", async () => {
    const result = await pair({ value: oct20, labelledBy: true, props: { id: undefined } })
    expectSame(result)
    expect(result.react[0]).toMatch(/aria-labelledby="dob-label gen-\d+"/)
    expect(result.react[0]).not.toContain("undefined")
  })

  test("ref() holding a DateTime (deep reactive proxy) works like a plain value", async () => {
    const holder = ref<DateTime | null>(oct20)
    const { container } = mountVue(() =>
      h(DatePicker, { "id": "dp", "value": holder.value, "onUpdate:value": (next: DateTime | null) => (holder.value = next) }),
    )
    await flushVue()
    expect(container.querySelector(".TriggerText")?.textContent).toBe("10/20/26")
  })
})


describe("DatePicker live state regressions", () => {
  test("disabling an open calendar blocks days, navigation, captions and time", async () => {
    await walk({ value: oct20, props: { showTime: true, captionLayout: "dropdown" } }, async (tools) => {
      await tools.open()
      await tools.set({ props: { showTime: true, captionLayout: "dropdown", disabled: true } })
      expect((resolve(day(21)) as HTMLButtonElement).disabled).toBe(true)
      expect((resolve(button("Next month")) as HTMLButtonElement).disabled).toBe(true)
      expect((resolve(button("Previous month")) as HTMLButtonElement).disabled).toBe(true)
      expect(resolve(button("Month")).getAttribute("aria-disabled")).toBe("true")
      expect(resolve(button("Year")).getAttribute("aria-disabled")).toBe("true")
      expect((resolve(button("Hour")) as HTMLInputElement).disabled).toBe(true)
      expect((resolve(button("Minute")) as HTMLInputElement).disabled).toBe(true)
      await tools.click(day(21))
      await tools.key("PageDown", day(21))
      await tools.type(button("Hour"), "13")
      await tools.fire(button("Minute"), "blur")
      expect(events).toEqual([])
      await tools.set({ props: { showTime: true, captionLayout: "dropdown" } })
      await tools.click(day(21))
      expect(events).toHaveLength(1)
    })
  })

  test.each([
    ["Hour", "1", false],
    ["Minute", "4", false],
    ["Hour", "1", true],
    ["Minute", "4", true],
  ] as const)("disabling discards partial %s=%s draft (owner changes: %s)", async (field, draft, updateOwner) => {
    const initial = DateTime.local(2026, 10, 20, 12, 5)
    const next = DateTime.local(2026, 10, 20, 14, 45)
    await walk({ value: initial, props: { showTime: true } }, async (tools) => {
      await tools.open()
      await tools.focus(button(field))
      await tools.type(button(field), draft)
      expect((resolve(button(field)) as HTMLInputElement).value).toBe(draft)
      expect(events).toEqual([])

      // Native disabling does not guarantee a blur event. Cancel the edit now.
      await tools.set({ props: { showTime: true, disabled: true } })
      expect((resolve(button("Hour")) as HTMLInputElement).value).toBe("12")
      expect((resolve(button("Minute")) as HTMLInputElement).value).toBe("05")
      await tools.fire(button(field), "blur")
      if (updateOwner) await tools.set({ value: next })
      await tools.set({ props: { showTime: true, disabled: false } })
      expect((resolve(button("Hour")) as HTMLInputElement).value).toBe(updateOwner ? "14" : "12")
      expect((resolve(button("Minute")) as HTMLInputElement).value).toBe(updateOwner ? "45" : "05")
      expect(events).toEqual([])

      // A later edit/blur must commit the owner's value, never the cancelled draft.
      await tools.focus(button(field))
      await tools.blur(button(field))
      expect(events).toEqual([`change ${formatValue(updateOwner ? next : initial)}`])
    })
  })

  test("time keeps the owner value when a change is refused", async () => {
    await walk({ value: DateTime.local(2026, 10, 20, 12, 5), props: { showTime: true } }, async (tools) => {
      await tools.open()
      await tools.focus(button("Hour"))
      await tools.key("ArrowUp")
      expect((resolve(button("Hour")) as HTMLInputElement).value).toBe("12")
      await tools.type(button("Hour"), "13")
      await tools.blur(button("Hour"))
      expect((resolve(button("Hour")) as HTMLInputElement).value).toBe("12")
      await tools.type(button("Minute"), "30")
      expect((resolve(button("Minute")) as HTMLInputElement).value).toBe("05")
      await tools.set({ value: DateTime.local(2026, 10, 20, 14, 45) })
      expect((resolve(button("Hour")) as HTMLInputElement).value).toBe("14")
      expect((resolve(button("Minute")) as HTMLInputElement).value).toBe("45")
    })
  })

  test.each([true, false])("time fields keep separate targets without enlarging the painted pill (Phone: %s)", async (phone) => {
    // jsdom does not evaluate media queries or lay out flex items. Apply the
    // actual declarations for one viewport, then check their size/flow contract
    // on both frameworks' native inputs. Browser hit rectangles remain a
    // separate runtime check after the shared stylesheet is rebuilt.
    const source = postcss.parse(readFileSync("packages/styles/src/components/DatePicker/Calendar.module.css", "utf8"))
    const stylesheet = document.createElement("style")
    const selected = postcss.root()
    const selectors = new Set([".TimeFooter", ".TimeInputGroup", ".TimeField", ".TimeSeparator"])
    source.walkRules((rule) => {
      if (!selectors.has(rule.selector)) return
      const parent = rule.parent
      if (parent?.type === "atrule" && (!phone || parent.name !== "media" || parent.params !== "(max-width: 767px)")) return
      const flat = postcss.rule({ selector: rule.selector })
      rule.each((node) => { if (node.type === "decl") flat.append(node.clone()) })
      selected.append(flat)
    })
    stylesheet.textContent = selected.toString()
    document.head.append(stylesheet)
    try {
      await walk({ value: DateTime.local(2026, 10, 20, 9, 5), props: { showTime: true } }, async (tools) => {
        await tools.open()
        const hour = resolve(button("Hour")) as HTMLInputElement
        const minute = resolve(button("Minute")) as HTMLInputElement
        const group = hour.parentElement!
        const groupStyle = getComputedStyle(group)
        expect(Array.from(group.querySelectorAll("input"))).toEqual([hour, minute])
        for (const input of [hour, minute]) {
          const style = getComputedStyle(input)
          expect(style.width).toBe(phone ? "44px" : "32px")
          expect(style.height).toBe(phone ? "44px" : "28px")
          if (phone) {
            expect(style.boxSizing).toBe("border-box")
            expect(style.flexShrink).toBe("0")
            expect(style.fontSize).toBe("17px")
            expect(style.lineHeight).toBe("22px")
          }
        }
        if (phone) {
          expect(groupStyle.width).toBe("88px")
          expect(groupStyle.height).toBe("44px")
          expect(groupStyle.padding).toBe("0px")
          expect(groupStyle.gap).toBe("0px")
          expect(getComputedStyle(group.querySelector("span")!).position).toBe("absolute")
          expect(getComputedStyle(group.querySelector("span")!).pointerEvents).toBe("none")
          // The Time row is as tall as the month row (owner 08.11, plan 170): 44px targets with the calendar's inset
          expect(getComputedStyle(group.parentElement!).height).toBe("var(--calendar-header-height)")
          let paint: Record<string, string> = {}
          source.walkRules((rule) => {
            if (rule.selector !== "&::before" || rule.parent?.type !== "rule" || rule.parent.selector !== ".TimeInputGroup") return
            paint = Object.fromEntries(rule.nodes.filter((node) => node.type === "decl").map((node) => [node.prop, node.value]))
          })
          expect(paint).toMatchObject({ width: "86px", height: "34px", "pointer-events": "none" })
          // Two adjacent44px inputs fill the88px group. No negative margins,
          // absolute inputs or shrinking targets can make their hit areas overlap.
          expect(parseFloat(getComputedStyle(hour).width) + parseFloat(getComputedStyle(minute).width)).toBe(parseFloat(groupStyle.width))
        }
      })
    } finally {
      stylesheet.remove()
    }
  })

  test("calendar geometry is remeasured after a responsive resize", async () => {
    let height = 224
    const originalObserver = globalThis.ResizeObserver
    const observers: CalendarObserver[] = []
    class CalendarObserver implements ResizeObserver {
      readonly targets = new Set<Element>()
      constructor(private readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(target: Element) { this.targets.add(target) }
      unobserve(target: Element) { this.targets.delete(target) }
      disconnect() { this.targets.clear() }
      notify() { this.callback([], this) }
    }
    vi.stubGlobal("ResizeObserver", CalendarObserver)
    const dimensions = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute("data-calendar") ? height : 0
    })
    try {
      await walk({ value: oct20 }, async (tools) => {
        height = 224
        await tools.open()
        const container = resolve(".CalendarContainer") as HTMLElement
        expect(container.style.height).toBe("224px")
        height = 329
        for (const observer of observers) {
          if ([...observer.targets].some((target) => target.hasAttribute("data-calendar"))) observer.notify()
        }
        await tools.advance(50)
        expect(container.style.height).toBe("329px")
        height = 224
        for (const observer of observers) {
          if ([...observer.targets].some((target) => target.hasAttribute("data-calendar"))) observer.notify()
        }
        await tools.advance(50)
        expect(container.style.height).toBe("224px")
      })
      expect(observers.every((observer) => observer.targets.size === 0)).toBe(true)
    } finally {
      dimensions.mockRestore()
      vi.stubGlobal("ResizeObserver", originalObserver)
    }
  })
})


test("SelectControl date trigger waits for committed touch and accepts click-only activation", async () => {
  await walk({}, async ({ fire, advance }) => {
    const trigger = () => document.querySelector('.SelectControl')
    await fire(trigger, "pointerDown", { button: 0, pointerType: "touch", pointerId: 7 })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await fire(trigger, "pointerCancel", { pointerType: "touch", pointerId: 7 })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await fire(trigger, "click", { detail: 0 })
    await advance(1)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})


test("Enter opens the date trigger without synthesizing a pointer event", async () => {
  await walk({}, async ({ fire, advance }) => {
    const trigger = () => document.querySelector(".SelectControl")
    await fire(trigger, "keyDown", { key: "Enter", isComposing: true })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await fire(trigger, "keyDown", { key: "Enter" })
    await advance(1)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe("Phone today marker", () => {
  // The phone selection follows the desktop fill (plan 98), so today keeps the desktop dot there too
  // instead of losing every visual marker. jsdom does not evaluate media queries; read the phone rules.
  test.each([
    "packages/styles/src/components/DatePicker/Calendar.module.css",
    "packages/styles/src/components/DateRangePicker/Calendar.module.css",
  ])("%s shows a 4px dot centered on the 44px cell", (file) => {
    const found: Record<string, string>[] = []
    postcss.parse(readFileSync(file, "utf8")).walkAtRules("media", (media) => {
      if (media.params !== "(max-width: 767px)") return
      media.walkRules(".TodayDot", (rule) => {
        found.push(Object.fromEntries(rule.nodes.filter((n): n is postcss.Declaration => n.type === "decl").map((d) => [d.prop, d.value])))
      })
    })
    expect(found).toEqual([{ "bottom": "8px", "width": "4px", "height": "4px", "margin-left": "-2px" }])
  })
})
