import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { captureInitialPhoneSubmenuFocus as captureReact, completeInitialPhoneSubmenuFocus as completeReact, delegateInitialPhoneSubmenuFocus as delegateReact } from "../../packages/ui/src/lib/menuInitialFocus"
import { captureInitialPhoneSubmenuFocus as captureVue, completeInitialPhoneSubmenuFocus as completeVue, delegateInitialPhoneSubmenuFocus as delegateVue } from "../../packages/vue/src/lib/menuInitialFocus"

let phone = true
beforeEach(() => {
  phone = true
  vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
    media: query, matches: phone, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(() => true),
  }))
})
afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren() })

function element(tag: string, attributes: Record<string, string>, text = "") {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)
  node.textContent = text
  return node
}

function fixture() {
  const parent = element("div", { role: "menu", "data-state": "open", tabindex: "-1" })
  const trigger = element("div", { role: "menuitem", id: "initial-sub-trigger", "aria-haspopup": "menu", "aria-expanded": "true", "aria-controls": "initial-sub-content", tabindex: "-1" }, "Sort")
  parent.append(trigger)
  const child = element("div", { role: "menu", id: "initial-sub-content", "aria-labelledby": trigger.id, "data-submenu": "", "data-state": "open", tabindex: "-1" })
  const header = element("div", { role: "menuitem", "data-submenu-collapse": "", tabindex: "-1" }, "Sort")
  const disabled = element("div", { role: "menuitem", "aria-disabled": "true", tabindex: "-1" }, "Unavailable")
  const first = element("div", { role: "menuitem", tabindex: "-1" }, "Rename")
  const second = element("div", { role: "menuitem", tabindex: "-1" }, "Duplicate")
  child.append(header, disabled, first, second)
  const outside = element("button", {}, "Outside")
  const other = element("button", {}, "Other")
  document.body.append(parent, child, outside, other)
  outside.focus()
  const event = new Event("focusScope.autoFocusOnMount", { cancelable: true })
  const ready = () => child.setAttribute("data-submenu-positioned", "")
  return { parent, trigger, child, first, second, outside, other, event, ready }
}

for (const [framework, delegate, complete, capture] of [
  ["React", delegateReact, completeReact, captureReact],
  ["Vue", delegateVue, completeVue, captureVue],
] as const) describe(`${framework} initial Phone submenu focus ownership`, () => {
  test("waits for geometry, skips header/disabled rows, and consumes the claim once", () => {
    const f = fixture()
    delegate(f.event, f.parent)
    expect(f.event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(f.outside)
    expect(complete(f.trigger, f.child)).toBe(false)
    f.ready()
    expect(complete(f.trigger, f.child)).toBe(true)
    expect(document.activeElement).toBe(f.first)
    f.second.focus()
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.second)
  })

  test("an already ready child receives initial focus synchronously", () => {
    const f = fixture()
    f.ready()
    delegate(f.event, f.parent)
    expect(f.event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(f.first)
  })

  test("a real focus move while geometry is pending cancels the handoff", () => {
    const f = fixture()
    delegate(f.event, f.parent)
    f.other.focus()
    f.ready()
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.other)
    f.trigger.focus()
    expect(complete(f.trigger, f.child)).toBe(false)
  })

  test("a closed child cannot take a pending initial focus claim", () => {
    const f = fixture()
    delegate(f.event, f.parent)
    f.trigger.setAttribute("aria-expanded", "false")
    f.child.setAttribute("data-state", "closed")
    f.ready()
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.outside)
  })

  test("an already cancelled primitive autofocus event remains owned by its handler", () => {
    const f = fixture()
    f.event.preventDefault()
    delegate(f.event, f.parent)
    f.ready()
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.outside)
  })

  test("an ancestor mount guard runs before the primitive's unconditional autofocus and detaches cleanly", () => {
    const f = fixture()
    const native = vi.fn(() => f.parent.focus())
    f.parent.addEventListener("focusScope.autoFocusOnMount", native)
    const detach = capture(f.parent)
    f.parent.dispatchEvent(f.event)
    expect(native).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(f.outside)
    f.ready()
    complete(f.trigger, f.child)
    expect(document.activeElement).toBe(f.first)
    detach()
    f.parent.dispatchEvent(new Event("focusScope.autoFocusOnMount", { cancelable: true }))
    expect(native).toHaveBeenCalledOnce()
  })

  test("a leaf mount and desktop ancestor retain their primitive autofocus events", () => {
    const f = fixture()
    const leafNative = vi.fn()
    f.child.addEventListener("focusScope.autoFocusOnMount", leafNative)
    const detachLeaf = capture(f.child)
    f.child.dispatchEvent(new Event("focusScope.autoFocusOnMount", { cancelable: true }))
    expect(leafNative).toHaveBeenCalledOnce()
    detachLeaf()
    phone = false
    const rootNative = vi.fn()
    f.parent.addEventListener("focusScope.autoFocusOnMount", rootNative)
    const detachParent = capture(f.parent)
    f.parent.dispatchEvent(f.event)
    expect(rootNative).toHaveBeenCalledOnce()
    expect(f.event.defaultPrevented).toBe(false)
    detachParent()
  })

  test.each(["ready", "unavailable"])("a keyboard leaf defers native mount autofocus until geometry is %s", (result) => {
    const f = fixture()
    const native = vi.fn(() => f.child.focus())
    f.child.addEventListener("focusScope.autoFocusOnMount", native)
    const detach = capture(f.child, () => true)
    f.child.dispatchEvent(new Event("focusScope.autoFocusOnMount", { cancelable: true }))
    expect(native).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(f.outside)
    if (result === "ready") f.ready()
    else f.child.setAttribute("data-submenu-unavailable", "")
    expect(complete(f.trigger, f.child)).toBe(true)
    expect(document.activeElement).toBe(result === "ready" ? f.first : f.trigger)
    detach()
  })

  test("terminal geometry consumes the claim and returns once to the visible trigger", () => {
    const f = fixture()
    delegate(f.event, f.parent)
    expect(document.activeElement).toBe(f.outside)
    f.child.setAttribute("data-submenu-unavailable", "")
    expect(complete(f.trigger, f.child)).toBe(true)
    expect(document.activeElement).toBe(f.trigger)
    f.child.removeAttribute("data-submenu-unavailable")
    f.ready()
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.trigger)
  })

  test("terminal geometry does not override a focus move made while layout was pending", () => {
    const f = fixture()
    delegate(f.event, f.parent)
    f.other.focus()
    f.child.setAttribute("data-submenu-unavailable", "")
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.other)
  })

  test("desktop retains the primitive's original autofocus decision", () => {
    phone = false
    const f = fixture()
    f.ready()
    delegate(f.event, f.parent)
    expect(f.event.defaultPrevented).toBe(false)
    expect(complete(f.trigger, f.child)).toBe(false)
    expect(document.activeElement).toBe(f.outside)
  })
})
