import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import { computeAccessibleName } from "dom-accessibility-api"
import { useLayoutEffect, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { ContextMenu as RContextMenu } from "../../packages/ui/src/components/ContextMenu"
import * as reactShared from "../../packages/ui/src/components/ContextMenu/shared"
import { Sortable as RSortable } from "../../packages/ui/src/components/Sortable"
import { CONTEXT_MENU_HOLD, type ContextMenuHold } from "../../packages/ui/src/lib/contextMenuHold"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../../packages/vue/src/components/ContextMenu"
import * as vueShared from "../../packages/vue/src/components/ContextMenu/shared"
import { MenuItem, MenuSeparator } from "../../packages/vue/src/components/Menu"
import { Sortable } from "../../packages/vue/src/components/Sortable"
import { flushVue, mountVue } from "./harness"
import { walkPair } from "./pair"

// React-vs-Vue parity for ContextMenu: the same trigger and menu, a secondary click at the pointer, a touch and hold
// that opens beside the element over a dimming with the element cut out, the click it swallows, the keyboard, and
// the kit tokens.

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8")
const REGION = { x: 16, y: 100, width: 370, height: 52 }
let region$ = REGION

beforeEach(() => {
  region$ = REGION
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (this.dataset.testid === "region") return DOMRect.fromRect(region$)
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Spies = { select: string[]; clicks: number; opened: number; closed: number }
type Options = { disabled?: boolean; ownContextMenu?: boolean; grip?: boolean; label?: string; forceOpen?: boolean }

const mountReact = (spies: Spies, options: Options = {}) => render(
  <RContextMenu forceOpen={options.forceOpen} onOpen={() => spies.opened++} onClose={() => spies.closed++}>
    <RContextMenu.Trigger disabled={options.disabled}>
      <div
        data-testid="region"
        tabIndex={0}
        onClick={() => spies.clicks++}
        onContextMenu={options.ownContextMenu ? (event) => event.preventDefault() : undefined}
      >
        {options.grip && <button type="button" aria-label="Reorder" data-sortable-handle="" />}
        Groceries
      </div>
    </RContextMenu.Trigger>
    <RContextMenu.Content aria-label={options.label}>
      <RContextMenu.Item onSelect={() => spies.select.push("copy")}>Copy</RContextMenu.Item>
      <RContextMenu.Separator />
      <RContextMenu.Item danger onSelect={() => spies.select.push("delete")}>Delete</RContextMenu.Item>
    </RContextMenu.Content>
  </RContextMenu>,
)

const vueApp = (spies: Spies, options: Options = {}) => () => h(ContextMenu, { forceOpen: options.forceOpen, onOpen: () => spies.opened++, onClose: () => spies.closed++ }, () => [
  h(ContextMenuTrigger, { disabled: options.disabled }, () => h("div", {
    "data-testid": "region",
    "tabindex": 0,
    "onClick": () => spies.clicks++,
    "onContextmenu": options.ownContextMenu ? (event: Event) => event.preventDefault() : undefined,
  }, [options.grip ? h("button", { "type": "button", "aria-label": "Reorder", "data-sortable-handle": "" }) : null, "Groceries"])),
  h(ContextMenuContent, { ariaLabel: options.label }, () => [
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
    // The element stands in the leading third of the screen, so the menu keeps to its leading edge, wherever the
    // touch, 16px below it.
    expect(menu()?.getAttribute("data-align")).toBe("start")
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

  test("a touch on the leading half keeps the menu to the element's leading edge too", async () => {
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

  test("the menu is named after its element", async () => {
    await setup()
    await act(async () => { fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    // The menu is labelled by its anchor, which is hidden and names it: a node aria-labelledby points to is named
    // even when hidden (accname 2A, 2C)
    expect(menu()?.getAttribute("aria-labelledby")).toBe(anchor()?.id)
    expect(computeAccessibleName(menu() as HTMLElement)).toBe("Groceries")
  })

  test("ContextMenu.Content aria-label names the menu instead", async () => {
    await setup({ label: "Grocery actions" })
    await act(async () => { fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    expect(computeAccessibleName(menu() as HTMLElement)).toBe("Grocery actions")
  })

  test("the hold that opens the menu goes on to a Sortable list: an event on the element, and a close for the drag", async () => {
    const spies = await setup()
    expect(region().hasAttribute("data-context-menu-trigger")).toBe(true)
    const holds: ContextMenuHold[] = []
    region().addEventListener(CONTEXT_MENU_HOLD, (event) => holds.push((event as CustomEvent<ContextMenuHold>).detail))
    await touch("pointerDown", 300, 120)
    await settle(550)
    expect(menu()).not.toBeNull()
    expect(holds.map((hold) => hold.pointerId)).toEqual([7])
    await act(async () => { holds[0].close() })
    await settle(300)
    expect(menu()).toBeNull()
    expect(spies.closed).toBe(1)
    await touch("pointerUp", 300, 120)
  })

  test("a touch and hold the browser reports as a context menu goes on to a Sortable list too (Android)", async () => {
    await setup()
    const holds: number[] = []
    region().addEventListener(CONTEXT_MENU_HOLD, (event) => holds.push((event as CustomEvent<ContextMenuHold>).detail.pointerId))
    await touch("pointerDown", 300, 120)
    await settle(200)
    await act(async () => { fireEvent.contextMenu(region(), { button: 0, clientX: 300, clientY: 120 }) })
    await settle(400)
    expect(menu()).not.toBeNull()
    expect(overlay()).not.toBeNull()
    // Once: the timer that would have opened it is over
    expect(holds).toEqual([7])
    await touch("pointerUp", 300, 120)
  })

  test("a hold on the grip of a Sortable item, or one a list already turned into a drag, opens no menu", async () => {
    await setup({ grip: true })
    const grip = region().querySelector("button") as HTMLElement
    await act(async () => { fireEvent.pointerDown(grip, { pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, clientX: 30, clientY: 120 }) })
    await settle(550)
    expect(menu()).toBeNull()
    await act(async () => { fireEvent.pointerUp(grip, { pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, clientX: 30, clientY: 120 }) })
    await touch("pointerDown", 300, 120)
    const source = document.createElement("div")
    source.setAttribute("data-sortable-source", "")
    document.body.append(source)
    await settle(550)
    expect(menu()).toBeNull()
    source.remove()
    await touch("pointerUp", 300, 120)
  })

  test("disabled, the element is no trigger for a Sortable hold either", async () => {
    await setup({ disabled: true })
    expect(region().hasAttribute("data-context-menu-trigger")).toBe(false)
  })

  test("forceOpen holds the menu open under its element", async () => {
    await setup({ forceOpen: true })
    await waitFor(() => expect(menu()).not.toBeNull())
    expect(anchor()?.style.cssText).toBe("left: 16px; top: 100px; width: 370px; height: 52px;")
    expect(overlay()).toBeNull()
  })

  test("forceOpen false keeps the menu closed", async () => {
    await setup({ forceOpen: false })
    await act(async () => { fireEvent.contextMenu(region(), { button: 2, clientX: 40, clientY: 60 }) })
    await settle(20)
    expect(menu()).toBeNull()
  })

  test("forceOpen on a phone stands as the touch-and-hold preview", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    await setup({ forceOpen: true })
    await waitFor(() => expect(overlay()).not.toBeNull())
    expect(anchor()?.style.cssText).toBe("left: 16px; top: 100px; width: 370px; height: 52px;")
    // The element's middle stands in the leading half of the window
    expect(menu()?.getAttribute("data-align")).toBe("start")
  })

  test("the preview moves up so that the menu stands whole below it, and back as the menu closes", async () => {
    region$ = { x: 16, y: 150, width: 370, height: 52 }
    Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 400 })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function height(this: HTMLElement) {
      return this.getAttribute("role") === "menu" ? 200 : 0
    })
    try {
      await setup()
      await touch("pointerDown", 300, 170)
      await settle(550)
      // The element stands in the upper half, so the menu opens below it. 200 tall and 16 below the element, it ends
      // 30 above the 400px window's bottom: 48 higher
      expect(anchor()?.style.cssText).toBe("left: 16px; top: 102px; width: 370px; height: 52px;")
      expect(region().style.getPropertyValue("translate")).toBe("0 -48px")
      const hole = decodeURIComponent(overlay()?.style.getPropertyValue("--context-menu-hole") ?? "")
      expect(hole).toContain("M42 102H360")
      expect(overlay()?.style.getPropertyValue("--context-menu-hole-clip")).toContain("M42 102H360")
      await touch("pointerUp", 300, 170)
      await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }) })
      await settle(300)
      expect(menu()).toBeNull()
      expect(region().style.getPropertyValue("translate")).toBe("")
    } finally {
      Reflect.deleteProperty(document.documentElement, "clientHeight")
    }
  })

  test("a preview in the lower half opens its menu above it, unmoved, where the menu stands whole", async () => {
    region$ = { x: 16, y: 300, width: 370, height: 52 }
    Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 400 })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function height(this: HTMLElement) {
      return this.getAttribute("role") === "menu" ? 120 : 0
    })
    try {
      await setup()
      await touch("pointerDown", 300, 320)
      await settle(550)
      // iOS 27.2 opens the menu toward the larger room: above, 120 tall and 16 over the element, which stays in
      // place (below, it would move 118 up). jsdom places no popper, so the side itself is checked in
      // contextMenuPreviewLayout and contextMenuPlacement above.
      expect(anchor()?.style.cssText).toBe("left: 16px; top: 300px; width: 370px; height: 52px;")
      expect(region().style.getPropertyValue("translate")).toBe("")
      await touch("pointerUp", 300, 320)
    } finally {
      Reflect.deleteProperty(document.documentElement, "clientHeight")
    }
  })
})

type Parts = { hide: () => void; show: () => void; swap: () => void }

describe.each([
  ["React", (forceOpen?: boolean): Parts => {
    const parts = { hide: () => {}, show: () => {}, swap: () => {} }
    const App = () => {
      const [shown, setShown] = useState(true)
      const [other, setOther] = useState(false)
      useLayoutEffect(() => {
        parts.hide = () => setShown(false)
        parts.show = () => setShown(true)
        parts.swap = () => setOther(true)
      }, [])
      return (
        <RContextMenu forceOpen={forceOpen}>
          <RContextMenu.Trigger>
            {other ? <button type="button" data-testid="other">Groceries</button> : <div data-testid="region" tabIndex={0}>Groceries</div>}
          </RContextMenu.Trigger>
          {shown && <RContextMenu.Content><RContextMenu.Item onSelect={() => {}}>Copy</RContextMenu.Item></RContextMenu.Content>}
        </RContextMenu>
      )
    }
    render(<App />)
    return { hide: () => parts.hide(), show: () => parts.show(), swap: () => parts.swap() }
  }],
  ["Vue", (forceOpen?: boolean): Parts => {
    const shown = ref(true)
    const other = ref(false)
    mountVue(() => h(ContextMenu, { forceOpen }, () => [
      h(ContextMenuTrigger, null, () => other.value
        ? h("button", { "type": "button", "data-testid": "other" }, "Groceries")
        : h("div", { "data-testid": "region", "tabindex": 0 }, "Groceries")),
      shown.value ? h(ContextMenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Copy")) : null,
    ]))
    return { hide: () => { shown.value = false }, show: () => { shown.value = true }, swap: () => { other.value = true } }
  }],
] as const)("%s ContextMenu as its parts change", (_, mount) => {
  test("the content going away while the element stays puts the element back", async () => {
    region$ = { x: 16, y: 150, width: 370, height: 52 }
    Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 400 })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function height(this: HTMLElement) {
      return this.getAttribute("role") === "menu" ? 200 : 0
    })
    try {
      let parts: Parts = { hide: () => {}, show: () => {}, swap: () => {} }
      await act(async () => { parts = mount() })
      await settle()
      await touch("pointerDown", 300, 170)
      await settle(550)
      expect(region().style.getPropertyValue("translate")).toBe("0 -48px")
      await act(async () => { parts.hide() })
      await settle(50)
      expect(region().style.getPropertyValue("translate")).toBe("")
      await touch("pointerUp", 300, 170)
    } finally {
      Reflect.deleteProperty(document.documentElement, "clientHeight")
    }
  })

  test("content that comes back to a menu held open measures its move anew", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
    region$ = { x: 16, y: 150, width: 370, height: 52 }
    Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: 400 })
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function height(this: HTMLElement) {
      return this.getAttribute("role") === "menu" ? 200 : 0
    })
    try {
      let parts: Parts = { hide: () => {}, show: () => {}, swap: () => {} }
      await act(async () => { parts = mount(true) })
      await waitFor(() => expect(region().style.getPropertyValue("translate")).toBe("0 -48px"))
      expect(anchor()?.style.top).toBe("102px")
      await act(async () => { parts.hide() })
      await settle(50)
      expect(region().style.getPropertyValue("translate")).toBe("")
      await act(async () => { parts.show() })
      await waitFor(() => expect(region().style.getPropertyValue("translate")).toBe("0 -48px"))
      expect(anchor()?.style.top).toBe("102px")
    } finally {
      Reflect.deleteProperty(document.documentElement, "clientHeight")
    }
  })

  test("a menu held open follows the element the trigger has now", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
      if (this.dataset.testid === "region") return DOMRect.fromRect(REGION)
      if (this.dataset.testid === "other") return DOMRect.fromRect({ x: 16, y: 250, width: 370, height: 52 })
      return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
    })
    let parts: Parts = { hide: () => {}, show: () => {}, swap: () => {} }
    await act(async () => { parts = mount(true) })
    await waitFor(() => expect(menu()).not.toBeNull())
    expect(anchor()?.style.top).toBe("100px")
    await act(async () => { parts.swap() })
    await settle(50)
    expect(anchor()?.style.top).toBe("250px")
  })
})

test("Vue: a menu held open follows a component that changes its own root", async () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function rect(this: HTMLElement) {
    if (this.dataset.testid === "region") return DOMRect.fromRect(REGION)
    if (this.dataset.testid === "other") return DOMRect.fromRect({ x: 16, y: 250, width: 370, height: 52 })
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 })
  })
  const other = ref(false)
  const Row = defineComponent(() => () => other.value
    ? h("button", { "type": "button", "data-testid": "other" }, "Groceries")
    : h("div", { "data-testid": "region", "tabindex": 0 }, "Groceries"))
  await act(async () => {
    mountVue(() => h(ContextMenu, { forceOpen: true }, () => [
      h(ContextMenuTrigger, null, () => h(Row)),
      h(ContextMenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Copy")),
    ]))
  })
  await waitFor(() => expect(menu()).not.toBeNull())
  expect(anchor()?.style.top).toBe("100px")
  other.value = true
  await settle(50)
  expect(anchor()?.style.top).toBe("250px")
  // The new root takes the trigger's attribute and handlers as the old one did
  expect(document.querySelector('[data-testid="other"]')?.hasAttribute("data-context-menu-trigger")).toBe(true)
})

describe("One touch and hold for a ContextMenu on a Sortable item", () => {
  beforeEach(() => {
    // Reduced motion: jsdom cannot animate the drag's chip
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
  })
  const touchRow = (type: "pointerDown" | "pointerUp", target: Element) =>
    act(async () => { fireEvent[type](target, { pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, clientX: 300, clientY: 120 }) })

  test.each([
    ["React", () => {
      const Rows = () => {
        const [items, setItems] = useState(["Milk", "Eggs"])
        return (
          <RSortable value={items} onChange={setItems}>
            {items.map((item) => (
              <RContextMenu key={item}>
                <RContextMenu.Trigger><div data-testid={item}>{item}</div></RContextMenu.Trigger>
                <RContextMenu.Content><RContextMenu.Item onSelect={() => {}}>Copy</RContextMenu.Item></RContextMenu.Content>
              </RContextMenu>
            ))}
          </RSortable>
        )
      }
      render(<Rows />)
    }],
    ["Vue", () => {
      const items = ref(["Milk", "Eggs"])
      mountVue(() => h(Sortable, { "value": items.value, "onUpdate:value": (next: string[]) => { items.value = next } }, () => items.value.map((item) =>
        h(ContextMenu, { key: item }, () => [
          h(ContextMenuTrigger, null, () => h("div", { "data-testid": item }, item)),
          h(ContextMenuContent, null, () => h(MenuItem, { onSelect: () => {} }, () => "Copy")),
        ]))))
    }],
  ] as const)("%s: the hold opens the menu, and the finger moving on closes it and drags the row", async (_, mount) => {
    await act(async () => { mount() })
    await settle()
    const row = document.querySelector<HTMLElement>('[data-testid="Milk"]') as HTMLElement
    await touchRow("pointerDown", row)
    await settle(300)
    expect(row.hasAttribute("data-sortable-source")).toBe(false)
    await settle(250)
    expect(menu()).not.toBeNull()
    await act(async () => { window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, clientX: 300, clientY: 150 })) })
    await settle(300)
    expect(menu()).toBeNull()
    expect(row.hasAttribute("data-sortable-source")).toBe(true)
    await act(async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })) })
    await act(async () => { window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 })) })
    await settle(50)
  })
})

describe("ContextMenu placement and dimming helpers are the same in React and Vue", () => {
  test.each([reactShared, vueShared])("placement and hole", (shared) => {
    expect(shared.contextMenuPlacement(null)).toEqual({ side: "bottom", align: "start", sideOffset: 2, alignOffset: 0 })
    expect(shared.contextMenuPlacement({ kind: "keyboard", rect: REGION })).toEqual({ side: "bottom", align: "start", sideOffset: 5, alignOffset: 0 })
    expect(shared.contextMenuPlacement({ kind: "preview", rect: REGION, radius: 12, align: "end" })).toEqual({ side: "bottom", align: "end", sideOffset: 16, alignOffset: 0 })
    expect(shared.contextMenuPlacement({ kind: "preview", rect: REGION, radius: 12, align: "center", side: "top" })).toEqual({ side: "top", align: "center", sideOffset: 16, alignOffset: 0 })
    expect(shared.CONTEXT_MENU_LONG_PRESS).toBe(500)
    expect(shared.CONTEXT_MENU_LONG_PRESS_SLOP).toBe(10)
    const mask = shared.contextMenuHoleMask({ kind: "preview", rect: { x: 10.004, y: 20, width: 100, height: 40 }, radius: 12, align: "start" }, { width: 402, height: 874 })
    expect(decodeURIComponent(mask["--context-menu-hole"])).toBe(
      "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='402' height='874' viewBox='0 0 402 874'><path fill-rule='evenodd' d='M0 0H402V874H0ZM22 20H98A12 12 0 0 1 110 32V48A12 12 0 0 1 98 60H22A12 12 0 0 1 10 48V32A12 12 0 0 1 22 20Z'/></svg>\")",
    )
  })

  test.each([reactShared, vueShared])("the menu keeps to where the preview stands, and opens toward the larger room", (shared) => {
    const at = (x: number, width: number) => {
      const element = document.createElement("div")
      element.getBoundingClientRect = () => ({ x, y: 100, left: x, top: 100, width, height: 52, right: x + width, bottom: 152, toJSON: () => ({}) }) as DOMRect
      return shared.contextMenuPreview(element)
    }
    const width = window.innerWidth
    // iOS 27.2 (ref-app, block 8): a tile in the leading third, the middle or the trailing third, and a full-width row
    expect(at(16, 96)).toMatchObject({ align: "start", radius: 26 })
    expect(at(width / 2 - 48, 96)).toMatchObject({ align: "center" })
    expect(at(width - 112, 96)).toMatchObject({ align: "end" })
    expect(at(16, width - 32)).toMatchObject({ align: "center" })
    // In a PhoneLayout the thirds are the box's: a 402px box at 400 in a 1200px window
    const box = document.createElement("div")
    box.setAttribute("data-plex-layout", "phone")
    box.getBoundingClientRect = () => ({ x: 400, y: 0, left: 400, top: 0, width: 402, height: 874, right: 802, bottom: 874, toJSON: () => ({}) }) as DOMRect
    document.body.append(box)
    const inBox = (x: number) => {
      const element = document.createElement("div")
      box.append(element)
      element.getBoundingClientRect = () => ({ x, y: 100, left: x, top: 100, width: 96, height: 96, right: x + 96, bottom: 196, toJSON: () => ({}) }) as DOMRect
      return shared.contextMenuPreview(element).align
    }
    vi.stubGlobal("innerWidth", 1200)
    expect([inBox(416), inBox(553), inBox(690)]).toEqual(["start", "center", "end"])
    vi.unstubAllGlobals()
    box.remove()
    const room = { top: 30, bottom: 830 }
    // In the upper half: below. In the lower half: above, unmoved, where the menu stands whole; else below, the
    // preview moved up as far as the menu needs.
    expect(shared.contextMenuPreviewLayout({ x: 16, y: 200, width: 96, height: 64 }, 100, room)).toEqual({ side: "bottom", shift: 0 })
    expect(shared.contextMenuPreviewLayout({ x: 16, y: 500, width: 96, height: 64 }, 100, room)).toEqual({ side: "top", shift: 0 })
    expect(shared.contextMenuPreviewLayout({ x: 16, y: 500, width: 96, height: 64 }, 480, room)).toEqual({ side: "bottom", shift: 230 })
  })

  test.each([reactShared, vueShared])("the preview shift, the menu's name and the frame of a PhoneLayout", (shared) => {
    const rect = { x: 16, y: 300, width: 370, height: 52 }
    // Fits: no shift; short of room: up by what is missing; at most to the top of the room or a clipping box
    expect(shared.contextMenuPreviewShift(rect, 100, { top: 30, bottom: 500 })).toBe(0)
    expect(shared.contextMenuPreviewShift(rect, 120, { top: 30, bottom: 370 })).toBe(118)
    expect(shared.contextMenuPreviewShift(rect, 600, { top: 30, bottom: 370 })).toBe(270)
    expect(shared.contextMenuPreviewShift(rect, 600, { top: 30, bottom: 370 }, 250)).toBe(50)
    expect(shared.contextMenuPreviewShift(rect, 600, { top: 30, bottom: 370 }, 400)).toBe(0)
    // Held back by a box that clips the element, a menu that stands whole above it opens there, the element in place
    expect(shared.contextMenuPreviewShift(rect, 200, { top: 30, bottom: 370 }, 250)).toBe(0)
    expect(shared.contextMenuPreviewShift(rect, 200, { top: 30, bottom: 370 })).toBe(198)
    const element = document.createElement("div")
    element.innerHTML = "<span>Milk</span>\n  <span>2 l</span>"
    expect(shared.contextMenuName(element)).toBe("Milk 2 l")
    element.setAttribute("aria-label", "Milk, 2 litres")
    expect(shared.contextMenuName(element)).toBe("Milk, 2 litres")
    const picture = document.createElement("div")
    picture.innerHTML = '<img alt="Beach">'
    expect(shared.contextMenuName(picture)).toBe("Beach")
    // A picture that is the element names it too, and the text it is labelled by comes before its own label
    const image = document.createElement("img")
    image.alt = "Beach"
    expect(shared.contextMenuName(image)).toBe("Beach")
    const title = document.createElement("span")
    title.id = "context-menu-title"
    title.textContent = "Groceries"
    const labelled = document.createElement("div")
    labelled.setAttribute("aria-label", "List")
    labelled.setAttribute("aria-labelledby", "context-menu-title")
    document.body.append(title, labelled)
    expect(shared.contextMenuName(labelled)).toBe("Groceries")
    title.remove()
    labelled.remove()
    expect(shared.contextMenuFrame(null)).toBeNull()
    const frame = { left: 100, top: 50, scaleX: 0.5, scaleY: 0.5, width: 402, height: 874 }
    expect(shared.contextMenuInFrame({ x: 110, y: 60, width: 50, height: 20 }, frame)).toEqual({ x: 20, y: 20, width: 100, height: 40 })
    expect(shared.contextMenuInFrame(rect, null)).toBe(rect)
  })

  test.each([reactShared, vueShared])("the lift adds to the element's own translate, and moves it as far on the screen in a frame drawn smaller", (shared) => {
    const element = document.createElement("div")
    document.body.append(element)
    element.style.translate = "20px 4px"
    const set = vi.spyOn(element.style, "setProperty")
    const back = shared.liftContextMenuPreview(element, 30, false)
    expect(set).toHaveBeenLastCalledWith("translate", "20px calc(4px - 30px)")
    back(false)
    expect(element.style.getPropertyValue("translate")).toBe("20px 4px")
    // Drawn at half its size (a PhoneLayout at scale 0.5), the element moves half its own pixels on the screen
    const frame = document.createElement("div")
    const plain = document.createElement("div")
    frame.append(plain)
    document.body.append(frame)
    Object.defineProperty(frame, "offsetHeight", { configurable: true, value: 52 })
    vi.spyOn(frame, "getBoundingClientRect").mockImplementation(() => DOMRect.fromRect({ x: 0, y: 400, width: 100, height: 26 }))
    const first = shared.liftContextMenuPreview(plain, 60, false)
    expect(plain.style.getPropertyValue("translate")).toBe("0 -120px")
    first(false)
    expect(plain.style.getPropertyValue("translate")).toBe("")
    // Put back with a glide, then at once: the second call stops the glide
    const glides: string[] = []
    plain.style.setProperty("--motion-enter", "250ms")
    plain.style.setProperty("--motion-exit", "150ms")
    plain.animate = ((frames: Keyframe[]) => {
      const name = `${frames[0].translate} > ${frames[1].translate}`
      glides.push(name)
      return { cancel: () => glides.push(`stop ${name}`) }
    }) as unknown as HTMLElement["animate"]
    const put = shared.liftContextMenuPreview(plain, 60)
    put(true)
    put(true)
    put(false)
    expect(glides).toEqual(["none > 0 -120px", "stop none > 0 -120px", "0 -120px > none", "stop 0 -120px > none"])
    frame.remove()
    element.remove()
    // A transition of the element's own does not run the move or its undoing: the drag measures right after it.
    // The transition each change starts is cancelled, other animations and the element's own style stay.
    const moving = document.createElement("div")
    document.body.append(moving)
    moving.style.setProperty("--speed", "1s")
    moving.style.setProperty("transition", "translate var(--speed) linear")
    const own = moving.getAttribute("style")
    const cancelled: string[] = []
    const running = (property: string) => ({ transitionProperty: property, cancel: () => cancelled.push(property) })
    moving.getAnimations = (() => [running("translate"), running("opacity"), { cancel: () => cancelled.push("glide") }]) as unknown as HTMLElement["getAnimations"]
    shared.liftContextMenuPreview(moving, 20, false)(false)
    expect(cancelled).toEqual(["translate", "translate"])
    expect(moving.getAttribute("style")).toBe(own)
    expect(moving.style.getPropertyValue("translate")).toBe("")
    moving.remove()
  })

  test("the two copies of the shared module are the same", () => {
    const ui = read("packages/ui/src/components/ContextMenu/shared.ts")
    const vue = read("packages/vue/src/components/ContextMenu/shared.ts")
    // @plexui/vue names its imports with `.js`
    expect(vue.slice(vue.indexOf("\n") + 1).replace(/(from )"(\.{1,2}\/[^"]+)\.js"/g, '$1"$2"')).toBe(ui)
  })
})

describe("ContextMenu tokens follow the iOS 26 kit Context Menu (507:25994)", () => {
  test("the dimming, the preview corner and shadow", () => {
    const tokens = read("packages/styles/src/styles/variables-components.css")
    for (const line of [
      "--context-menu-dimming-background: light-dark(rgb(0 0 0 / 20%), rgb(0 0 0 / 50%));",
      "--context-menu-dimming-backdrop-filter: blur(30px);",
      "--context-menu-preview-radius: 30px;",
      "--context-menu-preview-shadow: 0 0 32px rgb(0 0 0 / 20%);",
    ]) expect(tokens).toContain(line)
    const css = read("packages/styles/src/components/ContextMenu/ContextMenu.module.css")
    for (const line of ["mask-image: var(--context-menu-hole);", "touch-action: none;", "-webkit-touch-callout: none;"]) expect(css).toContain(line)
    // A press through the cut reaches the element (a clip path takes it out of the hit area; a mask does not), and a
    // dimming on its way out takes no press
    expect(css).toContain("clip-path: var(--context-menu-hole-clip, none);")
    expect(css).toMatch(/\.Dimming\[data-exiting\] & \{\s*pointer-events: none;/)
    // The dimming shares the overlay layer, after a Dialog it opens from, and takes the press over its content too.
    const overlay = css.slice(css.indexOf(".Overlay {"), css.indexOf("}", css.indexOf(".Overlay {")))
    for (const line of ["z-index: 50;", "pointer-events: auto;"]) expect(overlay).toContain(line)
  })
})
