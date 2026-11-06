import { afterEach, describe, expect, test, vi } from "vitest"
import * as react from "../../packages/ui/src/lib/menuSubmenuPlacement"
import * as vue from "../../packages/vue/src/lib/menuSubmenuPlacement"

const frameworks = [{ name: "React", api: react }, { name: "Vue", api: vue }]
const boundary = { left: 12, top: 30, right: 363, bottom: 670 }
const parent = { left: 20, top: 200, right: 300, bottom: 500 }
const trigger = { left: 36, top: 260, right: 284, bottom: 304 }
const dimensions = { boundary, parent, trigger, width: 238, height: 220, paddingTop: 10 }

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

for (const { name, api } of frameworks) describe(`${name} Phone submenu geometry`, () => {
  test.each(["ltr", "rtl"] as const)("overlays the trigger row in %s instead of using the side strip", (direction) => {
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction })).toEqual({ sideOffset: -264, alignOffset: -10 })
  })

  test("moves the full-width child above the footer when its natural bottom does not fit", () => {
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction: "ltr", trigger: { ...trigger, top: 580, bottom: 624 } }))
      .toEqual({ sideOffset: -264, alignOffset: -130 })
  })

  test.each(["ltr", "rtl"] as const)("keeps a right-edge parent within the full boundary in %s", (direction) => {
    const result = api.solvePhoneSubmenuPlacement({
      ...dimensions, direction, parent: { ...parent, left: 210, right: 490 },
      trigger: { ...trigger, left: 226, right: 474 },
    })
    expect(result).toEqual({ sideOffset: direction === "ltr" ? -349 : -137, alignOffset: -10 })
  })

  test.each(["ltr", "rtl"] as const)("supports a nested child wider than its parent in %s", (direction) => {
    expect(api.solvePhoneSubmenuPlacement({
      ...dimensions, direction, width: 300, parent: { ...parent, left: 10, right: 248 },
      trigger: { ...trigger, left: 26, right: 232 },
    })).toEqual({ sideOffset: direction === "ltr" ? -220 : -286, alignOffset: -10 })
  })

  test("clamps the top, and waits for valid bounded dimensions instead of publishing oversized geometry", () => {
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction: "ltr", trigger: { ...trigger, top: 35 } }))
      .toEqual({ sideOffset: -264, alignOffset: -5 })
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction: "ltr", width: 0 })).toBeNull()
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction: "ltr", width: 400 })).toBeNull()
    expect(api.solvePhoneSubmenuPlacement({ ...dimensions, direction: "ltr", boundary: { ...boundary, bottom: 20 } })).toBeNull()
  })

  test("intersects the scaled client box and visual viewport before consuming the already-resolved footer inset", () => {
    const root = document.createElement("div")
    document.body.append(root)
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 300, 500))
    for (const [key, value] of Object.entries({ offsetWidth: 150, offsetHeight: 250, clientLeft: 2, clientTop: 3, clientWidth: 146, clientHeight: 244 })) {
      Object.defineProperty(root, key, { configurable: true, value })
    }
    vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 100, width: 400, height: 350 })
    expect(api.readMenuBoundaryRect(document, {
      collisionBoundary: root, collisionPadding: { left: 12, right: 12, top: 30, bottom: 90 },
    })).toEqual({ left: 26, top: 130, right: 294, bottom: 360 })
    // With the keyboard clipping the footer, boundary91 supplies only its base
    // bottom padding. This reader must not reserve the footer a second time.
    vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 100, width: 400, height: 250 })
    expect(api.readMenuBoundaryRect(document, {
      collisionBoundary: root, collisionPadding: { left: 12, right: 12, top: 30, bottom: 30 },
    })?.bottom).toBe(320)
  })

  test("distinguishes missing header/zero layout from unavailable measured geometry, then recovers", () => {
    vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 0, width: 375, height: 812, addEventListener() {}, removeEventListener() {} })
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const parent = document.createElement("div")
    parent.setAttribute("role", "menu")
    const trigger = document.createElement("div")
    trigger.textContent = "Sort"
    parent.append(trigger)
    const content = document.createElement("div")
    const header = document.createElement("div")
    header.setAttribute("data-submenu-collapse", "")
    document.body.append(parent, content)
    let width = 400
    let height = 300
    Object.defineProperty(content, "offsetWidth", { configurable: true, get: () => width })
    Object.defineProperty(content, "offsetHeight", { configurable: true, get: () => height })
    let state: react.PhoneSubmenuState = { mobile: false }
    const observer = api.observePhoneSubmenu(trigger, content, { collisionPadding: { top: 30, right: 12, bottom: 30, left: 12 } }, (next) => { state = next })
    try {
      expect(state).toMatchObject({ mobile: true, ready: false, unavailable: false })
      content.append(header)
      width = 0
      observer.refresh()
      expect(state).toMatchObject({ mobile: true, ready: false, unavailable: false })
      width = 400
      observer.refresh()
      expect(state).toMatchObject({ mobile: true, ready: false, unavailable: true })
      expect(content.hasAttribute("data-submenu-unavailable")).toBe(true)
      width = 280
      observer.refresh()
      expect(state).toMatchObject({ mobile: true, ready: true, unavailable: false })
      expect(content.hasAttribute("data-submenu-unavailable")).toBe(false)
      expect(content.hasAttribute("data-submenu-positioned")).toBe(true)
      height = 0
      observer.refresh()
      expect(state).toMatchObject({ mobile: true, ready: false, unavailable: false })
    } finally {
      observer.dispose()
    }
  })

  test("an empty boundary is unavailable even when max-height leaves zero layout", () => {
    vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 0, width: 375, height: 20, addEventListener() {}, removeEventListener() {} })
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const parent = document.createElement("div")
    parent.setAttribute("role", "menu")
    const trigger = document.createElement("div")
    parent.append(trigger)
    const content = document.createElement("div")
    const header = document.createElement("div")
    header.setAttribute("data-submenu-collapse", "")
    content.append(header)
    document.body.append(parent, content)
    let state: react.PhoneSubmenuState = { mobile: false }
    const observer = api.observePhoneSubmenu(trigger, content, { collisionPadding: { top: 30, right: 12, bottom: 30, left: 12 } }, (next) => { state = next })
    try {
      expect(state).toMatchObject({ mobile: true, ready: false, unavailable: true })
      expect(content.hasAttribute("data-submenu-positioned")).toBe(false)
    } finally {
      observer.dispose()
    }
  })

  test("retains the full localized label while excluding decorative content and never copying IDs", () => {
    const trigger = document.createElement("div")
    const label = document.createElement("span")
    label.id = "localized-menu-label"
    label.append("Ordenar ", document.createTextNode("por"))
    const decoration = document.createElement("span")
    decoration.setAttribute("aria-hidden", "true")
    decoration.textContent = "decorative glyph"
    trigger.append(label, decoration)
    document.body.append(trigger)
    expect(api.readMenuTriggerLabel(trigger)).toBe("Ordenar por")
    trigger.setAttribute("aria-label", "Orden personalizado")
    expect(api.readMenuTriggerLabel(trigger)).toBe("Orden personalizado")
    trigger.setAttribute("aria-labelledby", label.id)
    expect(api.readMenuTriggerLabel(trigger)).toBe("Ordenar por")
    label.textContent = "Trier par"
    label.setAttribute("aria-hidden", "true")
    expect(api.readMenuTriggerLabel(trigger)).toBe("Trier par")
    expect(document.querySelectorAll("#localized-menu-label")).toHaveLength(1)
    trigger.removeAttribute("aria-labelledby")
    trigger.removeAttribute("aria-label")
    trigger.replaceChildren()
    expect(api.readMenuTriggerLabel(trigger)).toBe("Collapse submenu")
  })
})
