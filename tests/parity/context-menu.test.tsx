import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { ContextMenu as RContextMenu } from "../../packages/ui/src/components/ContextMenu"
import * as reactShared from "../../packages/ui/src/components/ContextMenu/shared"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../packages/vue/src/components/ContextMenu"
import * as vueShared from "../../packages/vue/src/components/ContextMenu/shared"
import { MenuItem, MenuSeparator } from "../../packages/vue/src/components/Menu"
import { flushVue, mountVue } from "./harness"
import { walkPair } from "./pair"

// React-vs-Vue parity for ContextMenu: the same trigger and menu, a secondary click at the pointer, a touch and hold
// that opens beside the element over a dimming with the element cut out, the click it swallows, the keyboard, and
// the kit tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
const REGION = { x: 16, y: 100, width: 370, height: 52 }

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (this.dataset.testid === "region") return DOMRect.fromRect(REGION)
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Spies = { select: string[]; clicks: number; opened: number; closed: number }
type Options = { disabled?: boolean; ownContextMenu?: boolean }

const mountReact = (spies: Spies, options: Options = {}) => render(
  <RContextMenu onOpen={() => spies.opened++} onClose={() => spies.closed++}>
    <RContextMenu.Trigger disabled={options.disabled}>
      <div
        data-testid="region"
        tabIndex={0}
        onClick={() => spies.clicks++}
        onContextMenu={options.ownContextMenu ? (event) => event.preventDefault() : undefined}
      >
        Groceries
      </div>
    </RContextMenu.Trigger>
    <RContextMenu.Content>
      <RContextMenu.Item onSelect={() => spies.select.push("copy")}>Copy</RContextMenu.Item>
      <RContextMenu.Separator />
      <RContextMenu.Item danger onSelect={() => spies.select.push("delete")}>Delete</RContextMenu.Item>
    </RContextMenu.Content>
  </RContextMenu>,
)

const vueApp = (spies: Spies, options: Options = {}) => () => h(ContextMenu, { onOpen: () => spies.opened++, onClose: () => spies.closed++ }, () => [
  h(ContextMenuTrigger, { disabled: options.disabled }, () => h("div", {
    "data-testid": "region",
    "tabindex": 0,
    "onClick": () => spies.clicks++,
    "onContextmenu": options.ownContextMenu ? (event: Event) => event.preventDefault() : undefined,
  }, "Groceries")),
  h(ContextMenuContent, null, () => [
    h(MenuItem, { onSelect: () => spies.select.push("copy") }, () => "Copy"),
    h(MenuSeparator),
    h(MenuItem, { danger: true, onSelect: () => spies.select.push("delete") }, () => "Delete"),
  ]),
])

const settle = async (ms = 0) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
  await flushVue()
}

const region = () => {
  const element = document.querySelector<HTMLElement>('[data-testid="region"]')
  if (!element) throw new Error("The trigger must render its element")
  return element
}
const anchor = () => document.querySelector<HTMLElement>('span[aria-hidden="true"][aria-haspopup="menu"]')
const menu = () => document.querySelector<HTMLElement>('[role="menu"]')
const overlay = () => document.querySelector<HTMLElement>("[data-context-menu-dimming]")
const touch = (type: "pointerDown" | "pointerMove" | "pointerUp", x: number, y: number) =>
  act(async () => { fireEvent[type](region(), { pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, clientX: x, clientY: y }) })

describe("ContextMenu DOM parity", () => {
  test("closed: the element, and the invisible anchor the menu is placed against", async () => {
    const spies: Spies = { select: [], clicks: 0, opened: 0, closed: 0 }
    const pair = await walkPair(() => mountReact(spies), vueApp(spies), async (snapshot) => {
      await settle()
      snapshot()
    })
    expect(pair.vue).toEqual(pair.react)
    expect(pair.react[0]).toContain("Groceries")
  })

  test("opened by a secondary click, and by a touch and hold", async () => {
    const spies: Spies = { select: [], clicks: 0, opened: 0, closed: 0 }
    const pair = await walkPair(() => mountReact(spies), vueApp(spies), async (snapshot) => {
      await settle()
      await act(async () => { fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
      await settle(20)
      snapshot()
      await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }) })
      await settle(300)
      await touch("pointerDown", 300, 120)
      await settle(550)
      snapshot()
      await touch("pointerUp", 300, 120)
      await settle(300)
    })
    // Radix and Reka name the variables of their popper wrapper after themselves; the rest is the same DOM.
    expect(pair.vue.map((dom) => dom.replaceAll("--reka-popper", "--radix-popper"))).toEqual(pair.react)
  })
})

describe.each([
  ["React", (spies: Spies, options?: Options) => { mountReact(spies, options) }],
  ["Vue", (spies: Spies, options?: Options) => { mountVue(vueApp(spies, options)) }],
] as const)("%s ContextMenu", (_, mount) => {
  const setup = async (options?: Options) => {
    const spies: Spies = { select: [], clicks: 0, opened: 0, closed: 0 }
    await act(async () => { mount(spies, options) })
    await settle()
    return spies
  }

  test("a secondary click opens the menu with its corner at the pointer, without dimming", async () => {
    const spies = await setup()
    let notPrevented = true
    await act(async () => { notPrevented = fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    expect(notPrevented).toBe(false)
    expect(menu()).not.toBeNull()
    expect(menu()?.getAttribute("data-align")).toBe("start")
    expect(anchor()?.style.cssText).toBe("left: 40px; top: 60px; width: 0px; height: 0px;")
    expect(overlay()).toBeNull()
    expect(spies.opened).toBe(1)
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) => element.textContent === "Delete")
    if (!item) throw new Error("The menu must show Delete")
    await act(async () => {
      fireEvent.pointerDown(item, { button: 0, pointerType: "mouse", pointerId: 1 })
      fireEvent.pointerUp(item, { button: 0, pointerType: "mouse", pointerId: 1 })
      fireEvent.click(item, { button: 0, detail: 1 })
    })
    await settle(300)
    expect(spies.select).toEqual(["delete"])
    expect(menu()).toBeNull()
    expect(spies.closed).toBe(1)
  })

  test("a touch held for 500ms opens the menu beside the element over the dimming, and swallows its click", async () => {
    const spies = await setup()
    await touch("pointerDown", 900, 120)
    await settle(400)
    expect(menu()).toBeNull()
    await settle(150)
    expect(menu()).not.toBeNull()
    // The touch was on the trailing half, so the menu keeps to the trailing edge, 18px below the element.
    expect(menu()?.getAttribute("data-align")).toBe("end")
    expect(anchor()?.style.cssText).toBe("left: 16px; top: 100px; width: 370px; height: 52px;")
    const dimming = overlay()
    expect(dimming).not.toBeNull()
    const hole = decodeURIComponent(dimming?.style.getPropertyValue("--context-menu-hole") ?? "")
    // The element's box with the kit's corner of 30, held to half its 52px height, is cut out of the page.
    expect(hole).toContain("M0 0H1024V768H0ZM42 100H360A26 26 0 0 1 386 126V126A26 26 0 0 1 360 152H42A26 26 0 0 1 16 126V126A26 26 0 0 1 42 100Z")
    expect(dimming?.firstElementChild?.getAttribute("style")).toBe("left: 16px; top: 100px; width: 370px; height: 52px; border-radius: 26px;")
    await touch("pointerUp", 900, 120)
    // The compatibility mousedown after the hold must not move focus to the element: the menu would close.
    let mousedownNotPrevented = true
    await act(async () => { mousedownNotPrevented = fireEvent.mouseDown(region(), { button: 0 }) })
    expect(mousedownNotPrevented).toBe(false)
    await act(async () => { fireEvent.click(region()) })
    expect(spies.clicks).toBe(0)
    expect(menu()).not.toBeNull()
    // The next tap is a tap again.
    await settle(700)
    await act(async () => { fireEvent.click(region()) })
    expect(spies.clicks).toBe(1)
  })

  test("a touch on the leading half keeps the menu to the leading edge", async () => {
    await setup()
    await touch("pointerDown", 100, 120)
    await settle(550)
    expect(menu()?.getAttribute("data-align")).toBe("start")
    await touch("pointerUp", 100, 120)
  })

  test("a short tap and a touch that moves open nothing", async () => {
    const spies = await setup()
    await touch("pointerDown", 300, 120)
    await settle(200)
    await touch("pointerUp", 300, 120)
    await act(async () => { fireEvent.click(region()) })
    await settle(400)
    expect(menu()).toBeNull()
    expect(spies.clicks).toBe(1)
    await touch("pointerDown", 300, 120)
    await touch("pointerMove", 300, 132)
    await settle(550)
    expect(menu()).toBeNull()
  })

  test("a context menu key opens it under the element, and closing returns focus to the element", async () => {
    await setup()
    region().focus()
    await act(async () => { fireEvent.keyDown(region(), { key: "F10", shiftKey: true }) })
    await act(async () => { fireEvent.contextMenu(region(), { button: 0, clientX: 0, clientY: 0 }) })
    await settle(20)
    expect(menu()).not.toBeNull()
    expect(anchor()?.style.cssText).toBe("left: 16px; top: 100px; width: 370px; height: 52px;")
    expect(overlay()).toBeNull()
    await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }) })
    await waitFor(() => expect(menu()).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(region()))
  })

  test("disabled, the element keeps the browser's own context menu", async () => {
    await setup({ disabled: true })
    let notPrevented = false
    await act(async () => { notPrevented = fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    expect(notPrevented).toBe(true)
    expect(menu()).toBeNull()
  })

  test("an element that handles its own context menu opens nothing", async () => {
    await setup({ ownContextMenu: true })
    await act(async () => { fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    expect(menu()).toBeNull()
  })
})

describe("ContextMenu placement and dimming helpers are the same in React and Vue", () => {
  test.each([reactShared, vueShared])("placement and hole", (shared) => {
    expect(shared.contextMenuPlacement(null)).toEqual({ side: "bottom", align: "start", sideOffset: 2, alignOffset: 0 })
    expect(shared.contextMenuPlacement({ kind: "keyboard", rect: REGION })).toEqual({ side: "bottom", align: "start", sideOffset: 5, alignOffset: 0 })
    expect(shared.contextMenuPlacement({ kind: "preview", rect: REGION, radius: 12, align: "end" })).toEqual({ side: "bottom", align: "end", sideOffset: 18, alignOffset: 0 })
    expect(shared.CONTEXT_MENU_LONG_PRESS).toBe(500)
    expect(shared.CONTEXT_MENU_LONG_PRESS_SLOP).toBe(10)
    const mask = shared.contextMenuHoleMask({ kind: "preview", rect: { x: 10.004, y: 20, width: 100, height: 40 }, radius: 12, align: "start" }, { width: 402, height: 874 })
    expect(decodeURIComponent(mask["--context-menu-hole"])).toBe(
      "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='402' height='874' viewBox='0 0 402 874'><path fill-rule='evenodd' d='M0 0H402V874H0ZM22 20H98A12 12 0 0 1 110 32V48A12 12 0 0 1 98 60H22A12 12 0 0 1 10 48V32A12 12 0 0 1 22 20Z'/></svg>\")",
    )
  })

  test("the two copies of the shared module are the same", () => {
    const ui = read("packages/ui/src/components/ContextMenu/shared.ts")
    const vue = read("packages/vue/src/components/ContextMenu/shared.ts")
    expect(vue.slice(vue.indexOf("\n") + 1)).toBe(ui)
  })
})

describe("ContextMenu tokens follow the iOS 26 kit Context Menu (507:25994)", () => {
  test("the dimming, the preview corner and shadow", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const line of [
      "--context-menu-dimming-background: light-dark(rgb(0 0 0 / 23%), rgb(0 0 0 / 50%));",
      "--context-menu-dimming-backdrop-filter: blur(30px);",
      "--context-menu-preview-radius: 30px;",
      "--context-menu-preview-shadow: 0 0 32px rgb(0 0 0 / 20%);",
    ]) expect(tokens).toContain(line)
    const css = read("packages/styles/src/components/ContextMenu/ContextMenu.module.css")
    for (const line of ["mask-image: var(--context-menu-hole);", "touch-action: none;", "-webkit-touch-callout: none;"]) expect(css).toContain(line)
    // The dimming shares the overlay layer, after a Dialog it opens from, and takes the press over its content too.
    const overlay = css.slice(css.indexOf(".Overlay {"), css.indexOf("}", css.indexOf(".Overlay {")))
    for (const line of ["z-index: 50;", "pointer-events: auto;"]) expect(overlay).toContain(line)
  })
})
