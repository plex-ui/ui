import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Tabs as RTabs } from "../../packages/ui/src/components/Tabs"
import { fitCount, visibleTabCount } from "../../packages/ui/src/components/Tabs/overflow"
import { Tabs, TabsTab } from "../../packages/vue/src/components/Tabs"
import { flushVue, mountVue } from "./harness"
import { serializeDom } from "./normalize"

// Tabs overflow="menu": the tabs that do not fit move into a menu at the end
// of the strip. jsdom has no layout, so widths come from the text: 10px per
// character plus 20px, a chevron 20px, the strip its `data-test-width`.

const tabs = [
  { value: "code", label: "Code" },
  { value: "issues", label: "Issues", badge: 3 },
  { value: "pulls", label: "Pull requests" },
  { value: "actions", label: "Actions" },
  { value: "insights", label: "Insights" },
]

beforeEach(() => {
  // Elements with a size make floating-ui watch the menu's anchor for layout shifts
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const testWidth = this.getAttribute("data-test-width")
    const width = testWidth
      ? Number(testWidth)
      : this.tagName === "BUTTON"
        ? 10 * (this.textContent ?? "").length + 20
        : this.tagName.toLowerCase() === "svg"
          ? 20
          : 0
    return { width, height: 20, top: 0, left: 0, right: width, bottom: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const reactStrip = (value: string, width: number, onChange: (value: string) => void = () => {}) => (
  <div>
    <RTabs value={value} onChange={onChange} aria-label="Repository" overflow="menu" data-test-width={width}>
      {tabs.map((tab) => (
        <RTabs.Tab key={tab.value} value={tab.value} badge={tab.badge}>
          {tab.label}
        </RTabs.Tab>
      ))}
    </RTabs>
  </div>
)

const vueStrip = (value: string, width: number, onChange: (value: string) => void = () => {}) => () =>
  h("div", null, [
    h(
      Tabs,
      { "value": value, "onUpdate:value": onChange, "aria-label": "Repository", "overflow": "menu", "data-test-width": width },
      () => tabs.map((tab) => h(TabsTab, { key: tab.value, value: tab.value, badge: tab.badge }, () => tab.label)),
    ),
  ])

const domOf = async (react: () => JSX.Element, vue: () => ReturnType<typeof h>) => {
  await act(async () => {
    render(react())
  })
  const reactDom = serializeDom()
  cleanup()
  mountVue(vue)
  await flushVue()
  await flushVue()
  const vueDom = serializeDom()
  return { react: reactDom, vue: vueDom }
}

const visibleTabs = () =>
  Array.from(document.querySelectorAll('[role="radiogroup"] > button')).map((button) => button.textContent)

describe("Tabs overflow width math", () => {
  test("everything fits: no menu", () => {
    expect(fitCount([60, 90, 150], 60, 4, 400)).toBe(3)
  })
  test("room for the menu button is taken first", () => {
    expect(fitCount([60, 90, 150, 90], 60, 0, 260)).toBe(2)
  })
  test("a hidden active tab widens the button", () => {
    // With the narrow button three fit; the active fifth tab's name makes it wider
    expect(visibleTabCount([50, 50, 50, 50, 50], 40, 110, 4, 0, 230)).toBe(2)
    expect(visibleTabCount([50, 50, 50, 50, 50], 40, 110, 1, 0, 230)).toBe(3)
  })
  test("the Vue copy of the math is the same file", () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
    expect(read("../../packages/vue/src/components/Tabs/overflow.ts")).toBe(read("../../packages/ui/src/components/Tabs/overflow.ts"))
  })
})

describe("Tabs overflow parity", () => {
  test("tabs that fit stay, the rest go behind More", async () => {
    const pair = await domOf(() => reactStrip("code", 300), vueStrip("code", 300))
    expect(pair.vue).toBe(pair.react)
    expect(visibleTabs()).toEqual(["Code", "Issues3", "More"])
    expect(pair.react).toContain('aria-haspopup="menu"')
  })

  test("a hidden active tab names the More button, which carries the selection", async () => {
    const pair = await domOf(() => reactStrip("insights", 300), vueStrip("insights", 300))
    expect(pair.vue).toBe(pair.react)
    expect(visibleTabs()).toEqual(["Code", "Issues3", "Insights"])
    const more = document.querySelector<HTMLElement>('[aria-haspopup="menu"]')!
    expect(more.getAttribute("aria-checked")).toBe("true")
    expect(more.getAttribute("data-state")).toBe("on")
  })

  test("everything fits: no More button", async () => {
    const pair = await domOf(() => reactStrip("code", 1000), vueStrip("code", 1000))
    expect(pair.vue).toBe(pair.react)
    expect(visibleTabs()).toEqual(["Code", "Issues3", "Pull requests", "Actions", "Insights"])
  })

  test("a strip without width shows every tab", async () => {
    const pair = await domOf(() => reactStrip("code", 0), vueStrip("code", 0))
    expect(pair.vue).toBe(pair.react)
    expect(visibleTabs()).toHaveLength(5)
  })

  test("choosing a hidden tab in the menu selects it", async () => {
    // Lets Vue, floating-ui and Reka's teleports settle
    const settle = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      await flushVue()
    }
    for (const run of ["react", "vue"] as const) {
      const onChange = vi.fn()
      let unmount = () => {}
      if (run === "react") {
        await act(async () => {
          render(reactStrip("code", 300, onChange))
        })
      } else {
        unmount = mountVue(vueStrip("code", 300, onChange)).unmount
        await settle()
      }
      const more = screen.getByRole("radio", { name: "More" })
      await act(async () => {
        fireEvent.pointerDown(more, { button: 0, ctrlKey: false, pointerType: "mouse" })
      })
      await settle()
      const item = screen.getByRole("menuitemradio", { name: "Actions" })
      await act(async () => {
        fireEvent.click(item)
      })
      await settle()
      expect(onChange, run).toHaveBeenCalledWith("actions")
      cleanup()
      unmount()
    }
  })

  test("plain Tabs are untouched by the new props", async () => {
    const pair = await domOf(
      () => (
        <RTabs value="a" onChange={() => {}} aria-label="View">
          <RTabs.Tab value="a">A</RTabs.Tab>
        </RTabs>
      ),
      () => h(Tabs, { "value": "a", "aria-label": "View" }, () => h(TabsTab, { value: "a" }, () => "A")),
    )
    expect(pair.vue).toBe(pair.react)
    expect(pair.react).not.toContain("data-overflow")
  })
})
