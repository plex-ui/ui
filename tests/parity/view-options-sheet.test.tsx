import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { useLayoutEffect, useState } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { ViewOptionsSheet as ReactSheet, ViewOptionsSheetDemo as ReactDemo } from "../../components/docs/ViewOptionsSheet"
import { ViewOptionsSheet as VueSheet, ViewOptionsSheetDemo as VueDemo } from "../../components/docs/vue/ViewOptionsSheet"
import { extensionNote, initialViewOptions, type ViewOptions } from "../../components/docs/viewOptionsData"
import { flushVue, mountVue } from "./harness"
import { interact } from "./pair"

// Check the helper against current source, including nested Select/Dialog ownership.
vi.mock("@plexui/ui/components/Button", async () => import("../../packages/ui/src/components/Button"))
vi.mock("@plexui/vue/components/Button", async () => import("../../packages/vue/src/components/Button"))
vi.mock("@plexui/ui/components/Dialog", async () => import("../../packages/ui/src/components/Dialog"))
vi.mock("@plexui/vue/components/Dialog", async () => import("../../packages/vue/src/components/Dialog"))
vi.mock("@plexui/ui/components/Field", async () => import("../../packages/ui/src/components/Field"))
vi.mock("@plexui/vue/components/Field", async () => import("../../packages/vue/src/components/Field"))
vi.mock("@plexui/ui/components/FieldGroup", async () => import("../../packages/ui/src/components/FieldGroup"))
vi.mock("@plexui/vue/components/FieldGroup", async () => import("../../packages/vue/src/components/FieldGroup"))
vi.mock("@plexui/ui/components/Page", async () => import("../../packages/ui/src/components/Page"))
vi.mock("@plexui/vue/components/Page", async () => import("../../packages/vue/src/components/Page"))
vi.mock("@plexui/ui/components/Select", async () => import("../../packages/ui/src/components/Select"))
vi.mock("@plexui/vue/components/Select", async () => import("../../packages/vue/src/components/Select"))
vi.mock("@plexui/ui/components/Switch", async () => import("../../packages/ui/src/components/Switch"))
vi.mock("@plexui/vue/components/Switch", async () => import("../../packages/vue/src/components/Switch"))

type Framework = "React" | "Vue"

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { vi.unstubAllGlobals() })

const click = async (element: HTMLElement) => interact(() => { fireEvent.click(element) })
const page = () => within(document.body)
const sheet = () => page().getByRole("dialog", { name: "View Options" })

const mountDemo = async (framework: Framework, initialOpen = false) => {
  if (framework === "React") await act(async () => { render(<ReactDemo initialOpen={initialOpen} />) })
  else {
    mountVue(() => h(VueDemo, { initialOpen }))
    await flushVue()
  }
}

const openSheet = async () => {
  const trigger = page().getByRole("button", { name: "View options", exact: true })
  await click(trigger)
  await page().findByRole("dialog", { name: "View Options" })
  return trigger
}

const selectOption = async (label: string, option: string) => {
  const trigger = within(sheet()).getByRole("button", { name: new RegExp(`^${label} `) })
  await click(trigger)
  const menu = await page().findByRole("listbox")
  await click(within(menu).getByRole("option", { name: option, exact: true }))
  await waitFor(() => expect(page().queryByRole("listbox")).toBeNull())
  expect(within(sheet()).getByRole("button", { name: new RegExp(`^${label} `) }).textContent).toBe(option)
}

describe.each<Framework>(["React", "Vue"])("%s floating View Options Sheet", (framework) => {
  test("renders group headings and notes in their groups, and opening focuses the heading without scrolling", async () => {
    await mountDemo(framework)
    const current = page().getByRole("group", { name: "Current view" })
    expect(within(current).getByRole("heading", { name: "Current view" })).toBeTruthy()
    const currentNote = within(current).getByText("Open View options to change these preferences.")
    expect(currentNote.closest("[data-row]")).toBeNull()
    const focus = vi.spyOn(HTMLElement.prototype, "focus")
    await openSheet()
    const content = within(sheet())
    expect(content.getByRole("group", { name: "Sorting and grouping" })).toBeTruthy()
    expect(content.getByRole("group", { name: "Item size" })).toBeTruthy()
    const advanced = content.getByRole("group", { name: "Advanced" })
    expect(within(advanced).getByRole("heading", { name: "Advanced" })).toBeTruthy()
    expect(within(advanced).getByText(extensionNote).closest("[data-row]")).toBeNull()
    const heading = content.getByRole("heading", { name: "View Options" }).parentElement
    expect(document.activeElement).toBe(heading)
    const focusCall = focus.mock.contexts.findIndex((element) => element === heading)
    expect(focusCall).toBeGreaterThanOrEqual(0)
    expect(focus.mock.calls[focusCall]).toEqual([{ preventScroll: true }])
    expect(content.queryByRole("button", { name: "Close dialog" })).toBeNull()
  })

  test("each nested Select updates immediately; Done restores focus and reopening keeps all choices", async () => {
    await mountDemo(framework)
    const current = page().getByRole("group", { name: "Current view" })
    const trigger = await openSheet()
    await selectOption("Sort By", "Size")
    await selectOption("Group By", "None")
    await selectOption("Icon and List Size", "Large")
    await click(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }))
    // The Page is inert behind the dialog, but its controlled outputs already changed.
    expect(Array.from(current.querySelectorAll("output"), (output) => output.textContent)).toEqual(["Size", "None", "Large", "Hidden"])
    await click(within(sheet()).getByRole("button", { name: "Done" }))
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    await openSheet()
    expect(within(sheet()).getByRole("button", { name: /^Sort By / }).textContent).toBe("Size")
    expect(within(sheet()).getByRole("button", { name: /^Group By / }).textContent).toBe("None")
    expect(within(sheet()).getByRole("button", { name: /^Icon and List Size / }).textContent).toBe("Large")
    expect(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }).getAttribute("aria-checked")).toBe("false")
  })

  test("an initially open Phone composition can close and reopen with its immediate switch value intact", async () => {
    await mountDemo(framework, true)
    await click(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }))
    await click(within(sheet()).getByRole("button", { name: "Done" }))
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull())
    const trigger = page().getByRole("button", { name: "View options", exact: true })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    await openSheet()
    expect(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }).getAttribute("aria-checked")).toBe("false")
  })

  test("controlled changes preserve the other values and external updates appear in the open sheet", async () => {
    const changes = vi.fn<(value: ViewOptions) => void>()
    let updateValue: ((next: ViewOptions) => void) | undefined
    if (framework === "React") {
      function Controlled() {
        const [value, setValue] = useState(initialViewOptions)
        useLayoutEffect(() => {
          updateValue = setValue
          return () => { updateValue = undefined }
        }, [])
        return <ReactSheet open onOpenChange={() => {}} value={value} onValueChange={(next) => { changes(next); setValue(next) }} />
      }
      await act(async () => { render(<Controlled />) })
    } else {
      const state = reactive({ value: initialViewOptions() })
      updateValue = (value) => { state.value = value }
      mountVue(() => h(VueSheet, { open: true, value: state.value, "onUpdate:value": (value: ViewOptions) => { changes(value); state.value = value } }))
      await flushVue()
    }
    await click(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }))
    expect(changes).toHaveBeenCalledExactlyOnceWith({ ...initialViewOptions(), showExtensions: false })
    if (!updateValue) throw new Error("Controlled sheet has not mounted")
    const setValue = updateValue
    await interact(() => { setValue({ sort: "date", grouping: "kind", iconSize: "small", showExtensions: true }) })
    expect(within(sheet()).getByRole("button", { name: /^Sort By / }).textContent).toBe("Date")
    expect(within(sheet()).getByRole("button", { name: /^Group By / }).textContent).toBe("Kind")
    expect(within(sheet()).getByRole("button", { name: /^Icon and List Size / }).textContent).toBe("Small")
    expect(within(sheet()).getByRole("switch", { name: "Show All Filename Extensions" }).getAttribute("aria-checked")).toBe("true")
    expect(changes).toHaveBeenCalledTimes(1)
  })
})
