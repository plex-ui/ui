import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { IndexBar as RIndexBar, indexBarSlots as rSlots, type IndexBarProps as RIndexBarProps } from "../../packages/ui/src/components/IndexBar"
import { IndexBar, indexBarSlots as vSlots } from "../../packages/vue/src/components/IndexBar"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for IndexBar (plan 173, block A): the letters or the letters and dots the bar shows for a
// height, the same strip and slider for every prop, a press and a drag that pick the letter under the pointer
// (behind a dot too), the keys, and the native and kit measurements in the CSS.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const LINE = 15
const TOP = 100

const isStrip = (element: Element) => element.firstElementChild?.getAttribute("role") === "slider"

// jsdom lays nothing out: the rail starts at y = 100 and each of its lines is 15px (its resolved line height); the
// strip is `stripHeight` tall (0 lets every letter show). `resize()` runs the ResizeObserver callbacks, as a new
// screen height or line height would.
let stripHeight = 0
let observers: Array<() => void> = []
const resize = () => observers.forEach((callback) => callback())
beforeEach(() => {
  stripHeight = 0
  observers = []
  vi.stubGlobal("ResizeObserver", class {
    callback: () => void
    constructor(callback: () => void) { this.callback = callback; observers.push(callback) }
    observe() {}
    unobserve() {}
    disconnect() { observers = observers.filter((callback) => callback !== this.callback) }
  })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (this.getAttribute("role") === "slider") return DOMRect.fromRect({ x: 370, y: TOP, width: 16, height: this.children.length * LINE })
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function height(this: HTMLElement) {
    return isStrip(this) ? stripHeight : 0
  })
  const computed = window.getComputedStyle
  vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
    if (isStrip(element)) return { paddingTop: "0px", paddingBottom: "0px" } as unknown as CSSStyleDeclaration
    if (element.getAttribute("role") === "slider") return { lineHeight: `${LINE}px` } as unknown as CSSStyleDeclaration
    return computed(element, pseudo)
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const describeSlots = (slots: Array<number | null>) => slots.map((slot) => slot === null ? "•" : LETTERS[slot]).join(" ")

describe("indexBarSlots shortens the index as UIKit does", () => {
  test.each([rSlots, vSlots])("every letter while they fit or the height is not known", (slots) => {
    expect(describeSlots(slots(26))).toBe(LETTERS.join(" "))
    expect(describeSlots(slots(26, 26))).toBe(LETTERS.join(" "))
    expect(describeSlots(slots(26, 40))).toBe(LETTERS.join(" "))
    expect(slots(0, 10)).toEqual([])
  })

  test.each([rSlots, vSlots])("the first and the last letter and letters spread evenly between them, a dot between two", (slots) => {
    expect(describeSlots(slots(26, 15))).toBe("A • E • H • L • O • S • V • Z")
    expect(describeSlots(slots(26, 16))).toBe("A • E • H • L • O • S • V • Z")
    expect(describeSlots(slots(26, 7))).toBe("A • I • R • Z")
    expect(describeSlots(slots(26, 3))).toBe("A • Z")
  })

  test.each([rSlots, vSlots])("as many lines as fit when there is room for fewer than three", (slots) => {
    expect(describeSlots(slots(26, 2))).toBe("A Z")
    expect(describeSlots(slots(26, 1))).toBe("A")
    expect(slots(26, 0)).toEqual([])
  })
})

type Case = RIndexBarProps & { stripHeight?: number }
const cases: Array<[string, Case]> = [
  ["letters", { items: LETTERS.slice(0, 5) }],
  ["named, controlling and classed", { "items": LETTERS, "id": "index", "aria-label": "Countries", "aria-controls": "countries", "className": "custom" }],
  ["shortened on a short screen", { items: LETTERS, stripHeight: 120 }],
  ["no sections", { items: [] }],
]

const vueProps = ({ "aria-label": ariaLabel, "aria-controls": ariaControls, className, onSelect, stripHeight: _, ...rest }: Case) =>
  ({ ...rest, ...(ariaLabel && { ariaLabel }), ariaControls, class: className, ...(onSelect && { onSelect }) })

describe("IndexBar DOM parity", () => {
  test.each(cases)("%s", async (_, { stripHeight: height = 0, ...props }) => {
    stripHeight = height
    const pair = await renderPair(<RIndexBar {...props} />, () => h(IndexBar, vueProps(props)))
    expect(pair.vue).toBe(pair.react)
  })

  test("one slider read as the current letter; the letters and dots are presentation only", async () => {
    await act(async () => { render(<RIndexBar items={LETTERS} />) })
    const slider = document.querySelector('[role="slider"]')
    expect([slider?.getAttribute("aria-valuenow"), slider?.getAttribute("aria-valuemin"), slider?.getAttribute("aria-valuemax")]).toEqual(["1", "1", "26"])
    expect([slider?.getAttribute("aria-valuetext"), slider?.getAttribute("aria-label"), slider?.getAttribute("aria-orientation")]).toEqual(["A", "Section index", "vertical"])
    expect(slider?.getAttribute("tabindex")).toBe("0")
    expect(slider?.children).toHaveLength(26)
    expect([...(slider?.children ?? [])].every((item) => item.getAttribute("aria-hidden") === "true")).toBe(true)
  })

  test("a short screen shows letters and dots, and nothing when there are no sections", async () => {
    stripHeight = 120
    await act(async () => { render(<RIndexBar items={LETTERS} />) })
    expect(document.querySelector('[role="slider"]')?.textContent).toBe("A•I•R•Z")
    cleanup()
    await act(async () => { render(<RIndexBar items={[]} />) })
    expect(document.body.querySelector('[role="slider"]')).toBeNull()
  })
})

type Mounted = { rail: () => HTMLElement; picks: Array<[string, number]>; setItems: (items: string[]) => Promise<void> }

const mountReact = async (items: string[]): Promise<Mounted> => {
  const picks: Array<[string, number]> = []
  let setItems: (items: string[]) => void = () => {}
  function Host() {
    const [current, set] = useState(items)
    setItems = set
    return <RIndexBar items={current} onSelect={(item, index) => picks.push([item, index])} />
  }
  await act(async () => { render(<Host />) })
  return query(picks, (next) => interact(() => setItems(next)))
}

const mountVueIndexBar = async (items: string[]): Promise<Mounted> => {
  const picks: Array<[string, number]> = []
  const current = ref(items)
  mountVue(() => h(IndexBar, { items: current.value, onSelect: (item: string, index: number) => picks.push([item, index]) }))
  await flushVue()
  return query(picks, (next) => interact(() => { current.value = next }))
}

const query = (picks: Array<[string, number]>, setItems: Mounted["setItems"]): Mounted => ({
  rail: () => {
    const element = document.querySelector<HTMLElement>('[role="slider"]')
    if (!element) throw new Error("The index bar must render its slider")
    return element
  },
  picks,
  setItems,
})

const pointer = (clientY: number, extra: Record<string, unknown> = {}) => ({ button: 0, pointerId: 1, pointerType: "touch", clientX: 378, clientY, ...extra })
/** The middle of a line of the rail. */
const line = (index: number) => TOP + index * LINE + LINE / 2

describe.each([
  ["React", mountReact],
  ["Vue", mountVueIndexBar],
] as const)("%s IndexBar", (_, mount) => {
  test("a press picks the letter under the finger and a drag each new one, past either end the first or the last", async () => {
    const mounted = await mount(LETTERS)
    const rail = mounted.rail
    await interact(() => { fireEvent.pointerDown(rail(), pointer(line(2))) })
    expect(rail().hasAttribute("data-pressed")).toBe(true)
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(2) + 6)) })
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(5))) })
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(6), { pointerId: 2 })) })
    await interact(() => { fireEvent.pointerMove(rail(), pointer(10_000)) })
    await interact(() => { fireEvent.pointerMove(rail(), pointer(-50)) })
    await interact(() => { fireEvent.pointerUp(rail(), pointer(-50)) })
    expect(rail().hasAttribute("data-pressed")).toBe(false)
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(9))) })
    expect(mounted.picks).toEqual([["C", 2], ["F", 5], ["Z", 25], ["A", 0]])
    expect(rail().getAttribute("aria-valuetext")).toBe("A")
  })

  test("a cancelled gesture or one that lost its capture ends; another pointer neither starts nor ends one", async () => {
    const mounted = await mount(LETTERS)
    const rail = mounted.rail
    await interact(() => { fireEvent.pointerDown(rail(), pointer(line(1))) })
    await interact(() => { fireEvent.pointerDown(rail(), pointer(line(4), { pointerId: 2 })) })
    await interact(() => { fireEvent.lostPointerCapture(rail(), pointer(line(4), { pointerId: 2 })) })
    await interact(() => { fireEvent.pointerCancel(rail(), pointer(line(4), { pointerId: 2 })) })
    expect(rail().hasAttribute("data-pressed")).toBe(true)
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(2))) })
    await interact(() => { fireEvent.pointerCancel(rail(), pointer(line(2))) })
    expect(rail().hasAttribute("data-pressed")).toBe(false)
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(3))) })
    await interact(() => { fireEvent.pointerDown(rail(), pointer(line(5))) })
    await interact(() => { fireEvent.lostPointerCapture(rail(), pointer(line(5))) })
    expect(rail().hasAttribute("data-pressed")).toBe(false)
    await interact(() => { fireEvent.pointerMove(rail(), pointer(line(6))) })
    expect(mounted.picks).toEqual([["B", 1], ["C", 2], ["F", 5]])
  })

  test("a gesture ends when the letters go away under the finger", async () => {
    const mounted = await mount(LETTERS)
    await interact(() => { fireEvent.pointerDown(mounted.rail(), pointer(line(1))) })
    await mounted.setItems([])
    expect(document.querySelector('[role="slider"]')).toBeNull()
    await mounted.setItems(LETTERS)
    expect(mounted.rail().hasAttribute("data-pressed")).toBe(false)
    await interact(() => { fireEvent.pointerMove(mounted.rail(), pointer(line(7))) })
    expect(mounted.picks).toEqual([["B", 1]])
  })

  test("the bar measures again when the screen changes", async () => {
    const mounted = await mount(LETTERS)
    expect(mounted.rail().children).toHaveLength(26)
    stripHeight = 120
    await interact(resize)
    expect(mounted.rail().textContent).toBe("A•I•R•Z")
    stripHeight = 600
    await interact(resize)
    expect(mounted.rail().children).toHaveLength(26)
  })

  test("a second press on the same letter shows its section again; another button does nothing", async () => {
    const mounted = await mount(LETTERS)
    for (let i = 0; i < 2; i++) await interact(() => {
      fireEvent.pointerDown(mounted.rail(), pointer(line(3)))
      fireEvent.pointerUp(mounted.rail(), pointer(line(3)))
    })
    await interact(() => { fireEvent.pointerDown(mounted.rail(), pointer(line(7), { button: 2, pointerType: "mouse" })) })
    expect(mounted.rail().hasAttribute("data-pressed")).toBe(false)
    await interact(() => { fireEvent.pointerCancel(mounted.rail(), pointer(line(7))) })
    expect(mounted.picks).toEqual([["D", 3], ["D", 3]])
  })

  test("a letter shown is its own; over a dot a drag moves through the letters hidden behind it", async () => {
    stripHeight = 120
    const mounted = await mount(LETTERS)
    expect(mounted.rail().textContent).toBe("A•I•R•Z")
    const move = async (y: number) => interact(() => { fireEvent.pointerMove(mounted.rail(), pointer(y)) })
    await interact(() => { fireEvent.pointerDown(mounted.rail(), pointer(line(2))) })
    await move(line(1) + 7)
    await move(TOP + LINE + 1)
    await move(line(3) + 6)
    await move(line(4))
    await move(line(6))
    await interact(() => { fireEvent.pointerUp(mounted.rail(), pointer(line(6))) })
    // A•I•R•Z: lines 0, 2, 4 and 6 are A, I, R and Z; the dot on line 1 holds B to H (seven, about 2px each), the
    // one on line 3 holds J to Q.
    expect(mounted.picks).toEqual([["I", 8], ["H", 7], ["B", 1], ["Q", 16], ["R", 17], ["Z", 25]])
  })

  test("with room for no line, the bar hides and takes neither presses nor keys", async () => {
    stripHeight = 10
    const mounted = await mount(LETTERS)
    expect(mounted.rail().children).toHaveLength(0)
    expect(mounted.rail().hidden).toBe(true)
    await interact(() => { fireEvent.pointerDown(mounted.rail(), pointer(TOP)) })
    await interact(() => { fireEvent.keyDown(mounted.rail(), { key: "ArrowDown" }) })
    expect(mounted.picks).toEqual([])
    stripHeight = 120
    await interact(resize)
    expect(mounted.rail().hidden).toBe(false)
  })

  test("Down and Right move one section, Up and Left back, Home and End to the ends, Enter and Space show it again", async () => {
    const mounted = await mount(LETTERS.slice(0, 4))
    const key = async (name: string, extra: Record<string, unknown> = {}) => interact(() => { fireEvent.keyDown(mounted.rail(), { key: name, ...extra }) })
    for (const name of ["ArrowDown", "ArrowRight", "ArrowUp", "End", "ArrowDown", "Enter", "Home", "ArrowUp", "ArrowLeft", " ", "a"]) await key(name)
    for (const modifier of ["ctrlKey", "altKey", "metaKey", "shiftKey"]) {
      await key("ArrowDown", { [modifier]: true })
      await key("Enter", { [modifier]: true })
    }
    expect(mounted.picks.map(([item]) => item)).toEqual(["B", "C", "B", "D", "D", "A", "A"])
    expect([mounted.rail().getAttribute("aria-valuenow"), mounted.rail().getAttribute("aria-valuetext")]).toEqual(["1", "A"])
  })
})

describe("IndexBar tokens follow the iOS 27.2 section index", () => {
  const tokens = read("packages/styles/src/styles/variables-components.css")
  const css = read("packages/styles/src/components/IndexBar/IndexBar.module.css")

  test("11px semibold letters 13.79px apart, centred about 7.4px from the edge, in the accent", () => {
    for (const token of [
      "--index-bar-width: 14.67px;",
      "--index-bar-inset-inline-end: 0px;",
      "--index-bar-font-size: 11px;",
      "--index-bar-line-height: 13.79px;",
      "--index-bar-font-weight: 590;",
      "--index-bar-color: var(--color-text-accent);",
      "--index-bar-target-width: 30px;",
    ]) expect(tokens).toContain(token)
  })

  test("a phone strip down the trailing edge that only takes touches on the letters", () => {
    expect(css).toMatch(/^\.IndexBar \{\n {2}display: none;\n\}/m)
    expect(css).toContain("@media (max-width: 767.98px) {")
    expect(css).toContain("inset-inline-end: var(--index-bar-inset-inline-end);")
    expect(css).toContain("justify-content: center;")
    expect(css).toContain("pointer-events: none;")
    expect(css).toContain("pointer-events: auto;")
    expect(css).toContain("touch-action: none;")
    expect(css).toContain("height: var(--index-bar-line-height);")
  })

  test("centred between the bars of a Page, its target 30px from the edge, its ring inside the column", () => {
    expect(css).toContain("var(--page-top, var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))")
    expect(css).toContain("var(--page-bottom, var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)));")
    expect(css).toContain("inset-inline: calc(var(--index-bar-width) + var(--index-bar-inset-inline-end) - var(--index-bar-target-width)) calc(-1 * var(--index-bar-inset-inline-end));")
    expect(css).toContain("outline-offset: -2px;")
    expect(css).toMatch(/&\[hidden\] \{\n\s+display: none;/)
  })

  test("a list keeps its margins beside an index, as Contacts does: the Page does not move its rows", () => {
    expect(tokens).not.toContain("--index-bar-content-inset-inline-end")
    expect(read("packages/styles/src/components/Page/Page.module.css")).not.toContain("[data-index-bar]")
  })
})
