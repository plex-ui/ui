import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { createElement, useSyncExternalStore, type ReactElement, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive, type VNode } from "vue"
import { Slider as RSlider } from "../../packages/ui/src/components/Slider"
import { Tooltip as RTooltip } from "../../packages/ui/src/components/Tooltip"
import { Slider } from "../../packages/vue/src/components/Slider"
import { Tooltip, TooltipTriggerDecorator } from "../../packages/vue/src/components/Tooltip"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"
import { renderPair } from "./pair"

// React-vs-Vue parity for Slider. React renders Radix Slider; the Vue port
// renders the same markup from its own port of the Radix primitive.
//
// jsdom lacks what the slider measures with, so both frameworks get the
// same stand-ins: a recording ResizeObserver, matchMedia (the `md`
// breakpoint), pointer capture, and getBoundingClientRect when a test sets
// `rects`.

type Rect = { left: number; top: number; width: number; height: number }

// The `md` breakpoint both useBreakpoint hooks read from :root (else they warn and fall back)
document.documentElement.style.setProperty("--breakpoint-md", "768px")

const observers: FakeResizeObserver[] = []
class FakeResizeObserver {
  targets: Element[] = []
  constructor(public callback: ResizeObserverCallback) {
    observers.push(this)
  }
  observe(target: Element) {
    this.targets.push(target)
  }
  unobserve() {}
  disconnect() {}
}

let tabletAndUp = true
let rects: ((element: Element) => Rect | undefined) | undefined
const captures = new WeakMap<Element, Set<number>>()

const toDomRect = ({ left, top, width, height }: Rect) =>
  ({ left, top, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON() {} }) as DOMRect

beforeEach(() => {
  observers.length = 0
  tabletAndUp = true
  rects = undefined
  vi.stubGlobal("ResizeObserver", FakeResizeObserver)
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: tabletAndUp,
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }))
  const original = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const rect = rects?.(this)
    return rect ? toDomRect(rect) : original.call(this)
  })
  Object.assign(Element.prototype, {
    setPointerCapture(this: Element, id: number) {
      if (!captures.has(this)) captures.set(this, new Set())
      captures.get(this)!.add(id)
    },
    hasPointerCapture(this: Element, id: number) {
      return !!captures.get(this)?.has(id)
    },
    releasePointerCapture(this: Element, id: number) {
      captures.get(this)?.delete(id)
    },
  })
})

afterEach(() => {
  for (const key of ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"]) {
    Reflect.deleteProperty(Element.prototype, key)
  }
})

type Props = Record<string, unknown>

// React prop names map to Vue ones: className is class, onChange is the
// update:value emit, onFocus / onBlur are the focus / blur emits
const toVue = ({ className, onChange, onFocus, onBlur, label, ...props }: Props) => ({
  ...props,
  ...(typeof label === "string" ? { label } : {}),
  ...(className ? { class: className } : {}),
  ...(onChange ? { "onUpdate:value": onChange } : {}),
  ...(onFocus ? { onFocus } : {}),
  ...(onBlur ? { onBlur } : {}),
})

const BASE = { label: "Example field", min: 0, max: 2000, step: 10, unit: "ms", value: 1000 }
const MARKS = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))

const markupCases: [string, Props, boolean?][] = [
  ["overview (reset hidden at the reset value)", { ...BASE, resetValue: 1000 }],
  ["reset shown away from the reset value, custom tooltip", { ...BASE, value: 500, resetValue: 1000, resetTooltip: "Back" }],
  ["no label", { min: 0, max: 100, step: 1, value: 30 }],
  ["prefix unit and unit", { ...BASE, prefixUnit: "$", unit: "k" }],
  ["decimal step", { label: "Ratio", min: 0, max: 1, step: 0.05, value: 0.25 }],
  ["integer value with a decimal step", { label: "Ratio", min: 0, max: 10, step: 0.5, value: 3 }],
  ["disabled", { ...BASE, resetValue: 500, disabled: true }],
  ["track and range colors", { ...BASE, trackColor: "#61C454", rangeColor: "#EF4146" }],
  ["marks (collide in jsdom: hidden)", { label: "Passing grade", min: 1, max: 5, step: 1, value: 3, marks: MARKS }],
  ["unsorted marks", { min: 0, max: 10, step: 1, value: 3, marks: [{ value: 10, label: "Max" }, { value: 0, label: "Min" }] }],
  ["vertical (no marks, no dir)", { label: "Volume", min: 0, max: 100, step: 1, value: 50, orientation: "vertical", marks: MARKS }],
  ["value at the minimum", { ...BASE, value: 0 }],
  ["value at the maximum", { ...BASE, value: 2000 }],
  ["out of bounds (clamped on mount, parent ignores it)", { ...BASE, value: 2500 }],
  ["className on the wrapper", { ...BASE, className: "w-72" }],
  ["other attributes are not passed on", { ...BASE, "data-testid": "slider", "id": "s" }],
  ["range", { range: true, label: "Price range", min: 0, max: 100, step: 1, value: [25, 75], prefixUnit: "$" }],
  ["range, three thumbs", { range: true, label: "Breakpoints", min: 0, max: 100, step: 1, value: [10, 40, 70], minStepsBetweenThumbs: 5 }],
  ["range with unit and decimal step", { range: true, label: "Window", min: 0, max: 10, step: 0.5, value: [1, 7.5], unit: "s" }],
  ["range, vertical, disabled", { range: true, label: "Band", min: 0, max: 100, step: 1, value: [20, 60], orientation: "vertical", disabled: true }],
  ["range ignores resetValue", { range: true, label: "R", min: 0, max: 100, step: 1, value: [20, 60], resetValue: 10 }],
  ["range without a label", { range: true, min: 0, max: 100, step: 1, value: [20, 60] }],
  ["aria-label names the thumb without a label", { min: 0, max: 100, step: 1, value: 30, "aria-label": "Volume" }],
  ["a visible label wins over aria-label", { ...BASE, "aria-label": "Ignored" }],
  ["aria-labelledby wins over the label", { ...BASE, "aria-labelledby": "external" }],
  ["range: aria-label plus each thumb's name", { range: true, min: 0, max: 100, step: 1, value: [20, 60], "aria-label": "Price" }],
  ["range, three thumbs: aria-label plus each thumb's name", { range: true, min: 0, max: 100, step: 1, value: [10, 40, 70], "aria-label": "Stops" }],
  ["range: aria-labelledby plus each thumb", { range: true, label: "R", min: 0, max: 100, step: 1, value: [20, 60], "aria-labelledby": "external" }],
  ["in a form", { ...BASE, resetValue: 1000 }, true],
  ["range in a form", { range: true, label: "R", min: 0, max: 100, step: 1, value: [20, 60] }, true],
]

const reactSlider = (props: Props) => createElement(RSlider as never, { onChange: () => {}, ...props })
const vueSlider = (props: Props) => h(Slider as never, toVue(props))

describe("Slider markup parity", () => {
  test.each(markupCases)("%s", async (_name, props, form) => {
    const { react, vue } = await renderPair(
      form ? <form>{reactSlider(props)}</form> : reactSlider(props),
      () => (form ? h("form", null, [vueSlider(props)]) : vueSlider(props)),
    )
    expect(vue).toBe(react)
  })

  test("below the md breakpoint the value input is wider per character", async () => {
    tabletAndUp = false
    const { react, vue } = await renderPair(reactSlider(BASE), () => vueSlider(BASE))
    expect(vue).toBe(react)
    expect(react).toContain('style="width: 38px"')
  })

  test("a rich label: a tooltip on the label text", async () => {
    const { react, vue } = await renderPair(
      reactSlider({
        ...BASE,
        resetValue: 1000,
        label: (
          <RTooltip content="More details about this field">
            <RTooltip.TriggerDecorator>Example field</RTooltip.TriggerDecorator>
          </RTooltip>
        ),
      }),
      () =>
        h(
          Slider,
          { ...BASE, resetValue: 1000 },
          {
            label: () =>
              h(Tooltip, { content: "More details about this field" }, () =>
                h(TooltipTriggerDecorator, null, () => "Example field"),
              ),
          },
        ),
    )
    expect(vue).toBe(react)
    expect(react).toContain('class="TriggerDecorator"')
  })

  test("an out-of-bounds value is reported clamped on mount", async () => {
    const reactCalls: unknown[] = []
    const vueCalls: unknown[] = []
    const { react, vue } = await renderPair(
      reactSlider({ ...BASE, value: -50, onChange: (v: unknown) => reactCalls.push(v) }),
      () => vueSlider({ ...BASE, value: -50, onChange: (v: unknown) => vueCalls.push(v) }),
    )
    expect(vue).toBe(react)
    expect(vueCalls).toEqual(reactCalls)
    expect(reactCalls).toEqual([0])
  })
})

// ---------------------------------------------------------------------------
// Behaviour: the same script against React and Vue, both reading one shared
// state, with fake timers
// ---------------------------------------------------------------------------

type State = Props & { value: unknown }

type Tools = {
  /** Records the DOM, the focused element, the calls so far and `extra` */
  snapshot: (extra?: string) => void
  fire: (selector: string, event: keyof typeof fireEvent, init?: object) => Promise<void>
  focus: (selector: string) => Promise<void>
  blur: () => Promise<void>
  /** keydown (then keyup) on the focused element */
  key: (key: string, init?: KeyboardEventInit) => Promise<void>
  /** Types `text` into the value input (an `input` event) */
  type: (text: string) => Promise<void>
  advance: (ms: number) => Promise<void>
  /** Updates the state both apps read */
  set: (patch: Partial<State>) => Promise<void>
  run: (action: () => void) => Promise<void>
}

const settle = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

// The tooltip's popper wrapper: Reka names its custom properties
// `--reka-popper-*` and sets `dir`; neither port renders it (see
// tooltip-popover.test.tsx)
const normalizePopper = (root: Element) => {
  for (const wrapper of Array.from(root.querySelectorAll("[data-reka-popper-content-wrapper]"))) {
    wrapper.removeAttribute("dir")
  }
  for (const element of Array.from(root.querySelectorAll("[style]"))) {
    const style = element.getAttribute("style")!
    if (style.includes("--reka-popper-")) element.setAttribute("style", style.replaceAll("--reka-popper-", "--radix-popper-"))
  }
}

const describeElement = (element: Element | null) => {
  if (!element || element === document.body) return "body"
  const role = element.getAttribute("role")
  if (role === "slider") return `thumb ${element.getAttribute("aria-valuenow")}`
  return `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(" ")[0]}` : ""}`
}

const $ = <T extends Element = HTMLElement>(selector: string) => {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`No element for ${selector}`)
  return element
}

const thumbs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="slider"]'))

const walk = async (
  initial: State,
  reactApp: (state: State, set: (patch: Partial<State>) => void, log: string[]) => ReactNode,
  vueApp: (state: State, set: (patch: Partial<State>) => void, log: string[]) => VNode,
  script: (tools: Tools) => Promise<void>,
) => {
  const results = { react: [] as string[], vue: [] as string[], reactLog: [] as string[], vueLog: [] as string[] }

  const tools = (out: string[], log: string[], setState: (patch: Partial<State>) => void): Tools => {
    const run = async (action: () => void) => {
      await act(async () => {
        // Vue skips a listener when the event is not newer than the listener
        // (frozen Date), so the clock moves 1ms before each DOM event
        vi.setSystemTime(Date.now() + 1)
        action()
        await settle()
      })
      await flushVue()
      await settle()
      await flushVue()
    }
    return {
      run,
      snapshot: (extra) => {
        const clone = document.body.cloneNode(true) as HTMLElement
        normalizePopper(clone)
        out.push(
          `${serializeDom(clone)}\nfocus: ${describeElement(document.activeElement)}\nlog: ${JSON.stringify(log)}${extra ? `\n${extra}` : ""}`,
        )
      },
      fire: (selector, event, init) =>
        run(() => {
          ;(fireEvent[event] as (element: Element, init?: object) => boolean)($(selector), init)
        }),
      focus: (selector) => run(() => $(selector).focus()),
      blur: () => run(() => (document.activeElement as HTMLElement).blur()),
      key: async (key, init = {}) => {
        await run(() => {
          fireEvent.keyDown(document.activeElement!, { key, ...init })
        })
        await run(() => {
          fireEvent.keyUp(document.activeElement!, { key, ...init })
        })
      },
      type: (text) => run(() => void fireEvent.input($("input.ValueInput"), { target: { value: text } })),
      advance: (ms) =>
        run(() => {
          vi.advanceTimersByTime(ms)
        }),
      set: (patch) => run(() => setState(patch)),
    }
  }

  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame", "Date", "performance"],
  })
  try {
    // React: an external store read with useSyncExternalStore
    let current = { ...initial }
    const listeners = new Set<() => void>()
    // Like a useState parent: setting the same values renders nothing
    const setReact = (patch: Partial<State>) => {
      if (Object.entries(patch).every(([key, value]) => Object.is(current[key], value))) return
      current = { ...current, ...patch }
      for (const listener of listeners) listener()
    }
    function ReactApp() {
      const state = useSyncExternalStore(
        (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        () => current,
      )
      return <>{reactApp(state, setReact, results.reactLog)}</>
    }
    await act(async () => {
      render(<ReactApp />)
      await settle()
    })
    await script(tools(results.react, results.reactLog, setReact))
    await act(async () => {
      cleanup()
    })
    vi.clearAllTimers()

    const vueState = reactive({ ...initial }) as State
    const setVue = (patch: Partial<State>) => {
      Object.assign(vueState, patch)
    }
    const { unmount } = mountVue(() => vueApp(vueState, setVue, results.vueLog))
    await flushVue()
    await settle()
    await flushVue()
    await script(tools(results.vue, results.vueLog, setVue))
    unmount()
    vi.clearAllTimers()
  } finally {
    vi.useRealTimers()
  }
  return results
}

type Mode = "controlled" | "fixed"

/** A slider whose value is stored on change ("controlled") or ignored ("fixed"); other state keys are props. */
const sliderWalk = (initial: State, mode: Mode, script: (tools: Tools) => Promise<void>, form = false) =>
  walk(
    initial,
    (state, set, log) => {
      const slider = reactSlider({
        ...state,
        onChange: (value: unknown) => {
          log.push(`change ${JSON.stringify(value)}`)
          if (mode === "controlled") set({ value })
        },
        onFocus: (event: FocusEvent) => log.push(`focus ${describeElement(event.target as Element)}`),
        onBlur: (event: FocusEvent) => log.push(`blur ${describeElement(event.target as Element)}`),
      })
      return form ? (
        <form onInput={(event) => log.push(`input ${(event.target as HTMLInputElement).value}`)}>{slider}</form>
      ) : (
        slider
      )
    },
    (state, set, log) => {
      const slider = vueSlider({
        ...state,
        onChange: (value: unknown) => {
          log.push(`change ${JSON.stringify(value)}`)
          if (mode === "controlled") set({ value })
        },
        onFocus: (event: FocusEvent) => log.push(`focus ${describeElement(event.target as Element)}`),
        onBlur: (event: FocusEvent) => log.push(`blur ${describeElement(event.target as Element)}`),
      })
      return form
        ? h("form", { onInput: (event: Event) => log.push(`input ${(event.target as HTMLInputElement).value}`) }, [slider])
        : slider
    },
    script,
  )

const valueOf = (step: string) => step.match(/aria-valuenow="([^"]+)"/g)?.map((match) => match.slice(15, -1)).join(",")
const durationOf = (step: string) => step.match(/--slider-duration: ([\d.]+ms)/)?.[1]

describe("Slider keyboard parity", () => {
  test("thumb keys: arrows step, Shift and Page keys step by ten, Home and End jump", async () => {
    const result = await sliderWalk({ ...BASE, resetValue: 1000 }, "controlled", async (t) => {
      await t.run(() => thumbs()[0]!.focus())
      t.snapshot()
      for (const [key, init] of [
        ["ArrowRight"],
        ["ArrowUp"],
        ["ArrowLeft"],
        ["ArrowDown"],
        ["ArrowDown"],
        ["PageUp"],
        ["PageDown"],
        ["ArrowRight", { shiftKey: true }],
        ["ArrowLeft", { shiftKey: true }],
        ["End"],
        ["ArrowRight"],
        ["Home"],
        ["ArrowLeft"],
      ] as [string, KeyboardEventInit?][]) {
        await t.key(key, init)
        t.snapshot()
      }
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual([
      "1000",
      "1010",
      "1020",
      "1010",
      "1000",
      "990",
      "1090",
      "990",
      "1090",
      "990",
      "2000",
      "2000",
      "0",
      "0",
    ])
    // The thumb transition follows how far it moves (at least 100ms)
    expect(result.react.map(durationOf).slice(9)).toEqual(["100ms", "151.5ms", "151.5ms", "300ms", "300ms"])
  })

  test("vertical: up and right increase, down and left decrease", async () => {
    const result = await sliderWalk(
      { label: "Volume", min: 0, max: 100, step: 5, value: 50, orientation: "vertical" },
      "controlled",
      async (t) => {
        await t.run(() => thumbs()[0]!.focus())
        for (const key of ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "PageDown", "PageUp"]) {
          await t.key(key)
          t.snapshot()
        }
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.map(valueOf)).toEqual(["55", "60", "55", "50", "0", "50"])
  })

  test("range: each thumb steps its own value; crossing swaps values and moves focus", async () => {
    const result = await sliderWalk(
      { range: true, label: "Price range", min: 0, max: 100, step: 1, value: [25, 27], prefixUnit: "$" },
      "controlled",
      async (t) => {
        await t.run(() => thumbs()[1]!.focus())
        t.snapshot()
        await t.key("ArrowRight")
        t.snapshot()
        for (let i = 0; i < 4; i++) {
          await t.key("ArrowLeft")
          t.snapshot()
        }
        await t.key("End")
        t.snapshot()
        await t.key("Home")
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["25,27", "25,28", "25,27", "25,26", "25,25", "24,25", "24,100", "0,100"])
    expect(result.react[5]).toContain("focus: thumb 24")
  })

  test("range: minStepsBetweenThumbs stops a thumb short of the other", async () => {
    const result = await sliderWalk(
      { range: true, label: "Breakpoints", min: 0, max: 100, step: 1, value: [10, 40, 70], minStepsBetweenThumbs: 5 },
      "controlled",
      async (t) => {
        await t.run(() => thumbs()[1]!.focus())
        await t.key("PageDown")
        await t.key("PageDown")
        await t.key("PageDown")
        t.snapshot()
        await t.key("ArrowLeft", { shiftKey: true })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["10,20,70", "10,20,70"])
  })

  test("a fixed value reports each step from the same value", async () => {
    const result = await sliderWalk({ ...BASE }, "fixed", async (t) => {
      await t.run(() => thumbs()[0]!.focus())
      await t.key("ArrowRight")
      await t.key("ArrowRight")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus thumb 1000", "change 1010", "change 1010"])
  })

  test("disabled: the keys and the pointer change nothing", async () => {
    rects = (element) => (element.classList.contains("Slider") ? { left: 0, top: 0, width: 200, height: 10 } : undefined)
    const result = await sliderWalk({ ...BASE, disabled: true }, "controlled", async (t) => {
      await t.run(() => fireEvent.keyDown(thumbs()[0]!, { key: "ArrowRight" }))
      await t.run(() => fireEvent.keyDown(thumbs()[0]!, { key: "End" }))
      await t.fire(".Track", "pointerDown", { pointerId: 1, clientX: 150 })
      await t.fire(".Track", "pointerUp", { pointerId: 1, clientX: 150 })
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.reactLog).toEqual([])
  })
})

describe("Slider pointer parity", () => {
  // The slider root measures 200px from x = 100 (and y = 50 to 250 when vertical)
  const sliderRect = (element: Element) =>
    element.classList.contains("Slider") ? { left: 100, top: 50, width: 200, height: 200 } : undefined

  test("press on the track jumps, dragging follows, release restores the transition and the reset button", async () => {
    rects = sliderRect
    const result = await sliderWalk({ ...BASE, resetValue: 1000 }, "controlled", async (t) => {
      await t.fire(".Track", "pointerDown", { pointerId: 1, clientX: 150 })
      t.snapshot()
      await t.fire(".Track", "pointerMove", { pointerId: 1, clientX: 203 })
      t.snapshot()
      // Another pointer that was not captured is ignored
      await t.fire(".Track", "pointerMove", { pointerId: 2, clientX: 290 })
      await t.fire(".Track", "pointerMove", { pointerId: 1, clientX: 400 })
      t.snapshot()
      await t.fire(".Track", "pointerUp", { pointerId: 1, clientX: 400 })
      t.snapshot()
      await t.fire(".Track", "pointerMove", { pointerId: 1, clientX: 120 })
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["500", "1030", "2000", "2000", "2000"])
    expect(result.react.map(durationOf)).toEqual(["0ms", "0ms", "0ms", "145.5ms", "145.5ms"])
    expect(result.react[0]).toContain('data-hide="false"')
    expect(result.react[0]).toContain("focus: thumb 500")
  })

  test("pressing a thumb only focuses it", async () => {
    rects = sliderRect
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.run(() => fireEvent.pointerDown(thumbs()[0]!, { pointerId: 1, clientX: 290 }))
      t.snapshot()
      await t.run(() => fireEvent.pointerMove(thumbs()[0]!, { pointerId: 1, clientX: 250 }))
      t.snapshot()
      await t.run(() => fireEvent.pointerUp(thumbs()[0]!, { pointerId: 1, clientX: 250 }))
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["1000", "1500", "1500"])
  })

  test("range: the closest thumb follows the pointer", async () => {
    rects = sliderRect
    const result = await sliderWalk(
      { range: true, label: "Price range", min: 0, max: 100, step: 1, value: [25, 75] },
      "controlled",
      async (t) => {
        await t.fire(".Track", "pointerDown", { pointerId: 1, clientX: 270 })
        t.snapshot()
        await t.fire(".Track", "pointerMove", { pointerId: 1, clientX: 120 })
        t.snapshot()
        await t.fire(".Track", "pointerUp", { pointerId: 1, clientX: 120 })
        await t.fire(".Track", "pointerDown", { pointerId: 1, clientX: 110 })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["25,85", "10,25", "5,25"])
  })

  test("vertical: the value grows from the bottom", async () => {
    rects = sliderRect
    const result = await sliderWalk(
      { label: "Volume", min: 0, max: 100, step: 1, value: 50, orientation: "vertical" },
      "controlled",
      async (t) => {
        await t.fire(".Track", "pointerDown", { pointerId: 1, clientY: 70 })
        t.snapshot()
        await t.fire(".Track", "pointerMove", { pointerId: 1, clientY: 200 })
        await t.fire(".Track", "pointerUp", { pointerId: 1, clientY: 200 })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react.map(valueOf)).toEqual(["90", "25"])
  })
})

describe("Slider value input parity", () => {
  test("typing reports the parsed value after 250ms; the input keeps the text", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      await t.type("15")
      await t.type("155")
      await t.type("1555")
      t.snapshot()
      await t.advance(249)
      t.snapshot()
      await t.advance(1)
      t.snapshot()
      // Every character that is not a digit or a dot is stripped
      await t.type("1a2b3")
      t.snapshot()
      await t.advance(250)
      t.snapshot()
      // Above the maximum: clamped
      await t.type("9999")
      await t.advance(250)
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 1555", "change 123", "change 2000"])
    expect(result.react[3]).toContain('value="123"')
  })

  test("blur commits the typed value (floored, clamped) and drops the pending debounced change", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      await t.type("733.7")
      await t.blur()
      t.snapshot()
      await t.advance(250)
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 733", "blur input.ValueInput"])
  })

  test("a decimal step rounds on blur to its precision", async () => {
    const result = await sliderWalk({ label: "Ratio", min: 0, max: 1, step: 0.05, value: 0.25 }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      await t.type("0.456")
      await t.blur()
      t.snapshot()
      await t.focus("input.ValueInput")
      await t.type("abc")
      await t.blur()
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog.filter((entry) => entry.startsWith("change"))).toEqual(["change 0.46", "change 0"])
  })

  test("input keys: arrows step (Shift by ten), Home and End jump, Enter and Escape blur", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      for (const [key, init] of [
        ["ArrowUp"],
        ["ArrowUp", { shiftKey: true }],
        ["ArrowDown"],
        ["ArrowDown", { shiftKey: true }],
        ["End"],
        ["ArrowUp"],
        ["Home"],
        ["ArrowDown"],
      ] as [string, KeyboardEventInit?][]) {
        await t.key(key, init)
        t.snapshot()
      }
      await t.key("Enter")
      t.snapshot()
      await t.focus("input.ValueInput")
      await t.key("Escape")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.slice(0, 8).map(valueOf)).toEqual(["1010", "1110", "1100", "1000", "2000", "2000", "0", "0"])
    expect(result.react[8]).toContain("focus: body")
    expect(result.react[9]).toContain("focus: body")
  })

  test("clicking the value area focuses the input; the reset button reports the reset value", async () => {
    const result = await sliderWalk({ ...BASE, value: 300, resetValue: 1000 }, "controlled", async (t) => {
      await t.fire(".SliderValue", "click")
      t.snapshot()
      await t.fire(".Reset", "click")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 1000"])
    expect(result.react[1]).toContain('data-hide="true"')
  })

  test("the parent's value updates the input unless it is focused", async () => {
    const result = await sliderWalk({ ...BASE, resetValue: 1000 }, "controlled", async (t) => {
      await t.set({ value: 1500 })
      t.snapshot()
      await t.set({ value: 400 })
      t.snapshot()
      await t.set({ value: 410 })
      t.snapshot()
      await t.focus("input.ValueInput")
      await t.set({ value: 1200 })
      t.snapshot()
      await t.set({ step: 0.5, value: 1200 })
      t.snapshot()
      await t.blur()
      await t.set({ min: 500, max: 1000 })
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.react.map(valueOf)).toEqual(["1500", "400", "410", "1200", "1200", "500"])
    expect(result.react.map((step) => step.match(/ValueInput[^>]*value="([^"]*)"/)?.[1])).toEqual([
      "1500",
      "400",
      "410",
      // Focused: the input keeps what it shows
      "410",
      "410",
      "500.0",
    ])
    // Blurring commits the input's text, even over a newer value from the
    // parent; then the new bounds clamp it
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 410", "blur input.ValueInput", "change 500"])
    // The duration compares with the value before the latest change, also
    // when nothing else re-renders the slider (the input is focused)
    expect(result.react.map(durationOf)).toEqual(["100ms", "165ms", "100ms", "118.5ms", "118.5ms", "100ms"])
  })
})

describe("Slider form, focus and tooltip parity", () => {
  test("in a form, each hidden input reports a new value with an input event (not the initial one)", async () => {
    const result = await sliderWalk(
      { range: true, label: "R", min: 0, max: 100, step: 1, value: [20, 60] },
      "controlled",
      async (t) => {
        t.snapshot()
        await t.run(() => thumbs()[0]!.focus())
        await t.key("ArrowRight")
        await t.key("End")
        t.snapshot()
      },
      true,
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    // End moves the last thumb, which takes the focus
    expect(result.reactLog).toEqual([
      "focus thumb 20",
      "change [21,60]",
      "input 21",
      "blur thumb 21",
      "focus thumb 60",
      "change [21,100]",
      "input 100",
    ])
  })

  test("focus and blur are reported from the thumbs and the input", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.run(() => thumbs()[0]!.focus())
      await t.focus("input.ValueInput")
      await t.run(() => thumbs()[0]!.focus())
      await t.blur()
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual([
      "focus thumb 1000",
      "blur thumb 1000",
      "focus input.ValueInput",
      "blur input.ValueInput",
      "focus thumb 1000",
      "blur thumb 1000",
    ])
  })

  test("marks are positioned from the measured width and the thumb", async () => {
    rects = (element) => {
      const el = element as HTMLElement
      if (el.getAttribute("role") === "slider") return { left: 0, top: 0, width: 16, height: 16 }
      if (el.hasAttribute("data-mark")) {
        const narrow = el.style.width === "min-content"
        return { left: parseFloat(el.style.left) || 0, top: 0, width: narrow ? 8 : 20, height: narrow ? 30 : 15 }
      }
      return undefined
    }
    const result = await sliderWalk(
      { label: "Grade", min: 1, max: 5, step: 1, value: 3, marks: MARKS },
      "controlled",
      async (t) => {
        t.snapshot()
        for (const width of [300, 100, 40]) {
          await t.run(() => {
            // The current app's observer of the marks' measure element
            const observer = observers
              .filter((o) => o.targets.some((target) => target.isConnected && target.parentElement?.classList.contains("MarksContainer")))
              .at(-1)!
            observer.callback(
              [{ contentBoxSize: [{ inlineSize: width, blockSize: 15 }] } as unknown as ResizeObserverEntry],
              observer as unknown as ResizeObserver,
            )
          })
          t.snapshot()
        }
      },
    )
    expect(result.vue).toEqual(result.react)
    // Hidden while unmeasured (they collide at zero width), placed at 300px,
    // wrapped at 100px, hidden again at 40px
    expect(result.react[0]).toContain("display: none")
    expect(result.react[1]).toContain('class="Mark" data-mark="true" style="left: 69px"')
    expect(result.react[2]).toContain("width: min-content")
    expect(result.react[3]).toContain("display: none")
  })

  test("switching orientation remounts the slider", async () => {
    const result = await sliderWalk({ ...BASE, marks: [{ value: 0, label: "0" }] }, "controlled", async (t) => {
      await t.run(() => thumbs()[0]!.focus())
      await t.set({ orientation: "vertical" })
      t.snapshot()
      await t.set({ orientation: "horizontal" })
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain("focus: body")
  })

  test("the reset button's tooltip opens on hover", async () => {
    const result = await sliderWalk({ ...BASE, value: 500, resetValue: 1000 }, "controlled", async (t) => {
      await t.fire(".Reset", "pointerMove", { pointerType: "mouse" })
      await t.advance(150)
      t.snapshot()
      await t.fire(".Reset", "pointerLeave", { pointerType: "mouse" })
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('role="tooltip"')
    expect(result.react[0]).toContain('"Reset to default"')
  })
})


describe("Slider review fixes", () => {
  test("the value input takes a minus sign when the slider goes below zero", async () => {
    const result = await sliderWalk({ label: "Offset", min: -10, max: 10, step: 1, value: 0 }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      // A lone minus is a number still being typed: nothing is reported
      await t.type("-")
      await t.advance(250)
      t.snapshot()
      await t.type("-5")
      await t.advance(250)
      t.snapshot()
      // Only a leading minus counts
      await t.type("5-")
      await t.advance(250)
      await t.type("-15")
      await t.blur()
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change -5", "change 5", "change -10", "blur input.ValueInput"])
    expect(result.react[0]).toContain('value="-"')
  })

  test("without negative values a minus sign is stripped", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      await t.type("-5")
      await t.advance(250)
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 5"])
  })

  test("a key in the value input replaces the typed value that is still pending", async () => {
    const result = await sliderWalk({ ...BASE }, "controlled", async (t) => {
      await t.focus("input.ValueInput")
      await t.type("25")
      await t.key("End")
      await t.advance(250)
      t.snapshot()
      await t.type("700")
      await t.key("ArrowDown")
      await t.advance(250)
      t.snapshot()
      // Also when the parent renders (a new onChange) while the typed value waits
      await t.type("300")
      await t.set({ unit: "s" })
      await t.key("Home")
      await t.advance(250)
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus input.ValueInput", "change 2000", "change 1990", "change 0"])
  })

  test("new marks with the same count replace the old ones, also with new bounds", async () => {
    const result = await sliderWalk(
      { label: "Size", min: 0, max: 100, step: 1, value: 50, marks: [{ value: 0, label: "0%" }, { value: 100, label: "100%" }] },
      "controlled",
      async (t) => {
        t.snapshot()
        await t.set({ max: 10, value: 5, marks: [{ value: 0, label: "0" }, { value: 10, label: "10" }] })
        t.snapshot()
        await t.set({ marks: [{ value: 0, label: "Low" }, { value: 10, label: "High" }] })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[1]).toContain('"10"')
    expect(result.react[1]).not.toContain('"100%"')
    expect(result.react[2]).toContain('"High"')
  })

  test("range: marks are positioned from the first thumb", async () => {
    rects = (element) => {
      const el = element as HTMLElement
      if (el.getAttribute("role") === "slider") return { left: 0, top: 0, width: 16, height: 16 }
      if (el.hasAttribute("data-mark")) return { left: parseFloat(el.style.left) || 0, top: 0, width: 20, height: 15 }
      return undefined
    }
    const result = await sliderWalk(
      { range: true, label: "Grade", min: 1, max: 5, step: 1, value: [2, 4], marks: MARKS },
      "controlled",
      async (t) => {
        await t.run(() => {
          const observer = observers
            .filter((o) => o.targets.some((target) => target.isConnected && target.parentElement?.classList.contains("MarksContainer")))
            .at(-1)!
          observer.callback(
            [{ contentBoxSize: [{ inlineSize: 300, blockSize: 15 }] } as unknown as ResizeObserverEntry],
            observer as unknown as ResizeObserver,
          )
        })
        t.snapshot()
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('class="Mark" data-mark="true" style="left: 69px"')
  })

  test("a key step from a value off the step grid lands on the grid", async () => {
    const result = await sliderWalk({ ...BASE, value: 1005 }, "controlled", async (t) => {
      await t.run(() => thumbs()[0]!.focus())
      await t.key("ArrowRight")
      t.snapshot()
      await t.set({ value: 1005 })
      await t.key("ArrowLeft")
      t.snapshot()
      await t.set({ value: 1005 })
      await t.key("PageUp")
      t.snapshot()
    })
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    // Even a Page key stops at the grid first
    expect(result.react.map(valueOf)).toEqual(["1010", "1000", "1010"])
  })

  test("a thumb focused by a key shows the focus ring; one focused by the pointer does not", async () => {
    rects = (element) =>
      element.classList.contains("Slider") ? { left: 100, top: 50, width: 200, height: 200 } : undefined
    const calls: string[] = []
    const focus = HTMLElement.prototype.focus
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
      calls.push(`${describeElement(this)} ${JSON.stringify(options ?? null)}`)
      focus.call(this, options)
    })
    const result = await sliderWalk(
      { range: true, label: "Price range", min: 0, max: 100, step: 1, value: [25, 26] },
      "controlled",
      async (t) => {
        calls.length = 0
        await t.run(() => thumbs()[1]!.focus())
        await t.key("ArrowLeft")
        await t.key("ArrowLeft")
        await t.fire(".Track", "pointerDown", { pointerId: 1, clientX: 280 })
        await t.fire(".Track", "pointerUp", { pointerId: 1, clientX: 280 })
        await t.run(() => fireEvent.pointerDown(thumbs()[0]!, { pointerId: 2, clientX: 150 }))
        t.snapshot(calls.join("\n"))
      },
    )
    expect(result.vue).toEqual(result.react)
    expect(result.react[0]).toContain('thumb 25 {"preventScroll":true,"focusVisible":true}')
    expect(result.react[0]).toContain('{"preventScroll":true,"focusVisible":false}')
  })

  test("in a form, a value from the parent reaches the hidden input without an input event", async () => {
    const result = await sliderWalk(
      { range: true, label: "R", min: 0, max: 100, step: 1, value: [20, 60] },
      "controlled",
      async (t) => {
        await t.set({ value: [30, 60] })
        await t.run(() => thumbs()[1]!.focus())
        await t.key("ArrowRight")
        await t.set({ value: [30, 70] })
        t.snapshot()
      },
      true,
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toEqual(["focus thumb 60", "change [30,61]", "input 61"])
    expect(result.react[0]).toContain('value="70"')
  })

  test("a form reset reports the first value again", async () => {
    const result = await sliderWalk(
      { ...BASE },
      "controlled",
      async (t) => {
        await t.run(() => thumbs()[0]!.focus())
        await t.key("ArrowRight")
        await t.run(() => $<HTMLFormElement>("form").reset())
        t.snapshot()
      },
      true,
    )
    expect(result.vue).toEqual(result.react)
    expect(result.vueLog).toEqual(result.reactLog)
    expect(result.reactLog).toContain("change 1000")
    expect(valueOf(result.react[0]!)).toBe("1000")
  })
})
