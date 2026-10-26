import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { h } from "vue"
import { OTPInput as ROTPInput } from "../../packages/ui/src/components/OTPInput"
import { Tabs as ReactTabs } from "../../packages/ui/src/components/Tabs"
import { OTPInput } from "../../packages/vue/src/components/OTPInput"
import { Tabs, TabsTab } from "../../packages/vue/src/components/Tabs"
import { walkPairWithState } from "./pair"

// Fixes for Plex defects that apps worked around on their side.

describe("OTPInput: a field cleared from outside", () => {
  test("puts the caret back in the first cell", async () => {
    const focusedCells: number[][] = [[], []]
    let run = 0
    const focusedIndex = () => Array.from(document.querySelectorAll("input")).indexOf(document.activeElement as HTMLInputElement)

    const { react, vue } = await walkPairWithState(
      { value: "4821" },
      (state) => <ROTPInput value={state.value} onChange={() => {}} length={6} />,
      (state) => h(OTPInput, { value: state.value, length: 6 }),
      async ({ set, snapshot }) => {
        document.querySelectorAll("input")[3].focus()
        focusedCells[run].push(focusedIndex())
        await set({ value: "" })
        focusedCells[run].push(focusedIndex())
        snapshot()
        run++
      },
    )

    expect(vue).toEqual(react)
    expect(focusedCells).toEqual([
      [3, 0],
      [3, 0],
    ])
  })

  test("leaves the focus alone when it is elsewhere", async () => {
    const outside: boolean[] = []
    const { react, vue } = await walkPairWithState(
      { value: "4821" },
      (state) => <ROTPInput value={state.value} onChange={() => {}} length={6} />,
      (state) => h(OTPInput, { value: state.value, length: 6 }),
      async ({ set, snapshot }) => {
        const button = document.createElement("button")
        document.body.appendChild(button)
        button.focus()
        await set({ value: "" })
        outside.push(document.activeElement === button)
        button.remove()
        snapshot()
      },
    )
    expect(vue).toEqual(react)
    expect(outside).toEqual([true, true])
  })
})

describe("Tabs: the thumb follows the tabs when they change", () => {
  const descriptors = new Map<string, PropertyDescriptor | undefined>()
  const fake = (name: "offsetLeft" | "clientWidth", fallback: number) => {
    descriptors.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name))
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get(this: HTMLElement) {
        const attribute = this.getAttribute(name === "offsetLeft" ? "data-left" : "data-width")
        return attribute == null ? fallback : Number(attribute)
      },
    })
  }

  beforeEach(() => {
    fake("offsetLeft", 0)
    fake("clientWidth", 1000)
  })
  afterEach(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
    }
  })

  test("reordering tabs moves the thumb to the active tab's new place", async () => {
    type Tab = { value: string; left: number }
    const first: Tab[] = [
      { value: "a", left: 0 },
      { value: "b", left: 60 },
    ]
    const swapped: Tab[] = [
      { value: "b", left: 0 },
      { value: "a", left: 60 },
    ]
    const transforms: string[] = []
    const thumb = () => document.querySelector<HTMLElement>(".TabsThumb")?.style.transform ?? ""

    const { react, vue } = await walkPairWithState(
      { tabs: first },
      (state) => (
        <ReactTabs value="b" onChange={() => {}} aria-label="View">
          {state.tabs.map((tab) => (
            <ReactTabs.Tab key={tab.value} value={tab.value} data-left={tab.left} data-width={50}>
              {tab.value}
            </ReactTabs.Tab>
          ))}
        </ReactTabs>
      ),
      (state) =>
        h(Tabs, { "value": "b", "aria-label": "View" }, () =>
          state.tabs.map((tab) =>
            h(TabsTab, { "key": tab.value, "value": tab.value, "data-left": tab.left, "data-width": 50 }, () => tab.value),
          ),
        ),
      async ({ set, advance, snapshot }) => {
        await advance(50)
        transforms.push(thumb())
        await set({ tabs: swapped })
        await advance(50)
        transforms.push(thumb())
        snapshot()
      },
    )

    expect(vue).toEqual(react)
    expect(transforms).toEqual(["translateX(60px)", "translateX(0px)", "translateX(60px)", "translateX(0px)"])
  })
})
