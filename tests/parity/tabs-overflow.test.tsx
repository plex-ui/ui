import { readFileSync } from "node:fs"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Fragment as ReactFragment } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { Fragment, h, ref } from "vue"
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

// Lets Vue, floating-ui and Reka's teleports settle
const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await flushVue()
}

const openMenu = async () => {
  await act(async () => {
    fireEvent.pointerDown(document.querySelector('[aria-haspopup="menu"]')!, { button: 0, ctrlKey: false, pointerType: "mouse" })
  })
  await settle()
}

describe("Tabs overflow, review follow-ups", () => {
  test("tabs inside a fragment overflow like any others", async () => {
    const pair = await domOf(
      () => (
        <div>
          <RTabs value="code" onChange={() => {}} aria-label="Repository" overflow="menu" data-test-width={300}>
            <RTabs.Tab value="code">Code</RTabs.Tab>
            <ReactFragment>
              {tabs.slice(1).map((tab) => (
                <RTabs.Tab key={tab.value} value={tab.value} badge={tab.badge}>
                  {tab.label}
                </RTabs.Tab>
              ))}
            </ReactFragment>
          </RTabs>
        </div>
      ),
      () =>
        h("div", null, [
          h(Tabs, { "value": "code", "aria-label": "Repository", "overflow": "menu", "data-test-width": 300 }, () => [
            h(TabsTab, { value: "code" }, () => "Code"),
            h(
              Fragment,
              tabs.slice(1).map((tab) => h(TabsTab, { key: tab.value, value: tab.value, badge: tab.badge }, () => tab.label)),
            ),
          ]),
        ]),
    )
    expect(pair.vue).toBe(pair.react)
    expect(visibleTabs()).toEqual(["Code", "Issues3", "More"])
  })

  test("a disabled hidden tab stays disabled in the menu (Vue: the bare attribute)", async () => {
    for (const run of ["react", "vue"] as const) {
      const onChange = vi.fn()
      let unmount = () => {}
      if (run === "react") {
        await act(async () => {
          render(
            <div>
              <RTabs value="code" onChange={onChange} aria-label="Repository" overflow="menu" data-test-width={300}>
                {tabs.map((tab) => (
                  <RTabs.Tab key={tab.value} value={tab.value} disabled={tab.value === "actions"}>
                    {tab.label}
                  </RTabs.Tab>
                ))}
              </RTabs>
            </div>,
          )
        })
      } else {
        // `<TabsTab disabled>` in a template: the raw prop is ""
        unmount = mountVue(() =>
          h("div", null, [
            h(Tabs, { "value": "code", "onUpdate:value": onChange, "aria-label": "Repository", "overflow": "menu", "data-test-width": 300 }, () =>
              tabs.map((tab) =>
                h(TabsTab, { key: tab.value, value: tab.value, ...(tab.value === "actions" && { disabled: "" }) }, () => tab.label),
              ),
            ),
          ]),
        ).unmount
        await settle()
      }
      await openMenu()
      const item = screen.getByRole("menuitemradio", { name: "Actions" })
      expect(item.getAttribute("aria-disabled"), run).toBe("true")
      await act(async () => {
        fireEvent.click(item)
      })
      await settle()
      expect(onChange, run).not.toHaveBeenCalled()
      cleanup()
      unmount()
    }
  })

  test("disabling the group disables the hidden tabs in an open menu", async () => {
    for (const run of ["react", "vue"] as const) {
      const onChange = vi.fn()
      let disable = async () => {}
      let unmount = () => {}
      if (run === "react") {
        const strip = (disabled: boolean) => (
          <div>
            <RTabs value="code" onChange={onChange} aria-label="Repository" overflow="menu" data-test-width={300} disabled={disabled}>
              {tabs.map((tab) => (
                <RTabs.Tab key={tab.value} value={tab.value}>
                  {tab.label}
                </RTabs.Tab>
              ))}
            </RTabs>
          </div>
        )
        const view = render(strip(false))
        disable = async () => {
          await act(async () => view.rerender(strip(true)))
        }
      } else {
        const disabled = ref(false)
        unmount = mountVue(() =>
          h("div", null, [
            h(
              Tabs,
              { "value": "code", "onUpdate:value": onChange, "aria-label": "Repository", "overflow": "menu", "data-test-width": 300, "disabled": disabled.value },
              () => tabs.map((tab) => h(TabsTab, { key: tab.value, value: tab.value }, () => tab.label)),
            ),
          ]),
        ).unmount
        disable = async () => {
          disabled.value = true
        }
      }
      await settle()
      await openMenu()
      await disable()
      await settle()
      const item = screen.getByRole("menuitemradio", { name: "Actions" })
      expect(item.getAttribute("aria-disabled"), run).toBe("true")
      cleanup()
      unmount()
    }
  })

  test("a longer menu label measures the strip again", async () => {
    // 230px: "More" (60px) leaves room for two tabs, "More options" (140px) for one
    const reactStrip = (label: string) => (
      <div>
        <RTabs value="code" onChange={() => {}} aria-label="Repository" overflow="menu" overflowLabel={label} data-test-width={230}>
          {tabs.map((tab) => (
            <RTabs.Tab key={tab.value} value={tab.value} badge={tab.badge}>
              {tab.label}
            </RTabs.Tab>
          ))}
        </RTabs>
      </div>
    )
    const view = render(reactStrip("More"))
    await settle()
    expect(visibleTabs()).toEqual(["Code", "Issues3", "More"])
    await act(async () => view.rerender(reactStrip("More options")))
    await settle()
    const react = visibleTabs()
    cleanup()

    const label = ref("More")
    mountVue(() =>
      h("div", null, [
        h(Tabs, { "value": "code", "aria-label": "Repository", "overflow": "menu", "overflowLabel": label.value, "data-test-width": 230 }, () =>
          tabs.map((tab) => h(TabsTab, { key: tab.value, value: tab.value, badge: tab.badge }, () => tab.label)),
        ),
      ]),
    )
    await settle()
    expect(visibleTabs()).toEqual(["Code", "Issues3", "More"])
    label.value = "More options"
    await settle()
    await settle()

    expect(react).toEqual(["Code", "More options"])
    expect(visibleTabs()).toEqual(react)
  })

  test("a hidden tab's icon and badge slots move into the menu (Vue)", async () => {
    mountVue(() =>
      h("div", null, [
        h(Tabs, { "value": "code", "aria-label": "Repository", "overflow": "menu", "data-test-width": 300 }, () =>
          tabs.map((tab) =>
            h(
              TabsTab,
              { key: tab.value, value: tab.value },
              tab.value === "insights"
                ? { default: () => tab.label, icon: () => h("svg", { "data-testid": "insights-icon" }), badge: () => "7" }
                : { default: () => tab.label },
            ),
          ),
        ),
      ]),
    )
    await settle()
    await openMenu()
    const item = screen.getByRole("menuitemradio", { name: /Insights/ })
    expect(item.querySelector('[data-testid="insights-icon"]')).toBeTruthy()
    expect(item.textContent).toContain("7")
  })

  test("switching to the menu after mount watches the container (Vue)", async () => {
    const observed: Element[] = []
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(element: Element) {
          observed.push(element)
        }
        unobserve() {}
        disconnect() {}
      },
    )
    const overflow = ref<"scroll" | "menu">("scroll")
    mountVue(() =>
      h("section", { id: "box" }, [
        h(Tabs, { "value": "code", "aria-label": "Repository", "overflow": overflow.value, "data-test-width": 300 }, () =>
          tabs.map((tab) => h(TabsTab, { key: tab.value, value: tab.value }, () => tab.label)),
        ),
      ]),
    )
    await settle()
    overflow.value = "menu"
    await settle()
    expect(observed).toContain(document.getElementById("box"))
  })
})
