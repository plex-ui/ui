import { act, cleanup, render } from "@testing-library/react"
import { DateTime } from "luxon"
import { createElement, createRef, useSyncExternalStore, type ComponentType, type ReactElement } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString as reactRenderToString } from "react-dom/server"
import { describe, expect, test } from "vitest"
import { createSSRApp, h, reactive, ref, type VNode } from "vue"
import { renderToString as vueRenderToString } from "vue/server-renderer"
import { DateInput as RDateInput } from "../../packages/ui/src/components/DateInput"
import { Field as RField } from "../../packages/ui/src/components/Field"
import RCalendar from "../../packages/ui/src/components/Icon/svg/Calendar"
import { DateInput } from "../../packages/vue/src/components/DateInput"
import { Field } from "../../packages/vue/src/components/Field"
import Calendar from "../../packages/vue/src/components/Icon/svg/Calendar"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for DateInput: rendered markup for every prop, then
// typing, pasting and deleting through the Maskito mask with the emitted
// values compared step by step.
//
// Typing is simulated the way a browser does it: a cancelable `beforeinput`
// (Maskito handles it and may cancel it), then, unless cancelled, the native
// edit (value set past React's value tracker, caret moved) and an `input`
// event, on which Maskito applies the masked state. Snapshots include the
// input's `value` property and caret, which attributes do not show.

type Props = Record<string, unknown>
type R = ComponentType<Props>

const date = (iso: string) => DateTime.fromISO(iso)
const fmt = (value: unknown) => (value === null ? "null" : (value as DateTime).toISO())

const theInput = () => document.querySelector("input") as HTMLInputElement

const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!

/** One `beforeinput` + native edit + `input`, as a browser fires them. */
const edit = (input: HTMLInputElement, inputType: string, data: string | null) => {
  const before = new InputEvent("beforeinput", { inputType, data, bubbles: true, cancelable: true })
  input.dispatchEvent(before)
  if (before.defaultPrevented) return
  const { value } = input
  let start = input.selectionStart ?? value.length
  let end = input.selectionEnd ?? value.length
  if (inputType.startsWith("delete") && start === end) {
    if (inputType.includes("Backward")) start = Math.max(0, start - 1)
    else end = Math.min(value.length, end + 1)
  }
  const inserted = data ?? ""
  valueSetter.call(input, value.slice(0, start) + inserted + value.slice(end))
  input.setSelectionRange(start + inserted.length, start + inserted.length)
  input.dispatchEvent(new InputEvent("input", { inputType, data, bubbles: true }))
}

const typeText = (input: HTMLInputElement, text: string) => {
  for (const char of text) edit(input, "insertText", char)
}

const describeInput = () => {
  const input = theInput()
  return `value: ${JSON.stringify(input.value)} caret: ${input.selectionStart}-${input.selectionEnd}`
}

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

const reactDateInput = (props: Props) => {
  const { startAdornment, endAdornment, ...rest } = props
  return createElement(RDateInput as R, {
    value: null,
    onChange: () => {},
    ...rest,
    ...(startAdornment ? { startAdornment: createElement(RCalendar, { className: "fill-tertiary" }) } : {}),
    ...(endAdornment ? { endAdornment: createElement("span", { className: "tabular-nums" }, "UTC") } : {}),
  })
}
const vueDateInput = (props: Props) => {
  const { className, startAdornment, endAdornment, ...rest } = props
  return h(
    DateInput as never,
    { value: null, ...rest, ...(className ? { class: className } : {}) },
    {
      ...(startAdornment ? { startAdornment: () => h(Calendar, { class: "fill-tertiary" }) } : {}),
      ...(endAdornment ? { endAdornment: () => h("span", { class: "tabular-nums" }, "UTC") } : {}),
    },
  )
}

const SIZES = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"]
const value = date("2024-03-15T14:30:45")

const cases: Array<[string, Props]> = [
  ["empty", {}],
  ["value", { value }],
  ["mode mm/dd/yyyy with /", { value, mode: "mm/dd/yyyy", separator: "/" }],
  ["mode yyyy/mm/dd with -", { value, mode: "yyyy/mm/dd", separator: "-" }],
  ["mode mm/yy", { value, mode: "mm/yy" }],
  ["mode dd/mm", { value, mode: "dd/mm" }],
  ["mode yyyy", { value, mode: "yyyy" }],
  ["empty with mode mm/dd/yyyy", { mode: "mm/dd/yyyy", separator: "/" }],
  ["timeMode HH:MM", { value, timeMode: "HH:MM" }],
  ["timeMode HH:MM:SS", { value, timeMode: "HH:MM:SS" }],
  ["timeMode HH:MM AA", { value, timeMode: "HH:MM AA" }],
  ["empty with timeMode", { timeMode: "HH:MM:SS" }],
  ["dateTimeSeparator", { value, timeMode: "HH:MM", dateTimeSeparator: " " }],
  ["dateTimeSeparator without timeMode is unused", { value, dateTimeSeparator: " at " }],
  ["value before min shows min", { value, min: date("2024-04-01") }],
  ["value after max shows max", { value, max: date("2024-02-01") }],
  ["min and max around the value", { value, min: date("2024-03-01"), max: date("2024-03-31") }],
  ["clearable with a value", { value, clearable: true }],
  ["clearable without a value", { clearable: true }],
  ["clearable and disabled", { value, clearable: true, disabled: true }],
  ["disabled", { value, disabled: true }],
  ["readOnly", { value, readOnly: true }],
  ["invalid", { invalid: true }],
  ["soft variant", { variant: "soft" }],
  ...SIZES.map((size): [string, Props] => [`size ${size}`, { size }]),
  ["pill", { pill: true }],
  ["gutterSize", { gutterSize: "xl" }],
  ["opticallyAlign", { opticallyAlign: "start" }],
  ["explicit placeholder", { placeholder: "Pick a date" }],
  ["empty placeholder", { placeholder: "" }],
  ["class, id, name and aria attributes", { className: "w-full", id: "dob", name: "dob", "aria-label": "Date of birth" }],
  ["adornments", { startAdornment: true, endAdornment: true }],
]

describe("DateInput parity", () => {
  test.each(cases)("%s", async (_name, props) => {
    const { react, vue } = await renderPair(reactDateInput(props), () => vueDateInput(props))
    expect(vue).toBe(react)
  })
})

// Server-renders both, parses each markup into the document, then hydrates
// it: the parsed server markup, then the DOM and the input's value after
// hydration (and its effects).
const dateInputSsrPair = async (props: Props) => {
  const element = reactDateInput(props)
  const renderVue = () => vueDateInput(props)
  const container = document.createElement("div")
  document.body.appendChild(container)

  container.innerHTML = reactRenderToString(element)
  const reactServer = serializeDom(container)
  let root: ReturnType<typeof hydrateRoot> | undefined
  await act(async () => {
    root = hydrateRoot(container, element)
  })
  const react = [reactServer, serializeDom(container), theInput().value]
  await act(async () => root!.unmount())

  container.innerHTML = await vueRenderToString(createSSRApp({ render: renderVue }))
  const vueServer = serializeDom(container)
  const app = createSSRApp({ render: renderVue })
  app.mount(container)
  await flushVue()
  const vue = [vueServer, serializeDom(container), theInput().value]
  app.unmount()
  container.remove()
  return { react, vue }
}

describe("DateInput SSR parity", () => {
  test.each<[string, Props, string]>([
    ["clearable with a value", { value, clearable: true }, "15.03.2024"],
    ["date and time", { value, timeMode: "HH:MM" }, "15.03.2024, 14:30"],
    ["empty", { clearable: true }, ""],
  ])("%s: the server renders an empty field, hydration formats the value", async (_name, props, shown) => {
    const { react, vue } = await dateInputSsrPair(props)
    expect(vue).toEqual(react)
    // Formatting runs in an effect: no text, clear button or adornment attribute on the server
    expect(react[0]).toMatch(/<input [^\n]*value=""/)
    expect(react[0]).not.toContain("Clear input")
    expect(react[0]).not.toContain("data-has-end-adornment")
    expect(react[2]).toBe(shown)
  })
})

describe("DateInput in Field parity", () => {
  test.each<[string, Props]>([
    ["label and description", { label: "Date of birth", description: "Enter your date of birth" }],
    ["error", { label: "Date of birth", errorMessage: "Date is required" }],
    ["opticallyAlign", { label: "Date of birth", opticallyAlign: "start" }],
  ])("%s", async (_name, props) => {
    const { react, vue } = await renderPair(
      createElement(RField as R, props, createElement(RDateInput as R, { value: null, onChange: () => {}, clearable: true })),
      () => h(Field as never, props, () => h(DateInput as never, { value: null, clearable: true })),
    )
    expect(vue).toBe(react)
  })
})

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------

type State = Props & { value: DateTime | null }

/**
 * Mounts a React and a Vue app reading one shared state and runs the same
 * steps. `accept: false` keeps `value` as it is, like a parent that ignores
 * `onChange`. Snapshots hold the DOM, the input's value and caret, and the
 * values emitted since the previous snapshot.
 */
const walk = async (
  initial: State,
  steps: (tools: {
    input: () => HTMLInputElement
    run: (fn: () => void) => Promise<void>
    set: (patch: Partial<State>) => Promise<void>
    snap: () => void
  }) => Promise<void>,
  { accept = true, inField = false }: { accept?: boolean; inField?: boolean } = {},
) => {
  let current: State = { ...initial }
  const listeners = new Set<() => void>()
  let vueState = reactive({ ...initial }) as State
  let emitted: string[] = []

  const set = async (patch: Partial<State>) => {
    await run(() => {
      current = { ...current, ...patch }
      Object.assign(vueState, patch)
      for (const listener of listeners) listener()
    })
  }
  const run = async (fn: () => void) => {
    await act(async () => {
      fn()
    })
    await flushVue()
  }

  function ReactApp() {
    const state = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => current,
    )
    const { value: stateValue, ...props } = state
    const input = createElement(RDateInput as R, {
      ...props,
      value: stateValue,
      onChange: (next: DateTime | null) => {
        emitted.push(`change ${fmt(next)}`)
        if (accept) {
          current = { ...current, value: next }
          for (const listener of listeners) listener()
        }
      },
    })
    return inField ? createElement(RField as R, { label: "Date", errorMessage: stateValue ? undefined : "Date is required" }, input) : input
  }

  const vueApp = (): VNode => {
    const { value: stateValue, ...props } = vueState
    const input = h(DateInput as never, {
      ...props,
      "value": stateValue,
      "onUpdate:value": (next: DateTime | null) => {
        emitted.push(`change ${fmt(next)}`)
        if (accept) vueState.value = next
      },
      "onChange": (next: DateTime | null) => emitted.push(`change event ${fmt(next)}`),
    })
    return inField ? h(Field as never, { label: "Date", errorMessage: stateValue ? undefined : "Date is required" }, () => input) : input
  }

  const results: string[][] = []
  for (const framework of ["react", "vue"] as const) {
    // Fresh state per framework (the React run also wrote to the Vue state)
    current = { ...initial }
    vueState = reactive({ ...initial }) as State
    emitted = []
    const snaps: string[] = []
    const snap = () => {
      // Vue emits `change` right after `update:value`, with the same value
      const changes = emitted.filter((entry) => !entry.startsWith("change event"))
      if (framework === "vue") {
        const events = emitted.filter((entry) => entry.startsWith("change event")).map((entry) => entry.replace("change event", "change"))
        expect(events).toEqual(changes)
      }
      snaps.push([serializeDom(), describeInput(), ...changes].join("\n"))
      emitted = []
    }
    let unmount = cleanup
    if (framework === "react") {
      await act(async () => {
        render(createElement(ReactApp) as ReactElement)
      })
    } else {
      unmount = mountVue(vueApp).unmount
      await flushVue()
    }
    await run(() => theInput().focus())
    await steps({ input: theInput, run, set, snap })
    results.push(snaps)
    unmount()
  }
  return { react: results[0]!, vue: results[1]! }
}

const typeSteps = (text: string) => async ({ input, run, snap }: Parameters<Parameters<typeof walk>[1]>[0]) => {
  snap()
  for (const char of text) {
    await run(() => edit(input(), "insertText", char))
    snap()
  }
}

describe("DateInput typing parity", () => {
  test("typing a full date emits it once complete", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("15032024"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "15.03.2024"')
    expect(react.at(-1)).toContain("change 2024-03-15T00:00:00.000")
    expect(react.slice(0, -1).join("\n")).not.toContain("change ")
  })

  test("a single digit that cannot start a day is zero-padded", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("4"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "04"')
  })

  test("an invalid day is corrected", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("39"))
    expect(vue).toEqual(react)
  })

  test("an invalid month is corrected", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("1513"))
    expect(vue).toEqual(react)
  })

  test("non-digits are rejected", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("a1b5"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "15"')
  })

  test("February 30th", async () => {
    const { react, vue } = await walk({ value: null }, typeSteps("30022023"))
    expect(vue).toEqual(react)
  })

  test("US format", async () => {
    const { react, vue } = await walk({ value: null, mode: "mm/dd/yyyy", separator: "/" }, typeSteps("03152024"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "03/15/2024"')
  })

  test("ISO format", async () => {
    const { react, vue } = await walk({ value: null, mode: "yyyy/mm/dd", separator: "-" }, typeSteps("20240315"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "2024-03-15"')
  })

  test("date and time", async () => {
    const { react, vue } = await walk({ value: null, timeMode: "HH:MM" }, typeSteps("150320241430"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "15.03.2024, 14:30"')
    expect(react.at(-1)).toContain("change 2024-03-15T14:30:00.000")
  })

  test("date and time with seconds and an invalid hour", async () => {
    const { react, vue } = await walk({ value: null, timeMode: "HH:MM:SS" }, typeSteps("15032024291530"))
    expect(vue).toEqual(react)
  })

  test("typing past max clamps to max", async () => {
    const { react, vue } = await walk(
      { value: null, min: date("2024-03-10"), max: date("2024-03-20") },
      typeSteps("25032024"),
    )
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "20.03.2024"')
  })

  test("typing before min clamps to min", async () => {
    const { react, vue } = await walk({ value: null, min: date("2024-03-10") }, typeSteps("01032024"))
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: "10.03.2024"')
  })
})

describe("DateInput editing parity", () => {
  test("pasting a formatted date", async () => {
    const { react, vue } = await walk({ value: null }, async ({ input, run, snap }) => {
      await run(() => edit(input(), "insertFromPaste", "15.03.2024"))
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("change 2024-03-15")
  })

  test("pasting digits only, another format and garbage", async () => {
    const { react, vue } = await walk({ value: null }, async ({ input, run, snap }) => {
      await run(() => edit(input(), "insertFromPaste", "15032024"))
      snap()
      await run(() => input().setSelectionRange(0, input().value.length))
      await run(() => edit(input(), "insertFromPaste", "2024-03-16"))
      snap()
      await run(() => input().setSelectionRange(0, input().value.length))
      await run(() => edit(input(), "insertFromPaste", "abc"))
      snap()
    })
    expect(vue).toEqual(react)
  })

  test("backspace through a complete date, then emptying it", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15") }, async ({ input, run, snap }) => {
      snap()
      await run(() => input().setSelectionRange(10, 10))
      for (let i = 0; i < 11; i++) {
        await run(() => edit(input(), "deleteContentBackward", null))
        snap()
      }
    })
    expect(vue).toEqual(react)
    expect(react.at(-1)).toContain('value: ""')
    expect(react.join("\n")).toContain("change null")
  })

  test("deleting in the middle keeps the separators", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15") }, async ({ input, run, snap }) => {
      await run(() => input().setSelectionRange(5, 5))
      await run(() => edit(input(), "deleteContentBackward", null))
      snap()
      await run(() => edit(input(), "deleteContentBackward", null))
      snap()
      await run(() => edit(input(), "deleteContentForward", null))
      snap()
      await run(() => edit(input(), "insertText", "0"))
      snap()
    })
    expect(vue).toEqual(react)
  })

  // Chrome's autofill fires `input` with no `beforeinput`: Maskito fixes the
  // value in its own `input` listener and fires a nested `input`. React reads
  // the text after Maskito's listeners, so it only ever sees the fixed text.
  test("an input event without beforeinput (autofill) is read after Maskito fixes it", async () => {
    const { react, vue } = await walk({ value: null }, async ({ input, run, snap }) => {
      await run(() => {
        valueSetter.call(input(), "15/03/2024")
        input().dispatchEvent(new Event("input", { bubbles: true }))
      })
      snap()
      await run(() => {
        valueSetter.call(input(), "1x2")
        input().dispatchEvent(new Event("input", { bubbles: true }))
      })
      snap()
      // Read before the fix, day 39 of month 13 would parse as a 2025 date
      await run(() => {
        valueSetter.call(input(), "39.13.2024")
        input().dispatchEvent(new Event("input", { bubbles: true }))
      })
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain('value: "15.03.2024"')
  })

  test("selecting all and deleting emits null", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15") }, async ({ input, run, snap }) => {
      await run(() => input().setSelectionRange(0, 10))
      await run(() => edit(input(), "deleteContentBackward", null))
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain("change null")
  })

  test("the clear button empties the field and emits null", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15"), clearable: true }, async ({ run, snap }) => {
      snap()
      const clear = () => document.querySelector('button[aria-label="Clear input"]') as HTMLButtonElement
      await run(() => clear().click())
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[1]).toContain("change null")
    expect(react[1]).not.toContain("Clear input")
  })

  test("arrow keys step the time with timeStep", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15T14:30"), timeMode: "HH:MM", timeStep: 5 }, async ({ input, run, snap }) => {
      await run(() => input().setSelectionRange(16, 16))
      for (const key of ["ArrowUp", "ArrowUp", "ArrowDown"]) {
        await run(() => input().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })))
        snap()
      }
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain('value: "15.03.2024, 14:35"')
  })
})

describe("DateInput value flow parity", () => {
  test("controlled: the parent sets and clears the value", async () => {
    const { react, vue } = await walk({ value: null }, async ({ set, snap }) => {
      await set({ value: date("2024-03-15") })
      snap()
      await set({ value: date("2025-12-31") })
      snap()
      await set({ value: null })
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[1]).toContain('value: "31.12.2025"')
  })

  test("a parent that ignores changes: the typed text stays", async () => {
    const { react, vue } = await walk(
      { value: null },
      async ({ input, run, snap }) => {
        await run(() => typeText(input(), "15032024"))
        snap()
        await run(() => edit(input(), "deleteContentBackward", null))
        snap()
      },
      { accept: false },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('value: "15.03.2024"')
    expect(react[0]).toContain("change 2024-03-15")
  })

  test("a new value with the same date keeps a partly typed edit; another date replaces it", async () => {
    const { react, vue } = await walk(
      { value: date("2024-03-15") },
      async ({ input, run, set, snap }) => {
        await run(() => input().setSelectionRange(10, 10))
        await run(() => edit(input(), "deleteContentBackward", null))
        snap()
        await set({ value: date("2024-03-15") })
        snap()
        await set({ value: date("2024-03-16") })
        snap()
      },
      { accept: false },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('value: "15.03.202"')
    expect(react[2]).toContain('value: "16.03.2024"')
  })

  test("mode and separator changes reformat the value", async () => {
    const { react, vue } = await walk({ value: date("2024-03-15") }, async ({ set, snap }) => {
      await set({ mode: "mm/dd/yyyy", separator: "/" })
      snap()
      await set({ timeMode: "HH:MM" })
      snap()
      await set({ dateTimeSeparator: " " })
      snap()
      await set({ timeMode: undefined })
      snap()
    })
    expect(vue).toEqual(react)
    expect(react[0]).toContain('value: "03/15/2024"')
  })

  test("min with the same milliseconds keeps a partial edit; a new min resets it", async () => {
    const { react, vue } = await walk(
      { value: null, min: date("2024-01-01") },
      async ({ input, run, set, snap }) => {
        await run(() => typeText(input(), "15"))
        snap()
        await set({ min: date("2024-01-01") })
        snap()
        await set({ min: date("2024-01-02") })
        snap()
      },
    )
    expect(vue).toEqual(react)
    expect(react[1]).toContain('value: "15"')
    expect(react[2]).toContain('value: ""')
  })

  test("inside Field: the error follows the value", async () => {
    const { react, vue } = await walk(
      { value: null, clearable: true },
      async ({ input, run, snap }) => {
        snap()
        await run(() => typeText(input(), "15032024"))
        snap()
        await run(() => (document.querySelector('button[aria-label="Clear input"]') as HTMLButtonElement).click())
        snap()
      },
      { inField: true },
    )
    expect(vue).toEqual(react)
    expect(react[0]).toContain('aria-invalid="true"')
    expect(react[1]).not.toContain('aria-invalid="true"')
  })
})

describe("DateInput ref", () => {
  test("exposes focus() and the <input>, where React's ref points at the input", async () => {
    const reactRef = createRef<HTMLInputElement>()
    await act(async () => {
      render(createElement(RDateInput as R, { value: null, onChange: () => {}, ref: reactRef }))
    })
    expect(reactRef.current).toBe(theInput())
    cleanup()

    const vueRef = ref<{ focus: () => void; input: HTMLInputElement | null } | null>(null)
    mountVue(() => h(DateInput as never, { value: null, ref: vueRef }))
    await flushVue()
    expect(vueRef.value!.input).toBe(theInput())
    vueRef.value!.focus()
    expect(document.activeElement).toBe(theInput())
  })
})
