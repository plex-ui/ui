import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Select } from "../../packages/vue/src/components/Select"
import { flushVue, mountVue } from "./harness"

// On an Android phone (the Plex Android look: `data-platform="android"` on the root, a window 767px wide or
// narrower) a Select opens Android's choice dialog, as a value row of the reference messenger's settings does: the
// setting's name, a radio row for each option and Cancel; a `multiple` one with `picker="dialog"` has a checkbox in
// each row, Cancel and OK. `picker="menu"`, iOS and a desktop keep the list.

class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" && phone }
}
let phone = true
const media = new Map<string, Media>()
const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark", description: "Easier on the eyes at night" },
  { value: "system", label: "System" },
]

beforeEach(() => {
  phone = true
  media.clear()
  document.documentElement.setAttribute("data-platform", "android")
  vi.stubGlobal("matchMedia", (query: string) => {
    let result = media.get(query)
    if (!result) { result = new Media(query); media.set(query, result) }
    return result
  })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
})
afterEach(() => {
  document.documentElement.removeAttribute("data-platform")
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const settle = async (callback: () => void = () => {}) => act(async () => {
  callback()
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, 25))
  await flushVue()
})

type Mount = {
  value?: string | string[]
  multiple?: boolean
  picker?: "dialog" | "menu"
  title?: string
  cancelLabel?: string
  okLabel?: string
  labelled?: boolean
  onChange?: (value: unknown) => void
}

async function open(framework: "React" | "Vue", { value = "light", multiple = false, picker, title, cancelLabel, okLabel, labelled = false, onChange = () => {} }: Mount = {}) {
  const props = {
    value, options: themes, multiple, picker, title, cancelLabel, okLabel, block: false,
    ...(labelled ? { "aria-labelledby": "theme-label" } : { "aria-label": "Appearance" }),
  }
  await settle(() => {
    if (framework === "React") {
      render(<><span id="theme-label">Theme</span><RSelect {...(props as never)} onChange={onChange} /></>)
    } else {
      const { "aria-labelledby": labelledby, "aria-label": label, ...rest } = props as typeof props & { "aria-labelledby"?: string; "aria-label"?: string }
      mountVue(() => h("div", [h("span", { id: "theme-label" }, "Theme"), h(Select, { ...rest, ariaLabelledby: labelledby, ariaLabel: label, onChange })]))
    }
  })
  const trigger = document.querySelector<HTMLElement>('[role="button"][aria-haspopup]')!
  await settle(() => { fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse", pointerId: 1 }) })
  await settle()
  return trigger
}

const dialog = () => document.querySelector<HTMLElement>('[data-select-dialog][data-state="open"]')
const listbox = () => document.querySelector('[role="listbox"]')
const rows = () => Array.from(dialog()?.querySelectorAll<HTMLElement>('[role="radio"], [role="checkbox"]') ?? [])
const row = (label: string) => rows().find((item) => item.textContent?.startsWith(label))!
const button = (label: string) => Array.from(dialog()?.querySelectorAll<HTMLElement>("button") ?? []).find((item) => item.textContent === label)!
const click = (element: HTMLElement) => settle(() => { fireEvent.click(element) })

describe.each(["React", "Vue"] as const)("%s: a Select on an Android phone", (framework) => {
  test("opens Android's single-choice dialog: the setting's name, a radio row for each option, and Cancel", async () => {
    await open(framework, { value: "dark" })
    expect(listbox()).toBeNull()
    expect(dialog()).not.toBeNull()
    expect(dialog()!.querySelector("h2")?.textContent).toBe("Appearance")
    const group = dialog()!.querySelector('[role="radiogroup"]')!
    expect(group.getAttribute("aria-label")).toBe("Appearance")
    expect(rows().map((item) => [item.getAttribute("role"), item.getAttribute("aria-checked")])).toEqual([
      ["radio", "false"], ["radio", "true"], ["radio", "false"],
    ])
    // A description is the row's second line
    expect(row("Dark").textContent).toBe("DarkEasier on the eyes at night")
    // The chosen row is the one tab stop, and takes focus
    expect(rows().map((item) => item.tabIndex)).toEqual([-1, 0, -1])
    expect(document.activeElement).toBe(row("Dark"))
    expect(Array.from(dialog()!.querySelectorAll("button")).map((item) => item.textContent)).toEqual(["Cancel"])
  })

  test("a press on a row chooses it and closes the dialog", async () => {
    const onChange = vi.fn()
    await open(framework, { onChange })
    await click(row("System"))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({ value: "system" })
    expect(dialog()).toBeNull()
  })

  test("Cancel and Escape close it with no change; the arrows move through the rows, round", async () => {
    const onChange = vi.fn()
    await open(framework, { onChange })
    await click(button("Cancel"))
    expect(dialog()).toBeNull()

    await settle(() => { fireEvent.pointerDown(document.querySelector<HTMLElement>('[role="button"][aria-haspopup]')!, { button: 0, pointerType: "mouse", pointerId: 2 }) })
    await settle()
    expect(document.activeElement).toBe(row("Light"))
    await settle(() => { fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" }) })
    expect(document.activeElement).toBe(row("System"))
    await settle(() => { fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" }) })
    expect(document.activeElement).toBe(row("Light"))
    await settle(() => { fireEvent.keyDown(document.activeElement!, { key: "Escape" }) })
    expect(dialog()).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  test("is titled by the field's label, else `title`; `cancelLabel` names its button", async () => {
    await open(framework, { labelled: true, cancelLabel: "Close" })
    expect(dialog()!.querySelector("h2")?.textContent).toBe("Theme")
    expect(button("Close")).toBeDefined()
    await click(button("Close"))
    expect(dialog()).toBeNull()
  })

  test("`title` names the dialog", async () => {
    await open(framework, { labelled: true, title: "Color theme" })
    expect(dialog()!.querySelector("h2")?.textContent).toBe("Color theme")
  })

  test('`picker="menu"` keeps the list', async () => {
    await open(framework, { picker: "menu" })
    expect(dialog()).toBeNull()
    expect(listbox()).not.toBeNull()
  })

  test("a multiple select keeps the list", async () => {
    await open(framework, { multiple: true, value: ["light"] })
    expect(dialog()).toBeNull()
    expect(listbox()).not.toBeNull()
  })

  test('a multiple select with `picker="dialog"` has a checkbox in each row, and OK applies them', async () => {
    const onChange = vi.fn()
    await open(framework, { multiple: true, picker: "dialog", value: ["dark"], okLabel: "Done", onChange })
    expect(dialog()!.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Appearance")
    expect(rows().map((item) => [item.getAttribute("role"), item.getAttribute("aria-checked")])).toEqual([
      ["checkbox", "false"], ["checkbox", "true"], ["checkbox", "false"],
    ])
    expect(document.activeElement).toBe(row("Dark"))
    expect(Array.from(dialog()!.querySelectorAll("button")).map((item) => item.textContent)).toEqual(["Cancel", "Done"])
    // A press checks or unchecks its row and keeps the dialog open; nothing changes before OK
    await click(row("Light"))
    await settle(() => { fireEvent.keyDown(row("Dark"), { key: " " }) })
    expect(rows().map((item) => item.getAttribute("aria-checked"))).toEqual(["true", "false", "false"])
    expect(onChange).not.toHaveBeenCalled()
    await click(button("Done"))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].map((option: { value: string }) => option.value)).toEqual(["light"])
    expect(dialog()).toBeNull()
  })

  test("Cancel leaves a multiple select's value as it was", async () => {
    const onChange = vi.fn()
    await open(framework, { multiple: true, picker: "dialog", value: ["dark"], onChange })
    await click(row("System"))
    await click(button("Cancel"))
    expect(onChange).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  test("iOS and a desktop keep the list", async () => {
    document.documentElement.setAttribute("data-platform", "ios")
    await open(framework)
    expect(dialog()).toBeNull()
    expect(listbox()).not.toBeNull()
  })

  test("a desktop window keeps the list on Android", async () => {
    phone = false
    await open(framework)
    expect(dialog()).toBeNull()
    expect(listbox()).not.toBeNull()
  })
})
