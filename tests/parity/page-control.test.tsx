import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { PageControl as RPageControl, pageControlDots as rDots, type PageControlProps as RPageControlProps } from "../../packages/ui/src/components/PageControl"
import { PageControl, pageControlDots as vDots } from "../../packages/vue/src/components/PageControl"
import { flushVue, mountVue } from "./harness"
import { interact, renderPair } from "./pair"

// React-vs-Vue parity for PageControl: the kit's dot window for every page count, the same slider and dots for
// every prop, taps on either side of the current dot, a mouse picking a dot, scrubbing, keys, and the tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")

// jsdom lays nothing out: each visible dot is 8px wide, 16px apart from 12px, inside a capsule from x = 0.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    const visible = (parent: Element) => [...parent.querySelectorAll<HTMLElement>("[data-index]")].filter((dot) => dot.dataset.size !== "hidden")
    if (this.dataset.index !== undefined && this.parentElement) {
      const left = 12 + visible(this.parentElement).indexOf(this) * 16
      return DOMRect.fromRect({ x: left, y: 8, width: 8, height: 8 })
    }
    if (this.getAttribute("role") === "slider") return DOMRect.fromRect({ x: 0, y: 0, width: 16 + visible(this).length * 16, height: 24 })
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const describeDots = (sizes: string[]) => sizes.map((size) => ({ full: "8", small: "6", smaller: "4", hidden: "-" })[size]).join(" ")

describe("pageControlDots follows the iOS 26 kit Page control variants (507:24679)", () => {
  test.each([rDots, vDots])("every kit variant", (dots) => {
    for (let count = 2; count <= 6; count++)
      for (let current = 0; current < count; current++) expect(describeDots(dots(count, current))).toBe(Array(count).fill("8").join(" "))
    for (let current = 0; current < 6; current++) expect(describeDots(dots(7, current))).toBe("8 8 8 8 8 8 6")
    expect(describeDots(dots(7, 6))).toBe("6 8 8 8 8 8 8")
    for (let current = 0; current < 4; current++) expect(describeDots(dots(8, current))).toBe("8 8 8 8 8 8 6 4")
    for (let current = 4; current < 8; current++) expect(describeDots(dots(8, current))).toBe("4 6 8 8 8 8 8 8")
    // Dots=8+, Selection=5: two shrinking dots on each side of five full ones, the current in the middle.
    expect(describeDots(dots(10, 4))).toBe("4 6 8 8 8 8 8 6 4 -")
    expect(describeDots(dots(12, 6))).toBe("- - 4 6 8 8 8 8 8 6 4 -")
    expect(describeDots(dots(12, 11))).toBe("- - - - 4 6 8 8 8 8 8 8")
    expect(dots(0, 0)).toEqual([])
    expect(describeDots(dots(1, 0))).toBe("8")
  })
})

type Case = Partial<RPageControlProps> & { count: number }
const cases: Array<[string, Case]> = [
  ["one page", { count: 1 }],
  ["four pages on the third", { count: 4, defaultValue: 2 }],
  ["seven pages on the last", { count: 7, defaultValue: 6 }],
  ["twelve pages in the middle", { count: 12, defaultValue: 5 }],
  ["a value past the end is clamped", { count: 3, defaultValue: 9 }],
  ["prominent", { count: 3, background: "prominent" }],
  ["minimal", { count: 3, background: "minimal" }],
  ["labelled, controlling and read in its own words", { "count": 5, "id": "pages", "aria-labelledby": "label", "aria-controls": "carousel", "valueText": (index, count) => `Photo ${index + 1} of ${count}` }],
  ["named", { "count": 5, "aria-label": "Photos" }],
]

const vueProps = (props: Case) => {
  const { "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby, "aria-controls": ariaControls, onChange, ...rest } = props
  return { ...rest, ariaLabel, ariaLabelledby, ariaControls, ...(onChange && { onChange }) }
}

describe("PageControl DOM parity", () => {
  test.each(cases)("%s", async (_, props) => {
    const pair = await renderPair(<RPageControl {...props} />, () => h(PageControl, vueProps(props)))
    expect(pair.vue).toBe(pair.react)
  })

  test("a slider read as the page, the dots presentation only", async () => {
    await act(async () => { render(<RPageControl count={5} defaultValue={1} />) })
    const slider = document.querySelector('[role="slider"]')
    expect([slider?.getAttribute("aria-valuenow"), slider?.getAttribute("aria-valuemin"), slider?.getAttribute("aria-valuemax")]).toEqual(["2", "1", "5"])
    expect(slider?.getAttribute("aria-valuetext")).toBe("Page 2 of 5")
    expect(slider?.getAttribute("aria-label")).toBe("Pages")
    expect(slider?.getAttribute("tabindex")).toBe("0")
    expect([...document.querySelectorAll("[data-index]")].every((dot) => dot.getAttribute("aria-hidden") === "true")).toBe(true)
    expect(document.querySelectorAll("[data-current]")).toHaveLength(1)
  })
})

type Mounted = { slider: () => HTMLElement; dot: (index: number) => HTMLElement; changes: Array<[number, boolean]> }

const mountReact = async (props: Case, controlled = false): Promise<Mounted> => {
  const changes: Array<[number, boolean]> = []
  function Controlled() {
    const [value, setValue] = useState(props.defaultValue ?? 0)
    return <RPageControl {...props} defaultValue={undefined} value={value} onChange={(next, details) => { changes.push([next, details.scrubbing]); setValue(next) }} />
  }
  await act(async () => {
    render(controlled ? <Controlled /> : <RPageControl {...props} onChange={(next, details) => changes.push([next, details.scrubbing])} />)
  })
  return query(changes)
}

const mountVuePageControl = async (props: Case, controlled = false): Promise<Mounted> => {
  const changes: Array<[number, boolean]> = []
  const Host = defineComponent({
    setup: () => {
      const value = ref(props.defaultValue ?? 0)
      return () => h(PageControl, {
        ...vueProps(props),
        ...(controlled && { "defaultValue": undefined, "value": value.value, "onUpdate:value": (next: number) => { value.value = next } }),
        "onChange": (next: number, details: { scrubbing: boolean }) => changes.push([next, details.scrubbing]),
      })
    },
  })
  mountVue(() => h(Host))
  await flushVue()
  return query(changes)
}

const query = (changes: Array<[number, boolean]>): Mounted => ({
  slider: () => {
    const element = document.querySelector<HTMLElement>('[role="slider"]')
    if (!element) throw new Error("The page control must render its slider")
    return element
  },
  dot: (index) => {
    const element = document.querySelector<HTMLElement>(`[data-index="${index}"]`)
    if (!element) throw new Error(`The page control must render dot ${index}`)
    return element
  },
  changes,
})

const now = (mounted: Mounted) => Number(mounted.slider().getAttribute("aria-valuenow")) - 1
const pointer = (pointerType: string, clientX: number) => ({ button: 0, pointerId: 1, pointerType, clientX })
const tap = async (mounted: Mounted, pointerType: string, clientX: number) => interact(() => {
  fireEvent.pointerDown(mounted.slider(), pointer(pointerType, clientX))
  fireEvent.pointerUp(mounted.slider(), pointer(pointerType, clientX))
})
/** The center of a dot in the stubbed layout. */
const center = (mounted: Mounted, index: number) => {
  const rect = mounted.dot(index).getBoundingClientRect()
  return rect.left + rect.width / 2
}

describe.each([
  ["React", mountReact],
  ["Vue", mountVuePageControl],
] as const)("%s PageControl", (_, mount) => {
  test.each([false, true])("a tap on the trailing or leading side of the current dot moves one page (controlled: %s)", async (controlled) => {
    const mounted = await mount({ count: 5, defaultValue: 0 }, controlled)
    await tap(mounted, "touch", center(mounted, 0) - 3)
    expect(mounted.changes).toEqual([])
    await tap(mounted, "touch", center(mounted, 4))
    await tap(mounted, "touch", center(mounted, 4))
    expect(now(mounted)).toBe(2)
    await tap(mounted, "touch", center(mounted, 0))
    expect(mounted.changes).toEqual([[1, false], [2, false], [1, false]])
  })

  test("a mouse or pen picks the dot nearest the pointer", async () => {
    const mounted = await mount({ count: 5 })
    await tap(mounted, "mouse", center(mounted, 3) + 2)
    expect(now(mounted)).toBe(3)
    await tap(mounted, "pen", center(mounted, 1) - 3)
    await tap(mounted, "mouse", center(mounted, 1))
    expect(mounted.changes).toEqual([[3, false], [1, false]])
  })

  test("dragging scrubs a page for each dot and past either end to the first or last page", async () => {
    const mounted = await mount({ count: 10, defaultValue: 1 })
    const start = center(mounted, 1)
    await interact(() => { fireEvent.pointerDown(mounted.slider(), pointer("touch", start)) })
    expect(mounted.slider().hasAttribute("data-interacting")).toBe(true)
    await interact(() => { fireEvent.pointerMove(mounted.slider(), pointer("touch", start + 6)) })
    expect(mounted.changes).toEqual([])
    await interact(() => { fireEvent.pointerMove(mounted.slider(), pointer("touch", start + 33)) })
    await interact(() => { fireEvent.pointerMove(mounted.slider(), pointer("touch", start + 40)) })
    await interact(() => { fireEvent.pointerMove(mounted.slider(), pointer("touch", 10_000)) })
    await interact(() => { fireEvent.pointerMove(mounted.slider(), pointer("touch", -50)) })
    await interact(() => { fireEvent.pointerUp(mounted.slider(), pointer("touch", -50)) })
    expect(mounted.slider().hasAttribute("data-interacting")).toBe(false)
    expect(mounted.changes).toEqual([[3, true], [4, true], [9, true], [0, true]])
  })

  test("minimal does not scrub; a tap still moves one page", async () => {
    const mounted = await mount({ count: 6, background: "minimal" })
    const start = center(mounted, 0)
    await interact(() => {
      fireEvent.pointerDown(mounted.slider(), pointer("touch", start + 2))
      fireEvent.pointerMove(mounted.slider(), pointer("touch", start + 60))
      fireEvent.pointerUp(mounted.slider(), pointer("touch", start + 60))
    })
    expect(mounted.changes).toEqual([[1, false]])
  })

  test("keys move one page, Home and End go to the ends, and Left and Right mirror in right to left", async () => {
    const mounted = await mount({ count: 5, defaultValue: 2 })
    const key = async (name: string) => interact(() => { fireEvent.keyDown(mounted.slider(), { key: name }) })
    for (const name of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "End", "ArrowRight", "Home", "ArrowLeft", "Enter"]) await key(name)
    expect(mounted.changes.map(([index]) => index)).toEqual([3, 2, 3, 2, 4, 0])
    document.documentElement.setAttribute("dir", "rtl")
    try {
      await key("ArrowLeft")
      await key("ArrowRight")
    } finally {
      document.documentElement.removeAttribute("dir")
    }
    expect(mounted.changes.map(([index]) => index)).toEqual([3, 2, 3, 2, 4, 0, 1, 0])
  })

  test("the window of dots follows the current page", async () => {
    const mounted = await mount({ count: 12, defaultValue: 0 })
    const sizes = () => [...document.querySelectorAll<HTMLElement>("[data-index]")].map((dot) => dot.dataset.size).join(" ")
    expect(sizes()).toBe("full full full full full full small smaller hidden hidden hidden hidden")
    await interact(() => { fireEvent.keyDown(mounted.slider(), { key: "End" }) })
    expect(sizes()).toBe("hidden hidden hidden hidden smaller small full full full full full full")
    expect(mounted.dot(11).hasAttribute("data-current")).toBe(true)
  })

  test("a controlled page the owner does not change stays", async () => {
    const changes: Array<[number, boolean]> = []
    if (mount === mountReact) await act(async () => { render(<RPageControl count={4} value={1} onChange={(next, details) => changes.push([next, details.scrubbing])} />) })
    else {
      mountVue(() => h(PageControl, { count: 4, value: 1, onChange: (next: number, details: { scrubbing: boolean }) => changes.push([next, details.scrubbing]) }))
      await flushVue()
    }
    const mounted = query(changes)
    await interact(() => { fireEvent.keyDown(mounted.slider(), { key: "ArrowRight" }) })
    await interact(() => { fireEvent.keyDown(mounted.slider(), { key: "ArrowRight" }) })
    expect(changes).toEqual([[2, false], [2, false]])
    expect(now(mounted)).toBe(1)
  })
})

describe("PageControl tokens follow the kit", () => {
  test("8px dots 8px apart in a 24px capsule with 12px ends; 6px and 4px past the window; 30% for the other pages", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const line of [
      "--page-control-height: 24px;",
      "--page-control-padding-inline: 12px;",
      "--page-control-gap: 8px;",
      "--page-control-dot-size: 8px;",
      "--page-control-dot-size-small: 6px;",
      "--page-control-dot-size-smaller: 4px;",
      "--page-control-dot-color: var(--alpha-30);",
      "--page-control-dot-color-current: var(--color-text);",
      "--page-control-background: var(--alpha-08);",
    ]) expect(tokens).toContain(line)
    const touch = read("packages/styles/src/styles/touch.css")
    const phone = touch.slice(touch.indexOf("@media (max-width: 767px) {"), touch.indexOf("@media (min-width: 414px)"))
    expect(phone).toContain("--page-control-target-size: 44px;")
  })

  test("the small dot keeps an 8px slot and the smaller one a 6px slot; the capsule fills only as asked", () => {
    const css = read("packages/styles/src/components/PageControl/PageControl.module.css")
    expect(css).toContain("margin-inline: calc((var(--page-control-dot-size) - var(--page-control-dot-size-small)) / 2);")
    expect(css).toContain("margin-inline: calc((var(--page-control-dot-size-small) - var(--page-control-dot-size-smaller)) / 2);")
    expect(css).toContain('&[data-background="prominent"],\n  &[data-background="automatic"][data-interacting] {')
    expect(css).toContain("touch-action: pan-y;")
  })
})
