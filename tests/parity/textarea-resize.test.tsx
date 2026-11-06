import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { h, ref } from "vue"
import { Textarea as ReactTextarea } from "../../packages/ui/src/components/Textarea"
import { FloatingLabelInput as ReactFloatingLabelInput } from "../../packages/ui/src/components/FloatingLabelInput"
import { Textarea } from "../../packages/vue/src/components/Textarea"
import { FloatingLabelInput } from "../../packages/vue/src/components/FloatingLabelInput"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

type Framework = "react" | "vue"
type Kind = "textarea" | "floating"
const cases: Array<[Framework, Kind]> = [
  ["react", "textarea"], ["vue", "textarea"],
  ["react", "floating"], ["vue", "floating"],
]
const value = "A fixed value that wraps when its container becomes narrower."

const mountField = async (framework: Framework, kind: Kind) => {
  if (framework === "react") {
    const content = (enabled: boolean) => kind === "textarea"
      ? <ReactTextarea defaultValue={value} autoResize={enabled} rows={1} />
      : <ReactFloatingLabelInput label="Notes" defaultValue={value} multiline={enabled} rows={1} />
    const mounted = render(content(true))
    await interact(() => {})
    return { unmount: mounted.unmount, setEnabled: (enabled: boolean) => mounted.rerender(content(enabled)) }
  }
  const enabled = ref(true)
  const mounted = mountVue(() => kind === "textarea"
    ? h(Textarea, { defaultValue: value, autoResize: enabled.value, rows: 1 })
    : h(FloatingLabelInput, { label: "Notes", defaultValue: value, multiline: enabled.value, rows: 1 }))
  await flushVue()
  return { unmount: mounted.unmount, setEnabled: (next: boolean) => { enabled.value = next } }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe.each(cases)("%s %s responsive autosize", (framework, kind) => {
  test("only width changes resize existing text, preserve focus, and disconnect when inactive", async () => {
    vi.useFakeTimers()
    const deliver = async (observer: Observer, element: Element, width: number) => {
      await interact(() => { observer.deliver(element, width); vi.advanceTimersByTime(20) })
    }
    let width = 400
    let heightReads = 0
    const observers: Observer[] = []
    class Observer implements ResizeObserver {
      element: Element | undefined
      disconnect = vi.fn(() => { this.element = undefined })
      constructor(readonly callback: ResizeObserverCallback) { observers.push(this) }
      observe(element: Element) { this.element = element }
      unobserve(element: Element) { if (element === this.element) this.element = undefined }
      deliver(element: Element, nextWidth: number) {
        const size = { inlineSize: nextWidth, blockSize: 120 }
        this.callback([{
          target: element,
          contentRect: new DOMRect(0, 0, nextWidth, 120),
          borderBoxSize: [size], contentBoxSize: [size], devicePixelContentBoxSize: [size],
        }], this)
      }
    }
    vi.stubGlobal("ResizeObserver", Observer)
    vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => {
      heightReads += 1
      return width <= 200 ? 120 : 40
    })
    const mounted = await mountField(framework, kind)
    const field = document.querySelector("textarea")!
    const observer = observers.find((entry) => entry.element === field)
    expect(observer).toBeDefined()
    if (!observer) throw new Error("The mounted textarea has no ResizeObserver")
    expect(field.style.height).toBe("40px")
    await deliver(observer, field, width)
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    outside.focus()
    try {
      width = 200
      await deliver(observer, field, width)
      expect(field.style.height).toBe("120px")
      expect(field.value).toBe(value)
      expect(document.activeElement).toBe(outside)
      const readsAfterWidth = heightReads
      await deliver(observer, field, width)
      expect(heightReads).toBe(readsAfterWidth)
      width = 400
      await deliver(observer, field, width)
      expect(field.style.height).toBe("40px")
      await interact(() => observer.deliver(field, 100))
      const readsBeforeDisable = heightReads
      await interact(() => mounted.setEnabled(false))
      expect(observer.disconnect).toHaveBeenCalledTimes(1)
      await interact(() => { vi.advanceTimersByTime(20) })
      expect(heightReads).toBe(readsBeforeDisable)
      const readsAfterDisconnect = heightReads
      await deliver(observer, field, 100)
      expect(heightReads).toBe(readsAfterDisconnect)
      await interact(() => mounted.setEnabled(true))
      expect(observers.filter((entry) => entry.element)).toHaveLength(1)
      await interact(() => mounted.unmount())
      expect(observers.every((entry) => entry.disconnect.mock.calls.length === 1)).toBe(true)
    } finally {
      outside.remove()
      mounted.unmount()
    }
  })

  test("without ResizeObserver, window width changes still resize and the listener is cleaned up", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    let width = 400
    let heightReads = 0
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, 0, width, 40))
    vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => {
      heightReads += 1
      return width <= 200 ? 120 : 40
    })
    const mounted = await mountField(framework, kind)
    const field = document.querySelector("textarea")!
    expect(field.style.height).toBe("40px")
    width = 200
    await interact(() => { window.dispatchEvent(new Event("resize")) })
    expect(field.style.height).toBe("120px")
    const previousReads = heightReads
    await interact(() => { window.dispatchEvent(new Event("resize")) })
    expect(heightReads).toBe(previousReads)
    await interact(() => mounted.unmount())
    width = 400
    await interact(() => { window.dispatchEvent(new Event("resize")) })
    expect(heightReads).toBe(previousReads)
  })
})
