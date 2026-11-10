import { act, fireEvent, render } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h } from "vue"
import { Select as RSelect } from "../../packages/ui/src/components/Select"
import { Select } from "../../packages/vue/src/components/Select"
import { flushVue, mountVue } from "./harness"

// Plan 178, block 8: on a phone a Select's list opens over its trigger, as the pop-up menu of an iOS 27.2 picker does
// (ref-app pickers: the 250pt menu stands over the row's value, 9pt below the row's top, its end at the chevron's end,
// the value hidden under it), and toward the larger part of the screen, as Menu does (menuTriggerCover.ts). A desktop
// keeps the 5px gap below the trigger.

class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" && phone }
}
let phone = true
let triggerTop = 78
const media = new Map<string, Media>()
const fruits = [{ value: "apple", label: "Apple" }, { value: "banana", label: "Banana" }]
// jsdom has no layout: the 57 by 34px value of a row on a 402px screen and a 250px list
function rect(element: HTMLElement) {
  // The wrapper the primitive positions around the list stands where its transform puts it
  if (element.querySelector(':scope > [role="dialog"]')) {
    const at = element.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)
    return new DOMRect(at ? Number(at[1]) : 0, at ? Number(at[2]) : -2000, 250, 314)
  }
  if (element.getAttribute("role") === "dialog") return new DOMRect(0, 0, 250, 314)
  if (element.getAttribute("role") === "button" && element.hasAttribute("aria-haspopup")) return new DOMRect(282, triggerTop, 57, 34)
  return new DOMRect(0, 0, 402, 874)
}
beforeEach(() => {
  phone = true
  triggerTop = 78
  media.clear()
  vi.stubGlobal("matchMedia", (query: string) => {
    let result = media.get(query)
    if (!result) { result = new Media(query); media.set(query, result) }
    return result
  })
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () { return rect(this) })
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function () { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function () { return rect(this).height })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function () { return rect(this).width })
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function () { return rect(this).height })
  vi.stubGlobal("visualViewport", { offsetLeft: 0, offsetTop: 0, width: 402, height: 874, addEventListener() {}, removeEventListener() {} })
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

/** Where the primitive placed the list: the translate of its positioned wrapper. */
const panelTop = () => {
  const wrapper = document.querySelector<HTMLElement>('[role="dialog"]')?.parentElement
  const match = wrapper?.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)
  return match ? Number(match[2]) : null
}
const trigger = () => document.querySelector<HTMLElement>('[role="button"][aria-haspopup]')!

async function mountSelect(framework: "React" | "Vue", { onChange = () => {}, alignOffset, scope = false }: { onChange?: () => void; alignOffset?: number; scope?: boolean } = {}) {
  const props = { value: "", options: fruits, placeholder: "None", block: false, align: "end" as const, alignOffset }
  if (framework === "React") {
    await settle(() => {
      const select = <RSelect {...props} onChange={onChange} />
      render(scope ? <div data-plex-layout="phone">{select}</div> : select)
    })
  } else {
    await settle(() => {
      mountVue(() => {
        const select = h(Select, { ...props, onChange })
        return scope ? h("div", { "data-plex-layout": "phone" }, [select]) : select
      })
    })
  }
}

async function openSelect(framework: "React" | "Vue", options: Parameters<typeof mountSelect>[1] = {}) {
  await mountSelect(framework, options)
  await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
  await settle()
}
const listOpen = () => document.querySelector('[data-option-id="banana"]') !== null

describe.each(["React", "Vue"] as const)("%s: an option's tooltip", (framework) => {
  test("is the info symbol on a desktop and also the row's text, which a phone shows as its subtitle", async () => {
    const options = [{ value: "apple", label: "Apple", tooltip: { content: "Crisp and sweet" } }, { value: "banana", label: "Banana" }]
    const props = { value: "", options, placeholder: "None", block: false }
    await settle(() => {
      if (framework === "React") render(<RSelect {...props} onChange={() => {}} />)
      else mountVue(() => h(Select, { ...props, onChange: () => {} }))
    })
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
    const apple = document.querySelector('[data-option-id="apple"]')!
    expect(apple.querySelector('[class*="OptionTooltipIcon"]')).not.toBeNull()
    expect(apple.querySelector('[class*="OptionTooltipText"]')?.textContent).toBe("Crisp and sweet")
    expect(document.querySelector('[data-option-id="banana"] [class*="OptionTooltipText"]')).toBeNull()
  })

  test("with a description too, the tooltip's text follows it, so a phone keeps both", async () => {
    const options = [{ value: "apple", label: "Apple", description: "A fruit", tooltip: { content: "Crisp and sweet" } }, { value: "banana", label: "Banana" }]
    const props = { value: "", options, placeholder: "None", block: false }
    await settle(() => {
      if (framework === "React") render(<RSelect {...props} onChange={() => {}} />)
      else mountVue(() => h(Select, { ...props, onChange: () => {} }))
    })
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
    const apple = document.querySelector('[data-option-id="apple"]')!
    expect(apple.querySelector('[class*="OptionDescription"]')?.textContent).toBe("A fruit")
    expect(apple.querySelector('[class*="OptionTooltipText"]')?.textContent).toBe("Crisp and sweet")
  })
})

describe.each(["React", "Vue"] as const)("%s: a long list's search", (framework) => {
  // An iOS menu has no search: a long one scrolls (iOS-menu IMG_5490, Add Payment's Province, 52 options)
  test.each([[true, false], [false, true]])("phone %s: a search field %s", async (onPhone, searched) => {
    phone = onPhone
    const options = Array.from({ length: 20 }, (_, index) => ({ value: `option-${index}`, label: `Option ${index}` }))
    const props = { value: "", options, placeholder: "None", block: false }
    await settle(() => {
      if (framework === "React") render(<RSelect {...props} onChange={() => {}} />)
      else mountVue(() => h(Select, { ...props, onChange: () => {} }))
    })
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
    expect(document.querySelector('[data-option-id="option-19"]')).not.toBeNull()
    expect(document.querySelector('input[role="combobox"]') !== null).toBe(searched)
  })

  async function openLong(count: number, value = "") {
    const options = Array.from({ length: count }, (_, index) => ({ value: `option-${index}`, label: `Option ${index}` }))
    const props = { value, options, placeholder: "None", block: false }
    await settle(() => {
      if (framework === "React") render(<RSelect {...props} onChange={() => {}} />)
      else mountVue(() => h(Select, { ...props, onChange: () => {} }))
    })
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
  }

  // The 300-option limit asks to search for the rest: with no search a phone shows them all
  test.each([[true, 320], [false, 300]])("phone %s: a 320-option list shows %i", async (onPhone, shown) => {
    phone = onPhone
    await openLong(320)
    expect(document.querySelectorAll('[role="option"]').length).toBe(shown)
  })

  test("a window narrowed to a phone while the list is open drops the search, its term and its focus", async () => {
    phone = false
    await openLong(20)
    const search = document.querySelector<HTMLInputElement>('input[role="combobox"]')!
    await settle(() => { search.focus(); fireEvent.input(search, { target: { value: "Option 1" } }) })
    expect(document.querySelectorAll('[role="option"]').length).toBeLessThan(20)
    await settle(() => { phone = true; media.get("(max-width: 767px)")?.dispatchEvent(new Event("change")) })
    await settle()
    expect(document.querySelector('input[role="combobox"]')).toBeNull()
    expect(document.querySelectorAll('[role="option"]').length).toBe(20)
    const list = document.activeElement as HTMLElement
    expect(list.getAttribute("role")).toBe("listbox")
    // The list now points at the highlighted option, and no desktop width is left locked on it
    expect(list.getAttribute("aria-activedescendant")).toBe(document.querySelector('[data-option-id="option-0"]')?.id)
    expect(document.querySelector<HTMLElement>('[class*="MenuInner"]')?.style.minWidth).toBe("")
  })

  test("a window widened past a phone while the list is open gives the keys and the pointer to the search", async () => {
    await openLong(20, "option-3")
    expect(document.querySelector('input[role="combobox"]')).toBeNull()
    await settle(() => { phone = false; media.get("(max-width: 767px)")?.dispatchEvent(new Event("change")) })
    await settle()
    const search = document.querySelector<HTMLInputElement>('input[role="combobox"]')!
    expect(document.activeElement).toBe(search)
    // The search points at the chosen option, and the list, which no longer holds the keys, at nothing
    expect(search.getAttribute("aria-activedescendant")).toBe(document.querySelector('[data-option-id="option-3"]')?.id)
    expect(document.querySelector('[role="listbox"]')?.hasAttribute("aria-activedescendant")).toBe(false)
  })
})

// Review 10.11: a list's own width kept on a phone, below the 250pt too (Select.module.css)
describe.each(["React", "Vue"] as const)("%s: a list's own width on a phone", (framework) => {
  test.each([[200, true], [undefined, false]])("listWidth %s: marked as sized %s", async (listWidth, sized) => {
    const props = { value: "", options: fruits, placeholder: "None", block: false, listWidth, listMaxWidth: 200 }
    await settle(() => {
      if (framework === "React") render(<RSelect {...props} onChange={() => {}} />)
      else mountVue(() => h(Select, { ...props, onChange: () => {} }))
    })
    await settle(() => { fireEvent.pointerDown(trigger(), { button: 0, pointerType: "mouse", pointerId: 1 }) })
    await settle()
    const list = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(list.hasAttribute("data-list-sized")).toBe(sized)
    expect(list.style.getPropertyValue("--select-list-max-width")).toBe("200px")
  })
})

describe.each(["React", "Vue"] as const)("%s: a phone Select's list opens over its trigger (iOS 27.2 picker, ref-app pickers)", (framework) => {
  test("the list's top is the trigger's top, and the covered value is hidden while it is open", async () => {
    await openSelect(framework)
    expect(panelTop()).toBe(78)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(true)
    // A list that fits its options takes the 250pt of an iOS menu on a phone (Select.module.css)
    expect(document.querySelector('[role="dialog"]')?.getAttribute("data-list-width")).toBe("auto")
  })

  test("a trigger in the lower half opens its list upward over it, its bottom at the trigger's bottom", async () => {
    triggerTop = 700
    await openSelect(framework)
    expect(panelTop()).toBe(700 + 34 - 314)
  })

  test("a larger screen keeps the 5px gap below the trigger and hides nothing", async () => {
    phone = false
    await openSelect(framework)
    expect(panelTop()).toBe(78 + 34 + 5)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("the mouse release of the press that opened the list chooses nothing over the trigger", async () => {
    const onChange = vi.fn()
    await openSelect(framework, { onChange })
    await settle(() => { fireEvent.pointerUp(document.querySelector('[data-option-id="banana"]')!, { button: 0, pointerType: "mouse", pointerId: 1, clientX: 300, clientY: 90 }) })
    expect(onChange).not.toHaveBeenCalled()
    expect(listOpen()).toBe(true)
  })

  test("dragged off the trigger, the release of that press chooses the option under it", async () => {
    const onChange = vi.fn()
    await openSelect(framework, { onChange })
    await settle(() => { fireEvent.pointerUp(document.querySelector('[data-option-id="banana"]')!, { button: 0, pointerType: "mouse", pointerId: 1, clientX: 150, clientY: 200 }) })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("a list set off its trigger by an align offset hides nothing", async () => {
    await openSelect(framework, { alignOffset: 60 })
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("in a PhoneLayout on a larger window the list keeps its gap: it has no phone layout there", async () => {
    phone = false
    await openSelect(framework, { scope: true })
    expect(panelTop()).toBe(78 + 34 + 5)
    expect(trigger().hasAttribute("data-menu-covered")).toBe(false)
  })

  test("a choice closes the list and shows the trigger again, before focus returns to it", async () => {
    await openSelect(framework)
    const button = trigger()
    const coveredOnFocus: boolean[] = []
    button.addEventListener("focus", () => coveredOnFocus.push(button.hasAttribute("data-menu-covered")))
    await settle(() => { fireEvent.pointerUp(document.querySelector('[data-option-id="banana"]')!) })
    await settle()
    expect(button.hasAttribute("data-menu-covered")).toBe(false)
    expect(document.activeElement).toBe(button)
    expect(coveredOnFocus.length).toBeGreaterThan(0)
    expect(coveredOnFocus.every((covered) => !covered)).toBe(true)
  })
})

test("a phone list is 250px, its subtitles wrapped, and its rows 42px, as an iOS picker's pop-up menu (Select.module.css)", () => {
  const css = readFileSync(`${process.cwd()}/packages/styles/src/components/Select/Select.module.css`, "utf8")
  // The 250pt floor leaves a list its own width, and a smaller maximum caps it
  expect(css).toMatch(/\.MenuList:not\(\[data-list-sized\]\) \{\s*min-width: var\(\s*--select-list-min-width,\s*max\(min\(var\(--menu-default-min-width, 0px\), var\(--select-list-max-width, 100vw\)\), var\(--radix-popover-trigger-width\)\)\s*\);/)
  expect(css).toMatch(/\.Option:has\(> \.PressableInner > \.OptionLeading\) \{[^}]*min-height: 42px;/)
  // 250 whatever the options, a long description wrapping, as UIKit's pop-up menu (ref-app pickers-desc-uikit)
  expect(css).toMatch(/\.MenuList\[data-list-width="auto"\] \{\s*width: var\(--menu-default-width, auto\);/)
  expect(css).not.toContain(".OptionDescription:not(:has(*))")
  const menu = readFileSync(`${process.cwd()}/packages/styles/src/components/Menu/Menu.module.css`, "utf8")
  expect(menu).not.toContain(".ItemDescription:not(:has(*))")
  const field = readFileSync(`${process.cwd()}/packages/styles/src/components/Field/Field.module.css`, "utf8")
  expect(field).toMatch(/\[aria-haspopup\]:not\(\[aria-haspopup="false"\]\) \{\s*--select-control-size: 34px;[\s\S]*?min-height: 0;\s*margin-block: calc\(\(var\(--field-row-label-line-height\) - 34px\) \/ 2\);/)
})

// Owner 10.11 on the phone list: in iOS a pop-up button's list is a menu, so the Select list takes Menu's rows
test("a phone list draws as a menu: its actions, checkmark, height and row value (Select.module.css)", () => {
  const read = (path: string) => readFileSync(`${process.cwd()}/packages/styles/src/${path}`, "utf8")
  const css = read("components/Select/Select.module.css")
  const phone = css.slice(css.indexOf("@media (max-width: 767px)"))
  // Actions: a menu section, the symbol after the checkmark column and the label from 79.5 (ref-app pickers-actions-uikit)
  expect(phone).toMatch(/\.ActionsContainer::before \{\s*inset: 0 calc\(var\(--menu-padding-inline, var\(--menu-gutter\)\) \+ 8px\) auto;[\s\S]*?mask-image: none;/)
  expect(phone).toMatch(/\.Action svg \{\s*width: var\(--menu-leading-icon-size, 20px\);/)
  expect(phone).toMatch(/\.MenuList:has\(\.OptionIndicatorSlot\[data-position\]\) \.ActionInner \{\s*gap: var\(--menu-check-icon-gap, 14px\);\s*padding-inline-start: calc\(var\(--menu-check-column, 13px\) \+ var\(--menu-check-gap, 8\.5px\)\);/)
  // A phone list has no search, so nothing styles one there
  expect(phone).not.toContain(".Search >")
  // The checkmark has a menu's weight, as Menu's does
  expect(phone).toMatch(/\.OptionCheck path \{\s*stroke: currentColor;\s*stroke-width: var\(--menu-check-stroke, 0\);/)
  expect(read("components/Menu/Menu.module.css")).toMatch(/\.SelectionCheck path \{\s*stroke: currentColor;\s*stroke-width: var\(--menu-check-stroke, 0\);/)
  expect(read("styles/touch.css")).toContain("--menu-check-stroke: 0.45px;")
  // As tall as its rows up to the screen's edge; a tooltip is a subtitle
  expect(phone).toMatch(/\.MenuInner \{\s*max-height: min\(var\(--select-list-max-height, 1200px\), var\(--radix-popover-content-available-height\)\);/)
  expect(phone).toMatch(/\.OptionTooltipIcon \{\s*display: none;/)
  expect(phone).toMatch(/\.OptionTooltipText \{\s*display: block;\s*font-size: 13px;/)
  // A clear button's 44px target reaches past a 34px row value instead of growing it
  expect(read("components/SelectControl/SelectControl.module.css")).toContain("margin-block: min(0px, calc((var(--select-control-size, 44px) - 44px) / 2));")
})
