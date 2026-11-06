import { fireEvent } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { h } from "vue"
import { Popover, PopoverTrigger, PopoverContent } from "../../packages/vue/src/components/Popover"
import { mountVue, flushVue } from "./harness"
import { interact } from "./pair"

const pointer = (target: Element, type: string, pointerId = 1) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 })
  Object.defineProperties(event, { pointerType: { value: "pen" }, pointerId: { value: pointerId } })
  fireEvent(target, event)
}
afterEach(() => vi.useRealTimers())

// React's vendor owns this deferred state; its matching upstream bug is tracked
// separately. These exercise the Vue public Popover, not the helper in isolation.
test.each(["focus after cancel", "inside click after cancel", "other pointer cancel"] as const)("Vue Popover: %s", async (scenario) => {
  vi.useFakeTimers()
  const changes: boolean[] = []
  mountVue(() => h("div", null, [h(Popover, { open: true, "onUpdate:open": (open: boolean) => changes.push(open) }, () => [h(PopoverTrigger, null, () => h("button", "Open")), h(PopoverContent, null, () => h("button", { "data-inside": "" }, "Inside"))]), h("button", { "data-outside": "" }, "Outside")]))
  await flushVue()
  await interact(() => { vi.advanceTimersByTime(20) })
  const inside = document.querySelector<HTMLElement>('[data-inside]')!
  const outside = document.querySelector<HTMLElement>('[data-outside]')!
  await interact(() => inside.focus())
  await interact(() => pointer(outside, "pointerdown"))
  await interact(() => pointer(outside, "pointercancel", scenario === "other pointer cancel" ? 2 : 1))
  if (scenario === "inside click after cancel") {
    await interact(() => { fireEvent.click(inside) })
    await interact(() => { vi.advanceTimersByTime(1) })
    expect(changes).toEqual([])
  } else {
    await interact(() => outside.focus())
    if (scenario === "other pointer cancel") {
      expect(changes).toEqual([])
      await interact(() => pointer(outside, "pointercancel"))
      await interact(() => inside.focus())
      await interact(() => outside.focus())
    }
    expect(changes).toEqual([false])
    expect(document.activeElement).toBe(outside)
  }
})
