import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { Stepper as RStepper, type StepperProps as RStepperProps } from "../../packages/ui/src/components/Stepper"
import { stepValue as rStepValue } from "../../packages/ui/src/components/Stepper/Stepper"
import { Stepper } from "../../packages/vue/src/components/Stepper"
import { stepValue as vStepValue } from "../../packages/vue/src/components/Stepper/Stepper"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for Stepper: the same spin button and segments for every prop, the same steps from a
// pointer (with hold to repeat), assistive technology clicks and keys, and the kit tokens on a phone.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

type Case = Partial<RStepperProps>
const cases: Array<[string, Case]> = [
  ["defaults", { "aria-label": "Guests" }],
  ["a value inside the range", { "aria-label": "Guests", defaultValue: 3, min: 1, max: 8 }],
  ["at the lowest value", { "aria-label": "Guests", defaultValue: 1, min: 1, max: 8 }],
  ["at the highest value", { "aria-label": "Guests", defaultValue: 8, min: 1, max: 8 }],
  ["wrapping at an end", { "aria-label": "Hour", defaultValue: 23, min: 0, max: 23, wrap: true }],
  ["disabled", { "aria-label": "Guests", defaultValue: 3, disabled: true }],
  ["square ends", { "aria-label": "Guests", pill: false }],
  ["labelled, described, named and submitted", { "id": "guests", "aria-labelledby": "label", "aria-describedby": "hint", "name": "guests", "defaultValue": 2, "decrementLabel": "Fewer", "incrementLabel": "More" }],
]

const vueProps = (props: Case) => {
  const { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, "aria-describedby": ariaDescribedby, onChange, ...rest } = props
  return { ...rest, ariaLabel, ariaLabelledby, ariaDescribedby, ...(onChange && { onChange }) }
}

describe("Stepper DOM parity", () => {
  test.each(cases)("%s", async (_, props) => {
    const pair = await renderPair(<RStepper {...props} />, () => h(Stepper, vueProps(props)))
    expect(pair.vue).toBe(pair.react)
  })

  test("the spin button names its value and range; the segments are unfocusable buttons", async () => {
    await act(async () => { render(<RStepper aria-label="Guests" defaultValue={3} min={1} max={8} />) })
    const spin = document.querySelector('[role="spinbutton"]')
    expect(spin?.getAttribute("aria-valuenow")).toBe("3")
    expect(spin?.getAttribute("aria-valuemin")).toBe("1")
    expect(spin?.getAttribute("aria-valuemax")).toBe("8")
    expect(spin?.getAttribute("tabindex")).toBe("0")
    const buttons = [...document.querySelectorAll("button")]
    expect(buttons.map((b) => [b.getAttribute("aria-label"), b.getAttribute("tabindex"), b.type])).toEqual([["Decrease", "-1", "button"], ["Increase", "-1", "button"]])
    expect(document.querySelectorAll('[role="spinbutton"] > span[aria-hidden="true"]')).toHaveLength(1)
    expect(document.querySelectorAll("button > svg")).toHaveLength(2)
  })
})

type Mounted = { spin: () => HTMLElement; segment: (kind: "decrement" | "increment") => HTMLElement; changes: number[] }

const mountReact = async (props: Case, controlled = false): Promise<Mounted> => {
  const changes: number[] = []
  function Controlled() {
    const [value, setValue] = useState(props.defaultValue ?? props.min ?? 0)
    return <RStepper {...props} defaultValue={undefined} value={value} onChange={(next) => { changes.push(next); setValue(next) }} />
  }
  await act(async () => {
    render(controlled ? <Controlled /> : <RStepper {...props} onChange={(next) => changes.push(next)} />)
  })
  return query(changes)
}

const mountVueStepper = async (props: Case, controlled = false): Promise<Mounted> => {
  const changes: number[] = []
  const Host = defineComponent({
    setup: () => {
      const value = ref(props.defaultValue ?? props.min ?? 0)
      return () => h(Stepper, {
        ...vueProps(props),
        ...(controlled && { "defaultValue": undefined, "value": value.value, "onUpdate:value": (next: number) => { value.value = next } }),
        "onChange": (next: number) => changes.push(next),
      })
    },
  })
  mountVue(() => h(Host))
  await flushVue()
  return query(changes)
}

const query = (changes: number[]): Mounted => ({
  spin: () => {
    const element = document.querySelector<HTMLElement>('[role="spinbutton"]')
    if (!element) throw new Error("The stepper must render its spin button")
    return element
  },
  segment: (kind) => {
    const element = document.querySelector<HTMLElement>(`[data-segment="${kind}"]`)
    if (!element) throw new Error(`The stepper must render its ${kind} segment`)
    return element
  },
  changes,
})

const press = async (target: HTMLElement) => interact(() => { fireEvent.pointerDown(target, { button: 0, pointerId: 1 }) })
const release = async (target: HTMLElement) => interact(() => {
  fireEvent.pointerUp(target, { button: 0, pointerId: 1 })
  fireEvent.click(target, { detail: 1 })
})
const advance = async (ms: number) => interact(() => { vi.advanceTimersByTime(ms) })
const now = (mounted: Mounted) => Number(mounted.spin().getAttribute("aria-valuenow"))

describe.each([
  ["React", mountReact],
  ["Vue", mountVueStepper],
] as const)("%s Stepper", (_, mount) => {
  test.each([false, true])("a pointer steps once on press, a click after it adds nothing (controlled: %s)", async (controlled) => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 2, "min": 1, "max": 8 }, controlled)
    await press(mounted.segment("increment"))
    expect(mounted.segment("increment").hasAttribute("data-pressed")).toBe(true)
    await release(mounted.segment("increment"))
    expect(mounted.segment("increment").hasAttribute("data-pressed")).toBe(false)
    expect(now(mounted)).toBe(3)
    await press(mounted.segment("decrement"))
    await release(mounted.segment("decrement"))
    expect(now(mounted)).toBe(2)
    expect(mounted.changes).toEqual([3, 2])
  })

  test("holding repeats after 400ms every 100ms and stops at the end of the range", async () => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 5, "min": 1, "max": 8 })
    await press(mounted.segment("increment"))
    expect(now(mounted)).toBe(6)
    await advance(399)
    expect(now(mounted)).toBe(6)
    await advance(1)
    expect(now(mounted)).toBe(7)
    await advance(100)
    expect(now(mounted)).toBe(8)
    expect(mounted.segment("increment").hasAttribute("data-disabled")).toBe(true)
    expect(mounted.segment("increment").getAttribute("aria-disabled")).toBe("true")
    await advance(1000)
    expect(mounted.changes).toEqual([6, 7, 8])
    expect(vi.getTimerCount()).toBe(0)
  })

  test("releasing stops the repeat; autoRepeat false steps once", async () => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 1, "min": 0, "max": 50 })
    await press(mounted.segment("increment"))
    await advance(500)
    await release(mounted.segment("increment"))
    await advance(1000)
    expect(mounted.changes).toEqual([2, 3, 4])
    cleanup()
    document.body.innerHTML = ""
    const single = await mount({ "aria-label": "Guests", "defaultValue": 1, "min": 0, "max": 50, "autoRepeat": false })
    await press(single.segment("decrement"))
    await advance(1000)
    expect(single.changes).toEqual([0])
    expect(vi.getTimerCount()).toBe(0)
  })

  test("assistive technology clicks (detail 0) step; a segment at the end does nothing", async () => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 1, "min": 1, "max": 3 })
    await interact(() => { fireEvent.click(mounted.segment("decrement"), { detail: 0 }) })
    expect(mounted.changes).toEqual([])
    await interact(() => { fireEvent.click(mounted.segment("increment"), { detail: 0 }) })
    await interact(() => { fireEvent.click(mounted.segment("increment"), { detail: 0 }) })
    await interact(() => { fireEvent.click(mounted.segment("increment"), { detail: 0 }) })
    expect(mounted.changes).toEqual([2, 3])
    await press(mounted.segment("increment"))
    expect(mounted.changes).toEqual([2, 3])
    expect(mounted.segment("increment").hasAttribute("data-pressed")).toBe(false)
  })

  test("keys: Up and Down step, Page keys step ten times, Home and End go to the ends", async () => {
    const mounted = await mount({ "aria-label": "Count", "defaultValue": 20, "min": 0, "max": 40 })
    const key = async (name: string) => interact(() => { fireEvent.keyDown(mounted.spin(), { key: name }) })
    await key("ArrowUp")
    await key("ArrowDown")
    await key("ArrowDown")
    await key("PageUp")
    await key("PageDown")
    await key("End")
    await key("ArrowUp")
    await key("Home")
    await key("ArrowLeft")
    expect(mounted.changes).toEqual([21, 20, 19, 29, 19, 40, 0])
  })

  test("wrap continues past either end; decimal steps add without drift", async () => {
    const hour = await mount({ "aria-label": "Hour", "defaultValue": 23, "min": 0, "max": 23, "wrap": true })
    await press(hour.segment("increment"))
    await release(hour.segment("increment"))
    await press(hour.segment("decrement"))
    await release(hour.segment("decrement"))
    expect(hour.changes).toEqual([0, 23])
    expect(hour.segment("increment").hasAttribute("data-disabled")).toBe(false)
    cleanup()
    document.body.innerHTML = ""
    const opacity = await mount({ "aria-label": "Opacity", "defaultValue": 0.2, "min": 0, "max": 1, "step": 0.1 })
    await interact(() => { fireEvent.keyDown(opacity.spin(), { key: "ArrowUp" }) })
    await interact(() => { fireEvent.keyDown(opacity.spin(), { key: "PageUp" }) })
    expect(opacity.changes).toEqual([0.3, 1])
  })

  test("a disabled stepper takes no focus, steps and keys", async () => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 3, "disabled": true })
    expect(mounted.spin().getAttribute("tabindex")).toBe("-1")
    expect(mounted.spin().getAttribute("aria-disabled")).toBe("true")
    expect(mounted.segment("increment").hasAttribute("disabled")).toBe(true)
    await press(mounted.segment("increment"))
    await interact(() => { fireEvent.keyDown(mounted.spin(), { key: "ArrowUp" }) })
    expect(mounted.changes).toEqual([])
  })

  test("pressing a segment keeps the focus where it is", async () => {
    const mounted = await mount({ "aria-label": "Guests", "defaultValue": 3 })
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    mounted.segment("increment").dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
  })

  test("a controlled value the owner does not change stays", async () => {
    const changes: number[] = []
    if (mount === mountReact) await act(async () => { render(<RStepper aria-label="Fixed" value={4} onChange={(next) => changes.push(next)} />) })
    else {
      mountVue(() => h(Stepper, { "ariaLabel": "Fixed", "value": 4, "onChange": (next: number) => changes.push(next) }))
      await flushVue()
    }
    const mounted = query(changes)
    await interact(() => { fireEvent.keyDown(mounted.spin(), { key: "ArrowUp" }) })
    await interact(() => { fireEvent.keyDown(mounted.spin(), { key: "ArrowUp" }) })
    expect(changes).toEqual([5, 5])
    expect(now(mounted)).toBe(4)
  })
})

describe("stepValue", () => {
  test.each([rStepValue, vStepValue])("clamps, wraps and rounds to the step", (stepValue) => {
    const range = { min: 0, max: 1, step: 0.1, wrap: false }
    expect(stepValue(0.2, 1, range)).toBe(0.3)
    expect(stepValue(0.95, 1, range)).toBe(1)
    expect(stepValue(0.05, -1, range)).toBe(0)
    expect(stepValue(1, 1, { ...range, wrap: true })).toBe(0)
    expect(stepValue(0, -1, { ...range, wrap: true })).toBe(1)
  })
})

describe("Stepper tokens follow the iOS 26 kit Stepper (507:24687) on a phone", () => {
  test("desktop: the PlexUI control size and the segmented track colors", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    expect(tokens).toContain("--stepper-height: var(--control-size-md);")
    expect(tokens).toContain("--stepper-background: light-dark(var(--gray-100), var(--alpha-08));")
    expect(tokens).toContain("--segmented-control-background: light-dark(var(--gray-100), var(--alpha-08));")
    expect(tokens).toContain("--stepper-mobile-background: light-dark(var(--alpha-05), var(--alpha-08));")
    expect(tokens).toContain("--stepper-mobile-segment-background-active: var(--alpha-08);")
    expect(tokens).toContain("--stepper-mobile-separator-color: var(--alpha-25);")
  })

  test("phone: 92 x 32, 46px segments, a 44px target, 22px icons, no hover, the tertiary label at an end", () => {
    const touch = read("packages/styles/src/styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px) {"), touch.indexOf("@media (min-width: 414px)"))
    for (const line of [
      "--stepper-height: 32px;",
      "--stepper-segment-width: 46px;",
      "--stepper-target-size: 44px;",
      "--stepper-icon-size: 22px;",
      "--stepper-background: var(--stepper-mobile-background);",
      "--stepper-segment-background-hover: transparent;",
      "--stepper-segment-background-active: var(--stepper-mobile-segment-background-active);",
      "--stepper-separator-color: var(--stepper-mobile-separator-color);",
      "--stepper-icon-disabled-color: var(--mobile-label-tertiary);",
    ]) expect(phone).toContain(line)
    expect(touch).not.toMatch(/--stepper-[a-z-]+: light-dark/)
  })

  test("the separator is 24px of a 32px control under the segments, adding no width, and the target grows to 44px only where the control is shorter", () => {
    const css = read("packages/styles/src/components/Stepper/Stepper.module.css")
    expect(css).toContain("height: calc(var(--stepper-height) - 2 * var(--stepper-separator-inset));")
    expect(css).toContain("&:not([data-disabled]):not([data-pressed]) {")
    const separator = css.slice(css.indexOf(".Separator {"), css.indexOf(".Icon {"))
    expect(separator).toContain("position: absolute;")
    expect(separator).toContain("left: 50%;")
    expect(separator).toContain("transform: translateX(-50%);")
    expect(css).toContain("inset: min(0px, calc((var(--stepper-height) - var(--stepper-target-size, 0px)) / 2)) 0;")
    expect(css).toContain("border-radius: calc(var(--stepper-height) / 2);")
  })
})
