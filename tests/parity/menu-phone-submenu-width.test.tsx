import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Menu as RMenu } from "../../packages/ui/src/components/Menu"
import { Menu, MenuContent, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from "../../packages/vue/src/components/Menu"
import { flushVue, mountVue } from "./harness"

// Plan 175.2: with touch.css a phone submenu is the 250px of a menu (--menu-default-width). A submenu's own width
// still wins there: a number is its width, "auto" fits its content (max-content), as before the default width.

class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" }
}
const media = new Map<string, Media>()
const rect = (element: HTMLElement) =>
  element.getAttribute("role") === "menu" ? new DOMRect(20, 180, 250, 200) : new DOMRect(20, 180, 238, 44)

beforeEach(() => {
  media.clear()
  vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 0, width: 375, height: 812, addEventListener() {}, removeEventListener() {} })
  vi.stubGlobal("matchMedia", (query: string) => {
    let result = media.get(query)
    if (!result) { result = new Media(query); media.set(query, result) }
    return result
  })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) { return rect(this) })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) { return rect(this).height })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) { return rect(this).height })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const settle = () => act(async () => {
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, 25))
  await flushVue()
})

const widths: Array<[string, number | "auto" | undefined, string | null]> = [
  ["none", undefined, null],
  ["auto", "auto", "max-content"],
  ["300", 300, "300px"],
]

const phoneWidth = () => {
  const submenu = document.querySelector<HTMLElement>("[data-submenu]")
  expect(submenu).not.toBeNull()
  const value = submenu!.style.getPropertyValue("--menu-phone-width")
  return value === "" ? null : value
}

describe("a phone submenu's own width", () => {
  test.each(widths)("React: width %s", async (_, width, expected) => {
    render(
      <RMenu forceOpen>
        <RMenu.Trigger><button type="button">Actions</button></RMenu.Trigger>
        <RMenu.Content>
          <RMenu.Sub forceOpen>
            <RMenu.SubTrigger>Sort By</RMenu.SubTrigger>
            <RMenu.SubContent width={width}>
              <RMenu.Item onSelect={() => {}}>Name</RMenu.Item>
            </RMenu.SubContent>
          </RMenu.Sub>
        </RMenu.Content>
      </RMenu>,
    )
    await settle()
    expect(phoneWidth()).toBe(expected)
  })

  test.each(widths)("Vue: width %s", async (_, width, expected) => {
    const mounted = mountVue(() =>
      h(Menu, { forceOpen: true }, () => [
        h(MenuTrigger, null, () => h("button", { type: "button" }, "Actions")),
        h(MenuContent, null, () =>
          h(MenuSub, { forceOpen: true }, () => [
            h(MenuSubTrigger, null, () => "Sort By"),
            h(MenuSubContent, { width }, () => h(MenuItem, { onSelect: () => {} }, () => "Name")),
          ]),
        ),
      ]),
    )
    await settle()
    expect(phoneWidth()).toBe(expected)
    mounted.unmount()
  })
})
