import { act, fireEvent, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Select } from "../../packages/vue/src/components/Select"
import { flushVue, mountVue } from "./harness"

// Plan 178: an iOS pop-up button has no clear button. Its value is unset by a None row, first in the list and in a
// section of its own, checked while nothing is chosen (Reminders' Early Reminder, iOS-menu IMG_5821: None, a line,
// the times). On a phone a clearable Select does the same; a desktop keeps its clear button.

class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" && phone }
}
let phone = true
const media = new Map<string, Media>()
const fruits = [{ value: "apple", label: "Apple" }, { value: "banana", label: "Banana" }]
const groups = [{ label: "Fruit", options: fruits }, { label: "Berries", options: [{ value: "cherry", label: "Cherry" }] }]

beforeEach(() => {
  phone = true
  media.clear()
  vi.stubGlobal("matchMedia", (query: string) => {
    let result = media.get(query)
    if (!result) { result = new Media(query); media.set(query, result) }
    return result
  })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const settle = async (callback: () => void = () => {}) => act(async () => {
  callback()
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, 25))
  await flushVue()
})
const trigger = () => document.querySelector<HTMLElement>('[role="button"][aria-haspopup]')!
const clearButton = () => document.querySelector('[aria-label="Clear current value"]')
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
const noneRow = () => options().find((option) => option.textContent === "None")

type Mount = {
  value?: string | string[]
  multiple?: boolean
  clearable?: boolean
  noneLabel?: string
  grouped?: boolean
  items?: typeof fruits
  customTrigger?: boolean
  onChange?: (value: unknown) => void
}

async function mount(framework: "React" | "Vue", { value = "", multiple = false, clearable = true, noneLabel, grouped = false, items, customTrigger = false, onChange = () => {} }: Mount = {}) {
  const props = { value, options: items ?? (grouped ? groups : fruits), multiple, clearable, noneLabel, placeholder: "Fruit", block: false }
  await settle(() => {
    if (framework === "React") {
      const custom = customTrigger ? { trigger: ({ open }: { open: boolean }) => <button type="button" data-testid="custom">{open ? "Close" : "Open"}</button> } : {}
      render(<RSelect {...(props as never)} {...custom} onChange={onChange} />)
    } else {
      const custom = customTrigger ? { trigger: ({ open }: { open: boolean }) => h("button", { "type": "button", "data-testid": "custom" }, open ? "Close" : "Open") } : {}
      mountVue(() => h(Select, { ...props, ...custom, onChange }))
    }
  })
}

async function open(framework: "React" | "Vue", options: Mount = {}) {
  await mount(framework, options)
  if (options.customTrigger) {
    await settle(() => { fireEvent.click(document.querySelector('[data-testid="custom"]')!) })
  } else {
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
  }
  await settle()
}
const listbox = () => document.querySelector<HTMLElement>('[role="listbox"]')
const crossTo = async (onPhone: boolean) => {
  await settle(() => { phone = onPhone; media.get("(max-width: 767px)")?.dispatchEvent(new Event("change")) })
  await settle()
}
const press = async (element: HTMLElement) => {
  await settle(() => {
    fireEvent.pointerDown(element, { button: 0, pointerType: "touch", pointerId: 2 })
    fireEvent.pointerUp(element, { button: 0, pointerType: "touch", pointerId: 2 })
    fireEvent.click(element, { detail: 1 })
  })
}

describe.each(["React", "Vue"] as const)("%s: a clearable Select on a phone", (framework) => {
  test("has no clear button: its list leads with a None row of its own, checked while nothing is chosen", async () => {
    await open(framework)
    const none = options()[0]
    expect(none.textContent).toBe("None")
    expect(none.getAttribute("aria-selected")).toBe("true")
    expect(none.parentElement?.className).toContain("NoneSection")
    expect(none.closest('[role="listbox"]')).not.toBeNull()
    expect(options().slice(1).map((option) => option.textContent)).toEqual(["Apple", "Banana"])
  })

  test("with a value, the None row is unchecked, and choosing it clears the value and closes the list", async () => {
    const onChange = vi.fn()
    await open(framework, { value: "apple", onChange })
    expect(clearButton()).toBeNull()
    expect(noneRow()?.getAttribute("aria-selected")).toBe("false")
    await press(noneRow()!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toMatchObject({ value: "" })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  // Owner 10.11 «должен закрывать список?»: an iOS menu closes on a choice, and None leaves nothing more to choose
  test("the other rows of a multiple list keep it open, as on a desktop", async () => {
    const onChange = vi.fn()
    await open(framework, { value: [], multiple: true, onChange })
    await press(document.querySelector<HTMLElement>('[data-option-id="apple"]')!)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(listbox()).not.toBeNull()
  })

  test("in a multiple list it clears every value and closes the list too", async () => {
    const onChange = vi.fn()
    await open(framework, { value: ["apple", "banana"], multiple: true, onChange })
    expect(noneRow()?.getAttribute("aria-selected")).toBe("false")
    await press(noneRow()!)
    expect(onChange).toHaveBeenCalledWith([])
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  test("Space on the None row clears the value too", async () => {
    const onChange = vi.fn()
    await open(framework, { value: "apple", onChange })
    await settle(() => { fireEvent.keyDown(listbox()!, { key: "ArrowUp" }) })
    await settle(() => { fireEvent.keyDown(listbox()!, { key: " " }) })
    expect(onChange.mock.calls[0][0]).toMatchObject({ value: "" })
  })

  test("a value no option has is no choice: the None row is checked and highlighted", async () => {
    await open(framework, { value: "kiwi" })
    expect(noneRow()?.getAttribute("aria-selected")).toBe("true")
    expect(listbox()!.getAttribute("aria-activedescendant")).toBe(noneRow()?.id)
  })

  test("with no options, the None row still unsets a value", async () => {
    const onChange = vi.fn()
    await open(framework, { value: "apple", items: [], onChange })
    expect(options().map((option) => option.textContent)).toEqual(["None"])
    // One tab stop: the list, as with options (the container stays out of the order)
    expect(listbox()!.getAttribute("tabindex")).toBe("0")
    expect(listbox()!.parentElement?.getAttribute("tabindex")).toBe("-1")
    await press(noneRow()!)
    expect(onChange.mock.calls[0][0]).toMatchObject({ value: "" })
  })

  test("a custom trigger owns its clearing: its list has no None row", async () => {
    await open(framework, { customTrigger: true })
    expect(listbox()).not.toBeNull()
    expect(noneRow()).toBeUndefined()
  })

  test("the default trigger carries the mark that hides its clear button from the first paint", async () => {
    await mount(framework, { value: "apple" })
    expect(trigger().hasAttribute("data-select-none-row")).toBe(true)
  })

  test("crossing to a desktop while open drops the row and moves its highlight; crossing back brings both", async () => {
    await open(framework)
    expect(listbox()!.getAttribute("aria-activedescendant")).toBe(noneRow()?.id)
    await crossTo(false)
    expect(noneRow()).toBeUndefined()
    const apple = document.querySelector('[data-option-id="apple"]')
    expect(apple?.hasAttribute("data-highlight")).toBe(true)
    expect(listbox()!.getAttribute("aria-activedescendant")).toBe(apple?.id)
    await crossTo(true)
    expect(noneRow()?.hasAttribute("data-highlight")).toBe(true)
    expect(listbox()!.getAttribute("aria-activedescendant")).toBe(noneRow()?.id)
  })

  test("noneLabel names the row", async () => {
    await open(framework, { noneLabel: "Нет" })
    expect(options()[0].textContent).toBe("Нет")
  })

  test("the arrow keys reach it, and Enter on it clears", async () => {
    const onChange = vi.fn()
    await open(framework, { value: "apple", onChange })
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!
    expect(list.getAttribute("aria-activedescendant")).toBe(document.querySelector('[data-option-id="apple"]')?.id)
    await settle(() => { fireEvent.keyDown(list, { key: "ArrowUp" }) })
    expect(list.getAttribute("aria-activedescendant")).toBe(noneRow()?.id)
    await settle(() => { fireEvent.keyDown(list, { key: "Enter" }) })
    expect(onChange.mock.calls[0][0]).toMatchObject({ value: "" })
  })

  test("with no value, the highlight starts on the None row, the checked one", async () => {
    await open(framework)
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!
    expect(list.getAttribute("aria-activedescendant")).toBe(noneRow()?.id)
  })

  test("before groups, the None row's section leaves the line to the first group's heading", async () => {
    await open(framework, { grouped: true })
    const none = options()[0]
    expect(none.textContent).toBe("None")
    expect(none.parentElement?.nextElementSibling?.getAttribute("role")).toBe("group")
  })

  test("a Select that is not clearable has no None row", async () => {
    await open(framework, { clearable: false })
    expect(trigger().hasAttribute("data-select-none-row")).toBe(false)
    expect(noneRow()).toBeUndefined()
    expect(options().map((option) => option.textContent)).toEqual(["Apple", "Banana"])
  })

  test("a desktop keeps the clear button and has no None row", async () => {
    phone = false
    await open(framework, { value: "apple" })
    expect(noneRow()).toBeUndefined()
    expect(clearButton()).not.toBeNull()
  })
})

test("the None row's section ends in the line of a menu section, 24pt in, 10pt above and below (Select.module.css)", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Select/Select.module.css`, "utf8")
  const phoneCss = css.slice(css.indexOf("@media (max-width: 767px)"))
  expect(phoneCss).toMatch(/\.NoneSection \{\s*position: relative;\s*padding-bottom: 21px;\s*\}/)
  expect(phoneCss).toMatch(/\.NoneSection::after \{\s*position: absolute;\s*inset: auto 8px 10px;\s*height: 1px;\s*background: var\(--menu-separator-background-color\);/)
  expect(phoneCss).toMatch(/\.NoneSection:has\(\+ \.OptionGroup\) \{\s*padding-bottom: 0;\s*\}/)
  expect(phoneCss).toMatch(/\.NoneSection:has\(\+ \.OptionGroup\)::after \{\s*content: none;\s*\}/)
  expect(phoneCss).toMatch(/\.NoneSection:last-child::after \{\s*content: none;\s*\}/)
})

test("a phone hides a clearable Select's clear button from the first paint (SelectControl.module.css)", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/SelectControl/SelectControl.module.css`, "utf8")
  const phoneCss = css.slice(css.indexOf("@media (max-width: 767px)"))
  expect(phoneCss).toMatch(/\.SelectControl\[data-select-none-row\] > \.IndicatorWrapper > \.Clear \{\s*display: none;\s*\}/)
})
