import { fireEvent } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { attachSheetDrag as attachReact } from "../../packages/ui/src/components/Dialog/sheetDrag"
import { attachSheetDrag as attachVue } from "../../packages/vue/src/components/Dialog/sheetDrag"

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

for (const [framework, attach] of [["React", attachReact], ["Vue", attachVue]] as const) {
  describe(`${framework} sheet touch gestures`, () => {
    function setup(width: number, reduced = false, transitionDuration = "0.25s") {
      let reduceMotion = reduced
      vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
        matches: query === "(prefers-reduced-motion: reduce)"
          ? reduceMotion
          : width <= Number(query.match(/max-width:\s*(\d+)px/)?.[1] ?? 0),
      }))
      const panel = document.createElement("div")
      const content = document.createElement("div")
      content.setAttribute("data-plex-dialog", "")
      content.setAttribute("data-state", "open")
      content.append(panel)
      document.body.append(content)
      vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, width, 600))
      // jsdom does not resolve var() in transition shorthands. Model only the
      // panel's resolved CSS duration; keep real computed styles for other nodes.
      const computed = document.createElement("div").style
      computed.transitionDuration = transitionDuration
      const getComputedStyle = window.getComputedStyle.bind(window)
      vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudoElement) => (
        element === panel ? computed : getComputedStyle(element, pseudoElement)
      ))
      const close = vi.fn()
      const detach = attach(panel, close)
      return { panel, content, close, detach, setReduced: (value: boolean) => { reduceMotion = value } }
    }

    // Explicit timestamps distinguish a slow partial return from a flick.
    function touch(panel: HTMLElement, type: string, time: number, clientY?: number) {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        timeStamp: { value: time },
        touches: { value: clientY === undefined ? [] : [{ clientY }] },
      })
      panel.dispatchEvent(event)
    }

    test.each([641, 767])("follows a finger throughout the mobile width range at %ipx", (width) => {
      const { panel, close, detach } = setup(width)
      fireEvent.touchStart(panel, { touches: [{ clientY: 10 }] })
      fireEvent.touchMove(panel, { touches: [{ clientY: 250 }] })
      expect(panel.style.transform).toBe("translateY(240px)")
      fireEvent.touchEnd(panel)
      expect(close).toHaveBeenCalledOnce()
      detach()
    })

    test("does not activate a mobile sheet gesture at desktop width", () => {
      const { panel, close, detach } = setup(768)
      fireEvent.touchStart(panel, { touches: [{ clientY: 10 }] })
      fireEvent.touchMove(panel, { touches: [{ clientY: 250 }] })
      fireEvent.touchEnd(panel)
      expect(panel.style.transform).toBe("")
      expect(close).not.toHaveBeenCalled()
      detach()
    })

    test.each([false, true])("partial release respects Reduce Motion=%s while direct finger tracking remains", (reduced) => {
      const { panel, close, detach } = setup(375, reduced)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 50)
      expect(panel.style.transform).toBe("translateY(40px)")
      touch(panel, "touchend", 400)
      expect(close).not.toHaveBeenCalled()
      expect(panel.style.transform).toBe("")
      if (reduced) expect(panel.style.transition).toBe("")
      else expect(panel.style.transition).toBe("transform var(--motion-enter) var(--cubic-enter)")
      detach()
    })

    test("reads Reduce Motion at release, including a preference changed during the gesture", () => {
      const { panel, close, detach, setReduced } = setup(375)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 50)
      setReduced(true)
      touch(panel, "touchend", 400)
      expect(close).not.toHaveBeenCalled()
      expect(panel.style.transition).toBe("")
      expect(panel.style.transform).toBe("")
      detach()
    })

    test("successful release gives CSS its current position before the owner closes", () => {
      vi.useFakeTimers()
      const { panel, close, detach } = setup(375)
      const transition = document.createElement("div")
      panel.replaceWith(transition)
      transition.append(panel)
      close.mockImplementation(() => {
        expect(panel.style.transform).toBe("")
        expect(panel.style.transition).toBe("")
        expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("translateY(240px)")
        transition.setAttribute("data-exiting", "")
      })
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 250)
      touch(panel, "touchend", 400)
      expect(close).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(400)
      // An actual departing panel must not be mistaken for a rejected close.
      expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("translateY(240px)")
      expect(panel.style.transition).toBe("")
      detach()
      expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("")
      expect(vi.getTimerCount()).toBe(0)
    })

    test.each([false, true])("a veto returns the sheet without closing twice, Reduce Motion=%s", (reduced) => {
      vi.useFakeTimers()
      const { panel, close, detach } = setup(375, reduced)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 250)
      touch(panel, "touchend", 400)
      vi.advanceTimersByTime(400)
      expect(close).toHaveBeenCalledOnce()
      expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("")
      expect(panel.style.transform).toBe("")
      if (reduced) expect(panel.style.transition).toBe("")
      else expect(panel.style.transition).toBe("transform var(--motion-enter) var(--cubic-enter)")
      detach()
      expect(vi.getTimerCount()).toBe(0)
    })

    test("only the panel's transform completion clears a pending return", () => {
      const { panel, detach } = setup(375)
      const child = document.createElement("span")
      panel.append(child)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 50)
      touch(panel, "touchend", 400)
      fireEvent.transitionEnd(child, { propertyName: "transform" })
      fireEvent.transitionEnd(panel, { propertyName: "opacity" })
      expect(panel.style.transition).not.toBe("")
      fireEvent.transitionEnd(panel, { propertyName: "transform" })
      expect(panel.style.transition).toBe("")
      detach()
    })

    test("a retained close-to-open reversal clears the old drag destination before the next entrance", async () => {
      vi.useFakeTimers()
      const { panel, content, detach } = setup(375)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 250)
      touch(panel, "touchend", 400)
      content.setAttribute("data-state", "closed")
      await Promise.resolve()
      content.setAttribute("data-state", "open")
      await Promise.resolve()
      expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("")
      expect(panel.style.transform).toBe("")
      expect(panel.style.transition).toBe("")
      expect(vi.getTimerCount()).toBe(0)
      detach()
    })

    test("a longer theme motion token is not cleared at the shorter close-veto timeout", () => {
      vi.useFakeTimers()
      const { panel, detach } = setup(375, false, "0.8s")
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 50)
      touch(panel, "touchend", 400)
      vi.advanceTimersByTime(400)
      expect(panel.style.transition).not.toBe("")
      vi.advanceTimersByTime(400)
      expect(panel.style.transition).toBe("")
      detach()
    })

    test.each(["0s", "0ms"])("a zero-duration theme (%s) clears a partial return immediately", (duration) => {
      vi.useFakeTimers()
      const { panel, close, detach } = setup(375, false, duration)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 50)
      touch(panel, "touchend", 400)
      expect(close).not.toHaveBeenCalled()
      expect(panel.style.transform).toBe("")
      expect(panel.style.transition).toBe("")
      expect(vi.getTimerCount()).toBe(0)
      detach()
    })

    test("a synchronous owner detach leaves no drag styles or pending cleanup", () => {
      vi.useFakeTimers()
      const { panel, close, detach } = setup(375)
      close.mockImplementation(detach)
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 250)
      touch(panel, "touchend", 400)
      expect(panel.style.transform).toBe("")
      expect(panel.style.transition).toBe("")
      expect(panel.style.getPropertyValue("--dialog-panel-drag-transform")).toBe("")
      expect(vi.getTimerCount()).toBe(0)
    })

    test("an exiting sheet cannot start a new drag that masks its CSS exit", () => {
      const { panel, close, detach } = setup(375)
      const transition = document.createElement("div")
      panel.replaceWith(transition)
      transition.append(panel)
      transition.setAttribute("data-exiting-active", "")
      touch(panel, "touchstart", 0, 10)
      touch(panel, "touchmove", 100, 250)
      touch(panel, "touchend", 400)
      expect(close).not.toHaveBeenCalled()
      expect(panel.style.transform).toBe("")
      detach()
    })

    test("a cancelled gesture restores the sheet without dismissing it", () => {
      const { panel, close, detach } = setup(402)
      fireEvent.touchStart(panel, { touches: [{ clientY: 10 }] })
      fireEvent.touchMove(panel, { touches: [{ clientY: 400 }] })
      fireEvent.touchCancel(panel)
      expect(panel.style.transform).toBe("")
      expect(close).not.toHaveBeenCalled()
      detach()
    })
  })
}
