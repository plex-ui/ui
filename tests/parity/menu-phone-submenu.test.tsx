import { act, fireEvent, render, within } from "@testing-library/react"
import { useEffect, useState } from "react"
import { Direction } from "radix-ui"
import { ConfigProvider } from "reka-ui"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { h, reactive } from "vue"
import { Menu as RMenu } from "../../packages/ui/src/components/Menu"
import { Dialog as RDialog } from "../../packages/ui/src/components/Dialog"
import { PhoneLayout as RPhoneLayout } from "../../packages/ui/src/components/PhoneLayout"
import { Page as RPage } from "../../packages/ui/src/components/Page"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../packages/vue/src/components/Dialog"
import { PhoneLayout } from "../../packages/vue/src/components/PhoneLayout"
import { Page, PageFooter } from "../../packages/vue/src/components/Page"
import { Menu, MenuContent, MenuItem, MenuTrigger, MenuSub, MenuSubTrigger, MenuSubContent, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem } from "../../packages/vue/src/components/Menu"
import { animation, flushVue, mountVue } from "./harness"

type Framework = "React" | "Vue"
class Media extends EventTarget {
  constructor(readonly media: string) { super() }
  get matches() { return this.media === "(max-width: 767px)" && mobile }
}
let mobile = true
let submenuWidth = 280
let grandchildWidth = 280
const media = new Map<string, Media>()
const viewport = { offsetLeft: 0, offsetTop: 0, width: 375, height: 812, addEventListener() {}, removeEventListener() {} }
// jsdom has no layout. These measurements let the real primitives and the
// adapter initialize; CSS widths, clipping, touch targets and footer geometry
// still require the accompanying browser scenarios.
function rect(element: HTMLElement) {
  // A PhoneLayout box: the screen of a phone
  if (element.getAttribute("data-plex-layout") === "phone") return new DOMRect(0, 0, 375, 812)
  if (element.getAttribute("role") === "menu") {
    const submenu = element.hasAttribute("data-submenu")
    const label = element.ownerDocument.getElementById(element.getAttribute("aria-labelledby") ?? "")?.textContent
    return new DOMRect(20, 180, submenu ? (label === "Tags" ? grandchildWidth : submenuWidth) : 280, submenu ? 300 : 160)
  }
  if (element.getAttribute("aria-haspopup") === "menu") return new DOMRect(36, 240, 248, 44)
  return new DOMRect(20, 180, 238, 44)
}
beforeEach(() => {
  mobile = true
  submenuWidth = 280
  grandchildWidth = 280
  media.clear()
  vi.stubGlobal("visualViewport", viewport)
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
})
afterEach(() => vi.unstubAllGlobals())

const settle = async (callback: () => void = () => {}, delay = 25) => act(async () => {
  callback()
  await flushVue()
  await new Promise((resolve) => setTimeout(resolve, delay))
  await flushVue()
})
const element = (selector: string) => {
  const node = document.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`Missing ${selector}`)
  return node
}
const body = () => within(document.body)
const preventClose = (event: Event) => event.preventDefault()

async function fixture(framework: Framework, { rtl = false, forceSub, acceptClose = false, modal = false, initialChild = false, initialGrandchild = false, rootEntry = "pointer" }: { rtl?: boolean; forceSub?: boolean; acceptClose?: boolean; modal?: boolean; initialChild?: boolean; initialGrandchild?: boolean; rootEntry?: "pointer" | "keyboard" | "forced" } = {}) {
  const closed = vi.fn()
  const grandchildClosed = vi.fn()
  const rootClosed = vi.fn()
  const selected = vi.fn()
  const initiallyForced = initialChild ? forceSub : forceSub === undefined ? undefined : false
  const state = reactive({ label: "Sort by", checked: false, order: "name", forced: initiallyForced, grandchildForced: initialGrandchild ? true : undefined })
  let updateLabel = (label: string) => { state.label = label }
  let updateForced = (forced: boolean | undefined) => { state.forced = forced }
  if (framework === "React") {
    const Fixture = () => {
      const [label, setLabel] = useState("Sort by")
      const [checked, setChecked] = useState(false)
      const [order, setOrder] = useState("name")
      const [forced, setForced] = useState(initiallyForced)
      const [grandchildForced, setGrandchildForced] = useState(initialGrandchild ? true : undefined)
      useEffect(() => {
        updateLabel = setLabel
        updateForced = setForced
      }, [])
      return <Direction.Provider dir={rtl ? "rtl" : "ltr"}>
        <RMenu modal={modal} forceOpen={rootEntry === "forced" ? true : undefined} onClose={rootClosed}>
          <RMenu.Trigger><button>Actions</button></RMenu.Trigger>
          <RMenu.Content>
            <RMenu.Item onSelect={() => {}}>Parent action</RMenu.Item>
            <RMenu.Sub forceOpen={forced} onClose={() => { closed(); if (acceptClose) setForced(false) }}>
              <RMenu.SubTrigger><span id="rich-label">{label}</span><span aria-hidden="true">decorative</span></RMenu.SubTrigger>
              <RMenu.SubContent>
                <RMenu.Item disabled onSelect={() => {}}>Unavailable</RMenu.Item>
                <RMenu.Item onSelect={selected}>Rename</RMenu.Item>
                <RMenu.CheckboxItem checked={checked} onCheckedChange={(next) => setChecked(next === true)} onSelect={preventClose}>Grid</RMenu.CheckboxItem>
                <RMenu.RadioGroup value={order} onChange={setOrder}>
                  <RMenu.RadioItem value="name" onSelect={preventClose}>Name</RMenu.RadioItem>
                  <RMenu.RadioItem value="date" onSelect={preventClose}>Date</RMenu.RadioItem>
                </RMenu.RadioGroup>
                <RMenu.Sub forceOpen={grandchildForced} onClose={() => { grandchildClosed(); if (acceptClose) setGrandchildForced(false) }}>
                  <RMenu.SubTrigger>Tags</RMenu.SubTrigger>
                  <RMenu.SubContent>
                    <RMenu.Item disabled onSelect={() => {}}>Nested unavailable</RMenu.Item>
                    <RMenu.Item onSelect={selected}>Nested action</RMenu.Item>
                  </RMenu.SubContent>
                </RMenu.Sub>
              </RMenu.SubContent>
            </RMenu.Sub>
          </RMenu.Content>
        </RMenu>
        <button>Outside</button>
      </Direction.Provider>
    }
    await settle(() => { render(<Fixture />) })
  } else {
    await settle(() => { mountVue(() => h(ConfigProvider, { dir: rtl ? "rtl" : "ltr" }, { default: () => [
      h(Menu, { modal, forceOpen: rootEntry === "forced" ? true : undefined, onClose: rootClosed }, { default: () => [
        h(MenuTrigger, null, { default: () => h("button", "Actions") }),
        h(MenuContent, null, { default: () => [
          h(MenuItem, { onSelect: () => {} }, { default: () => "Parent action" }),
          h(MenuSub, { forceOpen: state.forced, onClose: () => { closed(); if (acceptClose) state.forced = false } }, { default: () => [
            h(MenuSubTrigger, null, { default: () => [h("span", { id: "rich-label" }, state.label), h("span", { "aria-hidden": "true" }, "decorative")] }),
            h(MenuSubContent, null, { default: () => [
              h(MenuItem, { disabled: true, onSelect: () => {} }, { default: () => "Unavailable" }),
              h(MenuItem, { onSelect: selected }, { default: () => "Rename" }),
              h(MenuCheckboxItem, { checked: state.checked, "onUpdate:checked": (next: boolean | "indeterminate") => { state.checked = next === true }, onSelect: preventClose }, { default: () => "Grid" }),
              h(MenuRadioGroup, { value: state.order, onChange: (next: string) => { state.order = next } }, { default: () => [
                h(MenuRadioItem, { value: "name", onSelect: preventClose }, { default: () => "Name" }),
                h(MenuRadioItem, { value: "date", onSelect: preventClose }, { default: () => "Date" }),
              ] }),
              h(MenuSub, { forceOpen: state.grandchildForced, onClose: () => { grandchildClosed(); if (acceptClose) state.grandchildForced = false } }, { default: () => [
                h(MenuSubTrigger, null, { default: () => "Tags" }),
                h(MenuSubContent, null, { default: () => [
                  h(MenuItem, { disabled: true, onSelect: () => {} }, { default: () => "Nested unavailable" }),
                  h(MenuItem, { onSelect: selected }, { default: () => "Nested action" }),
                ] }),
              ] }),
            ] }),
          ] }),
        ] }),
      ] }), h("button", "Outside"),
    ] })) })
  }
  if (rootEntry !== "forced") {
    await settle(() => {
      const actions = body().getByRole("button", { name: "Actions" })
      if (rootEntry === "keyboard") { actions.focus(); fireEvent.keyDown(actions, { key: "ArrowDown" }) }
      else fireEvent.click(actions)
    })
  }
  // Ordinary controlled cases open externally after the root has settled;
  // initialChild exercises both panels mounting in the same update.
  if (forceSub !== undefined && !initialChild) {
    await settle(() => updateForced(forceSub))
    expect(closed).not.toHaveBeenCalled()
  }
  const trigger = element('[role="menuitem"][aria-haspopup="menu"]')
  const open = async (keyboard = false) => settle(() => {
    if (keyboard) { trigger.focus(); fireEvent.keyDown(trigger, { key: rtl ? "ArrowLeft" : "ArrowRight" }) }
    else fireEvent.click(trigger)
  })
  return { trigger, open, updateLabel, closed, grandchildClosed, rootClosed, selected }
}

for (const framework of ["React", "Vue"] as const) describe(`${framework} Phone submenu contracts`, () => {
  test.each([
    { rootEntry: "pointer", acceptClose: false },
    { rootEntry: "pointer", acceptClose: true },
    { rootEntry: "keyboard", acceptClose: false },
    { rootEntry: "keyboard", acceptClose: true },
    { rootEntry: "forced", acceptClose: false },
    { rootEntry: "forced", acceptClose: true },
  ] as const)("initial child owns $rootEntry autofocus without a spurious close; owner accepts=$acceptClose", async ({ rootEntry, acceptClose }) => {
    const f = await fixture(framework, { forceSub: true, initialChild: true, rootEntry, acceptClose })
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(2)
    expect(f.closed).not.toHaveBeenCalled()
    expect(f.rootClosed).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: "Rename" }))
    // Real subsequent focus outside the child still closes it normally.
    await settle(() => body().getByRole("menuitem", { name: "Parent action", hidden: true }).focus())
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(acceptClose ? 1 : 2)
    expect(f.rootClosed).not.toHaveBeenCalled()
  })

  test.each([
    { rootEntry: "forced", rtl: false },
    { rootEntry: "forced", rtl: true },
    { rootEntry: "pointer", rtl: false },
    { rootEntry: "pointer", rtl: true },
    { rootEntry: "keyboard", rtl: false },
    { rootEntry: "keyboard", rtl: true },
  ] as const)("simultaneous three-level $rootEntry entry routes directly to the leaf, RTL=$rtl", async ({ rootEntry, rtl }) => {
    const focusPath: HTMLElement[] = []
    const record = (event: FocusEvent) => {
      if (event.target instanceof HTMLElement) focusPath.push(event.target)
    }
    document.addEventListener("focusin", record, true)
    try {
      const f = await fixture(framework, { forceSub: true, initialChild: true, initialGrandchild: true, acceptClose: true, rootEntry, rtl })
      const leaf = body().getByRole("menuitem", { name: "Nested action" })
      const leafContent = leaf.closest('[role="menu"]')
      expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(3)
      expect(f.closed).not.toHaveBeenCalled()
      expect(f.grandchildClosed).not.toHaveBeenCalled()
      expect(f.rootClosed).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(leaf)
      expect(focusPath.filter((target) => {
        const menu = target.closest('[role="menu"]')
        return menu !== null && menu !== leafContent
      })).toEqual([])
    } finally {
      document.removeEventListener("focusin", record, true)
    }
  })

  test("zero layout stays pending and hands off only after measurable geometry arrives", async () => {
    submenuWidth = 0
    const f = await fixture(framework, { forceSub: true, initialChild: true, rootEntry: "forced" })
    const child = element('[data-submenu]')
    expect(child.hasAttribute("data-submenu-unavailable")).toBe(false)
    expect(child.hasAttribute("data-submenu-positioned")).toBe(false)
    expect(f.closed).not.toHaveBeenCalled()
    submenuWidth = 280
    await settle(() => fireEvent.resize(window))
    expect(child.hasAttribute("data-submenu-positioned")).toBe(true)
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: "Rename" }))
    expect(f.closed).not.toHaveBeenCalled()
  })

  test.each([
    { nested: false, rootEntry: "forced" },
    { nested: true, rootEntry: "forced" },
    { nested: false, rootEntry: "keyboard" },
    { nested: true, rootEntry: "keyboard" },
  ] as const)("unavailable $rootEntry layout returns once to the visible trigger, nested=$nested", async ({ nested, rootEntry }) => {
    if (nested) grandchildWidth = 400
    else submenuWidth = 400
    const f = await fixture(framework, { forceSub: true, initialChild: true, initialGrandchild: nested, rootEntry, acceptClose: true })
    const blocked = element('[data-submenu-unavailable]')
    const trigger = element(`[role="menuitem"][aria-haspopup="menu"][aria-controls="${blocked.id}"]`)
    expect(blocked.hasAttribute("data-submenu-positioned")).toBe(false)
    expect(document.activeElement).toBe(trigger)
    expect(f.closed).not.toHaveBeenCalled()
    expect(f.grandchildClosed).not.toHaveBeenCalled()
    expect(f.rootClosed).not.toHaveBeenCalled()
    submenuWidth = 280
    grandchildWidth = 280
    await settle(() => fireEvent.resize(window))
    expect(blocked.hasAttribute("data-submenu-unavailable")).toBe(false)
    expect(blocked.hasAttribute("data-submenu-positioned")).toBe(true)
    expect(document.activeElement).toBe(trigger)
    // A new explicit keyboard entry still works after the passive recovery.
    await settle(() => fireEvent.keyDown(trigger, { key: "ArrowRight" }))
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: nested ? "Nested action" : "Rename" }))
  })

  test("collapse preserves the root and original rich trigger, updates its text, and restores focus", async () => {
    const f = await fixture(framework)
    await f.open()
    const original = element("#rich-label")
    expect(element("[data-submenu-collapse]").textContent).toBe("Sort by")
    expect(document.querySelectorAll("#rich-label")).toHaveLength(1)
    await settle(() => f.updateLabel("Trier par"))
    expect(element("[data-submenu-collapse]").textContent).toBe("Trier par")
    expect(element("#rich-label")).toBe(original)
    await settle(() => fireEvent.click(element("[data-submenu-collapse]")))
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(1)
    expect(document.activeElement).toBe(f.trigger)
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(f.rootClosed).not.toHaveBeenCalled()
  })

  test.each([false, true])("keyboard entry skips the header and disabled row; nested return uses RTL=%s", async (rtl) => {
    const f = await fixture(framework, { rtl })
    await f.open(true)
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: "Rename" }))
    const tags = body().getByRole("menuitem", { name: "Tags", hidden: true })
    await settle(() => { tags.focus(); fireEvent.keyDown(tags, { key: rtl ? "ArrowLeft" : "ArrowRight" }) })
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: "Nested action" }))
    await settle(() => fireEvent.keyDown(document.activeElement ?? document.body, { key: rtl ? "ArrowRight" : "ArrowLeft" }))
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(2)
    expect(document.activeElement).toBe(tags)
    await settle(() => fireEvent.keyDown(tags, { key: "Escape" }))
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(1)
    expect(document.activeElement).toBe(f.trigger)
    expect(f.rootClosed).not.toHaveBeenCalled()
  })

  test("checkbox/radio cancellation stays open; a normal child action closes the root once", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle(() => fireEvent.click(body().getByRole("menuitemcheckbox", { name: "Grid" })))
    expect(body().getByRole("menuitemcheckbox", { name: "Grid" }).getAttribute("aria-checked")).toBe("true")
    await settle(() => fireEvent.click(body().getByRole("menuitemradio", { name: "Date" })))
    expect(body().getByRole("menuitemradio", { name: "Date" }).getAttribute("aria-checked")).toBe("true")
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(2)
    await settle(() => fireEvent.click(body().getByRole("menuitem", { name: "Rename" })))
    expect(body().queryByRole("menu", { hidden: true })).toBeNull()
    expect(f.selected).toHaveBeenCalledTimes(1)
    expect(f.rootClosed).toHaveBeenCalledTimes(1)
  })

  test.each([false, true])("controlled forceOpen reports collapse and respects owner acceptance=%s", async (acceptClose) => {
    const f = await fixture(framework, { forceSub: true, acceptClose })
    await settle(() => fireEvent.click(element("[data-submenu-collapse]")))
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(acceptClose ? 1 : 2)
    expect(f.rootClosed).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(f.trigger)
  })

  test("the collapse row participates in ordinary Home/Enter navigation", async () => {
    const f = await fixture(framework)
    await f.open(true)
    await settle(() => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Home" }))
    expect(document.activeElement).toBe(element("[data-submenu-collapse]"))
    await settle(() => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" }))
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(1)
    expect(document.activeElement).toBe(f.trigger)
    expect(f.rootClosed).not.toHaveBeenCalled()
  })

  test.each([false, true])("outside dismissal remains owned by the root, modal=%s", async (modal) => {
    const f = await fixture(framework, { modal })
    await f.open()
    await settle(() => fireEvent.pointerDown(body().getByText("Outside"), { button: 0, pointerType: "mouse" }))
    expect(body().queryByRole("menu", { hidden: true })).toBeNull()
    expect(f.rootClosed).toHaveBeenCalledTimes(1)
  })

  test.each([
    { focus: "child", acceptClose: true },
    { focus: "child", acceptClose: false },
    { focus: "trigger", acceptClose: true },
    { focus: "trigger", acceptClose: false },
  ])("controlled child owns Escape at $focus focus; owner accepts=$acceptClose", async ({ focus, acceptClose }) => {
    const f = await fixture(framework, { forceSub: true, acceptClose })
    await settle(() => {
      const target = focus === "trigger" ? f.trigger : body().getByRole("menuitem", { name: "Rename" })
      target.focus()
      fireEvent.keyDown(target, { key: "Escape" })
    })
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(acceptClose ? 1 : 2)
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(f.rootClosed).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(f.trigger)
  })

  test("rapid collapse/reopen keeps the active child and its header available", async () => {
    animation.disabled = false
    const f = await fixture(framework)
    await f.open()
    await settle(() => fireEvent.click(element("[data-submenu-collapse]")), 1)
    await f.open()
    await settle(() => {}, 180)
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(2)
    expect(element("[data-submenu-collapse]").getAttribute("aria-disabled")).not.toBe("true")
    expect(f.rootClosed).not.toHaveBeenCalled()
  })

  test("the parent behind a submenu is hidden from a screen reader, and the press's focus moves into the submenu", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle()
    const parent = f.trigger.closest('[role="menu"]') as HTMLElement
    const submenu = element("[data-submenu]")
    expect(parent.hasAttribute("data-submenu-over")).toBe(true)
    expect(parent.getAttribute("aria-hidden")).toBe("true")
    expect(body().getAllByRole("menu")).toEqual([submenu])
    expect(body().queryByRole("menuitem", { name: "Parent action" })).toBeNull()
    expect(document.activeElement).toBe(submenu)
    // Collapsing shows the parent again before focus returns to its row
    await settle(() => fireEvent.click(element("[data-submenu-collapse]")))
    expect(parent.hasAttribute("aria-hidden")).toBe(false)
    expect(document.activeElement).toBe(f.trigger)
    expect(body().getAllByRole("menu")).toEqual([parent])
  })

  test("a press on the parent collapses the submenu and chooses nothing, its release neither", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle()
    const parent = f.trigger.closest('[role="menu"]') as HTMLElement
    const row = within(parent).getByRole("menuitem", { name: "Parent action", hidden: true })
    await settle(() => fireEvent.pointerDown(row, { button: 0, pointerId: 7, pointerType: "touch" }))
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(body().getAllByRole("menu")).toEqual([parent])
    expect(document.activeElement).toBe(f.trigger)
    // The parent's rows take presses again by the time the finger lifts: its release and click are the collapse's
    await settle(() => {
      fireEvent.pointerUp(row, { button: 0, pointerId: 7, pointerType: "touch" })
      fireEvent.click(row)
    })
    expect(f.rootClosed).not.toHaveBeenCalled()
    expect(body().getAllByRole("menu")).toEqual([parent])
    // A later press is an ordinary one
    await settle(() => fireEvent.click(row))
    expect(f.rootClosed).toHaveBeenCalledTimes(1)
  })

  test("the pointer leaving the row that the submenu now covers leaves the submenu open", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle()
    const submenu = element("[data-submenu]")
    // The submenu stands over the row under the mouse that opened it, which leaves the row without moving
    await settle(() => fireEvent.pointerLeave(f.trigger, { pointerType: "mouse", clientX: 1, clientY: 1, relatedTarget: submenu }))
    expect(f.closed).not.toHaveBeenCalled()
    expect(body().getAllByRole("menu", { hidden: true })).toHaveLength(2)
    expect(document.activeElement).toBe(submenu)
  })

  test("after a press on the parent collapses the submenu, the first press outside closes the menu", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle()
    const parent = f.trigger.closest('[role="menu"]') as HTMLElement
    const row = within(parent).getByRole("menuitem", { name: "Parent action", hidden: true })
    await settle(() => {
      fireEvent.pointerDown(row, { button: 0, pointerId: 1, pointerType: "mouse" })
      fireEvent.pointerUp(row, { button: 0, pointerId: 1, pointerType: "mouse" })
      fireEvent.click(row)
    })
    expect(f.closed).toHaveBeenCalledTimes(1)
    expect(f.rootClosed).not.toHaveBeenCalled()
    // The press reached the document, so the primitives no longer take the next one for a press inside the menu
    await settle(() => fireEvent.pointerDown(document.body, { button: 0, pointerId: 1, pointerType: "mouse" }))
    expect(f.rootClosed).toHaveBeenCalledTimes(1)
  })

  test("only the release and click of the press that collapsed the submenu are cancelled", async () => {
    const f = await fixture(framework)
    await f.open()
    await settle()
    const parent = f.trigger.closest('[role="menu"]') as HTMLElement
    const row = within(parent).getByRole("menuitem", { name: "Parent action", hidden: true })
    // A secondary button chooses nothing behind the submenu, and leaves it open
    await settle(() => fireEvent.pointerDown(row, { button: 2, pointerId: 1, pointerType: "mouse" }))
    expect(f.closed).not.toHaveBeenCalled()
    // A press whose release never comes: the next press is an ordinary one, and so is its click
    await settle(() => fireEvent.pointerDown(row, { button: 0, pointerId: 1, pointerType: "mouse" }))
    expect(f.closed).toHaveBeenCalledTimes(1)
    await settle(() => {
      fireEvent.pointerDown(row, { button: 0, pointerId: 1, pointerType: "mouse" })
      fireEvent.click(row)
    })
    expect(f.rootClosed).toHaveBeenCalledTimes(1)
  })

  test("the heading row and its separator stay out of the scrolling items", async () => {
    const f = await fixture(framework)
    await f.open()
    const submenu = element("[data-submenu]")
    const [heading, separator, items] = Array.from(submenu.children) as HTMLElement[]
    expect(submenu.children).toHaveLength(3)
    expect(heading.hasAttribute("data-submenu-collapse")).toBe(true)
    expect(separator.getAttribute("role")).toBe("separator")
    expect(items.className).toBe("SubmenuItems")
    expect(within(items).getByRole("menuitem", { name: "Rename" })).toBeTruthy()
  })

  test("desktop keeps its existing child collection without a collapse header", async () => {
    mobile = false
    const f = await fixture(framework)
    await f.open(true)
    expect(document.querySelector("[data-submenu-collapse]")).toBeNull()
    expect(document.querySelector("[data-submenu-phone]")).toBeNull()
    expect(document.activeElement).toBe(body().getByRole("menuitem", { name: "Rename" }))
  })
})

// A menu laid out as on a phone by where it is, at any window width (owner, plan 176): inside a PhoneLayout it opens in
// the box, inside a Dialog laid out as on a phone in a phone scope of its own
for (const framework of ["React", "Vue"] as const) describe(`${framework} menu laid out as on a phone by its context`, () => {
  const mount = async (where: "layout" | "dialog") => {
    mobile = false
    if (framework === "React") {
      const menu = (
        <RMenu>
          <RMenu.Trigger><button>Actions</button></RMenu.Trigger>
          <RMenu.Content>
            <RMenu.Item onSelect={() => {}}>Parent action</RMenu.Item>
            <RMenu.Sub>
              <RMenu.SubTrigger>Sort by</RMenu.SubTrigger>
              <RMenu.SubContent><RMenu.Item onSelect={() => {}}>Rename</RMenu.Item></RMenu.SubContent>
            </RMenu.Sub>
          </RMenu.Content>
        </RMenu>
      )
      await settle(() => {
        render(where === "layout"
          ? <RPhoneLayout data-testid="frame">{menu}</RPhoneLayout>
          : <RDialog open><RDialog.Content layout="phone"><RDialog.Header><RDialog.Title>Edit</RDialog.Title></RDialog.Header>{menu}</RDialog.Content></RDialog>)
      })
    } else {
      const menu = () => h(Menu, null, { default: () => [
        h(MenuTrigger, null, { default: () => h("button", "Actions") }),
        h(MenuContent, null, { default: () => [
          h(MenuItem, { onSelect: () => {} }, { default: () => "Parent action" }),
          h(MenuSub, null, { default: () => [
            h(MenuSubTrigger, null, { default: () => "Sort by" }),
            h(MenuSubContent, null, { default: () => h(MenuItem, { onSelect: () => {} }, { default: () => "Rename" }) }),
          ] }),
        ] }),
      ] })
      await settle(() => {
        mountVue(() => where === "layout"
          ? h(PhoneLayout, { "data-testid": "frame" }, { default: menu })
          : h(Dialog, { open: true }, { default: () => h(DialogContent, { layout: "phone" }, { default: () => [
            h(DialogHeader, null, { default: () => h(DialogTitle, null, { default: () => "Edit" }) }),
            menu(),
          ] }) }))
      })
    }
    await settle(() => fireEvent.click(body().getByRole("button", { name: "Actions", hidden: true })))
    await settle(() => fireEvent.click(body().getByRole("menuitem", { name: "Sort by", hidden: true })))
    await settle()
  }

  test("inside a PhoneLayout the menu and its submenu open in the box, as on a phone", async () => {
    await mount("layout")
    const frame = document.querySelector<HTMLElement>('[data-testid="frame"]')!
    const [root, submenu] = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'))
    expect(frame.contains(root)).toBe(true)
    expect(frame.contains(submenu)).toBe(true)
    expect(submenu.hasAttribute("data-submenu-phone")).toBe(true)
    expect(submenu.querySelector("[data-submenu-collapse]")?.textContent).toContain("Sort by")
    expect(root.hasAttribute("data-submenu-over")).toBe(true)
  })

  test("inside a Dialog laid out as on a phone the menu opens over the window in a phone scope of its own", async () => {
    await mount("dialog")
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const [root, submenu] = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'))
    for (const menu of [root, submenu]) {
      expect(dialog.contains(menu)).toBe(false)
      expect(menu.closest('[data-plex-layout="phone"]')).not.toBeNull()
    }
    expect(submenu.hasAttribute("data-submenu-phone")).toBe(true)
    expect(submenu.querySelector("[data-submenu-collapse]")).not.toBeNull()
  })

  test("in a PhoneLayout inside a Page with a footer the box, not the Page, bounds the submenu", async () => {
    // A narrow window, where the Page's footer would hold menus of its own above it; the box clips past its edges
    mobile = true
    if (framework === "React") {
      await settle(() => {
        render(
          <RPage>
            <RPhoneLayout data-testid="frame">
              <RMenu>
                <RMenu.Trigger><button>Actions</button></RMenu.Trigger>
                <RMenu.Content>
                  <RMenu.Sub>
                    <RMenu.SubTrigger>Sort by</RMenu.SubTrigger>
                    <RMenu.SubContent><RMenu.Item onSelect={() => {}}>Rename</RMenu.Item></RMenu.SubContent>
                  </RMenu.Sub>
                </RMenu.Content>
              </RMenu>
            </RPhoneLayout>
            <RPage.Footer><button>Done</button></RPage.Footer>
          </RPage>,
        )
      })
    } else {
      await settle(() => {
        mountVue(() => h(Page, null, { default: () => [
          h(PhoneLayout, { "data-testid": "frame" }, { default: () => h(Menu, null, { default: () => [
            h(MenuTrigger, null, { default: () => h("button", "Actions") }),
            h(MenuContent, null, { default: () => h(MenuSub, null, { default: () => [
              h(MenuSubTrigger, null, { default: () => "Sort by" }),
              h(MenuSubContent, null, { default: () => h(MenuItem, { onSelect: () => {} }, { default: () => "Rename" }) }),
            ] }) }),
          ] }) }),
          h(PageFooter, null, { default: () => h("button", "Done") }),
        ] }))
      })
    }
    await settle(() => fireEvent.click(body().getByRole("button", { name: "Actions", hidden: true })))
    await settle(() => fireEvent.click(body().getByRole("menuitem", { name: "Sort by", hidden: true })))
    await settle()
    const submenu = element("[data-submenu]")
    // The box is 812 tall (rect): less the 30px collision padding at the top and the bottom
    expect(submenu.style.getPropertyValue("--menu-phone-max-height")).toBe("752px")
  })

  test("outside them a wide window keeps the desktop menu", async () => {
    mobile = false
    if (framework === "React") {
      await settle(() => { render(<RMenu><RMenu.Trigger><button>Actions</button></RMenu.Trigger><RMenu.Content><RMenu.Item onSelect={() => {}}>Rename</RMenu.Item></RMenu.Content></RMenu>) })
    } else {
      await settle(() => { mountVue(() => h(Menu, null, { default: () => [h(MenuTrigger, null, { default: () => h("button", "Actions") }), h(MenuContent, null, { default: () => h(MenuItem, { onSelect: () => {} }, { default: () => "Rename" }) })] })) })
    }
    await settle(() => fireEvent.click(body().getByRole("button", { name: "Actions" })))
    expect(element('[role="menu"]').closest('[data-plex-layout="phone"]')).toBeNull()
  })
})
