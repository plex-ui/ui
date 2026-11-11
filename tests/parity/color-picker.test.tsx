import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { ColorPicker as RColorPicker, ColorWell as RColorWell } from "../../packages/ui/src/components/ColorPicker"
import * as reactShared from "../../packages/ui/src/components/ColorPicker/shared"
import { ColorPicker, ColorWell } from "../../packages/vue/src/components/ColorPicker"
import * as vueShared from "../../packages/vue/src/components/ColorPicker/shared"
import { flushVue, mountVue } from "./harness"
import { interact, walkPair } from "./pair"

// React-vs-Vue parity for ColorPicker and ColorWell (iOS 27.2 UIColorPickerViewController, after the iOS 26 kit's Color
// Pickers 507:26010): the same DOM through Grid,
// Spectrum and Sliders, the Opacity slider, the saved colors with Add and Delete, the well in a popover and in the
// phone sheet, the controlled props and their events, the shared color helpers, and the native tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
const SPECTRUM = { x: 0, y: 0, width: 300, height: 250 }
const SWATCHES = ["#000000", "#007aff", "#34c759"]

let wide = true
beforeEach(() => {
  wide = true
  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
    media: query, matches: wide, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
  }))
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (this.getAttribute("aria-label") === "Spectrum") return DOMRect.fromRect(SPECTRUM)
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** Each snapshot of the walk, compared one by one so a difference shows as a line diff. */
const expectSame = (pair: { react: string[]; vue: string[] }, normalize = (dom: string) => dom) => {
  expect(pair.vue.length).toBe(pair.react.length)
  pair.react.forEach((dom, index) => expect(normalize(pair.vue[index] ?? ""), `snapshot ${index}`).toBe(dom))
}
// Reka's popper wrapper names its variables after itself and sets `dir="ltr"`, as tooltip-popover.test.tsx notes.
const popperNames = (dom: string) => dom.replaceAll("--reka-popper", "--radix-popper").replaceAll('<div dir="ltr" style="--radix-popper-', '<div style="--radix-popper-')
/** The Mode control measures its thumb, then turns on its transition, two and four animation frames after it mounts; snapshots wait for both. */
const settled = async (snapshot: () => void) => {
  await settle(100)
  snapshot()
}

const settle = async (ms = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
  await flushVue()
}

const one = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => {
  const element = root.querySelector<T & HTMLElement>(selector)
  if (!element) throw new Error(`No ${selector}`)
  return element
}
const radio = (name: string) => screen.getByRole("radio", { name, exact: true })
const field = (name: string) => screen.getByRole<HTMLInputElement>("textbox", { name, exact: true })
const saved = () => within(screen.getByRole("radiogroup", { name: "Saved colors" }))
const current = () => screen.getByRole("img").getAttribute("aria-label")
const click = (element: HTMLElement) => interact(() => { fireEvent.click(element) })
const key = (element: HTMLElement, init: KeyboardEventInit) => interact(() => {
  element.focus()
  fireEvent.keyDown(element, init)
})
const type = async (input: HTMLInputElement, text: string, finish: "Enter" | "blur") => {
  await interact(() => { input.focus() })
  await interact(() => {
    fireEvent.input(input, { target: { value: text } })
    fireEvent.change(input, { target: { value: text } })
  })
  await interact(() => {
    if (finish === "Enter") fireEvent.keyDown(input, { key: "Enter" })
    else input.blur()
  })
}

describe("ColorPicker DOM parity", () => {
  test("Grid, Spectrum, Sliders, Opacity and the saved colors, step by step", async () => {
    const pair = await walkPair(
      () => render(<RColorPicker defaultValue="#af52de" defaultSwatches={SWATCHES} />),
      () => h(ColorPicker, { defaultValue: "#af52de", defaultSwatches: SWATCHES }),
      async (snapshot) => {
        await settle()
        expect(one("[role=group]").getAttribute("data-mode")).toBe("grid")
        expect(document.querySelectorAll('[role=radio][aria-checked="true"][data-index]')).toHaveLength(0)
        expect(one('[data-index="0"]').getAttribute("tabindex")).toBe("0")
        await settled(snapshot)

        await click(one('[data-index="5"]'))
        expect(one('[data-index="5"]').getAttribute("aria-checked")).toBe("true")
        expect(current()).toBe("Selected color #999999")
        await settled(snapshot)

        await key(one('[data-index="5"]'), { key: "ArrowDown" })
        expect(one('[data-index="17"]').getAttribute("aria-checked")).toBe("true")
        expect(document.activeElement).toBe(one('[data-index="17"]'))
        await key(one('[data-index="17"]'), { key: "End" })
        expect(one('[data-index="23"]').getAttribute("aria-checked")).toBe("true")
        await settled(snapshot)

        await click(radio("Spectrum"))
        expect(one("[role=group]").getAttribute("data-mode")).toBe("spectrum")
        await settled(snapshot)

        const spectrum = screen.getByRole("slider", { name: "Spectrum" })
        await interact(() => {
          fireEvent.pointerDown(spectrum, { button: 0, pointerId: 1, pointerType: "mouse", clientX: 75, clientY: 125 })
        })
        expect(current()).toBe("Selected color #80FFFF")
        expect(spectrum.getAttribute("aria-valuenow")).toBe("180")
        expect(spectrum.getAttribute("aria-valuetext")).toBe("#80FFFF, hue 180°, lightness 75%")
        await key(spectrum, { key: "ArrowDown" })
        await key(spectrum, { key: "ArrowLeft", shiftKey: true })
        const moved = reactShared.hexDigits(reactShared.spectrumColor({ x: 0.25 - 0.1, y: 0.5 + 0.01 }, 1))
        expect(spectrum.getAttribute("aria-valuetext")).toBe(`#${moved}, hue 184°, lightness 85%`)
        expect(current()).toBe(`Selected color #${moved}`)
        await settled(snapshot)

        await click(radio("Sliders"))
        const before = Number(screen.getByRole("slider", { name: "Red" }).getAttribute("aria-valuenow"))
        await key(screen.getByRole("slider", { name: "Red" }), { key: "ArrowRight" })
        expect(screen.getByRole("slider", { name: "Red" }).getAttribute("aria-valuenow")).toBe(String(before + 1))
        await settled(snapshot)

        await type(field("Green"), "128", "Enter")
        expect(field("Green").value).toBe("128")
        await type(field("Hex Color #"), "ff8800", "blur")
        expect(current()).toBe("Selected color #FF8800")
        expect([field("Red").value, field("Green").value, field("Blue").value]).toEqual(["255", "136", "0"])
        await type(field("Opacity"), "50", "Enter")
        expect(field("Opacity").value).toBe("50%")
        expect(current()).toBe("Selected color #FF8800, 50% opacity")
        // A typed value that is not a number leaves the field as it was.
        await type(field("Blue"), "blue", "Enter")
        expect(field("Blue").value).toBe("0")
        await settled(snapshot)

        await click(screen.getByRole("button", { name: "Add color" }))
        expect(saved().getAllByRole("radio").map((swatch) => swatch.getAttribute("aria-label"))).toEqual(["#000000", "#007AFF", "#34C759", "#FF8800, 50% opacity"])
        expect(saved().getByRole("radio", { name: "#FF8800, 50% opacity" }).getAttribute("aria-checked")).toBe("true")
        await settled(snapshot)

        await key(saved().getByRole("radio", { name: "#FF8800, 50% opacity" }), { key: "ArrowLeft" })
        expect(current()).toBe("Selected color #34C759")
        await key(saved().getByRole("radio", { name: "#34C759" }), { key: "Delete" })
        await settle(30)
        expect(saved().getAllByRole("radio")).toHaveLength(3)
        expect(document.activeElement?.getAttribute("aria-label")).toBe("#FF8800, 50% opacity")
        expect(current()).toBe("Selected color #34C759")
        await settled(snapshot)

        expect(document.querySelector('[aria-label="Saved color pages"]')).toBeNull()
        for (let i = 0; i < 9; i++) await click(screen.getByRole("button", { name: "Add color" }))
        // Twelve saved colors and Add are two pages: iOS 27.2 sets two rows of six to a page.
        expect(saved().getAllByRole("radio")).toHaveLength(12)
        expect(document.querySelectorAll("[data-swatch]").length).toBe(12)
        expect(one('[aria-label="Saved color pages"]').getAttribute("aria-valuemax")).toBe("2")
        await settled(snapshot)
      },
    )
    expectSame(pair)
    expect(pair.react).toHaveLength(10)
  })

  test("without opacity and with a name of its own", async () => {
    const pair = await walkPair(
      () => render(<RColorPicker id="tint" aria-label="Tint" className="own" defaultValue="#007aff80" defaultMode="sliders" supportsAlpha={false} />),
      () => h(ColorPicker, { id: "tint", ariaLabel: "Tint", class: "own", defaultValue: "#007aff80", defaultMode: "sliders", supportsAlpha: false }),
      async (snapshot) => {
        await settle()
        expect(screen.queryByRole("textbox", { name: "Opacity" })).toBeNull()
        expect(screen.getByRole("group", { name: "Tint" }).id).toBe("tint")
        await settled(snapshot)
        await click(radio("Grid"))
        await click(one('[data-index="5"]'))
        expect(current()).toBe("Selected color #999999")
        await settled(snapshot)
      },
    )
    expectSame(pair)
  })
})

let afterEvents: Array<() => void> = []
const runAfterEvents = () => {
  for (const check of afterEvents) check()
  afterEvents = []
}

type Events = { value: string[]; mode: string[]; swatches: string[][] }
const events = (): Events => ({ value: [], mode: [], swatches: [] })

describe.each([
  ["React", (spies: Events, props: { value?: string; mode?: "grid" | "spectrum" | "sliders"; swatches?: string[]; supportsAlpha?: boolean }) => {
    render(<RColorPicker {...props} onChange={(value) => spies.value.push(value)} onModeChange={(mode) => spies.mode.push(mode)} onSwatchesChange={(next) => spies.swatches.push(next)} />)
  }],
  ["Vue", (spies: Events, props: { value?: string; mode?: "grid" | "spectrum" | "sliders"; swatches?: string[]; supportsAlpha?: boolean }) => {
    const updates: Events = events()
    mountVue(() => h(ColorPicker, {
      ...props,
      "onChange": (value: string) => spies.value.push(value),
      "onModeChange": (mode: string) => spies.mode.push(mode),
      "onSwatchesChange": (next: string[]) => spies.swatches.push(next),
      "onUpdate:value": (value: string) => updates.value.push(value),
      "onUpdate:mode": (mode: string) => updates.mode.push(mode),
      "onUpdate:swatches": (next: string[]) => updates.swatches.push(next),
    }))
    // `v-model` hears the same changes as the React-named events.
    afterEvents.push(() => expect(updates).toEqual(spies))
  }],
] as const)("%s ColorPicker", (_, mount) => {
  const setup = async (props: Parameters<typeof mount>[1] = {}) => {
    const spies = events()
    await act(async () => { mount(spies, props) })
    await settle()
    return spies
  }

  test("a controlled color, mode and saved colors change only when the owner passes them back", async () => {
    const spies = await setup({ value: "#007aff", mode: "grid", swatches: ["#000000"] })
    await click(one('[data-index="5"]'))
    expect(spies.value).toEqual(["#999999"])
    expect(current()).toBe("Selected color #007AFF")
    await click(radio("Sliders"))
    expect(spies.mode).toEqual(["sliders"])
    expect(one("[role=group]").getAttribute("data-mode")).toBe("grid")
    await click(screen.getByRole("button", { name: "Add color" }))
    expect(spies.swatches).toEqual([["#000000", "#007aff"]])
    expect(saved().getAllByRole("radio")).toHaveLength(1)
    // The color the owner holds is chosen again: nothing changes.
    await click(one('[data-index="5"]'))
    expect(spies.value).toEqual(["#999999", "#999999"])
    runAfterEvents()
  })

  test("without opacity, every chosen color is opaque", async () => {
    const spies = await setup({ value: "#ff000080", supportsAlpha: false })
    expect(screen.queryByRole("slider", { name: "Opacity" })).toBeNull()
    await click(one('[data-index="5"]'))
    expect(spies.value).toEqual(["#999999"])
    runAfterEvents()
  })

  test("Delete in a saved color's context menu removes it", async () => {
    const spies = await setup({ swatches: ["#000000", "#007aff", "#34c759"] })
    await act(async () => { fireEvent.contextMenu(saved().getByRole("radio", { name: "#007AFF" }), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    const item = screen.getByRole("menuitem", { name: "Delete" })
    expect(item.querySelector("svg")).not.toBeNull()
    await act(async () => {
      fireEvent.pointerDown(item, { button: 0, pointerType: "mouse", pointerId: 1 })
      fireEvent.pointerUp(item, { button: 0, pointerType: "mouse", pointerId: 1 })
      fireEvent.click(item, { button: 0, detail: 1 })
    })
    await settle(300)
    expect(spies.swatches).toEqual([["#000000", "#34c759"]])
    expect(screen.queryByRole("menu")).toBeNull()
    runAfterEvents()
  })
})

const wellsReact = () => (
  <div>
    <span id="tint-label">Tint</span>
    <RColorWell aria-labelledby="tint-label" defaultValue="#af52de" />
    <RColorWell aria-label="Highlight" />
    <RColorWell aria-label="Large" size="lg" defaultValue="#007aff80" name="large" className="own" />
    <RColorWell aria-label="Disabled" defaultValue="#34c759" disabled />
  </div>
)
const wellsVue = () => h("div", [
  h("span", { id: "tint-label" }, "Tint"),
  h(ColorWell, { ariaLabelledby: "tint-label", defaultValue: "#af52de" }),
  h(ColorWell, { ariaLabel: "Highlight" }),
  h(ColorWell, { ariaLabel: "Large", size: "lg", defaultValue: "#007aff80", name: "large", class: "own" }),
  h(ColorWell, { ariaLabel: "Disabled", defaultValue: "#34c759", disabled: true }),
])

describe("ColorWell DOM parity", () => {
  test.each([["desktop", true], ["phone", false]] as const)("closed wells (%s)", async (_, isWide) => {
    wide = isWide
    const pair = await walkPair(() => render(wellsReact()), wellsVue, async (snapshot) => {
      await settle()
      const tint = screen.getByRole("button", { name: "Tint" })
      expect(tint.getAttribute("aria-describedby")).not.toBeNull()
      expect(screen.getByRole("button", { name: "Tint", description: "#AF52DE" })).toBe(tint)
      expect(screen.getByRole("button", { name: "Highlight" }).hasAttribute("data-selected")).toBe(false)
      expect(screen.getByRole("button", { name: "Large", description: "#007AFF, 50% opacity" }).dataset.size).toBe("lg")
      expect(one<HTMLInputElement>('input[name="large"]').value).toBe("#007aff80")
      expect(screen.getByRole("button", { name: "Disabled" })).toHaveProperty("disabled", true)
      await settled(snapshot)
    })
    expectSame(pair)
  })

  // One well in a popover and one in a sheet: with several overlays on a page, React re-creates the opened one's
  // portal at the end of the body and Vue keeps it in its place (a Popover and Dialog difference, plan row 139).
  test("opened in a popover from the well", async () => {
    const pair = await walkPair(() => render(<RColorWell aria-label="Tint" defaultValue="#af52de" />), () => h(ColorWell, { ariaLabel: "Tint", defaultValue: "#af52de" }), async (snapshot) => {
      await settle()
      await click(screen.getByRole("button", { name: "Tint" }))
      await settle(50)
      // The popper stays hidden until it is placed, which jsdom never does.
      const dialog = screen.getByRole("dialog", { hidden: true })
      expect(one(".PopoverTitle", dialog).textContent).toBe("Colors")
      expect(one('[role=group][aria-label="Colors"]', dialog)).not.toBeNull()
      await settled(snapshot)
      await click(one('[data-index="5"]', dialog))
      expect(screen.getByRole("button", { name: "Tint", description: "#999999" })).not.toBeNull()
      await click(one('button[aria-label="Close"]', dialog))
      await settle(300)
      expect(screen.queryByRole("dialog", { hidden: true })).toBeNull()
      await settled(snapshot)
    })
    expectSame(pair, popperNames)
  })

  test("opened in a sheet on a phone", async () => {
    wide = false
    const pair = await walkPair(() => render(<RColorWell aria-label="Highlight" />), () => h(ColorWell, { ariaLabel: "Highlight" }), async (snapshot) => {
      await settle()
      await click(screen.getByRole("button", { name: "Highlight" }))
      await settle(50)
      const dialog = screen.getByRole("dialog", { name: "Colors" })
      expect(dialog.getAttribute("data-mobile-variant") ?? dialog.closest("[data-mobile-variant]")?.getAttribute("data-mobile-variant")).toBe("sheet")
      // No color yet: the picker starts from black.
      expect(current()).toBe("Selected color #000000")
      // iOS 27.2 sets Close first in the sheet's bar.
      expect(one('.Leading button[aria-label="Close"]', dialog)).not.toBeNull()
      // iOS 27.2's large sheet: the Dialog's flush phone sheet on the grouped palette of a sheet.
      expect(dialog.getAttribute("data-surface") ?? dialog.closest("[data-surface]")?.getAttribute("data-surface")).toBe("grouped")
      await settled(snapshot)
      await click(one('[data-index="5"]', dialog))
      expect(screen.getByRole("button", { name: "Highlight", hidden: true }).hasAttribute("data-selected")).toBe(true)
      await click(within(dialog).getByRole("button", { name: "Close" }))
      await settle(300)
      expect(screen.queryByRole("dialog")).toBeNull()
      await settled(snapshot)
    })
    expectSame(pair)
  })
})

describe.each([
  ["React", () => { render(<RColorPicker defaultValue="#ff000080" defaultMode="sliders" />) }],
  ["Vue", () => { mountVue(() => h(ColorPicker, { defaultValue: "#ff000080", defaultMode: "sliders" })) }],
] as const)("%s ColorPicker knobs", (_, mount) => {
  test("are filled with the current color, opaque on a channel and at its opacity on Opacity, as iOS 27.2 fills them", async () => {
    await act(async () => { mount() })
    await settle()
    const fills = [...document.querySelectorAll<HTMLElement>(".Knob")].map((knob) => knob.getAttribute("style") ?? "")
    // Red, Green and Blue, then Opacity: #ff000080 is 128/255 opaque.
    expect(fills).toEqual([...Array(3).fill("background-color: rgb(255, 0, 0);"), "background-color: rgba(255, 0, 0, 0.502);"])
  })
})

describe.each([
  ["React", (spy: string[]) => { render(<RColorWell aria-label="Tint" defaultValue="#ff000080" onChange={(value) => spy.push(value)} />) }],
  ["Vue", (spy: string[]) => { mountVue(() => h(ColorWell, { ariaLabel: "Tint", defaultValue: "#ff000080", onChange: (value: string) => spy.push(value) })) }],
] as const)("%s ColorWell", (_, mount) => {
  test("the eyedropper appears where the browser has the EyeDropper API and keeps the opacity", async () => {
    vi.stubGlobal("EyeDropper", class { open() { return Promise.resolve({ sRGBHex: "#34c759" }) } })
    const spy: string[] = []
    await act(async () => { mount(spy) })
    await settle()
    await click(screen.getByRole("button", { name: "Tint" }))
    await settle(50)
    await click(one('button[aria-label="Eyedropper"]', screen.getByRole("dialog", { hidden: true })))
    await settle()
    expect(spy).toEqual(["#34c75980"])
  })

  test("no eyedropper without the API", async () => {
    const spy: string[] = []
    await act(async () => { mount(spy) })
    await settle()
    await click(screen.getByRole("button", { name: "Tint" }))
    await settle(50)
    expect(screen.getByRole("dialog", { hidden: true })).not.toBeNull()
    expect(document.querySelector('button[aria-label="Eyedropper"]')).toBeNull()
  })
})

describe("the shared color helpers are the same in React and Vue", () => {
  test("the Vue copy is the React file", () => {
    const react = read("packages/ui/src/components/ColorPicker/shared.ts")
    const vue = read("packages/vue/src/components/ColorPicker/shared.ts")
    expect(vue.split("\n")[0]).toBe("// Shared with packages/ui/src/components/ColorPicker/shared.ts: keep the two copies the same.")
    expect(vue.split("\n").slice(1).join("\n")).toBe(react)
  })

  test.each([reactShared, vueShared])("colors, the grid, the saved colors and the spectrum", (shared) => {
    expect(shared.parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 })
    expect(shared.parseColor("FF880080")).toEqual({ r: 255, g: 136, b: 0, a: 128 / 255 })
    expect(shared.parseColor("#12345")).toBeNull()
    expect(shared.parseColor(null)).toBeNull()
    expect(shared.formatColor({ r: 255, g: 136, b: 0, a: 0.5 })).toBe("#ff880080")
    expect(shared.formatColor({ r: 255, g: 136, b: 0, a: 0.999 })).toBe("#ff8800")
    expect(shared.hexDigits({ r: 175, g: 82, b: 222, a: 1 })).toBe("AF52DE")
    expect(shared.cssColor({ r: 255, g: 0, b: 0, a: 0.5 })).toBe("rgb(255 0 0 / 50%)")
    expect(shared.COLOR_PICKER_GRID.flat()).toHaveLength(120)
    expect(shared.COLOR_PICKER_GRID.every((row) => row.length === 12)).toBe(true)
    expect([shared.gridMove(0, "ArrowLeft"), shared.gridMove(0, "ArrowRight"), shared.gridMove(0, "ArrowDown"), shared.gridMove(0, "ArrowUp")]).toEqual([0, 1, 12, 0])
    expect([shared.gridMove(13, "Home"), shared.gridMove(13, "End"), shared.gridMove(11, "ArrowRight"), shared.gridMove(115, "ArrowDown")]).toEqual([12, 23, 11, 115])
    expect([shared.listMove(0, 3, "ArrowLeft"), shared.listMove(2, 3, "ArrowRight"), shared.listMove(1, 3, "Home"), shared.listMove(0, 3, "End")]).toEqual([0, 2, 0, 2])
    expect([0, 11, 12, 23, 24].map(shared.swatchPageCount)).toEqual([1, 1, 2, 2, 3])
    expect([shared.COLOR_PICKER_SWATCHES_PER_PAGE, shared.COLOR_PICKER_SWATCHES_PER_ROW]).toEqual([12, 6])
    expect(shared.spectrumColor({ x: 0.25, y: 0.5 }, 1)).toEqual({ r: 128, g: 255, b: 255, a: 1 })
    expect(shared.spectrumColor({ x: 0, y: 0 }, 1)).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(shared.spectrumColor({ x: 1, y: 0.3 }, 0.4)).toEqual({ r: 0, g: 0, b: 0, a: 0.4 })
    expect(shared.spectrumPoint({ r: 255, g: 0, b: 0, a: 1 })).toEqual({ x: 0.5, y: 0 })
    // A gray has no hue: it keeps the hue the picker had.
    expect(shared.spectrumPoint({ r: 128, g: 128, b: 128, a: 1 }, { x: 0.2, y: 0.7 }).y).toBe(0.7)
    expect(shared.parseNumber(" 50 % ", 0, 100)).toBe(50)
    expect(shared.parseNumber("300", 0, 255)).toBe(255)
    expect(shared.parseNumber("blue", 0, 255)).toBeNull()
    expect(shared.opacityTrack({ r: 255, g: 0, b: 0, a: 1 })).toBe("linear-gradient(to right, rgb(255 0 0 / 0%) 12%, rgb(255 0 0 / 100%) 88%)")
  })
})

describe("ColorPicker tokens follow iOS 27.2 (UIColorPickerViewController on an iPhone 17)", () => {
  const tokens = read("packages/styles/src/styles/variables-components.css")
  const touch = read("packages/styles/src/styles/touch.css")
  const styles = read("packages/styles/src/components/ColorPicker/ColorPicker.module.css")
  const value = (css: string, name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

  test("the phone sizes are the native ones", () => {
    const phone = touch.slice(touch.indexOf("--color-picker-width"))
    expect(Object.fromEntries([
      "--color-picker-modes-gap", "--color-picker-body-radius", "--color-picker-section-gap", "--color-picker-row-gap",
      "--color-picker-track-height", "--color-picker-track-inset", "--color-picker-checker-size", "--color-picker-knob-size",
      "--color-picker-knob-border", "--color-picker-field-gap", "--color-picker-field-width", "--color-picker-field-height",
      "--color-picker-field-wide-width", "--color-picker-current-size", "--color-picker-current-gap",
      "--color-picker-swatches-padding-top", "--color-picker-swatch-size", "--color-picker-swatch-row-gap",
      "--color-picker-selection-width", "--color-picker-opacity-padding-bottom", "--color-picker-channel-gap",
    ].map((name) => [name, value(phone, name)]))).toEqual({
      "--color-picker-modes-gap": "15px",
      "--color-picker-body-radius": "18px",
      "--color-picker-section-gap": "18px",
      "--color-picker-row-gap": "5px",
      "--color-picker-track-height": "34px",
      "--color-picker-track-inset": "0px",
      "--color-picker-checker-size": "12px",
      "--color-picker-knob-size": "34px",
      "--color-picker-knob-border": "3px",
      "--color-picker-field-gap": "16px",
      "--color-picker-field-width": "76px",
      "--color-picker-field-height": "36px",
      "--color-picker-field-wide-width": "100px",
      "--color-picker-current-size": "78px",
      "--color-picker-current-gap": "20px",
      "--color-picker-swatches-padding-top": "22px",
      "--color-picker-swatch-size": "30px",
      "--color-picker-swatch-row-gap": "18px",
      "--color-picker-selection-width": "3px",
      "--color-picker-opacity-padding-bottom": "22px",
      "--color-picker-channel-gap": "17.67px",
    })
    // Two rows of saved colors are as tall as the current color, on a phone and on a desktop.
    const px = (css: string, name: string) => Number.parseFloat(value(css, name) ?? "")
    expect(2 * px(phone, "--color-picker-swatch-size") + px(phone, "--color-picker-swatch-row-gap")).toBe(px(phone, "--color-picker-current-size"))
    expect(2 * px(tokens, "--color-picker-swatch-size") + px(tokens, "--color-picker-swatch-row-gap")).toBe(px(tokens, "--color-picker-current-size"))
    expect(styles).toContain("grid-template-columns: repeat(6, var(--color-picker-swatch-size))")
    // The grid's 12 x 10 cells are square, as in iOS 27.2.
    expect(value(tokens, "--color-picker-body-aspect-ratio")).toBe("6 / 5")
    // Labels are small caps in the secondary label color; the field a regular capsule; the Hex row at the right.
    expect([value(phone, "--color-picker-label-font-size"), value(phone, "--color-picker-label-font-weight"), value(phone, "--color-picker-label-text-transform"), value(phone, "--color-picker-label-color")])
      .toEqual(["13px", "590", "uppercase", "var(--mobile-label-secondary)"])
    expect([value(phone, "--color-picker-field-radius"), value(phone, "--color-picker-field-font-weight"), value(phone, "--color-picker-field-background")])
      .toEqual(["var(--radius-full)", "var(--font-weight-normal)", "var(--mobile-surface-elevated-grouped-secondary)"])
    expect([value(phone, "--color-picker-sliders-justify"), value(phone, "--color-picker-hex-justify"), value(phone, "--color-picker-hex-margin-block")]).toEqual(["flex-start", "flex-end", "auto"])
    // The checkerboard and the Add button are light gray in both themes.
    expect(value(phone, "--color-picker-checker")).toBe("repeating-conic-gradient(transparent 0 25%, #d9d9d9 0 50%)")
    expect([value(phone, "--color-picker-add-background"), value(phone, "--color-picker-add-color")]).toEqual(["#d9d9d9", "#4a4a4a"])
    expect(value(phone, "--color-picker-separator-color")).toBe("var(--color-picker-mobile-separator-color)")
    expect(value(tokens, "--color-picker-mobile-separator-color")).toBe("light-dark(var(--alpha-20), var(--alpha-15))")
    // A desktop keeps its labels, field and checkerboard.
    expect([value(tokens, "--color-picker-label-text-transform"), value(tokens, "--color-picker-field-font-weight"), value(tokens, "--color-picker-checker")])
      .toEqual(["none", "var(--font-weight-semibold)", "repeating-conic-gradient(#fff 0 25%, #000 0 50%)"])
  })

  test("the well, the sheet and the Mode control", () => {
    expect([value(tokens, "--color-well-size-sm"), value(tokens, "--color-well-size-lg"), value(tokens, "--color-well-ring-width")]).toEqual(["28px", "36px", "3px"])
    // iOS 27.2's large sheet is flush and opaque: the picker no longer turns the Dialog's sheet into inset glass.
    expect(styles).not.toMatch(/\n\.Sheet \{/)
    expect(styles).not.toContain("backdrop-filter")
    // The Mode control is the plain segmented control every phone tab group takes in content (touch.css), as the
    // kit picker draws it; the picker keeps no override of its own.
    expect(styles).not.toContain(".Modes[data-variant")
    const plain = touch.match(/html :is\(\[data-variant="segmented"\], \[data-variant="underline"\]\)\[data-orientation="horizontal"\] \{([^}]*)\}/)?.[1] ?? ""
    expect(value(plain, "--segmented-control-size")).toBe("32px")
    expect(value(plain, "--segmented-control-thumb-outset")).toBe("0px")
    expect([value(plain, "--segmented-control-font-weight"), value(plain, "--segmented-control-active-font-weight")]).toEqual(["510", "590"])
    expect(value(plain, "--segmented-control-background")).toBe("var(--segmented-control-mobile-plain-background)")
    expect(value(plain, "--segmented-control-thumb-background")).toBe("var(--segmented-control-mobile-plain-thumb-background)")
    expect([value(plain, "--segmented-control-sheen"), value(plain, "--segmented-control-shadow"), value(plain, "--segmented-control-backdrop-filter")]).toEqual(["none", "none", "none"])
    expect(value(plain, "--color-text-secondary")).toBe("var(--color-text)")
    expect(value(tokens, "--segmented-control-mobile-plain-background")).toBe("light-dark(var(--alpha-06), var(--alpha-12))")
    expect(value(tokens, "--segmented-control-mobile-plain-thumb-background")).toBe("light-dark(var(--gray-0), var(--alpha-25))")
    expect(tokens).not.toContain("--color-picker-mobile-mode")
    // md and larger are the large phone control; the Mode control asks for the small one in both frameworks.
    const large = touch.match(/html :is\(\[data-variant="segmented"\], \[data-variant="underline"\]\)\[data-orientation="horizontal"\]:where\(:not\(([^)]*)\)\)/)?.[1] ?? ""
    const flat = touch.match(/html \[data-mobile-material="flat"\]:is\([^)]*\)\[data-orientation="horizontal"\]:where\(:not\(([^)]*)\)\)/)?.[1] ?? ""
    expect(large).toContain('[data-mobile-size="small"]')
    expect(flat).toContain('[data-mobile-size="small"]')
  })

  test("the Mode control asks for the small phone control in React and Vue", async () => {
    render(<RColorPicker defaultValue="#ff0000" />)
    const react = one('[aria-label="Mode"]')
    expect([react.getAttribute("data-mobile-size"), react.getAttribute("data-variant")]).toEqual(["small", "segmented"])
    cleanup()
    mountVue(() => h(ColorPicker, { defaultValue: "#ff0000" }))
    await settle()
    const vue = one('[aria-label="Mode"]')
    expect([vue.getAttribute("data-mobile-size"), vue.getAttribute("data-variant")]).toEqual(["small", "segmented"])
  })
})

describe("ColorPicker saved color pages and reduced motion (plan 95)", () => {
  test("a tap on the page dots scrolls smoothly, and without animation when reduced motion is on, in React and Vue", async () => {
    let reduced = false
    vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
      media: query, matches: query === "(prefers-reduced-motion: reduce)" ? reduced : true, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
    }))
    const scrolls: string[] = []
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value(options: ScrollToOptions) { scrolls.push(`${options.left} ${options.behavior}`) },
    })
    // Twelve saved colors and Add are two pages.
    const swatches = ["#000000", "#007aff", "#34c759", "#ff9500", "#ff3b30", "#af52de", "#5856d6", "#ffcc00", "#00c7be", "#8e8e93", "#ff2d55", "#a2845e"]
    const runs: string[][] = []
    try {
      await walkPair(
        () => render(<RColorPicker defaultValue="#af52de" defaultSwatches={swatches} />),
        () => h(ColorPicker, { defaultValue: "#af52de", defaultSwatches: swatches }),
        async () => {
          await settle()
          const dots = one('[aria-label="Saved color pages"]')
          reduced = false
          await key(dots, { key: "ArrowRight" })
          reduced = true
          await key(dots, { key: "ArrowLeft" })
          runs.push(scrolls.splice(0))
        },
      )
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollTo")
    }
    // jsdom lays nothing out, so every page is 0px wide; the behavior is what this checks.
    expect(runs).toEqual([["0 smooth", "0 auto"], ["0 smooth", "0 auto"]])
  })
})
