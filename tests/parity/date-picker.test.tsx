import { act, cleanup, fireEvent, render } from "@testing-library/react"
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

beforeEach(() => {
  events = []
  Element.prototype.scrollIntoView = function () {}
})

afterEach(() => {
  vi.useRealTimers()
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
  ["side top, offset 12", { props: { side: "top", sideOffset: 12 } }],
  ["align start (offset -5)", { props: { align: "start" } }],
  ["align end, offset 4", { props: { align: "end", alignOffset: 4 } }],
]

describe("DatePicker parity: markup", () => {
  test.each(closedCases)("closed: %s", async (_name, c) => {
    expectSame(await pair(c))
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

  test("calendar grid: day buttons have no key handling of their own", async () => {
    expectSame(
      await walk({ value: oct20 }, async (tools) => {
        await tools.open()
        await tools.focus(day(20))
        await tools.key("ArrowRight")
        await tools.key("ArrowDown")
        await tools.key("PageDown")
        tools.snapshot()
        await tools.key("Escape")
        await tools.advance(100)
        tools.snapshot()
      }),
    )
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
