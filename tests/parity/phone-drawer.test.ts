import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import * as reactDrawer from "../../packages/ui/src/lib/phoneDrawer"
import * as vueDrawer from "../../packages/vue/src/lib/phoneDrawer"

// The phone drawer of Sidebar (lib/phoneDrawer, one copy per framework, kept identical by lib-sync): the swipe that
// opens and closes it, Tab going round it and Escape left to layers over it. The DOM here has no layout: the root
// spans 0 to 400px and the drawer's width is set per test.

for (const [framework, { attachDrawerSwipe, closeOnUnhandledEscape, returnDrawerFocus, loopDrawerFocus }] of [["React", reactDrawer], ["Vue", vueDrawer]] as const) {
  describe(`${framework} drawer swipe`, () => {
    let root: HTMLElement
    let drawer: HTMLElement
    let open: boolean
    let enabled: boolean
    let calls: boolean[]
    let detach: () => void

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] })
      root = document.createElement("div")
      drawer = document.createElement("div")
      root.append(drawer)
      document.body.append(root)
      root.getBoundingClientRect = () => ({ left: 0, right: 400, top: 0, bottom: 800, width: 400, height: 800 }) as DOMRect
      drawer.getBoundingClientRect = () => ({ left: 0, right: 300, top: 0, bottom: 800, width: 300, height: 800 }) as DOMRect
      open = false
      enabled = true
      calls = []
      detach = attachDrawerSwipe({
        root,
        drawer,
        isOpen: () => open,
        setOpen: (next) => {
          calls.push(next)
          open = next
        },
        enabled: () => enabled,
      })
    })

    afterEach(() => {
      detach()
      root.remove()
      vi.useRealTimers()
    })

    const touch = (type: string, time: number, x?: number, y = 10) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        timeStamp: { value: time },
        touches: { value: x === undefined ? [] : [{ clientX: x, clientY: y }] },
      })
      drawer.dispatchEvent(event)
      return event
    }

    const leftEdge = () => drawer.style.setProperty("--sidebar-drawer-edge", "left")

    test("a drawer on the left follows the finger by its own width and opens on a quick swipe", () => {
      leftEdge()
      touch("touchstart", 0, 4)
      const move = touch("touchmove", 100, 154)
      expect(move.defaultPrevented).toBe(true)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(true)
      expect(root.style.getPropertyValue("--sidebar-drawer-progress")).toBe("0.5")
      touch("touchmove", 110, 164)
      touch("touchend", 120)
      expect(calls).toEqual([true])
      vi.advanceTimersByTime(20)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      expect(root.style.getPropertyValue("--sidebar-drawer-progress")).toBe("")
    })

    test("a slow release finishes by distance: under half goes back, past half goes on", () => {
      leftEdge()
      touch("touchstart", 0, 4)
      touch("touchmove", 100, 64)
      touch("touchmove", 1100, 74)
      touch("touchend", 1110)
      expect(calls).toEqual([])
      touch("touchstart", 2000, 4)
      touch("touchmove", 2100, 194)
      touch("touchmove", 3100, 200)
      touch("touchend", 3110)
      expect(calls).toEqual([true])
    })

    test("a closed drawer starts only at its edge; a cancelled or switched-off swipe changes nothing", () => {
      // The right edge of the root is at 400
      touch("touchstart", 0, 300)
      touch("touchmove", 100, 100)
      touch("touchend", 110)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      touch("touchstart", 200, 390)
      touch("touchmove", 300, 190)
      touch("touchcancel", 310)
      expect(calls).toEqual([])
      vi.advanceTimersByTime(20)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      enabled = false
      touch("touchstart", 400, 390)
      touch("touchmove", 500, 190)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
    })

    test("a swipe that starts on a slider, a control taking its own touches or a row that scrolls sideways is theirs", () => {
      open = true
      const row = document.createElement("div")
      row.style.overflowX = "auto"
      Object.defineProperties(row, { scrollWidth: { value: 600 }, clientWidth: { value: 300 } })
      const range = document.createElement("input")
      range.type = "range"
      const thumb = document.createElement("span")
      thumb.setAttribute("role", "slider")
      // The Slider's track, as its styles set it
      const track = document.createElement("span")
      track.style.touchAction = "none"
      const inner = document.createElement("span")
      track.append(inner)
      drawer.append(row, range, thumb, track)
      for (const from of [row, range, thumb, inner]) {
        const start = new Event("touchstart", { bubbles: true, cancelable: true })
        Object.defineProperties(start, { timeStamp: { value: 0 }, touches: { value: [{ clientX: 100, clientY: 10 }] } })
        from.dispatchEvent(start)
        touch("touchmove", 100, 300)
        touch("touchend", 110)
      }
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      expect(calls).toEqual([])
    })

    test("a popover or menu open over the drawer keeps the touch", () => {
      open = true
      const wrapper = document.createElement("div")
      document.body.append(wrapper)
      for (const name of ["data-radix-popper-content-wrapper", "data-reka-popper-content-wrapper"]) {
        wrapper.setAttribute(name, "")
        touch("touchstart", 0, 100)
        touch("touchmove", 100, 300)
        touch("touchend", 110)
        wrapper.removeAttribute(name)
      }
      wrapper.remove()
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      expect(calls).toEqual([])
    })

    test("a second finger put down outside the root, or one left on the screen, cancels the swipe", () => {
      leftEdge()
      touch("touchstart", 0, 4)
      touch("touchmove", 100, 204)
      const both = new Event("touchmove", { bubbles: true, cancelable: true })
      Object.defineProperties(both, { timeStamp: { value: 110 }, touches: { value: [{ clientX: 214, clientY: 10 }, { clientX: 300, clientY: 10 }] } })
      drawer.dispatchEvent(both)
      touch("touchend", 120)
      expect(calls).toEqual([])
      touch("touchstart", 200, 4)
      touch("touchmove", 300, 204)
      const lifted = new Event("touchend", { bubbles: true, cancelable: true })
      Object.defineProperties(lifted, { timeStamp: { value: 310 }, touches: { value: [{ clientX: 300, clientY: 10 }] } })
      drawer.dispatchEvent(lifted)
      expect(calls).toEqual([])
      vi.advanceTimersByTime(20)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
    })

    test("a second finger cancels the swipe and the drawer goes back", () => {
      leftEdge()
      touch("touchstart", 0, 4)
      touch("touchmove", 100, 204)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(true)
      const second = new Event("touchstart", { bubbles: true, cancelable: true })
      Object.defineProperties(second, { timeStamp: { value: 110 }, touches: { value: [{ clientX: 204, clientY: 10 }, { clientX: 300, clientY: 10 }] } })
      drawer.dispatchEvent(second)
      touch("touchend", 120)
      expect(calls).toEqual([])
      vi.advanceTimersByTime(20)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      expect(root.style.getPropertyValue("--sidebar-drawer-progress")).toBe("")
    })

    test("a finger held still before it lifts lets go by distance, not by its last speed", () => {
      leftEdge()
      // 60 of 300px quickly, then held for two seconds: back closed
      touch("touchstart", 0, 4)
      touch("touchmove", 100, 64)
      touch("touchend", 2100)
      expect(calls).toEqual([])
      // Open, 60px back quickly, held: stays open
      open = true
      touch("touchstart", 3000, 300)
      touch("touchmove", 3100, 240)
      touch("touchend", 5100)
      expect(calls).toEqual([])
    })

    test("an open drawer closes on a swipe toward its edge from anywhere and ignores one the other way", () => {
      open = true
      touch("touchstart", 0, 100)
      touch("touchmove", 100, 50)
      expect(root.hasAttribute("data-mobile-dragging")).toBe(false)
      touch("touchend", 110)
      touch("touchstart", 200, 100)
      touch("touchmove", 300, 300)
      touch("touchend", 310)
      expect(calls).toEqual([false])
    })

    test("Tab goes round the drawer's controls; a closed submenu, a disabled control and a portal are left out", () => {
      drawer.tabIndex = -1
      drawer.innerHTML =
        '<button id="a">A</button><ul inert><li><a href="#x">X</a></li></ul><button id="b">B</button><button disabled tabindex="0">C</button><fieldset disabled><input></fieldset>'
      const [a, b] = [drawer.querySelector<HTMLElement>("#a")!, drawer.querySelector<HTMLElement>("#b")!]
      const tab = (from: HTMLElement, shiftKey = false) => {
        from.focus()
        const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true })
        from.dispatchEvent(event)
        loopDrawerFocus(event, drawer)
        return event
      }
      expect(tab(b).defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(a)
      expect(tab(a, true).defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(b)
      // Between the first and the last the browser moves focus
      expect(tab(a).defaultPrevented).toBe(false)
      const portal = document.createElement("button")
      document.body.append(portal)
      expect(tab(portal).defaultPrevented).toBe(false)
      portal.remove()
      drawer.innerHTML = ""
      expect(tab(drawer).defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(drawer)
    })

    test("Escape closes the drawer once the key reaches the window unprevented", () => {
      const inside = document.createElement("button")
      drawer.append(inside)
      let closed = 0
      const press = () => {
        const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
        drawer.addEventListener("keydown", (e) => closeOnUnhandledEscape(e, drawer, () => closed++), { once: true })
        inside.dispatchEvent(event)
        return event
      }
      expect(press().defaultPrevented).toBe(true)
      expect(closed).toBe(1)
      // A popover that listens on the body takes the key after the drawer saw it
      const popover = (e: KeyboardEvent) => e.preventDefault()
      document.body.addEventListener("keydown", popover)
      press()
      document.body.removeEventListener("keydown", popover)
      expect(closed).toBe(1)
      // One that stops it on its way leaves the drawer open and the next key does nothing to it
      const stopper = (e: KeyboardEvent) => e.stopPropagation()
      document.body.addEventListener("keydown", stopper)
      press()
      document.body.removeEventListener("keydown", stopper)
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))
      expect(closed).toBe(1)
    })
  })
  describe(`${framework} drawer focus on close`, () => {
    test("focus goes back to the opener, or to the first menu button that takes it", () => {
      document.body.innerHTML = ""
      const other = document.createElement("div")
      other.setAttribute("data-mobile-menu", "hidden")
      const otherButton = document.createElement("button")
      otherButton.setAttribute("data-sidebar-mobile-menu-button", "")
      other.append(otherButton)
      const root = document.createElement("div")
      root.setAttribute("data-mobile-menu", "visible")
      const ownButton = document.createElement("button")
      ownButton.setAttribute("data-sidebar-mobile-menu-button", "")
      const drawer = document.createElement("div")
      const insideButton = document.createElement("button")
      insideButton.setAttribute("data-sidebar-mobile-menu-button", "")
      drawer.append(insideButton)
      const holder = document.createElement("div")
      const opener = document.createElement("button")
      holder.append(opener)
      root.append(ownButton, drawer, holder)
      document.body.append(other, root)
      const returned = (from: Element | null) => {
        ;(document.activeElement as HTMLElement | null)?.blur()
        const target = returnDrawerFocus(from, drawer)
        expect(document.activeElement).toBe(target ?? document.body)
        return target
      }

      expect(returned(opener)).toBe(opener)
      // In a drawer that has closed since, inert: the provider's own menu button, never one in this drawer
      holder.setAttribute("inert", "")
      expect(returned(opener)).toBe(ownButton)
      // The page itself (the drawer opened by a swipe) takes no focus back
      expect(returned(document.body)).toBe(ownButton)
      // Gone, with the provider's button disabled: another provider's
      opener.remove()
      ownButton.disabled = true
      expect(returned(opener)).toBe(otherButton)
      expect(returned(null)).toBe(otherButton)
      // A button that does not take focus when asked is passed over
      otherButton.focus = () => {}
      expect(returned(opener)).toBeNull()
      // An opener inside the drawer itself is not one to go back to
      expect(returned(insideButton)).toBeNull()
      document.body.innerHTML = ""
    })

    test("a drawer that has left the page goes to the provider it was open in, before others on the page", () => {
      document.body.innerHTML = ""
      const menuIn = (parent: HTMLElement) => {
        const button = document.createElement("button")
        button.setAttribute("data-sidebar-mobile-menu-button", "")
        parent.append(button)
        return button
      }
      const other = document.createElement("div")
      other.setAttribute("data-mobile-menu", "hidden")
      const otherButton = menuIn(other)
      const root = document.createElement("div")
      root.setAttribute("data-mobile-menu", "visible")
      const ownButton = menuIn(root)
      const drawer = document.createElement("div")
      root.append(drawer)
      document.body.append(other, root)
      const provider = drawer.closest("[data-mobile-menu]")
      drawer.remove()

      expect(returnDrawerFocus(null, drawer)).toBe(otherButton)
      ;(document.activeElement as HTMLElement | null)?.blur()
      expect(returnDrawerFocus(null, drawer, provider)).toBe(ownButton)
      expect(document.activeElement).toBe(ownButton)
      document.body.innerHTML = ""
    })

    test("a provider inside the drawer's provider keeps its menu buttons: they open another drawer", () => {
      document.body.innerHTML = ""
      const root = document.createElement("div")
      root.setAttribute("data-mobile-menu", "visible")
      const nested = document.createElement("div")
      nested.setAttribute("data-mobile-menu", "hidden")
      const nestedButton = document.createElement("button")
      nestedButton.setAttribute("data-sidebar-mobile-menu-button", "")
      nested.append(nestedButton)
      const ownButton = document.createElement("button")
      ownButton.setAttribute("data-sidebar-mobile-menu-button", "")
      const drawer = document.createElement("div")
      root.append(nested, ownButton, drawer)
      document.body.append(root)

      expect(returnDrawerFocus(null, drawer)).toBe(ownButton)
      // Without a button of its own, the first on the page that takes focus
      ownButton.remove()
      ;(document.activeElement as HTMLElement | null)?.blur()
      expect(returnDrawerFocus(null, drawer)).toBe(nestedButton)
      document.body.innerHTML = ""
    })
  })
}
