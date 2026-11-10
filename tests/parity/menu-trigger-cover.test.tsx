import { act, fireEvent, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Menu as RMenu } from "../../packages/ui/src/components/Menu"
import { markCoveredMenuTrigger, observeMenuTriggerCover } from "../../packages/ui/src/lib/menuTriggerCover"
import { markCoveredMenuTrigger as markCoveredMenuTriggerVue } from "../../packages/vue/src/lib/menuTriggerCover"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { flushVue, mountVue } from "./harness"

// Plan 169h: on a phone a menu grows out of the control that opens it and covers it, as iOS 26 menus do (iOS-menu
// IMG_5657, IMG_5654, IMG_5658: the panel's top is the More button's top, its edge the button's edge), and opens
// upward from a control in the lower half of the screen (IMG_5688, IMG_5693). A desktop keeps the 5px gap below the
// trigger, and a menu with its own sideOffset (ContextMenu) keeps it on a phone too.

class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" && phone }
}
let phone = true
let triggerTop = 62
const media = new Map<string, Media>()
// jsdom has no layout: a 44px More button on a 402px screen, clear of the edge so the 12px collision padding never
// shifts the panel, and a 238px panel
let triggerBox: DOMRect | null = null
function rect(element: HTMLElement) {
  // The wrapper the primitive positions around the panel stands where its transform puts it; the panel is 238px
  if (element.querySelector(':scope > [role="menu"]')) {
    const at = element.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)
    return new DOMRect(at ? Number(at[1]) : 0, at ? Number(at[2]) : -2000, 238, 160)
  }
  if (element.getAttribute("role") === "menu") return new DOMRect(0, 0, 238, 160)
  if (element.getAttribute("aria-haspopup") === "menu") return triggerBox ?? new DOMRect(300, triggerTop, 44, 44)
  return new DOMRect(0, 0, 402, 874)
}
beforeEach(() => {
  phone = true
  triggerTop = 62
  triggerBox = null
  media.clear()
  vi.stubGlobal("matchMedia", (query: string) => {
    let result = media.get(query)
    if (!result) { result = new Media(query); media.set(query, result) }
    return result
  })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () { return rect(this) })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function () { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () { return rect(this).height })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function () { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function () { return rect(this).height })
  vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 0, width: 402, height: 874, addEventListener() {}, removeEventListener() {} })
})
afterEach(() => vi.unstubAllGlobals())

const settle = async (callback: () => void = () => {}) => act(async () => {
  callback()
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, 25))
  await flushVue()
})

/** Where the primitive placed the panel: the translate of its positioned wrapper. */
const panelPosition = () => {
  const panel = document.querySelector<HTMLElement>('[role="menu"]')
  const wrapper = panel?.parentElement
  const match = wrapper?.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null
}

async function openMenu(framework: "React" | "Vue", content: { sideOffset?: number; side?: "top" | "bottom"; alignOffset?: number } = {}) {
  if (framework === "React") {
    await settle(() => {
      render(
        <RMenu forceOpen>
          <RMenu.Trigger><button>More</button></RMenu.Trigger>
          <RMenu.Content align="end" {...content}>
            <RMenu.Item onSelect={() => {}}>Rename</RMenu.Item>
          </RMenu.Content>
        </RMenu>,
      )
    })
  } else {
    await settle(() => {
      mountVue(() => h(Menu, { forceOpen: true }, { default: () => [
        h(MenuTrigger, null, { default: () => h("button", "More") }),
        h(MenuContent, { align: "end", ...content }, { default: () => h(MenuItem, { onSelect: () => {} }, { default: () => "Rename" }) }),
      ] }))
    })
  }
  await settle()
  return panelPosition()
}

/** A menu that opens from its trigger, with one item that reports its choice. */
async function mountMenu(framework: "React" | "Vue", onSelect: () => void) {
  if (framework === "React") {
    await settle(() => {
      render(
        <RMenu>
          <RMenu.Trigger><button>More</button></RMenu.Trigger>
          <RMenu.Content align="end"><RMenu.Item onSelect={onSelect}>Rename</RMenu.Item></RMenu.Content>
        </RMenu>,
      )
    })
  } else {
    await settle(() => {
      mountVue(() => h(Menu, null, { default: () => [
        h(MenuTrigger, null, { default: () => h("button", "More") }),
        h(MenuContent, { align: "end" }, { default: () => h(MenuItem, { onSelect }, { default: () => "Rename" }) }),
      ] }))
    })
  }
  return document.querySelector<HTMLElement>('[aria-haspopup="menu"]')!
}

/** A mouse press on the trigger, released at a point over the menu that the press opened. */
async function pressAndRelease(trigger: HTMLElement, at: { clientX: number; clientY: number }) {
  await settle(() => { fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse", pointerId: 1 }) })
  const item = document.querySelector<HTMLElement>('[role="menuitem"]')!
  await settle(() => { fireEvent.pointerUp(item, { button: 0, pointerType: "mouse", pointerId: 1, ...at }) })
}

describe.each(["React", "Vue"] as const)("%s: a phone menu hides a trigger it covers whole (iOS 27.2, ref-app menus-bar)", (framework) => {
  const trigger = () => document.querySelector<HTMLElement>('[aria-haspopup="menu"]')!

  test("the 44px More button under the 238px panel is hidden while the menu is open", async () => {
    await openMenu(framework)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(true)
  })

  test("a trigger wider than the panel, as a form row, stays", async () => {
    triggerBox = new DOMRect(16, 62, 370, 44)
    await openMenu(framework)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("a panel set off its trigger by an align offset hides nothing: it may stand beside the trigger", async () => {
    await openMenu(framework, { alignOffset: 60 })
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("nothing is hidden on a larger screen, where the menu keeps its gap", async () => {
    phone = false
    await openMenu(framework)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("closing the menu shows the trigger again, before focus returns to it", async () => {
    const button = await mountMenu(framework, () => {})
    await settle(() => { fireEvent.pointerDown(button, { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
    expect(button.hasAttribute("data-menu-covered")).toBe(true)
    // A hidden element takes no focus in a browser: the mark must be gone when the menu hands focus back
    const coveredOnFocus: boolean[] = []
    button.addEventListener("focus", () => coveredOnFocus.push(button.hasAttribute("data-menu-covered")))
    await settle(() => { fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" }) })
    await settle()
    expect(button.hasAttribute("data-menu-covered")).toBe(false)
    expect(document.activeElement).toBe(button)
    expect(coveredOnFocus).toEqual([false])
  })

  test("the mark hides the trigger", () => {
    const css = readFileSync(`${process.cwd()}/packages/styles/src/styles/touch.css`, "utf8")
    expect(css).toMatch(/\[data-menu-covered\] \{\s*visibility: hidden;\s*\}/)
  })
})

describe.each([["React", markCoveredMenuTrigger], ["Vue", markCoveredMenuTriggerVue]] as const)("%s: the covered mark follows the placed panel", (_, mark) => {
  test("the trigger is marked once the wrapper places the panel over it whole, and not at the screen's edge past it", async () => {
    const boxes = new Map<Element, DOMRect>()
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      return boxes.get(this) ?? new DOMRect(0, 0, 0, 0)
    })
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function () {
      return boxes.get(this)?.width ?? 0
    })
    const resized: Array<() => void> = []
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resized.push(callback) }
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1 })
    const trigger = document.createElement("button")
    const wrapper = document.createElement("div")
    const content = document.createElement("div")
    wrapper.append(content)
    document.body.append(trigger, wrapper)
    boxes.set(trigger, new DOMRect(300, 62, 44, 44))
    boxes.set(content, new DOMRect(0, 0, 238, 160))
    // The primitive first holds the wrapper off screen, until it has measured
    boxes.set(wrapper, new DOMRect(0, -2000, 238, 160))
    const clear = mark(trigger, content)
    expect(trigger.hasAttribute("data-menu-covered")).toBe(false)
    // Placed over the trigger, its end at the trigger's end
    boxes.set(wrapper, new DOMRect(106, 62, 238, 160))
    wrapper.style.transform = "translate(106px, 62px)"
    await Promise.resolve()
    expect(trigger.hasAttribute("data-menu-covered")).toBe(true)
    // A trigger at the screen's edge, the panel kept 12px off it: 12px of the trigger stays uncovered
    boxes.set(trigger, new DOMRect(358, 62, 44, 44))
    boxes.set(wrapper, new DOMRect(152, 62, 238, 160))
    resized.forEach((callback) => callback())
    expect(trigger.hasAttribute("data-menu-covered")).toBe(false)
    boxes.set(trigger, new DOMRect(300, 62, 44, 44))
    boxes.set(wrapper, new DOMRect(106, 62, 238, 160))
    resized.forEach((callback) => callback())
    expect(trigger.hasAttribute("data-menu-covered")).toBe(true)
    clear()
    expect(trigger.hasAttribute("data-menu-covered")).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe("a phone menu covers its trigger", () => {
  test("the observer reports minus the trigger's height and the larger side on a phone, and nothing on a larger screen", () => {
    const trigger = document.createElement("button")
    trigger.setAttribute("aria-haspopup", "menu")
    document.body.append(trigger)
    const onChange = vi.fn()
    const stop = observeMenuTriggerCover(trigger, onChange)
    expect(onChange).toHaveBeenLastCalledWith({ sideOffset: -44, side: "bottom" })
    phone = false
    media.get("(max-width: 767px)")!.dispatchEvent(new Event("change"))
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(onChange).toHaveBeenCalledTimes(2)
    stop()
    triggerTop = 700
    phone = true
    const below = vi.fn()
    observeMenuTriggerCover(trigger, below)()
    expect(below).toHaveBeenLastCalledWith({ sideOffset: -44, side: "top" })
  })

  test("a media query list without addEventListener (Safari before 14) still covers the trigger", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(max-width: 767px)", media: query }))
    const trigger = document.createElement("button")
    trigger.setAttribute("aria-haspopup", "menu")
    const onChange = vi.fn()
    expect(() => observeMenuTriggerCover(trigger, onChange)()).not.toThrow()
    expect(onChange).toHaveBeenLastCalledWith({ sideOffset: -44, side: "bottom" })
  })

  test("React and Vue share one observer", () => {
    // Vue's copy names its imports with .js
    const vue = readFileSync("packages/vue/src/lib/menuTriggerCover.ts", "utf8").replace(/(from )"(\.{1,2}\/[^"]+)\.js"/g, '$1"$2"')
    expect(vue).toBe(readFileSync("packages/ui/src/lib/menuTriggerCover.ts", "utf8"))
  })

  for (const framework of ["React", "Vue"] as const) {
    test(`${framework}: on a phone the panel's top is the trigger's top and its end the trigger's end`, async () => {
      // The trigger spans 300 to 344: a 238px panel aligned to its end starts at 106
      expect(await openMenu(framework)).toEqual({ x: 106, y: 62 })
    })

    test(`${framework}: a desktop keeps the 5px gap below the trigger and the 5px overhang of an end-aligned panel`, async () => {
      phone = false
      expect(await openMenu(framework)).toEqual({ x: 111, y: 111 })
    })

    test(`${framework}: a menu with its own sideOffset keeps it on a phone`, async () => {
      expect(await openMenu(framework, { sideOffset: 8 })).toEqual({ x: 111, y: 114 })
    })

    test(`${framework}: on a phone a menu opens upward from a trigger in the lower half, its bottom the trigger's bottom`, async () => {
      // The trigger spans 700 to 744 of 874: a 160px panel ending at 744 starts at 584, though it would fit below
      triggerTop = 700
      expect(await openMenu(framework)).toEqual({ x: 106, y: 584 })
    })

    test(`${framework}: a mouse that opens the menu and comes up over the trigger chooses nothing`, async () => {
      // The menu opens as the button goes down, so its first item lies under the pointer when it comes up
      const onSelect = vi.fn()
      await pressAndRelease(await mountMenu(framework, onSelect), { clientX: 320, clientY: 80 })
      expect(onSelect).not.toHaveBeenCalled()
      expect(document.querySelector('[role="menu"]')).not.toBeNull()
    })

    test(`${framework}: a mouse press dragged off the trigger onto an item chooses it`, async () => {
      const onSelect = vi.fn()
      await pressAndRelease(await mountMenu(framework, onSelect), { clientX: 200, clientY: 150 })
      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    test(`${framework}: a menu with its own side keeps it on a phone and still covers the trigger`, async () => {
      // In the lower half, with room below for the panel and the 30px collision padding
      triggerTop = 600
      expect(await openMenu(framework, { side: "bottom" })).toEqual({ x: 106, y: 600 })
    })
  }
})
