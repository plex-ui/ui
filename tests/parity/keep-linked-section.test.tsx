import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { KeepLinkedSectionInView } from "../../components/layout/KeepLinkedSectionInView"

// Row 167: opened at a section link, the docs page keeps the linked heading in view while the examples above it
// hydrate and change size, until the reader takes over.

let resize: () => void = () => {}
const observed: Element[] = []
class StubResizeObserver {
  constructor(callback: () => void) {
    resize = callback
  }
  observe(target: Element) {
    observed.push(target)
  }
  disconnect() {
    resize = () => {}
  }
  unobserve() {}
}

const scrolled: string[] = []
const navigation = (type: NavigationTimingType) =>
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ type } as unknown as PerformanceEntry])

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("ResizeObserver", StubResizeObserver)
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this.id)
  }
  document.body.innerHTML = `<h2 id="time-picker">Time picker</h2>`
  window.history.replaceState(null, "", "/components/date-picker#time-picker")
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(Element.prototype, "scrollIntoView")
  window.history.replaceState(null, "", "/")
  scrolled.length = 0
  observed.length = 0
})

describe("a docs page opened at a section link", () => {
  test("brings the linked heading back on each resize, until the reader scrolls", () => {
    navigation("navigate")
    render(<KeepLinkedSectionInView />)
    expect(observed).toEqual([document.body])
    resize()
    resize()
    expect(scrolled).toEqual(["time-picker", "time-picker"])
    window.dispatchEvent(new Event("wheel"))
    resize()
    expect(scrolled).toHaveLength(2)
  })

  test("stops when the reader scrolls without a pointer or key, as by dragging the scrollbar", () => {
    navigation("navigate")
    render(<KeepLinkedSectionInView />)
    resize()
    window.dispatchEvent(new Event("scroll"))
    resize()
    expect(scrolled).toHaveLength(2)
    const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY")
    Object.defineProperty(window, "scrollY", { value: 400, configurable: true })
    window.dispatchEvent(new Event("scroll"))
    resize()
    expect(scrolled).toHaveLength(2)
    if (scrollY) Object.defineProperty(window, "scrollY", scrollY)
    else Reflect.deleteProperty(window, "scrollY")
  })

  test("opens a malformed section link without failing, looking the id up as written", () => {
    navigation("navigate")
    document.body.innerHTML = `<h2 id="100%">Full width</h2>`
    window.history.replaceState(null, "", "/components/slider#100%")
    render(<KeepLinkedSectionInView />)
    resize()
    expect(scrolled).toEqual(["100%"])
  })

  test("leaves the heading alone once the page has kept its size", () => {
    navigation("navigate")
    render(<KeepLinkedSectionInView />)
    resize()
    vi.advanceTimersByTime(1500)
    resize()
    expect(scrolled).toEqual(["time-picker"])
  })

  test("keeps the position the browser restores on a reload or a step back", () => {
    for (const type of ["reload", "back_forward"] as const) {
      navigation(type)
      const { unmount } = render(<KeepLinkedSectionInView />)
      resize()
      unmount()
    }
    expect(observed).toEqual([])
    expect(scrolled).toEqual([])
  })
})
