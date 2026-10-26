import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { DateTime } from "luxon"
import { createElement, useSyncExternalStore, type ComponentType, type ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Fragment, h, reactive, ref, type Component, type VNode } from "vue"
import { DateRangePicker as ReactDateRangePicker } from "../../packages/ui/src/components/DateRangePicker"
import { DateRangePicker, type DateRange, type DateRangeShortcut } from "../../packages/vue/src/components/DateRangePicker"
import { animation, flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// React-vs-Vue parity for DateRangePicker (trigger, month stepper, popover
// with one or two calendars and shortcuts).
//
// The clock is fixed (Wednesday 14 October 2026, 10:30) so both frameworks
// render the same months and the same "today" dot. matchMedia is stubbed
// with a viewport width: two calendars from `sm` (576px), shortcuts from
// `md` (768px); resizing calls the media query listeners.
//
// Normalized here, and only here: Reka's popper wrapper (`--reka-popper-*`
// names and `dir="ltr"`, as in tooltip-popover.test.tsx).
//
// Snapshots also record the focused element and the `change` events (with
// the shortcut, when one was picked). In Vue every `update:value` must carry
// the range of the `change` it comes with.

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
  width = 1024
  mediaQueries.clear()
  vi.stubGlobal("matchMedia", (query: string) => {
    const entry = { min: Number(/min-width: (\d+)px/.exec(query)?.[1]), listeners: new Set<() => void>() }
    mediaQueries.add(entry)
    return {
      get matches() {
        return width >= entry.min
      },
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
})

const snapshotDom = () => {
  const clone = document.body.cloneNode(true) as HTMLElement
  normalize(clone)
  const extra = [describeFocus(), `events: ${events.join(" | ")}`]
  events = []
  return `${serializeDom(clone)}\n${extra.join("\n")}`
}

const formatRange = (range: DateRange | null, shortcut?: DateRangeShortcut) =>
  `${range ? `[${range[0].toISO()}, ${range[1].toISO()}]` : "null"}${shortcut ? ` shortcut=${shortcut.label}` : ""}`

// ---------------------------------------------------------------------------
// Data

const today = () => DateTime.local()

// The React docs demo's shortcuts
const dayShortcuts: DateRangeShortcut[] = [
  { label: "Today", getDateRange: () => [today().startOf("day"), today().endOf("day")] },
  { label: "Yesterday", getDateRange: () => [today().minus({ days: 1 }).startOf("day"), today().minus({ days: 1 }).endOf("day")] },
  { label: "Last 7 days", getDateRange: () => [today().endOf("day").minus({ days: 7 }).startOf("day"), today().endOf("day")] },
  { label: "Last 30 days", getDateRange: () => [today().endOf("day").minus({ days: 30 }).startOf("day"), today().endOf("day")] },
]

const range = (from: [number, number, number], to: [number, number, number]): DateRange => [
  DateTime.local(...from).startOf("day"),
  DateTime.local(...to).endOf("day"),
]

const oct5to12 = range([2026, 10, 5], [2026, 10, 12])
const octMonth = range([2026, 10, 1], [2026, 10, 31])
const sepMonth = range([2026, 9, 1], [2026, 9, 30])

// ---------------------------------------------------------------------------
// Rendering

type Case = {
  value?: DateRange | null
  /** Plain props, identical in both frameworks */
  props?: Record<string, unknown>
  /** Parent updates `value` from changes (otherwise it keeps its value) */
  controlled?: boolean
}

type Update = (patch: Partial<Case>) => void

const reactPicker = (c: Case, update: Update): ReactElement => (
  <>
    {createElement(ReactDateRangePicker as unknown as ComponentType<Record<string, unknown>>, {
      value: c.value ?? null,
      onChange: (next: DateRange | null, shortcut?: DateRangeShortcut) => {
        events.push(`change ${formatRange(next, shortcut)}`)
        if (c.controlled) update({ value: next })
      },
      ...c.props,
    })}
    <button data-testid="outside">Outside</button>
  </>
)

const vuePicker = (c: Case, update: Update): VNode =>
  h(Fragment, [
    h(DateRangePicker as unknown as Component, {
      "value": c.value ?? null,
      "onUpdate:value": (next: DateRange | null) => {
        vueUpdates.push(formatRange(next))
        if (c.controlled) update({ value: next })
      },
      "onChange": (next: DateRange | null, shortcut?: DateRangeShortcut) => {
        vueChanges.push(formatRange(next))
        events.push(`change ${formatRange(next, shortcut)}`)
      },
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
  hover: (target: Target) => Promise<void>
  key: (key: string, target?: Target) => Promise<void>
  focus: (target: Target) => Promise<void>
  advance: (ms: number) => Promise<void>
  set: (patch: Partial<Case>) => Promise<void>
  resize: (next: number) => Promise<void>
  open: () => Promise<void>
}

const TRIGGER = 'span[role="button"]'
const CONTAINER = ".CalendarContainer"
const mouse = { pointerType: "mouse" }

/** A day button of a visible (not exiting) calendar, optionally by month label */
const day = (n: number, monthLabel?: string) => () =>
  Array.from(document.querySelectorAll<HTMLElement>(".Calendar")).flatMap((calendar) => {
    if (calendar.closest("[data-exiting]")) return []
    if (monthLabel && calendar.querySelector(".MonthLabel")?.textContent !== monthLabel) return []
    return Array.from(calendar.querySelectorAll<HTMLButtonElement>(".InteractiveDay")).filter(
      (button) => button.firstChild?.textContent === String(n),
    )
  })[0] ?? null

const button = (label: string) => `[aria-label="${label}"]`
const shortcut = (label: string) => () =>
  Array.from(document.querySelectorAll(".Shortcuts button")).find((element) => element.textContent === label) ?? null

const walk = async (initial: Case, steps: (tools: Tools) => Promise<void>) => {
  const initialWidth = width
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
      // testing-library's mouseEnter also fires mouseover (React's onMouseEnter)
      hover: (target) => fire(target, "mouseEnter"),
      key: (key, target = () => document.activeElement) => fire(target, "keyDown", { key }),
      focus: (target) => dispatch(() => (resolve(target) as HTMLElement).focus()),
      advance: (ms) => run(() => vi.advanceTimersByTime(ms)),
      set: (patch) => run(() => update(patch)),
      resize: (next) =>
        run(() => {
          width = next
          for (const entry of mediaQueries) for (const listener of entry.listeners) listener()
        }),
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
    width = initialWidth
    mediaQueries.clear()
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

const closedCases: Array<[string, Case]> = [
  ["placeholder", {}],
  ["range", { value: oct5to12 }],
  ["one-day range shows one date", { value: range([2026, 10, 9], [2026, 10, 9]) }],
  ["custom placeholder", { props: { placeholder: "Pick a range" } }],
  ["trigger date format", { value: oct5to12, props: { triggerDateFormat: "MMM d" } }],
  ["a matching shortcut shows its label", { value: dayShortcuts[2]!.getDateRange(), props: { shortcuts: dayShortcuts } }],
  ["disabled", { value: oct5to12, props: { disabled: true } }],
  ["soft", { value: oct5to12, props: { variant: "soft" } }],
  ["ghost", { props: { variant: "ghost" } }],
  ...["3xs", "sm", "lg", "3xl"].map((size): [string, Case] => [`size ${size}`, { value: oct5to12, props: { size } }]),
  ["pill false", { props: { pill: false } }],
  ["block", { props: { block: true } }],
  ["clearable with a value", { value: oct5to12, props: { clearable: true } }],
  ["clearable without a value", { props: { clearable: true } }],
  ["dropdown icon chevronDown", { props: { dropdownIconType: "chevronDown" } }],
  ["without icon", { props: { triggerShowIcon: false } }],
  ["trigger class", { props: { triggerClassName: "w-[260px] font-semibold" } }],
  ["stepper: a whole month", { value: octMonth, props: { triggerStepperUnit: "month" } }],
  ["stepper: not a whole month shows the range", { value: oct5to12, props: { triggerStepperUnit: "month" } }],
  ["stepper: no value", { props: { triggerStepperUnit: "month" } }],
  [
    "stepper: month clipped by max, next disabled",
    { value: range([2026, 10, 1], [2026, 10, 14]), props: { triggerStepperUnit: "month", max: DateTime.local(2026, 10, 14).endOf("day") } },
  ],
  [
    "stepper: month clipped by min, previous disabled",
    { value: range([2026, 10, 10], [2026, 10, 31]), props: { triggerStepperUnit: "month", min: DateTime.local(2026, 10, 10) } },
  ],
  ["stepper: disabled", { value: octMonth, props: { triggerStepperUnit: "month", disabled: true } }],
  [
    "stepper: pill false, clearable, size lg, class",
    { value: octMonth, props: { triggerStepperUnit: "month", pill: false, clearable: true, size: "lg", triggerClassName: "custom" } },
  ],
]

const openCases: Array<[string, Case, number?]> = [
  ["no value: this month and the next", {}],
  ["range in view, with trails across months", { value: range([2026, 10, 20], [2026, 11, 6]) }],
  ["range in another month", { value: range([2025, 2, 10], [2025, 2, 20]) }],
  ["one-day range", { value: range([2026, 10, 9], [2026, 10, 9]) }],
  ["range starting on a Sunday and ending on a Saturday", { value: range([2026, 11, 1], [2026, 11, 28]) }],
  [
    "min and max are inclusive whole days",
    { props: { min: DateTime.local(2026, 10, 10, 15), max: DateTime.local(2026, 11, 24, 9) } },
  ],
  ["max this month: the left calendar shows the month before", { props: { max: DateTime.local(2026, 10, 20) } }],
  ["value at max shows the month before on the left", { value: octMonth, props: { max: DateTime.local(2026, 10, 31).endOf("day") } }],
  ["shortcuts", { props: { shortcuts: dayShortcuts } }],
  ["active shortcut is selected and checked", { value: dayShortcuts[0]!.getDateRange(), props: { shortcuts: dayShortcuts } }],
  ["below md: no shortcuts", { props: { shortcuts: dayShortcuts } }, 700],
  ["below sm: one calendar", { value: oct5to12, props: { shortcuts: dayShortcuts } }, 500],
  ["below sm, max this month: no shift", { props: { max: DateTime.local(2026, 10, 20) } }, 500],
  ["side top, offset 12", { props: { side: "top", sideOffset: 12 } }],
  ["align start (offset -5)", { props: { align: "start" } }],
  ["align end, offset 4", { props: { align: "end", alignOffset: 4 } }],
]

describe("DateRangePicker parity: markup", () => {
  test.each(closedCases)("closed: %s", async (_name, c) => {
    expectSame(await pair(c))
  })

  test.each(openCases)("open: %s", async (_name, c, viewport = 1024) => {
    width = viewport
    expectSame(await pair(c, { open: true }))
  })

  test.each([true, false])("open with animations %s", async (animated) => {
    animation.disabled = !animated
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        tools.snapshot()
        await tools.advance(400)
        tools.snapshot()
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// Behaviour

describe("DateRangePicker parity: behaviour", () => {
  test("opens on pointer down, closes on Escape and on an outside pointer down", async () => {
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
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
        await tools.key(" ")
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("range selection: start, hover preview, leave, earlier start, end (controlled)", async () => {
    expectSame(
      await walk({ controlled: true }, async (tools) => {
        await tools.open()
        await tools.hover(day(8))
        tools.snapshot()
        await tools.click(day(8))
        tools.snapshot()
        await tools.hover(day(12))
        tools.snapshot()
        await tools.hover(day(3, "November 2026"))
        tools.snapshot()
        await tools.hover(day(2))
        tools.snapshot()
        await tools.fire(CONTAINER, "mouseLeave")
        tools.snapshot()
        await tools.click(day(6))
        await tools.hover(day(20))
        tools.snapshot()
        await tools.click(day(4, "November 2026"))
        await tools.advance(100)
        tools.snapshot()
        await tools.click(day(1))
        await tools.click(day(1))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("uncontrolled: the parent keeps its range", async () => {
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        await tools.click(day(20))
        await tools.click(day(22))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("maxRangeDays: days past the limit are disabled while selecting", async () => {
    expectSame(
      await walk({ controlled: true, props: { maxRangeDays: 5 } }, async (tools) => {
        await tools.open()
        await tools.click(day(10))
        await tools.hover(day(14))
        tools.snapshot()
        expect((day(15)() as HTMLButtonElement).disabled).toBe(true)
        await tools.click(day(14))
        await tools.advance(100)
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
        // Disabled buttons: browsers do not click them (jsdom would dispatch
        // to Vue's listener, React filters it)
        expect((day(9)() as HTMLButtonElement).disabled).toBe(true)
        expect((day(25)() as HTMLButtonElement).disabled).toBe(true)
        await tools.click(day(10, "October 2026"))
        await tools.click(day(24, "October 2026"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("shortcuts: picking one emits it and the trigger shows its label", async () => {
    expectSame(
      await walk({ controlled: true, props: { shortcuts: dayShortcuts, clearable: true } }, async (tools) => {
        await tools.open()
        await tools.click(shortcut("Last 7 days"))
        await tools.advance(100)
        tools.snapshot()
        await tools.click(shortcut("Yesterday"))
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(button("Clear current value"), "pointerDown", { button: 0, ...mouse })
        await tools.click(button("Clear current value"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("a shortcut ends an unfinished selection", async () => {
    expectSame(
      await walk({ controlled: true, props: { shortcuts: dayShortcuts } }, async (tools) => {
        await tools.open()
        await tools.click(day(2))
        await tools.hover(day(5))
        await tools.click(shortcut("Today"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test.each([true, false])("month navigation buttons (animations %s)", async (animated) => {
    animation.disabled = !animated
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        await tools.click(button("Next month"))
        tools.snapshot()
        await tools.advance(200)
        tools.snapshot()
        await tools.advance(300)
        tools.snapshot()
        await tools.click(button("Previous month"))
        await tools.click(button("Previous month"))
        await tools.advance(50)
        tools.snapshot()
        await tools.advance(500)
        tools.snapshot()
      }),
    )
  })

  test.each([true, false])("below sm: one calendar navigates (animations %s)", async (animated) => {
    animation.disabled = !animated
    width = 500
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        await tools.click(button("Next month"))
        await tools.advance(200)
        tools.snapshot()
        await tools.advance(300)
        await tools.resize(1024)
        await tools.advance(100)
        tools.snapshot()
        await tools.click(button("Previous month"))
        await tools.advance(500)
        tools.snapshot()
      }),
    )
  })

  test("navigation stops at min and max months", async () => {
    expectSame(
      await walk({ props: { min: DateTime.local(2026, 9, 5), max: DateTime.local(2026, 12, 20) } }, async (tools) => {
        await tools.open()
        await tools.click(button("Previous month"))
        await tools.advance(500)
        tools.snapshot()
        await tools.click(button("Next month"))
        await tools.click(button("Next month"))
        await tools.advance(500)
        tools.snapshot()
      }),
    )
  })

  test("a value outside the view resets the calendars; one inside clears the selection", async () => {
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        await tools.click(day(20))
        await tools.hover(day(23))
        await tools.set({ value: range([2026, 11, 2], [2026, 11, 4]) })
        tools.snapshot()
        await tools.click(button("Next month"))
        await tools.click(button("Next month"))
        await tools.advance(500)
        await tools.set({ value: range([2025, 1, 6], [2025, 1, 9]) })
        await tools.advance(100)
        tools.snapshot()
        await tools.set({ value: null })
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("resizing across sm and md while open", async () => {
    expectSame(
      await walk({ value: oct5to12, props: { shortcuts: dayShortcuts } }, async (tools) => {
        await tools.open()
        await tools.resize(700)
        tools.snapshot()
        await tools.resize(500)
        await tools.advance(100)
        tools.snapshot()
        await tools.resize(900)
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("stepper: arrows step a month on click without opening the popover", async () => {
    expectSame(
      await walk({ value: octMonth, controlled: true, props: { triggerStepperUnit: "month", max: DateTime.local(2026, 11, 20) } }, async (tools) => {
        await tools.fire(button("Previous month"), "pointerDown", { button: 0, ...mouse })
        await tools.click(button("Previous month"))
        await tools.advance(100)
        tools.snapshot()
        await tools.fire(button("Next month"), "pointerDown", { button: 0, ...mouse })
        await tools.click(button("Next month"))
        await tools.click(button("Next month"))
        await tools.advance(100)
        tools.snapshot()
        await tools.click(button("Next month"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("stepper: opening the popover from the month text, picking a range leaves the stepper", async () => {
    expectSame(
      await walk({ value: sepMonth, controlled: true, props: { triggerStepperUnit: "month" } }, async (tools) => {
        await tools.fire(".StepperText", "pointerDown", { button: 0, ...mouse })
        await tools.advance(100)
        tools.snapshot()
        await tools.click(day(3, "September 2026"))
        await tools.click(day(9, "September 2026"))
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("stepper: Enter on an arrow is left to the button (no popover)", async () => {
    expectSame(
      await walk({ value: octMonth, controlled: true, props: { triggerStepperUnit: "month" } }, async (tools) => {
        await tools.focus(button("Previous month"))
        await tools.key("Enter")
        await tools.key(" ")
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("calendar grid: day buttons have no key handling of their own", async () => {
    expectSame(
      await walk({ value: oct5to12 }, async (tools) => {
        await tools.open()
        await tools.focus(day(7))
        await tools.key("ArrowRight")
        await tools.key("ArrowDown")
        await tools.key("Enter")
        tools.snapshot()
        await tools.key("Escape")
        await tools.advance(100)
        tools.snapshot()
      }),
    )
  })

  test("ref() holding a range (deep reactive proxy) works like a plain value", async () => {
    const holder = ref<DateRange | null>(oct5to12)
    const { container } = mountVue(() =>
      h(DateRangePicker, { "value": holder.value, "onUpdate:value": (next: DateRange | null) => (holder.value = next) }),
    )
    await flushVue()
    expect(container.querySelector(".TriggerText")?.textContent).toBe("10/05/26-10/12/26")
  })
})
